// ref-b5-events.mjs — REFEREE: reproduce v5 §3's "10^7 phase events -> 2,908 births, 0 powers of two".
// Walk from R(3,3) with the COLLAPSED engine, counting phase events; stop at exactly 10^7 events.
// Report: anchors covered, reentries, births (all/roots/children), powers of two.
// Usage: node ref-b5-events.mjs [MAXEV=10000000]
import { stepFastB } from './bstep.mjs';
const MAXEV = BigInt(Number(process.argv[2] ?? 10000000));
const B = BigInt;
let n = 3n;
let events = 0n, anchors = 0, reentries = 0;
let birthsAll = 0, birthsRoot = 0, birthsChild = 0, pow2 = 0;
let prevGHead = null;
outer:
for (let k = 0; ; k++) {
  let c = { t: 'R', r: [n, n] };
  let pT = 'INIT';
  anchors++;
  for (let it = 0; it < 9000000; it++) {
    if (c.t === 'S' && (c.r[1] & 1n) === 0n) {
      const A = c.r[0] + c.r[1] / 2n + 1n;
      birthsAll++;
      if (pT === 'G') birthsChild++; else birthsRoot++;
      let x = A; while ((x & 1n) === 0n) x >>= 1n;
      if (x === 1n) { pow2++; console.log(`POW2 birth A=${A} at event ${events}`); }
    }
    if (c.t === 'R' && c.r[0] === 1n) reentries++;
    if (c.t === 'G') prevGHead = c.r[0] + 1n;
    pT = c.t;
    const st = stepFastB(c);
    events++;
    if (st.degenerate || st.halt) { console.log('END', st.degenerate || 'HALT'); break outer; }
    c = st.c;
    if (events >= MAXEV) break outer;
    if (c.t === 'R' && c.r[0] === c.r[1] && c.r[0] >= 2n) break;
  }
  n = c.r[0];
}
console.log(`events=${events} anchorsStarted=${anchors} reentries=${reentries}`);
console.log(`births: all=${birthsAll} roots=${birthsRoot} children=${birthsChild} POW2=${pow2}`);
