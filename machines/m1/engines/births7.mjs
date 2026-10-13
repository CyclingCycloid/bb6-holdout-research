// births7.mjs — long-run class-birth scheduler: coarse key (ty, j, A%144, q%144), log each NEW key with anchor+n.
// Also log every birth with q%144==1 or A a power of 2 (danger watch).
// Usage: node births7.mjs NANCH
import { stepFastB } from './bstep.mjs';
const NANCH = Number(process.argv[2] ?? 10000000);
const B = BigInt;
const nu2 = (v) => { let n = 0; let x = B(v); while ((x & 1n) === 0n) { n++; x >>= 1n; } return { j: n, q: x }; };
const mod = (v, m) => Number(((B(v) % B(m)) + B(m)) % B(m));

let n = 3n;
const seen = new Map();
let roots = 0, bad = 0, exotic = 0;
const log = [];
outer:
for (let k = 0; k < NANCH; k++) {
  let c = { t: 'R', r: [n, n] };
  let prevT = 'START', prevC = null;
  for (let it = 0; it < 9000000; it++) {
    if (c.t === 'S' && (c.r[1] & 1n) === 0n) {
      const A = c.r[0] + c.r[1] / 2n + 1n;
      let ty = null, ctx = '';
      if (prevT === 'L') { ty = 'Lk'; ctx = 'L(' + prevC.r.map(String).join(',') + ')'; }
      else if (prevT === 'R') {
        if (prevC.r[0] === 1n) ty = 'E1r'; else { ty = 'L3'; ctx = 'R(' + prevC.r.map(String).join(',') + ')'; }
      }
      if (ty && ty !== 'E1r') {
        roots++;
        const { j, q } = nu2(A);
        if (q === 1n) { console.log(`!!! POWER-OF-2 BIRTH A=${A} ty=${ty} ctx=${ctx} anchor=${k} n=${n}`); bad++; }
        const qm = mod(q, 144), am = mod(A, 144);
        const key = `${ty}|j${j}|A${am}|q${qm}`;
        if (!seen.has(key)) { seen.set(key, 1); const rec = `NEW ${key}  anchor=${k} n=${n} ${ctx} A=${A} q=${q}`; log.push(rec); console.log(rec); }
        else seen.set(key, seen.get(key) + 1);
        if (qm === 1 || (ty === 'Lk' && j >= 2) || (ty === 'L3' && j >= 3)) {
          exotic++;
          if (exotic < 400 || exotic % 1000 === 0) log.push(`EX ${ty} j=${j} A=${A} q=${q} anchor=${k} n=${n} ${ctx}`);
        }
      } else if (ty === 'E1r') roots++;
    }
    prevT = c.t; prevC = c;
    const st = stepFastB(c);
    if (st.degenerate || st.halt) { console.log('END', st.degenerate || 'HALT', 'anchor', k); break outer; }
    c = st.c;
    if (c.t === 'R' && c.r[0] === c.r[1] && c.r[0] >= 2n) break;
  }
  n = c.r[0];
  if ((k % 1000000) === 0) console.error(`@anchor ${k} n=${n} roots=${roots} classes=${seen.size} bad=${bad} exotic=${exotic}`);
}
import { writeFileSync } from 'fs';
writeFileSync('births7-log.txt', log.join('\n'));
console.log(`DONE anchors=${NANCH} finalN=${n} roots=${roots} bad=${bad} classes=${seen.size} exotic=${exotic}`);
