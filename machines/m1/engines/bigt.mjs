// bigt.mjs — round-law spot check at very large t (t ~ 10^5..10^6): the law's t-uniformity.
import { stepFastB } from './bstep.mjs';
import { readFileSync } from 'fs';
const DA = [], DT = [];
for (const l of readFileSync('sym4-table.txt', 'utf8').split('\n')) {
  const m = l.match(/h=(\d+).*da=(\d+) dt=(\d+)/); if (m) { DA[+m[1]] = BigInt(m[2]); DT[+m[1]] = +m[3]; }
}
const v2 = x => { let c = 0n; x = x < 0n ? -x : x; while (x % 2n === 0n) { c++; x /= 2n; } return c; };
const rhoOf = h => [0n, 1n, 2n].find(r => ((2n ** BigInt(h + 1) * r + 2n ** BigInt(h) - 1n) % 6n + 6n) % 6n === 1n);
let ok = 0, bad = 0;
for (const h of [1, 2, 3, 4, 5, 9, 13, 17, 31, 64]) {
  const rho = rhoOf(h);
  for (const [t, u, c] of [[99991, 0, 0], [100003, 2, 1], [999983, 5, 3], [104729, 7, 2]]) {
    if (t < h + 17) continue;
    const w = 6n * BigInt(u) + 3n, alpha = 2n ** BigInt(h + 1) * (3n * BigInt(c) + rho) + 2n ** BigInt(h) - 1n;
    const T = BigInt(t), E = 2n ** (T - 3n) * w, slack = 40n;
    const runs = [alpha + 3n * E, (alpha - 1n) + 5n * E];
    for (let j = 0n; j <= slack; j++) runs.push(2n ** (T + j) * w);
    runs.push(2n ** (T + slack + 1n) * w - 1n);
    let c2 = { t: 'G', r: runs }, lm = null;
    for (let it = 0; it < 500000; it++) {
      if (c2.t === 'G' && it > 0) {
        const r = c2.r;
        if (r.length >= 3 && r[2] % w === 0n) {
          const q = r[2] / w, tt = v2(q);
          if ((q >> tt) === 1n && tt >= 4n) {
            const A = r[0] - 3n * 2n ** (tt - 3n) * w;
            if (A > 0n && A < 10n ** 40n && ((A % 6n) + 6n) % 6n === 1n && r[1] === (A - 1n) + 5n * 2n ** (tt - 3n) * w) {
              let good = r[r.length - 1] === 2n ** (tt + BigInt(r.length - 3)) * w - 1n;
              for (let i = 2; i + 1 < r.length && good; i++) if (r[i] !== 2n ** (tt + BigInt(i - 2)) * w) good = false;
              if (good) { lm = [A, tt]; break; }
            }
          }
        }
      }
      const st = stepFastB(c2); if (st.degenerate || st.halt) break; c2 = st.c;
    }
    if (lm && lm[0] === alpha + DA[h] && lm[1] === T + BigInt(DT[h])) ok++;
    else { bad++; console.log(`t=${t} h=${h} u=${u} c=${c}: got ${lm ? lm.join(',') : 'none'} want (${alpha + DA[h]},${T + BigInt(DT[h])})`); }
  }
}
console.log(`large-t spot check (t in {99991,100003,999983,104729}): ${ok} ok, ${bad} bad`);
if (bad) process.exit(1);
console.log('ROUND LAW t-UNIFORM (holds identically at t ~ 10^6)');
