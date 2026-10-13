// ref-b5b-uncollapsed.mjs — REFEREE: v5 "10^7 events -> 2,908 births" reproduction attempt #2:
// UNCOLLAPSED per-event steps, stop at exactly 10^7 steps; count anchors, reentries, DEDUPED births.
import { stepFastB } from './bstep.mjs';
const B = BigInt;
function step1(c) {
  if (c.t === 'R') { const [a, b] = c.r; return { c: { t: 'S', r: [a + 1n, b - 2n, 1n] } }; }
  if (c.t === 'S') {
    const [x, y, z, ...rest] = c.r;
    if (y >= 3n) return { c: { t: 'S', r: [x + 1n, y - 2n, z + 1n, ...rest] } };
    if (y === 2n) return { c: { t: 'G', r: [x + 1n, z + 1n, ...rest] } };
    if (y === 1n) { if (rest.length === 0) return { c: { t: 'R', r: [1n, x + z + 3n] } }; return { c: { t: 'L', r: [1n, x + z + 3n, ...rest] } }; }
    return { degenerate: 'S' };
  }
  if (c.t === 'G') {
    const [a, b, ...rest] = c.r;
    if (a >= 4n) return { c: { t: 'S', r: [1n, a - 3n, 1n, b + 1n, ...rest] } };
    if (a === 2n) return { c: { t: 'L', r: [1n, b + 1n, b + 1n, ...rest] } };
    if (a === 3n) return { halt: true };
    return { degenerate: 'G' };
  }
  if (c.t === 'L') {
    const [r1, r2, r3, ...rest] = c.r;
    if (r3 >= 2n) return { c: { t: 'L', r: [r1 + 1n, r2, r3 - 1n, ...rest] } };
    if (r3 === 1n) { if (c.r.length === 3) return { c: { t: 'R', r: [r1 + 1n, r2] } }; return { c: { t: 'S', r: [r1 + 1n, r2, ...rest] } }; }
    return { degenerate: 'L' };
  }
  return { degenerate: '?' };
}
const MAXEV = 10000000;
let n = 3n, steps = 0, anchors = 0, reentries = 0;
let birthsAll = 0, birthsRoot = 0, birthsChild = 0, pow2 = 0, evenYvisits = 0;
let c, pT;
outer:
for (let k = 0; ; k++) {
  c = { t: 'R', r: [n, n] }; pT = 'INIT'; anchors++;
  for (let it = 0; it < 5000000; it++) {
    if (c.t === 'S' && (c.r[1] & 1n) === 0n) {
      evenYvisits++;
      if (pT !== 'S') {
        const A = c.r[0] + c.r[1] / 2n + 1n;
        birthsAll++; if (pT === 'G') birthsChild++; else birthsRoot++;
        let x = A; while ((x & 1n) === 0n) x >>= 1n;
        if (x === 1n) { pow2++; console.log('POW2', A); }
      }
    }
    if (c.t === 'R' && c.r[0] === 1n) reentries++;
    pT = c.t;
    const st = step1(c); steps++;
    if (st.degenerate || st.halt) { console.log('END'); break outer; }
    c = st.c;
    if (steps >= MAXEV) break outer;
    if (c.t === 'R' && c.r[0] === c.r[1] && c.r[0] >= 2n) break;
  }
  n = c.r[0];
}
console.log(`UNCOLLAPSED steps=${steps} anchorsStarted=${anchors} reentries=${reentries} evenYvisits=${evenYvisits}`);
console.log(`deduped births: all=${birthsAll} roots=${birthsRoot} children=${birthsChild} POW2=${pow2}`);
