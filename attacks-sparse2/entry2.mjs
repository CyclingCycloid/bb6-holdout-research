// entry2.mjs — entry lemmas, referee-fix version:
//  MODE 'pure'  (L2b, w-scale, PURE tail): from Phi(w,m) = G(w-1, w-1, 2w, ..., 2^(m-1)w, 2^m w - 1),
//    m >= 12, the walk reaches the landmark L(7,9)-form at w-scale: head (7 + 3*2^6*w, 6 + 5*2^6*w),
//    third run 2^9*w, ..., with tail carried verbatim from exponent 10 to m (final -1 intact).
//    Numeric via bstep for m = 12..MMAX x w samples.
//  MODE 'mod'   (L3b, Psi-scale, MODIFIED tail, from S0): h sweep to HMAX (referee fix e: >= 200).
// Usage: node entry2.mjs pure [MMAX=300] | node entry2.mjs mod [HMAX=200]
import { stepFastB } from './bstep.mjs';

const MODE = process.argv[2] || 'pure';
const rhoOf = (h) => [0n, 1n, 2n].find(r => (((2n ** BigInt(h + 1) * r + 2n ** BigInt(h) - 1n) % 6n) + 6n) % 6n === 1n);
let tot = 0, ok = 0; const bads = [];
if (MODE === 'pure') {
  const MMAX = +(process.argv[3] ?? 300);
  for (let m = 12; m <= MMAX; m++) {
    for (const w of [3n, 9n, 15n, 21n]) {
      // Phi(w, m)
      const runs = [w - 1n, w - 1n];
      for (let i = 1n; i <= BigInt(m) - 1n; i++) runs.push(2n ** i * w);
      runs.push(2n ** BigInt(m) * w - 1n);
      let c = { t: 'G', r: runs };
      let hit = null;
      for (let it = 0; it < 4000 && !hit; it++) {
        if (c.t === 'G' && it > 0) {
          const r = c.r;
          if (r.length >= 3 && r[0] === 7n + 3n * 64n * w && r[1] === 6n + 5n * 64n * w && r[2] === 512n * w && r[3] === 1024n * w) {
            // verify full L(7,9; m-10) shape: runs 2^9..2^(m-1) pure, final 2^m w - 1
            let good = r.length === m - 6; // 2 + (m-9 pure runs 2^9..2^(m-1)) + 1 final = m-6
            for (let i = 9; i <= m - 1 && good; i++) if (r[i - 7] !== 2n ** BigInt(i) * w) good = false;
            if (good && r[r.length - 1] !== 2n ** BigInt(m) * w - 1n) good = false;
            if (good) hit = it;
          }
        }
        if (!hit) { const st = stepFastB(c); if (st.degenerate || st.halt) { bads.push(`m=${m} w=${w}: ${st.degenerate || 'HALT'}`); break; } c = st.c; }
      }
      tot++;
      if (hit) ok++; else if (!bads.length || !bads[bads.length - 1].startsWith(`m=${m} w=${w}`)) bads.push(`m=${m} w=${w}: L(7,9)-form not reached`);
    }
    if (m % 50 === 0) console.log(`  m=${m}: ${ok}/${tot}`);
  }
  console.log(`entry2 pure (L2b): Phi(w,m) -> L(7,9; m-10) exact for m=12..${MMAX}: ${ok}/${tot}`);
} else {
  const HMAX = +(process.argv[3] ?? 200);
  for (let h = 12; h <= HMAX; h++) {
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
      for (let it = 0; it < h + 400; it++) {
        if (c.t === 'G') gs.push(c.r);
        if (gs.length > h + 8) break;
        const st = stepFastB(c);
        if (st.degenerate || st.halt) { bads.push(`h=${h}: walk ended`); break; }
        c = st.c;
      }
      tot++;
      // S0 exact (cascade) + entry L(7,9) within 7 G-states after S0
      const s0 = gs[h];
      const wantS0 = [Psi - 1n, Psi - 1n];
      for (let i = 1n; i <= BigInt(h - 1); i++) wantS0.push(2n ** i * Psi);
      wantS0.push(alpha + 5n * E);
      for (let j = 0; j <= s; j++) wantS0.push(2n ** BigInt(t + j) * w);
      wantS0.push(2n ** BigInt(t + s + 1) * w - 1n);
      let cascadeOk = s0 && s0.length === wantS0.length;
      for (let i = 0; cascadeOk && i < wantS0.length; i++) if (s0[i] !== wantS0[i]) cascadeOk = false;
      let entryOk = false;
      for (let k = h; k < Math.min(gs.length, h + 12); k++) {
        const g = gs[k];
        if (g.length >= 3 && g[0] === 7n + 3n * 64n * Psi && g[1] === 6n + 5n * 64n * Psi && g[2] === 512n * Psi && g[3] === 1024n * Psi) { entryOk = true; break; }
      }
      if (cascadeOk && entryOk) ok++; else bads.push(`h=${h} u=${u} c=${cI}: cascade=${!!cascadeOk} entry=${entryOk}`);
    }
    if (h % 40 === 0) console.log(`  h=${h}: ${ok}/${tot}`);
  }
  console.log(`entry2 mod (L3b): cascade S0 + L(7,9) entry for h=12..${HMAX}: ${ok}/${tot}`);
}
bads.slice(0, 10).forEach(b => console.log('  ' + b));
if (bads.length) process.exit(1);
console.log('ENTRY LEMMAS VERIFIED');
