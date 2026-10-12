// hunt3.mjs — full lethal-db matching at every tail-less A-marker + approach-distance stats.
// DB: lethal-db.json (193 verified cells). Track min parameter distance to lethal domain.
import { FastTape } from './macro3.mjs';
import { parseRle, macroStepGuarded } from '../reverify-cm2/ref-lib.mjs';
import fs from 'fs';
const DB = JSON.parse(fs.readFileSync('lethal-db.json', 'utf8'));
const dbSet = new Set(DB.map(x => `${x.M},${x.L},${x.R}`));
// per (M, R): sorted lethal L list for distance computation
const byMR = new Map();
for (const x of DB) { const k = x.M + ',' + x.R; if (!byMR.has(k)) byMR.set(k, []); byMR.get(k).push(x.L); }
for (const v of byMR.values()) v.sort((a, b) => a - b);
const lineageR = new Set([1, 7, 31, 127]);
function taillessA(t) { const rl = t.rle(); const rs = parseRle(rl.s);
  if (rs.length !== 5) return null;
  let q = rl.lo, hi = -1, off = 0;
  for (let i = 0; i < rs.length; i++) { if (t.head >= q && t.head < q + rs[i].len) { hi = i; off = t.head - q; break; } q += rs[i].len; }
  if (rs[1].v === 0 && rs[1].len === 1 && rs[3].v === 0 && rs[3].len === 5 && hi === 3 && off === 1)
    return { L: rs[0].len, M: rs[2].len, R: rs[4].len };
  return null; }
const CAP = +process.argv[2] || 3e10;
const t = new FastTape();
let eras = 0, markers = 0, hits = 0;
let minDist = { d: Infinity, at: null };
const distHist = [];
let lastLog = 0; const t0 = Date.now();
while (t.step < CAP) {
  const r = macroStepGuarded(t);
  if (String(r.kind).startsWith('HALT')) { console.log('!!! ORBIT HALT', r.kind, t.step); break; }
  if (r.kind === 'Dance' || r.kind === 'DanceFill' || r.kind === 'DBL' || r.kind === 'L1') {
    eras++;
    const a = taillessA(t);
    if (a) {
      markers++;
      const key = a.M + ',' + a.L + ',' + a.R;
      if (dbSet.has(key)) { hits++; console.log('LETHAL HIT t=' + t.step, key, 'era', eras); break; }
      // distance: for same (M, R): |L - nearest lethal L|; also lineage check for M=3
      const k = a.M + ',' + a.R;
      let d = Infinity, dim = null;
      if (byMR.has(k)) { const Ls = byMR.get(k); for (const Ll of Ls) { const dd = Math.abs(a.L - Ll); if (dd < d) { d = dd; dim = 'L'; } } }
      if (a.M === 3 && lineageR.has(a.R)) { if (0 < d) { d = 0; dim = 'R-lineage'; } }
      if (d < minDist.d) minDist = { d, dim, at: { t: t.step, M: a.M, L: a.L, R: a.R } };
      if (markers % 100000 === 0) distHist.push({ markers, minD: minDist.d, at: minDim() });
    }
  }
  if (t.step - lastLog > 5e9) { lastLog = t.step; console.error('t=' + t.step, 'eras=' + eras, 'markers=' + markers, ((Date.now() - t0) / 1000).toFixed(0) + 's'); }
}
function minDim() { return minDist.at ? `M${minDist.at.M},L${minDist.at.L},R${minDist.at.R}` : '-'; }
console.log('hunt3 done: t=' + t.step, 'eras=' + eras, 'markers=' + markers, 'hits=' + hits, ((Date.now() - t0) / 1000).toFixed(0) + 's');
console.log('min distance to lethal domain:', minDist.d, 'via', minDist.dim, 'at', JSON.stringify(minDist.at));
console.log('distance history:', distHist.map(h => `${h.markers}:${h.minD}`).join(' '));
