// pref1.mjs — prefix-sharing check: the trajectory from Phi(w,m) is m-independent in its
// head states (each engine rule touches only the first few runs; the deep tail is carried
// verbatim). Verify: run the sym3/sym2 symbolic walk in-process for m and m' > m and
// compare the recorded generic-path G-state forms elementwise up to the point where the
// shorter tail is exhausted. Uses sym3.mjs's walk (imported via a child process would write
// JSON; instead re-implement the driver loop against the exported engine from sym2/sym3 —
// sym3.mjs is CLI-only, so we copy the essential walk here, reading sym3's rules via import
// is not possible; instead: execute sym3.mjs with a patched output path and compare JSONs.
// Simpler robust approach: numeric! walk from Phi(3,m) vs Phi(3,m') with the BigInt engine
// and compare the first N G-state run vectors: they must agree EXACTLY until the tail of
// the smaller m is consumed (all runs identical incl. merged ones).
// Usage: node pref1.mjs M1 M2 [N]
import { stepFastB } from './bstep.mjs';

const M1 = BigInt(+(process.argv[2] || 1000));
const M2 = BigInt(+(process.argv[3] || 1010));
const N = +(process.argv[4] || 800);
const W = 3n;
function gstates(m) {
  const runs = [W - 1n, W - 1n];
  for (let i = 1n; i <= m - 1n; i++) runs.push(2n ** i * W);
  runs.push(2n ** m * W - 1n);
  let c = { t: 'G', r: runs };
  const gs = [];
  for (let it = 0; it < 200000; it++) {
    if (c.t === 'G') { gs.push(c.r.join(',')); if (gs.length > N + 50) break; }
    const st = stepFastB(c);
    if (st.degenerate || st.halt) break;
    c = st.c;
    if (c.t === 'R' && c.r[0] === c.r[1]) { gs.push('ANCHOR ' + c.r[0]); break; }
  }
  return gs;
}
const a = gstates(M1), b = gstates(M2);
let agree = 0;
const n = Math.min(a.length, b.length, N);
const HEAD = 30; // locality: rules touch only the first few runs; compare head region
for (let i = 0; i < n; i++) {
  const ra = a[i].split(','), rb = b[i].split(',');
  const k = Math.min(ra.length, rb.length, HEAD);
  let same = true;
  for (let j = 0; j < k; j++) if (ra[j] !== rb[j]) { same = false; break; }
  // the shorter's remaining runs must be the pure geometric tail + final -1 (carried verbatim)
  if (!same) break;
  agree++;
}
console.log(`m=${M1} vs m=${M2}: G-states ${a.length} vs ${b.length}; first ${n} compared; head(${HEAD}) agree on first ${agree}`);
if (agree < Math.min(N, a.length)) console.log(`  DIVERGE at index ${agree}:\n   m1: ${a[agree]?.slice(0, 120)}\n   m2: ${b[agree]?.slice(0, 120)}`);
else console.log('  PREFIX SHARED (head runs identical up to compared horizon)');
