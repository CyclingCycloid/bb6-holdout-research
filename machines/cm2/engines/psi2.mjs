// psi2.mjs — verify PSI formulas on ALL transitions; analyze M3-terminal R distribution
// and the poison-production condition (M3 with R in {7,9,10,16}).
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
      seq.push({ t: t.step, kind: 'A', L: rs[0].len, M: rs[2].len, R: rs[4].len });
    if (rs.length === 3 && rs[0].v === 1 && rs[1].v === 0 && rs[1].len === 1 && rs[2].v === 1 && hi === 2 && off === 0)
      seq.push({ t: t.step, kind: 'gE', L: rs[0].len, M: rs[2].len });
    if (rs.length === 1 && rs[0].v === 1 && (t.head === rs[0].len + 1 || t.head === rs[0].len + 2))
      seq.push({ t: t.step, kind: 'outR', L: rs[0].len, off: t.head - rs[0].len });
  }
}
const sweeps = [];
let cur = null;
for (const m of seq) {
  if (m.kind === 'A') {
    if (cur && cur.kind === 'sweep' && m.L === cur.lastL + 3 && m.M === cur.lastM - 4 && m.R === cur.lastR + 1) { cur.lastL = m.L; cur.lastM = m.M; cur.lastR = m.R; cur.len++; }
    else { cur = { kind: 'sweep', start: m, lastL: m.L, lastM: m.M, lastR: m.R, len: 1 }; sweeps.push(cur); }
  } else { cur = { kind: 'gap', state: m }; sweeps.push(cur); }
}
const sw = sweeps.filter(s => s.kind === 'sweep');
console.log('markers:', seq.length, 'sweeps:', sw.length);
// verify formulas
let m4ok = 0, m4bad = 0, m3ok = 0, m3bad = 0, m3badList = [], m2Rok = 0, m2Rbad = 0;
const m3R = [], m2term = [], m1term = [];
for (let i = 0; i + 1 < sw.length; i++) {
  const T = sw[i], N = sw[i + 1].start;
  const pop = T.lastL + T.lastM + T.lastR;
  if (T.lastM === 4) {
    if (N.L === 3 && N.R === 1 && N.M === pop - 1) m4ok++; else { m4bad++; if (m4bad < 4) console.log('M4 MISS:', `term(L${T.lastL},M4,R${T.lastR}) pop=${pop} -> (L${N.L},M${N.M},R${N.R})`); }
  }
  if (T.lastM === 3) {
    m3R.push(T.lastR);
    if (N.L === T.lastL + 8 && N.R === 1 && N.M === T.lastR - 4) m3ok++; else { m3bad++; m3badList.push(`term(L${T.lastL},M3,R${T.lastR}) -> (L${N.L},M${N.M},R${N.R})`); }
  }
  if (T.lastM === 2) { m2term.push(T); if (N.R === T.lastR + 2) m2Rok++; else m2Rbad++; }
  if (T.lastM === 1) m1term.push(T);
}
console.log(`M4: ${m4ok} ok, ${m4bad} bad (formula (3,pop-1,1))`);
console.log(`M3: ${m3ok} ok, ${m3bad} bad (formula (L+8,R-4,1))`);
m3badList.slice(0, 5).forEach(x => console.log('   M3 MISS:', x));
console.log(`M2: R0'=R+2 holds ${m2Rok}/${m2Rok + m2Rbad}`);
// M3-terminal R distribution + poison production check
const poisonR = new Set([7, 9, 10, 16]);
const m3poison = m3R.filter(r => poisonR.has(r));
console.log('M3-terminal R values (sorted unique):', [...new Set(m3R)].sort((a, b) => a - b).slice(0, 40).join(','));
console.log('M3-terminals with poison R {7,9,10,16}:', m3poison.length);
// R mod 4 histogram of M3-terminals
const h = {};
for (const r of m3R) h['R%4=' + (r % 4)] = (h['R%4=' + (r % 4)] || 0) + 1;
console.log('M3-terminal R mod 4 histogram:', JSON.stringify(h));
// also check: does ANY sweep start have M0 in {1..12} and what R0
const small = [];
for (const s of sw) if (s.start.M <= 12) small.push(`(L${s.start.L},M${s.start.M},R${s.start.R})`);
console.log('sweep starts with M0<=12:', small.length, small.slice(0, 20).join(' '));
