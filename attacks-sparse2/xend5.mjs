// xend5.mjs — cross-check master endgame cells numerically: construct the REAL landmark
// L(alpha,t;s) class h, walk numerically, compare the anchor n' with the master's symbolic
// anchor form evaluated at the same (u, c). Also round-law cross at the same h.
// Usage: node xend5.mjs (checks a fixed sample: h in 16..40 step 3, s in 0..dt-1, u,c,t samples)
import { stepFastB } from './bstep.mjs';
import { execFileSync } from 'child_process';
import { readFileSync } from 'fs';

const DT = [];
for (const l of readFileSync('sym4-table.txt', 'utf8').split('\n')) {
  const m = l.match(/h=(\d+).*da=(\d+) dt=(\d+)/); if (m) DT[+m[1]] = +m[3];
}
const ladder = JSON.parse(readFileSync('ladder.json', 'utf8')).ladder;
const rhoOf = (h) => [0n, 1n, 2n].find(r => (((2n ** BigInt(h + 1) * r + 2n ** BigInt(h) - 1n) % 6n) + 6n) % 6n === 1n);
function j0of(h) {
  const marg = 64n < BigInt(h - 10) ? 64n : BigInt(h - 10);
  const lim = BigInt(h) - 1n - marg;
  let lo = 0, hi = ladder.length - 1, best = -1;
  while (lo <= hi) { const mid = (lo + hi) >> 1; if (BigInt(ladder[mid].tau) <= lim) { best = mid; lo = mid + 1; } else hi = mid - 1; }
  return best;
}
function numericEnd(alpha, t, w, s) {
  const E = 2n ** BigInt(t - 3) * w;
  const runs = [alpha + 3n * E, (alpha - 1n) + 5n * E];
  for (let j = 0n; j <= BigInt(s); j++) runs.push(2n ** (BigInt(t) + j) * w);
  runs.push(2n ** (BigInt(t) + BigInt(s) + 1n) * w - 1n);
  let c = { t: 'G', r: runs };
  for (let it = 0; it < 300000; it++) {
    const st = stepFastB(c);
    if (st.degenerate) return { bad: 'DEG ' + st.degenerate };
    if (st.halt) return { bad: 'HALT' };
    c = st.c;
    if (c.t === 'R' && c.r[0] === c.r[1] && c.r[0] >= 2n) return { n2: c.r[0] };
  }
  return { bad: 'cap' };
}
let tot = 0, ok = 0; const bads = [];
for (let h = 16; h <= 40; h += 3) {
  const j = j0of(h); const { A, tau } = ladder[j]; const rho = rhoOf(h);
  for (let s = 0; s < DT[h]; s++) {
    const out = execFileSync('node', ['sym5.mjs', A, tau, String(h), String(s)], { encoding: 'utf8', maxBuffer: 1e8 });
    const anchors = [...new Set([...out.matchAll(/ANCHOR n'=(.+)/g)].map(m => m[1].trim()))];
    if (anchors.length !== 1) { bads.push(`h=${h} s=${s}: ${anchors.length} anchor forms`); continue; }
    const mm = anchors[0].match(/^1W\+(\d+)\+\(?(-?\d+)(?:\+(\d+)u)?(?:\+(\d+)c)?\)?$/);
    const d0 = BigInt(mm[2]), du = BigInt(mm[3] ?? 0), dc = BigInt(mm[4] ?? 0);
    for (const [u, cI, tOff] of [[0, 0, 0], [1, 1, 0], [2, 3, 5], [5, 2, 0]]) {
      const w = 6n * BigInt(u) + 3n;
      const alpha = 2n ** BigInt(h + 1) * (3n * BigInt(cI) + rho) + 2n ** BigInt(h) - 1n;
      const t = 2 * h + 20 + tOff;
      const res = numericEnd(alpha, t, w, s);
      tot++;
      if (res.bad) { bads.push(`h=${h} s=${s} u=${u} c=${cI}: ${res.bad}`); continue; }
      const pred = 2n ** BigInt(t + s + 1) * w + d0 + du * BigInt(u) + dc * BigInt(cI);
      if (pred === res.n2) ok++; else bads.push(`h=${h} s=${s} u=${u} c=${cI} t=${t}: num ${res.n2} != sym ${pred}`);
    }
  }
}
console.log(`xend5: ${ok}/${tot} numeric instantiations match the master endgame forms`);
bads.slice(0, 12).forEach(b => console.log('  ' + b));
if (bads.length) process.exit(1);
console.log('MASTER ENDGAME = REAL ENDGAME (numeric cross-validation)');
