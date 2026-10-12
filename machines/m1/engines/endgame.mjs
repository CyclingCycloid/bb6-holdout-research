// endgame.mjs — batch endgame verification: for each h-class and tail slack r < dt(h),
// the walk from L(alpha,t; slack r) ends at ANCHOR n' = 2^(t+r+1)w + c(u,c-coords),
// with n' = 3 mod 6 ON-DOMAIN (du,dc = 0 mod 6, d0 = 3 mod 6) and delta = n'-n >= 6
// (d0-part >= 3 with nonneg slopes), no HALT/DEGEN, no unresolved FAIL.
// Runs sym4 in CONCRETE-t mode at T0; if the derivation used the t+e=0 parity boundary
// (valid only at t=T0 exactly), retries at T0+1.. until boundary-free; then a second
// confirming run at T0+1 must give the identical outcome distribution (stability =>
// the derivation is t-uniform, valid for ALL t >= T0).
// Usage: node endgame.mjs HMAX [T0PAD]
import { execFileSync } from 'child_process';
import { readFileSync } from 'fs';

const HMAX = +(process.argv[2] || 64);
const PAD = +(process.argv[3] ?? 16);
const DA = [], DT = [];
for (const l of readFileSync('sym4-table.txt', 'utf8').split('\n')) {
  const m = l.match(/h=(\d+).*da=(\d+) dt=(\d+)/);
  if (m) { DA[+m[1]] = +m[2]; DT[+m[1]] = +m[3]; }
}
function run(h, r, t0) {
  const out = execFileSync('node', ['sym4.mjs', String(h), String(r), String(t0), 'concrete'], { encoding: 'utf8' });
  const dist = JSON.parse(/dist=(\{[^}]*\})/.exec(out)[1]);
  const bu = /BOUNDARY-USES=(\d+)/.exec(out);
  const anchors = [...new Set([...out.matchAll(/ANCHOR n'=(.+)/g)].map(m => m[1].trim()))];
  return { dist, bu: bu ? +bu[1] : 0, anchors };
}
// anchor form check with slopes: 1W+<r+1>+(d0[+du u][+dc c]) or 1W+<r+1>+<d0>
function checkAnchor(a, h, r) {
  const mm = a.match(/^1W\+(\d+)\+\(?(-?\d+)(?:\+(\d+)u)?(?:\+(\d+)c)?\)?$/);
  if (!mm) return `form ${a}`;
  const e = +mm[1], d0 = BigInt(mm[2]), du = BigInt(mm[3] ?? 0), dc = BigInt(mm[4] ?? 0);
  if (e !== r + 1) return `e=${e}!=${r + 1}`;
  if (du < 0n || dc < 0n) return `neg slope ${a}`;
  if (du % 6n !== 0n || dc % 6n !== 0n) return `slope not 0 mod 6: ${a}`;
  if (((d0 % 6n) + 6n) % 6n !== 3n) return `d0=${d0} not 3 mod 6`;
  if (d0 < 3n) return `d0=${d0} < 3 (growth)`;
  return null;
}
let tot = 0, okc = 0; const bads = [];
for (let h = 1; h <= HMAX; h++) {
  for (let r = 0; r < DT[h]; r++) {
    tot++;
    let t0 = h + PAD, res = null, stable = null;
    for (let tries = 0; tries < 12; tries++) {
      res = run(h, r, t0);
      if (res.bu === 0) break;
      t0++;
    }
    if (res.bu !== 0) { bads.push(`h=${h} r=${r}: boundary-uses persist at T0=${t0}`); continue; }
    stable = run(h, r, t0 + 1);
    if (JSON.stringify(stable.dist) !== JSON.stringify(res.dist)) { bads.push(`h=${h} r=${r}: unstable dist ${JSON.stringify(res.dist)} vs ${JSON.stringify(stable.dist)}`); continue; }
    const dist = { ...res.dist }; delete dist.ANCHOR;
    if (Object.keys(dist).length > 0) { bads.push(`h=${h} r=${r}: non-anchor outcomes ${JSON.stringify(dist)}`); continue; }
    if (res.anchors.length === 0) { bads.push(`h=${h} r=${r}: no anchors`); continue; }
    let bad = null;
    for (const a of res.anchors) { bad = checkAnchor(a, h, r); if (bad) break; }
    if (bad) { bads.push(`h=${h} r=${r}: ${bad}`); continue; }
    okc++;
  }
  if (h <= 8 || h % 8 === 0) console.log(`  h=${h} done (${okc}/${tot} ok so far)`);
}
console.log(`endgame batch h=1..${HMAX}: ${tot} (h,r) cells, ${okc} ok, ${bads.length} bad`);
bads.slice(0, 40).forEach(b => console.log('  ' + b));
if (bads.length) process.exit(1);
console.log('ALL ENDGAMES: ANCHOR + class(3 mod 6 on-domain) + growth(delta>=6) + t-stability OK');
