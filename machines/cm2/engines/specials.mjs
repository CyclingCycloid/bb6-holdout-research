// specials.mjs — extract ALL non-clean era transitions with full configs; test tail-preservation
import { FastTape, macroStepFast } from './macro3.mjs';
const CAP = +process.argv[2] || 5e8;
const t = new FastTape();
const trans = []; // {t, from, to, kind}
let prev = null;
while (t.step < CAP) {
  const r = macroStepFast(t);
  if (String(r.kind).startsWith('HALT')) { console.log('HALT', r.kind, t.step); break; }
  if (r.kind === 'Dance' || r.kind === 'DanceFill' || r.kind === 'DBL' || r.kind === 'L1') {
    const rl = t.rle();
    if (prev) trans.push({ t: t.step, kind: r.kind, from: prev, to: rl.s });
    prev = rl.s;
  }
}
const parse = s => s ? s.split(' ').map(x => { const [v, l] = x.split('^'); return { v: +v, len: +l }; }) : [];
// clean-map test: from = 1^a 0^1 1^b 0^5 1^c T, b>=5, to = a+3,b-4,c+1,T
const special = [];
for (const tr of trans) {
  const A = parse(tr.from), B = parse(tr.to);
  let clean = false;
  if (A.length >= 5 && A[1].v === 0 && A[1].len === 1 && A[3].v === 0 && A[3].len === 5) {
    const a = A[0].len, b = A[2].len, c = A[4].len;
    if (b >= 5 && B.length === A.length && B[0].len === a + 3 && B[2].len === b - 4 && B[4].len === c + 1 && B[1].len === 1 && B[3].len === 5) {
      clean = true;
      for (let j = 5; j < A.length; j++) if (!B[j] || B[j].v !== A[j].v || B[j].len !== A[j].len) { clean = false; break; }
    }
  }
  if (!clean) special.push(tr);
}
console.log('eras:', trans.length, 'special:', special.length);
// classify special by (b, first-tail-gap) signature
const sig = {};
for (const tr of special) {
  const A = parse(tr.from), B = parse(tr.to);
  const Ashape = A.map(x => x.v ? 'B' : 'g' + x.len).join(',');
  const Bshape = B.map(x => x.v ? 'B' : 'g' + x.len).join(',');
  const key = Ashape + ' => ' + Bshape;
  (sig[key] = sig[key] || []).push(tr);
}
const ent = Object.entries(sig).sort((a, b) => b[1].length - a[1].length);
console.log('distinct special signatures:', ent.length);
for (const [k, v] of ent.slice(0, 40)) {
  console.log('n=' + v.length, k);
  console.log('   ex t=' + v[0].t, v[0].from, '=>', v[0].to);
}
