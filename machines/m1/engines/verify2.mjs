// verify2.mjs — cross-validate sym3 symbolic derivations against the numeric engine.
// For each m in range, for each u in 0..UMAX (w = 6u+3):
//   1. numeric: walk stepFast from Phi(w,m), collect G-state run vectors + landing;
//   2. symbolic: find the owning path in sym2-m<m>.json, evaluate its gstates at u;
//   3. require EXACT agreement: same G-state count, same run vectors, same landing n';
//      landing also cross-checked against transitionFast(n) with n = 2^m*w - 3.
// Also checks: no halt, no degenerate anywhere.
// Usage: node verify2.mjs MLO MHI [UMAX=120]
import { stepFast, transitionFast } from './phase1.mjs';
import { stepFastB, transitionFastB } from './bstep.mjs';
import { readFileSync, writeFileSync } from 'fs';

const MLO = +(process.argv[2] || 1), MHI = +(process.argv[3] || 80), UMAX = +(process.argv[4] ?? 120);

function parseForm(s) {
  const m = s.match(/^\((\d+)\+(\d+)u\)$/); if (m) return [BigInt(m[1]), BigInt(m[2])];
  return [BigInt(s), 0n];
}
function evalForm(pr, u) { return (pr[0] + pr[1] * BigInt(u)).toString(); }
function ownsU(path, u) {
  // subs: numbers are parity bits applied in order (u = 2u'+p, lowest bit first);
  // {u:k} pins absolute u. lo is a bound in the FINAL (most-substituted) variable.
  let cur = BigInt(u), ok = true;
  for (const s of path.subs) {
    if (typeof s === 'object') { if (BigInt(s.u) !== cur) return false; cur = 0n; /* pinned; lo applies to dummy */ }
    else { if ((cur % 2n) !== BigInt(s)) { ok = false; break; } cur = cur / 2n; }
  }
  if (!ok) return false;
  return cur >= BigInt(path.lo);
}

let totPaths = 0, totChecks = 0, totOk = 0; const fails = [];
const report = [];
for (let m = MLO; m <= MHI; m++) {
  const paths = JSON.parse(readFileSync(`sym2-m${m}.json`, 'utf8'));
  totPaths += paths.length;
  // sanity: every path outcome is ANCHOR with affine or const n'
  for (const p of paths) {
    if (!/^ANCHOR n'=\((\d+)\+(\d+)u\)$/.test(p.outcome) && !/^ANCHOR n'=(\d+)$/.test(p.outcome)) {
      fails.push(`m=${m} path outcome not anchor-affine: ${p.outcome}`);
    }
  }
  let mOk = 0, mCnt = 0;
  for (let u = 0; u <= UMAX; u++) {
    const w = 6 * u + 3;
    const runs = [BigInt(w - 1), BigInt(w - 1)];
    for (let i = 1; i <= m - 1; i++) runs.push(2n ** BigInt(i) * BigInt(w));
    runs.push(2n ** BigInt(m) * BigInt(w) - 1n);
    // numeric walk
    let c = { t: 'G', r: runs.map(BigInt) }; const numG = []; let landing = null, bad = null;
    for (let it = 0; it < 100000; it++) {
      if (c.t === 'G') numG.push(c.r.join(','));
      const st = stepFastB(c);
      if (st.degenerate) { bad = 'DEG:' + st.degenerate; break; }
      if (st.halt) { bad = 'HALT'; break; }
      c = st.c;
      if (c.t === 'R' && c.r[0] === c.r[1] && c.r[0] >= 2n) { landing = c.r[0].toString(); break; }
    }
    if (bad) { fails.push(`m=${m} u=${u} numeric ${bad}`); continue; }
    if (landing === null) { fails.push(`m=${m} u=${u} numeric no-landing`); continue; }
    // owning symbolic path
    const owners = paths.filter(p => ownsU(p, u));
    if (owners.length !== 1) { fails.push(`m=${m} u=${u} owners=${owners.length}`); continue; }
    const p = owners[0];
    // evaluate gstates
    let predG = p.gstates.map(g => g.split(',').map(s => evalForm(parseForm(s), u)).join(','));
    predG = predG.filter((v, i) => i === 0 || v !== predG[i - 1]); // drop consecutive dups (parent affine record + substituted copy)
    if (numG.some((v, i) => i > 0 && v === numG[i - 1])) { fails.push(`m=${m} u=${u} numeric has consecutive dup G-states`); continue; }
    if (predG.length !== numG.length) { fails.push(`m=${m} u=${u} gcount ${predG.length}!=${numG.length}`); continue; }
    let gOk = true;
    for (let i = 0; i < numG.length; i++) if (predG[i] !== numG[i]) { gOk = false; fails.push(`m=${m} u=${u} gstate${i}: sym=${predG[i].slice(0, 60)} num=${numG[i].slice(0, 60)}`); break; }
    if (!gOk) continue;
    // landing
    const mm = p.outcome.match(/^ANCHOR n'=\((\d+)\+(\d+)u\)$/);
    const mc = p.outcome.match(/^ANCHOR n'=(\d+)$/);
    const predLand = mm ? (BigInt(mm[1]) + BigInt(mm[2]) * BigInt(u)).toString() : mc[1];
    if (predLand !== landing) { fails.push(`m=${m} u=${u} landing sym=${predLand} num=${landing}`); continue; }
    // full-anchor check vs engine transition
    const n = 2 ** m * w - 3; // may exceed 2^53 for m large; only used as BigInt below
    const nB = 2n ** BigInt(m) * BigInt(w) - 3n;
    const full = (n < 2**46) ? transitionFast(n) : transitionFastB(nB);
    const f2 = full.n2 !== undefined ? full.n2.toString() : undefined;
    if (full.halt || full.degenerate || f2 !== landing) { fails.push(`m=${m} u=${u} full-transition mismatch: ${String(full.n2 ?? full.halt ?? full.degenerate)} vs ${landing}`); continue; }
    mOk++; mCnt++;
  }
  totChecks += mCnt; totOk += mOk;
  report.push(`m=${m}: ${mOk}/${mCnt} instantiations verified (u=0..${UMAX})`);
  if (fails.length > 40) break;
}
console.log(report.join('\n'));
console.log(`TOTAL: ${totOk}/${totChecks} (u,instantiation) checks ok, paths=${totPaths}`);
if (fails.length) { console.log('FAILS (' + fails.length + '):'); fails.slice(0, 40).forEach(f => console.log('  ' + f)); writeFileSync('verify2-fails.txt', fails.join('\n')); process.exit(1); }
else console.log('ALL OK');
