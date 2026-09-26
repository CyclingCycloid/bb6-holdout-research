// bothbr.mjs — Lemma G (both-branches safety) systematic test:
//  (i) SINGLE-FLIP: for each parity-decision index k of the true master walk, flip ONLY
//      decision k (take the other branch with exact arithmetic: d0 += 1), then let the walk
//      run with its own true parities. All such walks must close as NEXT or ANCHOR.
//  (ii) SPARSE: random flip sets (~5% of indices, 20 samples/seed).
//  (iii) BASELINE patterns (all0/all1/alt/alt1) recorded HONESTLY (these may diverge —
//      the adversarial-profile frontier, reported as findings not failures of the lemma).
// Runs in CONCRETE mode (w-scale folds; exact at t=T0). Terminals allowed: NEXT, ANCHOR.
// Anything else (FAIL/DEGEN/HALT/DEPTH-CAP/PUSH-CAP) = RED.
// Usage: node bothbr.mjs h1 [h2 ...]
import { execFileSync } from 'child_process';
import { readFileSync } from 'fs';

const hs = process.argv.slice(2).map(Number);
const ladder = JSON.parse(readFileSync('ladder.json', 'utf8')).ladder;
function j0of(h) {
  const marg = 64n < BigInt(h - 10) ? 64n : BigInt(h - 10);
  const lim = BigInt(h) - 1n - marg;
  let lo = 0, hi = ladder.length - 1, best = -1;
  while (lo <= hi) { const mid = (lo + hi) >> 1; if (BigInt(ladder[mid].tau) <= lim) { best = mid; lo = mid + 1; } else hi = mid - 1; }
  return best;
}
function runOne(A, tau, h, env) {
  try {
    const out = execFileSync('node', ['sym5.mjs', A, tau, String(h), '40'], {
      encoding: 'utf8', timeout: 120000, maxBuffer: 1e8,
      env: { ...process.env, SYM5_CONCRETE: '1', SYM4_MAXPUSH: '400000', ...env }
    });
    const dist = JSON.parse(/dist=(\{[^}]*\})/.exec(out)[1]);
    const ok = Object.keys(dist).every(k => k === 'NEXT' || k === 'ANCHOR');
    const kind = Object.keys(dist).join(',');
    return { ok, kind, paths: Object.values(dist).reduce((a, b) => a + b, 0) };
  } catch (e) { return { ok: false, kind: 'CRASH/TIMEOUT', paths: 0 }; }
}
let totSingle = 0, okSingle = 0; const reds = [];
for (const h of hs) {
  const j = j0of(h); const { A, tau } = ladder[j];
  // count the true walk's parity decisions: run with SYM5_MARGINS and count PAR lines? simpler:
  // flip indices 0..MAXK; once flips pass the walk length the walk is unflipped (true) -> NEXT.
  const MAXK = 700;
  for (let k = 0; k < MAXK; k++) {
    const r = runOne(A, tau, h, { SYM5_FLIPSET: String(k) });
    totSingle++;
    if (r.ok) okSingle++;
    else { if (reds.length < 40) reds.push(`h=${h} flip k=${k}: ${r.kind} (paths ${r.paths})`); }
  }
  console.log(`  h=${h}: single-flips so far ${okSingle}/${totSingle}`);
  // sparse random flip sets: 20 seeds x ~5% density
  let okS = 0, totS = 0;
  for (let sdn = 1; sdn <= 20; sdn++) {
    const set = [];
    for (let k = 0; k < MAXK; k++) if (((sdn * 2654435761 + k * 40503) >>> 0) % 20 === 0) set.push(k);
    if (!set.length) continue;
    const r = runOne(A, tau, h, { SYM5_FLIPSET: set.join(',') });
    totS++;
    if (r.ok) okS++; else reds.push(`h=${h} sparse seed=${sdn}: ${r.kind}`);
  }
  console.log(`  h=${h}: sparse-flips ${okS}/${totS}`);
  // baseline adversarial patterns (honest frontier)
  for (const prof of ['all0', 'all1', 'alt', 'alt1']) {
    const r = runOne(A, tau, h, { SYM5_FORCEPAR: prof });
    console.log(`  h=${h} baseline ${prof}: ok=${r.ok} (${r.kind})`);
  }
}
console.log(`SINGLE-FLIP TOTAL: ${okSingle}/${totSingle}`);
reds.slice(0, 40).forEach(x => console.log('  RED ' + x));
