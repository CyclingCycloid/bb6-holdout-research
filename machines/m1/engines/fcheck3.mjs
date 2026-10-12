// fcheck3.mjs — verify closed-form macro map of M3 against every oracle grid cell.
// Oracle lines:
//   "A t1 N 0 -> cost=C gI.O w=W n=k r1 [r2] [g1=G]"
//   "A t2 a b -> ..." / "A t3 a b -> ..."
//   "A tX .. -> HALT S" (not expected in these grids)
// Closed form (see attack-sparse2.md):
//   A1(N), N>=2 even  -> A2(N, N/2),           cost (m^3+9m^2+11m+9)/3, m=N/2
//   A1(N), N>=3 odd   -> A3((N-1)/2,(N+1)/2),  cost (N+1)(N+4)/2
//   A1(1)             -> precursor g0.1 w=3 n=1 [1], cost 5   (halts 3 steps later)
//   A2(a,b), a,b>=1   -> A1(2a+b),             cost (a^3+6a^2+8a+9)/3
//   A3(1,b)           -> precursor g0.0 w=2 n=1 [b+2], cost 4 (halts 3 steps later)
//   A3(a,b), a even   -> A2(a, b + a/2 + 1),   cost (m^3+9m^2+5m+9)/3, m=a/2
//   A3(a,b), a odd>=3 -> A3((a-1)/2, b+(a+3)/2), cost (a^2+3a+4)/2
import { readFileSync } from 'node:fs';

const files = process.argv.slice(2);
let n = 0, ok = 0, bad = 0;
const bads = [];
for (const file of files) {
  for (const ln of readFileSync(file, 'utf8').split('\n')) {
    const m = ln.match(/^A t(\d) (\d+) (\d+) -> cost=(\d+) (g(-?\d+)\.(-?\d+) w=(\d+) n=(\d+)(?: (\d+))?(?: (\d+))?(?: g1=(\d+))?|HALT (\d+))/);
    if (!m) continue;
    const type = +m[1], x = +m[2], y = +m[3], cost = +m[4];
    n++;
    // expected: [tag, gidx, off, w, nruns, r1, r2, gap1]
    let e;
    if (type === 1) {
      const N = x;
      if (N === 1) e = ['PRE', 0, 1, 3, 1, 1, null, null, 5];
      else if (N % 2 === 0) { const mm = N / 2; e = ['A2', 0, 0, 1, 2, N, N / 2, 1, (mm * mm * mm + 9 * mm * mm + 11 * mm + 9) / 3]; }
      else e = ['A3', 1, 0, 2, 2, (N - 1) / 2, (N + 1) / 2, 2, (N + 1) * (N + 4) / 2];
    } else if (type === 2) {
      e = ['A1', 0, 0, 1, 1, 2 * x + y, null, null, (x * x * x + 6 * x * x + 8 * x + 9) / 3];
    } else {
      if (x === 1) e = ['PRE', 0, 0, 2, 1, y + 2, null, null, 4];
      else if (x % 2 === 0) { const mm = x / 2; e = ['A2', 0, 0, 1, 2, x, y + x / 2 + 1, 1, (mm * mm * mm + 9 * mm * mm + 5 * mm + 9) / 3]; }
      else e = ['A3', 1, 0, 2, 2, (x - 1) / 2, y + (x + 3) / 2, 2, (x * x + 3 * x + 4) / 2];
    }
    const gidx = +m[6], off = +m[7], w = +m[8], nruns = +m[9], r1 = m[10] !== undefined ? +m[10] : null, r2 = m[11] !== undefined ? +m[11] : null, gap1 = m[12] !== undefined ? +m[12] : null;
    let good = true;
    if (m[5].startsWith('HALT')) { good = false; bads.push('UNEXPECTED-HALT ' + ln); }
    else {
      if (gidx !== e[1] || off !== e[2] || w !== e[3] || nruns !== e[4]) good = false;
      if (r1 !== e[5]) good = false;
      if (e[6] !== null && r2 !== e[6]) good = false;
      if (e[7] !== null && gap1 !== e[7]) good = false;
      if (cost !== e[8]) good = false;
    }
    if (good) ok++; else { bad++; if (bads.length < 15) bads.push(ln + '   expected ' + JSON.stringify(e)); }
  }
}
console.log(`cells=${n} ok=${ok} bad=${bad}`);
if (bads.length) console.log(bads.join('\n'));
