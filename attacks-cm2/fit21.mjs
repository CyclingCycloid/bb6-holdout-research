// fit21.mjs — fit M2/M1-restart (L0', M0') as functions of terminal (L, M, R);
// sub-classify by small moduli; verify on ALL transitions.
import { FastTape } from './macro3.mjs';
import { parseRle, macroStepGuarded } from '../reverify-cm2/ref-lib.mjs';
const CAP = 1e9;
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
      seq.push({ kind: 'A', L: rs[0].len, M: rs[2].len, R: rs[4].len });
  }
}
const sweeps = []; let cur = null;
for (const m of seq) {
  if (cur && m.L === cur.lastL + 3 && m.M === cur.lastM - 4 && m.R === cur.lastR + 1) { cur.lastL = m.L; cur.lastM = m.M; cur.lastR = m.R; cur.len++; }
  else { cur = { start: m, lastL: m.L, lastM: m.M, lastR: m.R, len: 1 }; sweeps.push(cur); }
}
const trans = [];
for (let i = 0; i + 1 < sweeps.length; i++) trans.push({ T: sweeps[i], N: sweeps[i + 1].start });
// M2 transitions
const m2 = trans.filter(x => x.T.lastM === 2);
console.log('M2 transitions:', m2.length);
// try L0' as function: check L0' vs terminal L and R
const l0class = {};
for (const x of m2) {
  const k = `L0'=${x.N.L}`; (l0class[k] = l0class[k] || []).push(x);
}
console.log('L0\' values:', Object.keys(l0class).join(' '));
// check: L0' related to L? print (L, R, L0', M0') samples
for (const x of m2.slice(0, 25)) console.log(`  term(L${x.T.lastL},M2,R${x.T.lastR}) -> (L0'=${x.N.L}, M0'=${x.N.M}, R0'=${x.N.R})  [L0'−L=${x.N.L - x.T.lastL}, M0'−L=${x.N.M - x.T.lastL}]`);
// M1 transitions
const m1 = trans.filter(x => x.T.lastM === 1);
console.log('M1 transitions:', m1.length);
for (const x of m1.slice(0, 25)) console.log(`  term(L${x.T.lastL},M1,R${x.T.lastR}) -> (L0'=${x.N.L}, M0'=${x.N.M}, R0'=${x.N.R})  [L0'−L=${x.N.L - x.T.lastL}, M0'−L=${x.N.M - x.T.lastL}]`);
