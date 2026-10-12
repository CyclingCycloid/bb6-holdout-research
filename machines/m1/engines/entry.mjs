// entry.mjs — machine-check the two structural lemmas of the decomposition:
//  L-CASCADE: from L(alpha,t;s) class h (t >= h+4), the first h+1 G-states are the halving
//    cascade: G-states 0..h-1 have heads a_i = 2^(h-i)*Psi - 1 (odd), state h = S0 =
//    G(Psi-1, Psi-1, 2Psi, ..., 2^(h-1)Psi, alpha+5E, E-tail...), Psi = omega + 3*2^(t-3-h)w odd.
//  L-ENTRY: from S0, the walk reaches the landmark L(7,9)-form at Psi-scale
//    (a = 7 + 3*2^6*Psi, b = 6 + 5*2^6*Psi, third run 2^9*Psi, ...), tail carried —
//    for all h >= 12 (reads runs up to exponent ~10 < h-1).
// Numeric via bstep; the algebra is an elementary induction on the engine rules.
// Usage: node entry.mjs [HMAX=60]
import { stepFastB } from './bstep.mjs';

const HMAX = +(process.argv[2] ?? 60);
const rhoOf = (h) => [0n, 1n, 2n].find(r => (((2n ** BigInt(h + 1) * r + 2n ** BigInt(h) - 1n) % 6n) + 6n) % 6n === 1n);
let okC = 0, okE = 0, tot = 0; const bads = [];
for (let h = 1; h <= HMAX; h++) {
  const rho = rhoOf(h);
  for (const [u, cI] of [[0, 0], [1, 2], [3, 1]]) {
    const w = 6n * BigInt(u) + 3n;
    const alpha = 2n ** BigInt(h + 1) * (3n * BigInt(cI) + rho) + 2n ** BigInt(h) - 1n;
    const omega = 2n * (3n * BigInt(cI) + rho) + 1n;
    const t = h + 20, s = 40;
    const E = 2n ** BigInt(t - 3) * w;
    const Psi = omega + 3n * 2n ** BigInt(t - 3 - h) * w;
    const runs0 = [alpha + 3n * E, (alpha - 1n) + 5n * E];
    for (let j = 0; j <= s; j++) runs0.push(2n ** BigInt(t + j) * w);
    runs0.push(2n ** BigInt(t + s + 1) * w - 1n);
    let c = { t: 'G', r: runs0 };
    const gs = [];
    for (let it = 0; it < 5000; it++) {
      if (c.t === 'G') gs.push(c.r);
      if (gs.length > h + 8) break;
      const st = stepFastB(c);
      if (st.degenerate || st.halt) { bads.push(`h=${h}: walk ended early`); break; }
      c = st.c;
    }
    tot++;
    // L-CASCADE: state h (0-indexed) must be S0
    const s0 = gs[h];
    if (!s0) { bads.push(`h=${h} u=${u} c=${cI}: no G-state ${h}`); continue; }
    const wantS0 = [Psi - 1n, Psi - 1n];
    for (let i = 1n; i <= BigInt(h - 1); i++) wantS0.push(2n ** i * Psi);
    wantS0.push(alpha + 5n * E);
    for (let j = 0; j <= s; j++) wantS0.push(2n ** BigInt(t + j) * w);
    wantS0.push(2n ** BigInt(t + s + 1) * w - 1n);
    let cascadeOk = s0.length === wantS0.length;
    for (let i = 0; cascadeOk && i < wantS0.length; i++) if (s0[i] !== wantS0[i]) cascadeOk = false;
    // also heads a_i = 2^(h-i)*Psi - 1 for i < h (odd for i<h)
    let headsOk = true;
    for (let i = 0; i < h; i++) { const ai = 2n ** BigInt(h - i) * Psi - 1n; if (!gs[i] || gs[i][0] !== ai) headsOk = false; }
    if (cascadeOk && headsOk) okC++; else bads.push(`h=${h} u=${u} c=${cI}: S0/head mismatch (cascade=${cascadeOk} heads=${headsOk})`);
    // L-ENTRY (only for h >= 12): find L(7,9)-form among gs[h..h+6]
    if (h >= 12) {
      let entryOk = false;
      for (let k = h; k < Math.min(gs.length, h + 7); k++) {
        const g = gs[k];
        if (g.length >= 3 && g[0] === 7n + 3n * 64n * Psi && g[1] === 6n + 5n * 64n * Psi && g[2] === 512n * Psi && g[3] === 1024n * Psi) { entryOk = true; break; }
      }
      if (entryOk) okE++; else bads.push(`h=${h} u=${u} c=${cI}: no L(7,9) entry within ${7} G-states after S0`);
    }
  }
}
console.log(`entry.mjs: L-CASCADE ${okC}/${tot} ok; L-ENTRY ${okE} ok (h>=12 subset)`);
bads.slice(0, 10).forEach(b => console.log('  ' + b));
if (bads.length) process.exit(1);
console.log('CASCADE + ENTRY LEMMAS VERIFIED (numeric, algebra elementary)');
