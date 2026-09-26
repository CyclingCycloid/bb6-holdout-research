// walk1.mjs — on-walk verification: run the FULL trajectory from Phi(w,m) with the BigInt
// engine for large m; verify (a) every consecutive landmark pair obeys the sym4 round table;
// (b) the walk ends at ANCHOR n' with n' = 2^m*w + c, c = 3 mod 6, delta = c+3 >= 6;
// (c) no halt/degenerate; (d) report h histogram (h > 9 cases).
// Usage: node walk1.mjs m [w]
import { stepFastB } from './bstep.mjs';
import { readFileSync } from 'fs';

const M = BigInt(+(process.argv[2] || 2000));
const W0 = BigInt(+(process.argv[3] || 3));
const v2 = (x) => { x = x < 0n ? -x : x; let c = 0n; while (x % 2n === 0n) { c++; x /= 2n; } return c; };
const DA = [], DT = [];
for (const l of readFileSync('sym4-table.txt', 'utf8').split('\n')) {
  const m = l.match(/h=(\d+).*da=(\d+) dt=(\d+)/);
  if (m) { DA[+m[1]] = BigInt(m[2]); DT[+m[1]] = +m[3]; }
}
function detect(runs, w) {
  if (runs.length < 3) return null;
  const a = runs[0], b = runs[1], c3 = runs[2];
  if (c3 % w !== 0n) return null;
  const q = c3 / w; const t = v2(q); if ((q >> t) !== 1n || t < 4n) return null;
  const sub3 = 3n * 2n ** (t - 3n) * w;
  if (a < sub3) return null;
  const alpha = a - sub3;
  if (((alpha % 6n) + 6n) % 6n !== 1n || alpha > 10n ** 30n) return null;
  if (b !== (alpha - 1n) + 5n * 2n ** (t - 3n) * w) return null;
  for (let i = 2; i + 1 < runs.length; i++) if (runs[i] !== 2n ** (t + BigInt(i - 2)) * w) return null;
  const last = runs[runs.length - 1];
  if (last !== 2n ** (t + BigInt(runs.length - 3)) * w - 1n) return null;
  return { alpha, t };
}
// Phi(w, m)
const runs = [W0 - 1n, W0 - 1n];
for (let i = 1n; i <= M - 1n; i++) runs.push(2n ** i * W0);
runs.push(2n ** M * W0 - 1n);
let c = { t: 'G', r: runs };
const lms = [];
let anchor = null, bad = null, ev = 0;
for (let it = 0; it < 3000000; it++) {
  if (c.t === 'G' && it > 0) { const lm = detect(c.r, W0); if (lm) lms.push(lm); }
  const st = stepFastB(c); ev++;
  if (st.degenerate) { bad = 'DEG ' + st.degenerate; break; }
  if (st.halt) { bad = 'HALT'; break; }
  c = st.c;
  if (c.t === 'R' && c.r[0] === c.r[1] && c.r[0] >= 2n) { anchor = c.r[0]; break; }
}
if (bad) { console.log(`m=${M} w=${W0}: FAIL ${bad}`); process.exit(1); }
if (anchor === null) { console.log(`m=${M} w=${W0}: no anchor (cap)`); process.exit(1); }
// verify every consecutive landmark transition against the table
let nOk = 0; const viol = [];
for (let i = 1; i < lms.length; i++) {
  const h = Number(v2(lms[i - 1].alpha + 1n));
  const da = lms[i].alpha - lms[i - 1].alpha, dt = lms[i].t - lms[i - 1].t;
  if (DA[h] === undefined) { viol.push(`h=${h} not in table (g${i})`); continue; }
  if (da !== DA[h] || dt !== BigInt(DT[h])) viol.push(`round g${i}: h=${h} got (${da},${dt}) want (${DA[h]},${DT[h]})`);
  else nOk++;
}
const hist = {};
for (const L of lms) { const h = Number(v2(L.alpha + 1n)); hist[h] = (hist[h] || 0) + 1; }
// endgame anchor checks
const cc = anchor - 2n ** M * W0;
const clsOk = ((cc % 6n) + 6n) % 6n === 3n;
const grwOk = cc >= 3n;
console.log(`m=${M} w=${W0}: landmarks=${lms.length} rounds-verified=${nOk}/${lms.length - 1} events=${ev}`);
console.log(`  first landmark: alpha=${lms[0].alpha} t=${lms[0].t}; last: alpha=${lms[lms.length - 1].alpha} t=${lms[lms.length - 1].t}`);
console.log(`  anchor: n' = 2^m*w + ${cc}  class(3 mod 6)=${clsOk} growth(delta=${cc + 3n}>=6)=${grwOk}`);
console.log(`  h histogram: ${JSON.stringify(hist)}`);
if (viol.length) { console.log('  VIOLATIONS:'); viol.slice(0, 10).forEach(v => console.log('   ' + v)); process.exit(1); }
if (!clsOk || !grwOk) { console.log('  CLASS/GROWTH FAIL'); process.exit(1); }
console.log('  ON-WALK CLEAN');
