// walkcensus.mjs — (1) full census of tail-less A-markers on the real orbit (joint (L, M) dist);
// (2) walk analysis: when does a tail-less A-marker appear, what is the walk segment structure.
import { FastTape } from './macro3.mjs';
import { parseRle, macroStepGuarded } from '../reverify-cm2/ref-lib.mjs';
const CAP = 2e8;
const t = new FastTape();
const markers = []; // all tail-less 3-run or 5-run (A-form) markers
let eras = 0;
while (t.step < CAP) {
  const r = macroStepGuarded(t);
  if (String(r.kind).startsWith('HALT')) { console.log('HALT', r.kind, t.step); break; }
  if (r.kind === 'Dance' || r.kind === 'DanceFill' || r.kind === 'DBL' || r.kind === 'L1') {
    eras++;
    const rl = t.rle(); const rs = parseRle(rl.s);
    // head run
    let q = rl.lo, hi = -1, off = 0;
    for (let i = 0; i < rs.length; i++) { if (t.head >= q && t.head < q + rs[i].len) { hi = i; off = t.head - q; break; } q += rs[i].len; }
    // A-form tail-less: [1^L,0^1,1^M,0^5,1^R] head at run3 off1
    if (rs.length === 5 && rs[0].v === 1 && rs[1].v === 0 && rs[1].len === 1 && rs[2].v === 1 && rs[3].v === 0 && rs[3].len === 5 && rs[4].v === 1 && hi === 3 && off === 1)
      markers.push({ t: t.step, kind: 'A', L: rs[0].len, M: rs[2].len, R: rs[4].len });
    // gE-form: [1^L,0^1,1^M] head at run2 off0
    if (rs.length === 3 && rs[0].v === 1 && rs[1].v === 0 && rs[1].len === 1 && rs[2].v === 1 && hi === 2 && off === 0)
      markers.push({ t: t.step, kind: 'gE', L: rs[0].len, M: rs[2].len });
    // outR-form: [1^L] head at L+1 or L+2 (walk state)
    if (rs.length === 1 && rs[0].v === 1 && (t.head === rs[0].len + 1 || t.head === rs[0].len + 2))
      markers.push({ t: t.step, kind: 'outR', L: rs[0].len, off: t.head - rs[0].len });
  }
}
console.log('eras:', eras, '| tail-less walk markers:', markers.length);
// joint distribution
const joint = new Map();
for (const m of markers) { const k = m.kind + '(' + (m.kind==='A' ? `L${m.L},M${m.M},R${m.R}` : m.kind==='gE' ? `L${m.L},M${m.M}` : `L${m.L}`) + ')'; joint.set(k, (joint.get(k) || 0) + 1); }
const ent = [...joint.entries()].sort((a, b) => b[1] - a[1]);
console.log('distinct walk states:', ent.length);
for (const [k, v] of ent) console.log(String(v).padStart(5), k);
