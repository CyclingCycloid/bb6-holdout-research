// margins.mjs — uniformity + finite-state-control analysis of the master derivation.
// Runs sym5 with SYM5_MARGINS=1 at a representative h list; classifies every branch decision
// into TYPES (site, g-part, canonical exponent, threshold, parity pattern, margin sign, dominance);
// then tests the FSA hypothesis: the canonicalized decision sequence is a function of
// (ladder window signature = last N positions' (H_j, A_j mod 2^K), budget b = h-1-tau_j0).
// Usage: node margins.mjs [h1 h2 ...]   (default representative list)
import { readFileSync, readdirSync, rmSync } from 'fs';
import { execFileSync } from 'child_process';

const hs = process.argv.slice(2).map(Number).filter(x => x > 0);
const HLIST = hs.length ? hs : [16, 17, 20, 24, 31, 40, 55, 64, 100, 128, 200, 257, 400, 512, 800, 1000, 1024, 1200, 1537, 1538, 1539, 1700, 2000, 3000, 5000, 12345, 100000, 500000, 999983, 1200000, 5000000, 12000000];
const ladder = JSON.parse(readFileSync('ladder.json', 'utf8')).ladder;
function j0of(h) {
  const marg = 64n < BigInt(h - 10) ? 64n : BigInt(h - 10);
  const lim = BigInt(h) - 1n - marg;
  let lo = 0, hi = ladder.length - 1, best = -1;
  while (lo <= hi) { const mid = (lo + hi) >> 1; if (BigInt(ladder[mid].tau) <= lim) { best = mid; lo = mid + 1; } else hi = mid - 1; }
  return best;
}
// run masters with margins
const runs = [];
rmSync('margins-tmp', { recursive: true, force: true });
for (const h of HLIST) {
  const j = j0of(h);
  if (j < 0) { console.log(`h=${h}: no ladder`); continue; }
  const { A, tau } = ladder[j];
  try {
    const out = execFileSync('node', ['sym5.mjs', A, tau, String(h), '40'], {
      encoding: 'utf8', timeout: 300000, maxBuffer: 1e9, env: { ...process.env, SYM5_MARGINS: '1' }
    });
    const oc = out.match(/NEXT da=(\d+) dt=(\d+)/) || out.match(/ANCHOR/);
    const mf = `margins-${A}-${tau}-${h}.txt`;
    let lines = [];
    try { lines = readFileSync(mf, 'utf8').split('\n').filter(x => x.includes('|')); } catch { }
    runs.push({ h, j0: j, A: BigInt(A), tau: BigInt(tau), outcome: oc ? (oc[0].startsWith('NEXT') ? `(${oc[1]},${oc[2]})` : 'ANCHOR') : '?', lines });
  } catch (e) { console.log(`h=${h}: crash`); }
}
// classify: canonical key. e is relative to t; Psi-scale parts have e <= -4: canonical
// exponent = e + h (= ladder-run index - 3, in [tau-3, h-4]); E-scale parts e >= -3: keep e.
const types = new Map(); // key -> {count, firstH, sites, sample}
for (const r of runs) {
  r.canon = r.lines.map(l => {
    const f = l.split('|');
    const site = f[0], g = BigInt(f[1]), e = BigInt(f[2]);
    const tag = e <= -4n ? `P${e + BigInt(r.h)}` : `E${e}`;
    const key = `${site}|g${g}|${tag}|thr${f[8]}|p${f[5]}${f[6]}${f[7]}|M${f[9]}|${f[13]}`;
    if (!types.has(key)) types.set(key, { count: 0, firstH: r.h, sample: l });
    types.get(key).count++;
    return key;
  });
}
console.log(`runs: ${runs.length}; distinct decision types: ${types.size}`);
// stability: types first seen at large h = new types appearing with growth
const byFirst = {};
for (const [k, v] of types) { byFirst[v.firstH] = (byFirst[v.firstH] || 0) + 1; }
console.log('new types by first-seen h: ' + JSON.stringify(byFirst));
// sign conflicts within (site, g, tag, thr) ignoring parity/sgin? check DOM/NOTDOM and Msings
const siteTag = new Map();
for (const [k, v] of types) {
  const base = k.split('|p')[0];
  if (!siteTag.has(base)) siteTag.set(base, new Set());
  siteTag.get(base).add(k.split('|p')[1]);
}
let conflicts = 0;
for (const [base, ss] of siteTag) if (ss.size > 1) { conflicts++; console.log(`  VARIANT BASE ${base}: ${[...ss].join(' ; ')}`); }
console.log(`base (site|g|exp|thr) groups: ${siteTag.size}; with >1 parity/sign variant: ${conflicts}`);
// FSA test: window signature -> identical canonical decision sequence?
// window = last 40 ladder positions from j0: (H_j, A_j mod 2^16) + budget b = h-1-tau_j0
const groups = new Map();
for (const r of runs) {
  const win = [];
  for (let i = r.j0; i < Math.min(r.j0 + 40, ladder.length); i++) win.push(ladder[i].H + ':' + (BigInt(ladder[i].A) & 0xffffn).toString());
  const sig = win.join(',') + '|b' + (r.h - 1 - Number(r.tau));
  if (!groups.has(sig)) groups.set(sig, []);
  groups.get(sig).push(r);
}
let fsaOk = 0, fsaBad = 0;
for (const [sig, rs] of groups) if (rs.length > 1) {
  const seq0 = rs[0].canon.join(';');
  for (const r of rs.slice(1)) {
    if (r.canon.join(';') === seq0) fsaOk++; else { fsaBad++; console.log(`  FSA MISMATCH sig ending b${sig.split('|b')[1]}: h=${rs[0].h} vs h=${r.h} (len ${rs[0].canon.length} vs ${r.canon.length})`); }
  }
}
console.log(`FSA test (same window+budget => same decision sequence): pairs=${fsaOk + fsaBad} ok=${fsaOk} bad=${fsaBad}`);
// outcome table
for (const r of runs) console.log(`h=${r.h} j0=${r.j0} A=${r.A} tau=${r.tau} b=${r.h - 1 - Number(r.tau)} -> ${r.outcome} [${r.canon.length} decisions]`);
// cleanup margin files
for (const f of readdirSync('.').filter(x => x.startsWith('margins-'))) rmSync(f);
