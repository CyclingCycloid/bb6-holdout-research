// births10.mjs — adversarial cross-check of birth extraction on UNCOLLAPSED semantics (step1, per-event).
// Verify: (a) births = S-entries with y even, value A = x + y/2 + 1, sources R/L/G only;
// (b) E6 descendants satisfy A' = (a_prev + 1)/2 (odd-part inheritance);
// (c) root list identical to collapsed-engine extraction for the same anchors.
import { stepFastB } from './bstep.mjs';
const B = BigInt;
function step1(c) { // uncollapsed, verbatim phase1/invariant-casecheck rules
  if (c.t === 'R') { const [a, b] = c.r; return { c: { t: 'S', r: [a + 1n, b - 2n, 1n] } }; }
  if (c.t === 'S') {
    const [x, y, z, ...rest] = c.r;
    if (y >= 3n) return { c: { t: 'S', r: [x + 1n, y - 2n, z + 1n, ...rest] } };
    if (y === 2n) return { c: { t: 'G', r: [x + 1n, z + 1n, ...rest] } };
    if (y === 1n) { if (rest.length === 0) return { c: { t: 'R', r: [1n, x + z + 3n] } }; return { c: { t: 'L', r: [1n, x + z + 3n, ...rest] } }; }
    return { degenerate: 'S y=' + y };
  }
  if (c.t === 'G') {
    const [a, b, ...rest] = c.r;
    if (a >= 4n) return { c: { t: 'S', r: [1n, a - 3n, 1n, b + 1n, ...rest] } };
    if (a === 2n) return { c: { t: 'L', r: [1n, b + 1n, b + 1n, ...rest] } };
    if (a === 3n) return { halt: true };
    return { degenerate: 'G a=' + a };
  }
  if (c.t === 'L') {
    const [r1, r2, r3, ...rest] = c.r;
    if (r3 >= 2n) return { c: { t: 'L', r: [r1 + 1n, r2, r3 - 1n, ...rest] } };
    if (r3 === 1n) { if (c.r.length === 3) return { c: { t: 'R', r: [r1 + 1n, r2] } }; return { c: { t: 'S', r: [r1 + 1n, r2, ...rest] } }; }
    return { degenerate: 'L r3=' + r3 };
  }
  return { degenerate: '?' };
}

const NANCH = Number(process.argv[2] ?? 2000);
// --- uncollapsed walk
let n = 3n;
const un = []; // {ty, A}
let prev = null, prevA1 = null; // track last G-head a+1 for inheritance check
let inheritBad = 0;
outer1:
for (let k = 0; k < NANCH; k++) {
  let c = { t: 'R', r: [n, n] };
  prev = null;
  for (let it = 0; it < 3000000; it++) {
    if (c.t === 'S' && (c.r[1] & 1n) === 0n) {
      const A = c.r[0] + c.r[1] / 2n + 1n;
      let ty = prev === null ? 'START' : prev.t === 'R' ? (prev.r[0] === 1n ? 'E1r' : 'L3') : prev.t === 'L' ? 'Lk' : prev.t === 'G' ? 'Gd' : 'SS';
      if (ty === 'Gd') { if (A !== prevA1 / 2n) { inheritBad++; console.log('INHERIT FAIL at anchor ' + k + ': A=' + A + ' prevA1=' + prevA1); } }
      un.push({ ty, A });
    }
    if (c.t === 'G') prevA1 = c.r[0] + 1n;
    const st = step1(c);
    if (st.degenerate || st.halt) { console.log('END', st.degenerate || 'HALT'); break outer1; }
    prev = c; c = st.c;
    if (c.t === 'R' && c.r[0] === c.r[1] && c.r[0] >= 2n) break;
  }
  n = c.r[0];
}
// --- collapsed walk (same logic as births3)
let n2 = 3n; const col = [];
outer2:
for (let k = 0; k < NANCH; k++) {
  let c = { t: 'R', r: [n2, n2] };
  let prevT = 'START', prevC = null;
  for (let it = 0; it < 5000000; it++) {
    if (c.t === 'S' && (c.r[1] & 1n) === 0n) {
      const A = c.r[0] + c.r[1] / 2n + 1n;
      let ty = prevT === 'R' ? (prevC.r[0] === 1n ? 'E1r' : 'L3') : prevT === 'L' ? 'Lk' : prevT === 'G' ? 'Gd' : 'START';
      col.push({ ty, A });
    }
    prevT = c.t; prevC = c;
    const st = stepFastB(c);
    if (st.degenerate || st.halt) break outer2;
    c = st.c;
    if (c.t === 'R' && c.r[0] === c.r[1] && c.r[0] >= 2n) break;
  }
  n2 = c.r[0];
}
// compare: collapsed list should equal uncollapsed list with S-sweep interior births ('SS' = prev S) filtered.
// (S is only ever entered from R/L/G; S->S steps are sweep interior with the same A — the entry was already recorded.)
const dedup = un.filter(b => b.ty !== 'SS');
let mismatch = 0;
const N = Math.min(dedup.length, col.length);
for (let i = 0; i < N; i++) if (dedup[i].ty !== col[i].ty || dedup[i].A !== col[i].A) { if (mismatch < 5) console.log(`MISMATCH @${i}: un=(${dedup[i].ty},${dedup[i].A}) col=(${col[i].ty},${col[i].A})`); mismatch++; }
console.log(`anchors=${NANCH}: uncollapsed births=${un.length} (deduped ${dedup.length}), collapsed ${col.length}, mismatches=${mismatch}, inheritFail=${inheritBad}`);
// count E1r divisible by 3
let e1r = 0, e1r3 = 0;
for (const b of dedup) if (b.ty === 'E1r') { e1r++; if (b.A % 3n === 0n) e1r3++; }
console.log(`E1r: ${e1r3}/${e1r} divisible by 3`);
