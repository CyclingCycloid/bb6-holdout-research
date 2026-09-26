// alphawalk.mjs — the autonomous landmark alpha-walk: alpha_{i+1} = alpha_i + dAlpha(nu2(alpha_i+1)).
// Simulates the walk MOD 2^K (exact while h < K, since dAlpha(h) is the machine-proven table
// value and nu2(alpha+1) is determined by alpha mod 2^K when < K). If the orbit from alpha=7
// (first landmark, T-infinity ladder) never visits 2^K - 1 (i.e. nu2(alpha+1) < K always),
// then the TRUE integer walk has h <= K-1 FOREVER (the reduction mod 2^K shadows it exactly).
// Cycle detection: Brent; then full transient+cycle scan for max h and bad-residue hit.
// Usage: node alphawalk.mjs K
import { readFileSync } from 'fs';

const K = +(process.argv[2] || 25);
const MOD = 2 ** K;
// load table
const DA = [];
for (const l of readFileSync('sym4-table.txt', 'utf8').split('\n')) {
  const m = l.match(/h=(\d+).*da=(\d+) dt=(\d+)/);
  if (m) DA[+m[1]] = +m[2];
}
let TMAX = 0; for (let i = 1; i < DA.length; i++) if (DA[i]) TMAX = i;
console.log(`table covers h=1..${TMAX} (need h < ${K}: ${TMAX >= K - 1 ? 'OK' : 'INSUFFICIENT'})`);
const v2mod = (a) => { // nu2((a mod MOD)+1), returns K if a == MOD-1 (the BAD residue)
  let x = (a + 1) % MOD; if (x === 0) return K;
  let c = 0; while (x % 2 === 0) { c++; x >>= 1; } return c;
};
const f = (a) => { const h = v2mod(a); if (h >= K || DA[h] === undefined) return null; return (a + DA[h]) % MOD; };

// Brent cycle detection from 7
let power = 1, lam = 1, tortoise = 7, hare = f(7), bad = null, steps = 0;
if (hare === null) { console.log('BAD at first step'); process.exit(1); }
outer: while (true) {
  if (tortoise === hare) break;
  if (power === lam) { tortoise = hare; power *= 2; lam = 0; if (power > 4 * MOD) { console.log('BRENT CAP'); process.exit(1); } }
  hare = f(hare); steps++;
  if (hare === null) { console.log(`BAD residue hit after ${steps} steps (h >= ${K})`); process.exit(2); }
  lam++;
  if (steps > 8 * MOD + 100) { console.log('STEP CAP'); process.exit(1); }
}
// lam = cycle length estimate; find exact mu: walk mu steps to cycle start
tortoise = 7; hare = tortoise;
for (let i = 0; i < lam; i++) { hare = f(hare); if (hare === null) { console.log('BAD during mu walk'); process.exit(2); } }
let mu = 0;
while (tortoise !== hare) { tortoise = f(tortoise); hare = f(hare); mu++; if (mu > 4 * MOD) { console.log('MU CAP'); process.exit(1); } }
// full scan of orbit: mu + lam states
let a = 7, maxh = 0, maxhAt = -1, hist = {};
for (let i = 0; i < mu + lam; i++) {
  const h = v2mod(a);
  if (h >= K) { console.log(`BAD: nu2 >= ${K} at step ${i}, alpha mod 2^K = ${a}`); process.exit(2); }
  hist[h] = (hist[h] || 0) + 1;
  if (h > maxh) { maxh = h; maxhAt = i; }
  a = f(a); if (a === null) { console.log('BAD during scan'); process.exit(2); }
}
console.log(`K=${K}: orbit from alpha=7 mod 2^K: mu=${mu} cycle-length=${lam} total=${mu + lam} states`);
console.log(`  max h on ENTIRE infinite orbit = ${maxh} (at step ${maxhAt})  => h <= ${maxh} FOREVER`);
console.log(`  h histogram: ${JSON.stringify(hist)}`);
console.log(maxh <= TMAX ? `  COVERED by sym4 table (h<=${TMAX}) — ROUND LAW COMPLETE FOR THE WHOLE WALK` : `  NOT covered (need table to ${maxh})`);
