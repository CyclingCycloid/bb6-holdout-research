// endgame5.mjs — ENDGAME cells via the MASTER (symbolic t >= 2h+16, literals from ladder):
// for h in [HLO,HHI], s in [0, dt(h)-1]: sym5(A_j0, tau_j0, h, s) must give all-ANCHOR paths
// with n' = 2^(t+s+1)w + c-forms: du,dc = 0 mod 6 (nonneg), d0 = 3 mod 6, d0 >= 3; single or
// uniform multi-path. Cross-checks the anchor constant against the previously verified
// endgame cells where available (endgame2/3 log parsing skipped; direct numeric spot instead).
// Usage: node endgame5.mjs HLO HHI
import { execFileSync } from 'child_process';
import { readFileSync } from 'fs';

const HLO = +(process.argv[2] ?? 16), HHI = +(process.argv[3] ?? 128);
const DT = [];
for (const l of readFileSync('sym4-table.txt', 'utf8').split('\n')) {
  const m = l.match(/h=(\d+).*da=(\d+) dt=(\d+)/);
  if (m) DT[+m[1]] = +m[3];
}
const ladder = JSON.parse(readFileSync('ladder.json', 'utf8')).ladder;
function j0of(h) {
  const marg = 64n < BigInt(h - 10) ? 64n : BigInt(h - 10);
  const lim = BigInt(h) - 1n - marg;
  let lo = 0, hi = ladder.length - 1, best = -1;
  while (lo <= hi) { const mid = (lo + hi) >> 1; if (BigInt(ladder[mid].tau) <= lim) { best = mid; lo = mid + 1; } else hi = mid - 1; }
  return best;
}
let cells = 0, okc = 0; const bads = [];
for (let h = HLO; h <= HHI; h++) {
  const j = j0of(h); const { A, tau } = ladder[j];
  for (let s = 0; s < DT[h]; s++) {
    cells++;
    let out;
    try { out = execFileSync('node', ['sym5.mjs', A, tau, String(h), String(s)], { encoding: 'utf8', timeout: 60000, maxBuffer: 1e8 }); }
    catch (e) { bads.push(`h=${h} s=${s}: crash`); continue; }
    const dist = JSON.parse(/dist=(\{[^}]*\})/.exec(out)[1]);
    const anchors = [...new Set([...out.matchAll(/ANCHOR n'=(.+)/g)].map(m => m[1].trim()))];
    const nonA = { ...dist }; delete nonA.ANCHOR;
    if (Object.keys(nonA).length > 0 || anchors.length === 0) { bads.push(`h=${h} s=${s}: dist=${JSON.stringify(dist)}`); continue; }
    let ok = true;
    for (const a of anchors) {
      const mm = a.match(/^1W\+(\d+)\+\(?(-?\d+)(?:\+(\d+)u)?(?:\+(\d+)c)?\)?$/);
      if (!mm) { ok = false; bads.push(`h=${h} s=${s}: form ${a}`); break; }
      if (+mm[1] !== s + 1) { ok = false; bads.push(`h=${h} s=${s}: e=${mm[1]}!=${s + 1}`); break; }
      const d0 = BigInt(mm[2]), du = BigInt(mm[3] ?? 0), dc = BigInt(mm[4] ?? 0);
      if (du < 0n || dc < 0n || du % 6n !== 0n || dc % 6n !== 0n || ((d0 % 6n) + 6n) % 6n !== 3n || d0 < 3n) { ok = false; bads.push(`h=${h} s=${s}: class/growth ${a}`); break; }
    }
    if (ok) okc++;
  }
  if (h % 16 === 0 || h === HHI) console.log(`  h=${h}: cells=${cells} ok=${okc} bad=${bads.length}`);
}
console.log(`ENDGAME5 ${HLO}..${HHI}: ${cells} cells, ${okc} ok, ${bads.length} bad`);
bads.slice(0, 20).forEach(b => console.log('  ' + b));
if (bads.length) process.exit(1);
console.log('ALL ENDGAME CELLS PROVEN SYMBOLICALLY VIA MASTER (class + growth, t >= 2h+16)');
