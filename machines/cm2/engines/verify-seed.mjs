// verify-seed.mjs — is the tail-less A-marker 1^9 0^1 1^15 0^5 1^3 (head at M.left) on the
// REAL orbit? Scan the orbit markers for it; if found at time t, run the BARE machine
// forward from t and check for a halt within the next ~50 eras.
import { FastTape } from './macro3.mjs';
import { build, parseRle, macroStepGuarded } from '../reverify-cm2/ref-lib.mjs';
const target = { runs: [{v:1,len:9},{v:0,len:1},{v:1,len:15},{v:0,len:5},{v:1,len:3}] };
function sameRuns(a, b) { if (a.length !== b.length) return false; for (let i = 0; i < a.length; i++) if (a[i].v !== b[i].v || a[i].len !== b[i].len) return false; return true; }
const t = new FastTape();
let eras = 0, found = null;
while (t.step < 2e8) {
  const r = macroStepGuarded(t);
  if (String(r.kind).startsWith('HALT')) { console.log('orbit HALT?!', r.kind, t.step); break; }
  if (r.kind === 'Dance' || r.kind === 'DanceFill' || r.kind === 'DBL' || r.kind === 'L1') {
    eras++;
    const rl = t.rle(); const rs = parseRle(rl.s);
    // tail-less A-marker: exactly 5 runs matching target, head at run 2 offset 0
    if (sameRuns(rs, target.runs)) {
      let q = rl.lo, hi = -1, off = 0;
      for (let i = 0; i < rs.length; i++) { if (t.head >= q && t.head < q + rs[i].len) { hi = i; off = t.head - q; break; } q += rs[i].len; }
      if (hi === 2 && off === 0) { found = { t: t.step, head: t.head, eras }; console.log('FOUND at t=' + t.step, 'eras=' + eras, 'h=' + t.head, rl.s); break; }
    }
  }
}
if (!found) console.log('target marker NOT on orbit up to 2e8 steps /', eras, 'eras');
else {
  // bare-machine forward from the found state: use the guarded engine (verified = bare)
  const runs = found ? target.runs.map(x=>({...x})) : [];
  const tt = build(runs, found.head);
  for (let e = 0; e < 60; e++) {
    const r = era1(tt);
    if (r.halt) { console.log('era', e+1, 'HALT', r.halt, '|| step', tt.step); break; }
    if (r.nonterm) { console.log('era', e+1, r.nonterm); break; }
    const tags = tailG11(tt);
    console.log('era', e+1, '->', tags.length ? 'POISON ' + tags.join(';') : 'clean', '|', tt.rle().s.slice(0, 85));
    if (e > 40 && tags.length === 0) { /* keep watching */ }
  }
}
function era1(t) {
  for (let i = 0; i < 400000; i++) {
    const r = macroStepGuarded(t);
    if (String(r.kind).startsWith('HALT')) return { halt: r.kind };
    if (String(r.kind).startsWith('NONTERM')) return { nonterm: r.kind };
    if (r.kind === 'Dance' || r.kind === 'DanceFill' || r.kind === 'DBL' || r.kind === 'L1') return { done: true };
  }
  return { nonterm: 'MAXMACRO' };
}
function tailG11(t) {
  const rl = t.rle(); const rs = parseRle(rl.s);
  let q = rl.lo, hi = -1;
  for (let i = 0; i < rs.length; i++) { if (t.head >= q && t.head < q + rs[i].len) { hi = i; break; } q += rs[i].len; }
  const tags = [];
  for (let i = Math.max(hi + 1, 0); i + 1 < rs.length; i++) if (rs[i].v === 0 && rs[i].len === 1 && rs[i+1].v === 1 && rs[i+1].len === 1) { tags.push('(g1,1)@r' + i); break; }
  return tags;
}
