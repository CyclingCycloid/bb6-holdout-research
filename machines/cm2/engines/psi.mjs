// psi.mjs — fit and verify the terminal -> next-sweep-start map PSI on ALL sweep transitions;
// then characterize which terminals produce poison starts.
import { FastTape } from './macro3.mjs';
import { parseRle, macroStepGuarded } from '../reverify-cm2/ref-lib.mjs';
const CAP = 2e8;
const t = new FastTape();
const seq = [];
while (t.step < CAP) {
  const r = macroStepGuarded(t);
  if (String(r.kind).startsWith('HALT')) { console.log('HALT', r.kind, t.step); break; }
  if (r.kind === 'Dance' || r.kind === 'DanceFill' || r.kind === 'DBL' || r.kind === 'L1') {
    const rl = t.rle(); const rs = parseRle(rl.s);
    let q = rl.lo, hi = -1, off = 0;
    for (let i = 0; i < rs.length; i++) { if (t.head >= q && t.head < q + rs[i].len) { hi = i; off = t.head - q; break; } q += rs[i].len; }
    if (rs.length === 5 && rs[0].v === 1 && rs[1].v === 0 && rs[1].len === 1 && rs[2].v === 1 && rs[3].v === 0 && rs[3].len === 5 && rs[4].v === 1 && hi === 3 && off === 1)
      seq.push({ t: t.step, kind: 'A', L: rs[0].len, M: rs[2].len, R: rs[4].len });
    if (rs.length === 3 && rs[0].v === 1 && rs[1].v === 0 && rs[1].len === 1 && rs[2].v === 1 && hi === 2 && off === 0)
      seq.push({ t: t.step, kind: 'gE', L: rs[0].len, M: rs[2].len });
    if (rs.length === 1 && rs[0].v === 1 && (t.head === rs[0].len + 1 || t.head === rs[0].len + 2))
      seq.push({ t: t.step, kind: 'outR', L: rs[0].len, off: t.head - rs[0].len });
  }
}
// decompose into sweeps
const sweeps = [];
let cur = null;
for (const m of seq) {
  if (m.kind === 'A') {
    if (cur && cur.kind === 'sweep' && m.L === cur.lastL + 3 && m.M === cur.lastM - 4 && m.R === cur.lastR + 1) { cur.lastL = m.L; cur.lastM = m.M; cur.lastR = m.R; cur.len++; }
    else { cur = { kind: 'sweep', start: m, lastL: m.L, lastM: m.M, lastR: m.R, len: 1 }; sweeps.push(cur); }
  } else { cur = { kind: 'gap', state: m }; sweeps.push(cur); }
}
const sw = sweeps.filter(s => s.kind === 'sweep');
// transitions: terminal (lastL,lastM,lastR) -> next.start; also record the gap states between
const trans = [];
for (let i = 0; i + 1 < sw.length; i++) {
  // find gap entries between sweep i and i+1
  const iEnd = sweeps.indexOf(sw[i]), iStart = sweeps.indexOf(sw[i + 1]);
  const between = sweeps.slice(iEnd + 1, iStart).map(s => s.state);
  trans.push({ term: { L: sw[i].lastL, M: sw[i].lastM, R: sw[i].lastR, pop: sw[i].lastL + sw[i].lastM + sw[i].lastR }, next: sw[i + 1].start, between });
}
console.log('transitions:', trans.length);
// per terminal class: (L0', M0', R0') = ? as function of terminal
const byClass = new Map();
for (const tr of trans) {
  const k = 'M' + tr.term.M;
  if (!byClass.has(k)) byClass.set(k, []);
  byClass.get(k).push(tr);
}
for (const [k, list] of byClass) {
  console.log('=== class', k, 'count', list.length);
  // try formulas: dL = L0' - term.L; dM = M0' - (pop - L0' - R0')... simpler: pop' - pop and L0', R0' vs term
  const fs = {};
  for (const tr of list) {
    const pop = tr.term.pop;
    const pop2 = tr.next.L + tr.next.M + tr.next.R;
    const key = `L0'=${tr.next.L === 3 ? '3' : tr.next.L === 6 ? '6' : tr.next.L === 9 ? '9' : 'X'}, R0'=${tr.next.R}, dPop=${pop2 - pop}`;
    (fs[key] = fs[key] || []).push(tr);
  }
  const ent = Object.entries(fs).sort((a, b) => b[1].length - a[1].length);
  for (const [kk, l] of ent) {
    // M0' - pop
    const m0s = l.map(tr => tr.next.M - tr.term.pop);
    console.log('  ', kk.padEnd(22), 'x' + String(l.length).padStart(3), 'M0\'−pop ∈', [...new Set(m0s)].slice(0, 6).join(','));
  }
}
// gap-state chains: what intermediate states appear between terminal and next start
const gapKinds = {};
for (const tr of trans) {
  const k = tr.between.map(b => b.kind + (b.kind === 'gE' ? '(M' + b.M + ')' : b.kind === 'outR' ? '(L' + b.L + ')' : '')).join('>');
  gapKinds[k] = (gapKinds[k] || 0) + 1;
}
console.log('--- intermediate chains (terminal -> ... -> next start) ---');
for (const [k, v] of Object.entries(gapKinds).sort((a, b) => b[1] - a[1])) console.log(String(v).padStart(4), k.slice(0, 80));
