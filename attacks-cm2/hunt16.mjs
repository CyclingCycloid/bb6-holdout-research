// hunt16.mjs — find the M3-terminal with R=16 on the real orbit; trace the actual
// next states era-by-era; check against the poison prediction.
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
  }
}
// find M3 R=16 terminal
for (let i = 0; i < seq.length; i++) {
  const m = seq[i];
  if (m.kind === 'A' && m.M === 3 && m.R === 16) {
    console.log('M3 R=16 terminal at t=' + m.t, `(L${m.L},M3,R16) pop=${m.L + 19}`);
    // the next few A-markers
    for (let j = i; j < Math.min(i + 8, seq.length); j++)
      console.log('   marker t=' + seq[j].t, `(L${seq[j].L},M${seq[j].M},R${seq[j].R})`);
    break;
  }
}
// ALSO: replay from that state concretely with full RLE trace
const t2 = new FastTape();
while (t2.step < (seq.find(m => m.kind === 'A' && m.M === 3 && m.R === 16)?.t ?? 0)) macroStepGuarded(t2);
console.log('--- full trace from the terminal state ---');
for (let e = 0; e < 8; e++) {
  const r = macroStepGuarded(t2);
  console.log('era', e + 1, r.kind, '|', t2.rle().s.slice(0, 90), 'h=' + t2.head);
  if (String(r.kind).startsWith('HALT') || String(r.kind).startsWith('NONTERM')) break;
}
