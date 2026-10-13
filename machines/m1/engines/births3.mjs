// births3.mjs — full root-birth recorder: every E1-reentry / L3-exit / Lk-exit birth with parent config.
// Correct collapsed-engine formulas: L-exit birth A = sigma + r2/2 + 1, sigma = r1 + r3 (sweep-conserved).
// L3-exit appears as R(sigma, r2) -> S(sigma+1, r2-2, 1): A = sigma + r2/2 + 1 (same form).
// Usage: node births3.mjs NANCH > out.json
import { stepFastB } from './bstep.mjs';
const NANCH = Number(process.argv[2] ?? 50000);
const B = BigInt;
const mod = (v, m) => Number(((v % B(m)) + B(m)) % B(m));
const nu2 = (v) => { let n = 0; let x = B(v); while ((x & 1n) === 0n) { n++; x >>= 1n; } return { j: n, q: x }; };

let n = 3n;
const roots = []; // {ty, A, ctx:[...parent runs], anchor}
let steps = 0;
outer:
for (let k = 0; k < NANCH; k++) {
  let c = { t: 'R', r: [n, n] };
  let prevT = 'START', prevC = null;
  for (let it = 0; it < 5000000; it++) {
    if (c.t === 'S' && (c.r[1] & 1n) === 0n) {
      const A = c.r[0] + c.r[1] / 2n + 1n;
      if (prevT === 'L') {
        const r = prevC.r;
        roots.push({ ty: 'Lk', A: A.toString(), sig: (r[0] + r[2]).toString(), r2: r[1].toString(), k: r.length, anchor: k, ctx: r.map(String).join(',') });
      } else if (prevT === 'R') {
        const r = prevC.r;
        if (r[0] === 1n) roots.push({ ty: 'E1r', A: A.toString(), b: r[1].toString(), anchor: k });
        else roots.push({ ty: 'L3', A: A.toString(), sig: r[0].toString(), r2: r[1].toString(), anchor: k, ctx: r.map(String).join(',') });
      } // G-descendants skipped (inherit odd part)
    }
    prevT = c.t; prevC = c;
    const st = stepFastB(c); steps++;
    if (st.degenerate || st.halt) { console.error('END ' + (st.degenerate || 'HALT')); break outer; }
    c = st.c;
    if (c.t === 'R' && c.r[0] === c.r[1] && c.r[0] >= 2n) break;
  }
  n = c.r[0];
}
import { writeFileSync } from 'fs';
writeFileSync('births-roots.json', JSON.stringify({ nanchor: NANCH, finalN: n.toString(), steps, roots }));
console.error(`roots=${roots.length} (E1r=${roots.filter(r => r.ty === 'E1r').length} L3=${roots.filter(r => r.ty === 'L3').length} Lk=${roots.filter(r => r.ty === 'Lk').length}), final n=${n}, steps=${steps}`);
