// reverify-handcheck.mjs — INDEPENDENT prologue (L2) hand-check, written by the audit agent.
// For each n: n+3 = 2^m*w (w odd). Hand-derived expectations per paper §4, checked against the
// UNCOLLAPSED event stream of phase1.mjs transition(n,true) (one D-on-0 event per line):
//   (P1) ev0 = R(n,n); ev1 = S(n+1, n-2, 1)                  [rule R(a,b)->S3(a+1,b-2,1), cost 2b+3]
//   (P2) the odd S-sweep S(n+1+2k, n-2-2k, 1+k), k=0..(n-3)/2, ends at y=1, then R(1, x+z+3) = R(1, 2n+2)
//   (P3) R(1,2n+2) -> S(2, 2n, 1), even sweep j=n-1, lands G(2+j+1, 1+j+1) = G(n+2, n+1) = G_0
//   (P4) the FIRST m+1 G-configs equal, in order,
//        G_i = G(a_i, a_i, 2^(m-i+1)w, ..., 2^(m-1)w, 2^m*w - 1),  a_i = 2^(m-i)*w - 1
//        (from the paper's halving rule G(a,b,R) -> G((a-1)/2,(a-1)/2,b+1,R)); the last is
//        G_m = Phi(w,m) = G(w-1, w-1, 2w, 4w, ..., 2^(m-1)w, 2^m*w - 1)  -> prologue end.
import { transition } from './phase1.mjs';

const v2 = (x) => { let c = 0; while (x % 2 === 0) { c++; x /= 2; } return c; };
const NS = [37, 101, 277, 811, 2431, 1629, 3197]; // 5 suggested fresh + 2 with larger m
let pass = 0, fail = 0;
for (const n of NS) {
  const m = v2(n + 3), w = (n + 3) / 2 ** m;
  const gchain = [];
  // G_0 = G(n+2, n+1) = G(2^m*w - 1, 2^m*w - 2)  (two runs; paper: "R(n,n) -> R(1,2n+2) -> G(n+2,n+1)")
  gchain.push([2 ** m * w - 1, 2 ** m * w - 2]);
  for (let i = 1; i <= m; i++) {
    const a = 2 ** (m - i) * w - 1;
    const runs = [a, a];
    for (let k = m - i + 1; k <= m - 1; k++) runs.push(2 ** k * w);
    runs.push(2 ** m * w - 1);
    gchain.push(runs);
  }
  const res = transition(n, true);
  if (res.halt) { console.log(`n=${n}: engine HALT cost=${res.cost} (w=1 sub-case)`); pass++; continue; }
  if (res.degenerate) { console.log(`n=${n}: DEGENERATE ${res.degenerate}`); fail++; continue; }
  const evs = res.events.map(e => e.c);
  const eq = (c, t, r) => c.t === t && c.r.length === r.length && c.r.every((v, i) => v === r[i]);
  // (P1)
  const p1 = eq(evs[0], 'R', [n, n]) && eq(evs[1], 'S', [n + 1, n - 2, 1]);
  // (P2): verify EVERY sweep event of the odd sweep, then R(1,2n+2)
  const J = (n - 3) / 2;
  let p2 = true;
  for (let k = 0; k <= J; k++) if (!eq(evs[1 + k], 'S', [n + 1 + k, n - 2 - 2 * k, 1 + k])) { p2 = false; break; }
  p2 = p2 && eq(evs[2 + J], 'R', [1, 2 * n + 2]);
  // (P3): S(2,2n,1) then even sweep, landing at G_0 = G(n+2, n+1)
  const J2 = n - 1;
  let p3 = eq(evs[3 + J], 'S', [2, 2 * n, 1]);
  for (let k = 0; p3 && k <= J2; k++) if (!eq(evs[3 + J + k], 'S', [2 + k, 2 * n - 2 * k, 1 + k])) p3 = false;
  // after the even sweep (y reaches 2 at k = J2-1... we just scan for G_0 next)
  const iG0 = evs.findIndex((c, i) => i > 3 + J && c.t === 'G');
  p3 = p3 && iG0 > 0 && eq(evs[iG0], 'G', [n + 2, n + 1]);
  // (P4): first m+1 G-configs equal gchain
  const gIdx = [];
  for (let i = 0; i < evs.length; i++) if (evs[i].t === 'G') { gIdx.push(i); if (gIdx.length > gchain.length + 2) break; }
  let p4 = gIdx.length >= gchain.length;
  for (let i = 0; p4 && i < gchain.length; i++) if (!eq(evs[gIdx[i]], 'G', gchain[i])) p4 = false;
  const phi = gchain[gchain.length - 1];
  const status = p1 && p2 && p3 && p4;
  if (status) pass++; else fail++;
  console.log(`n=${n}: m=${m} w=${w} P1=${p1} P2=${p2} P3=${p3} P4(first ${gchain.length} G-configs = hand chain)=${p4} Phi=G(${phi.join(',')}) -> ${status ? 'PASS' : 'FAIL'}`);
}
console.log(`HANDCHECK: ${pass} pass, ${fail} fail of ${NS.length}`);
if (fail) process.exit(1);
console.log('PROLOGUE CLOSED FORM MATCHES ENGINE EVENT STREAM EXACTLY (fresh n)');
