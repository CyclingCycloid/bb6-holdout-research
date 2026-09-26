// shape2.mjs — deep run: track maxRuns, shape set growth, special-edge parameter independence
import { FastTape, macroStepFast } from './macro3.mjs';
const CAP = +process.argv[2] || 1e10;
const t = new FastTape();
let eras = 0, maxRuns = 0, maxRunsT = 0;
const shapes = new Map();
const specialEdges = new Map(); // shapeA=>shapeB -> list of [t, from, to]
let prev = null;
let lastLog = 0;
while (t.step < CAP) {
  const r = macroStepFast(t);
  if (String(r.kind).startsWith('HALT')) { console.log('HALT', r.kind, 'at', t.step); break; }
  if (r.kind === 'Dance' || r.kind === 'DanceFill' || r.kind === 'DBL' || r.kind === 'L1') {
    eras++;
    const rl = t.rle();
    const runs = rl.s ? rl.s.split(' ').length : 0;
    if (runs > maxRuns) { maxRuns = runs; maxRunsT = t.step; console.log('maxRuns', runs, 't=' + t.step, rl.s.slice(0, 130)); }
    const rs = rl.s ? rl.s.split(' ').map(x => { const [v, l] = x.split('^'); return { v: +v, len: +l }; }) : [];
    const shape = rs.map(x => x.v ? 'B' : 'g' + x.len).join(',');
    if (!shapes.has(shape)) shapes.set(shape, [t.step, rl.s.slice(0, 130)]);
    if (prev) {
      const key = prev.shape + '=>' + shape;
      if (!specialEdges.has(key)) specialEdges.set(key, []);
      const arr = specialEdges.get(key);
      if (arr.length < 3) arr.push([t.step, prev.cfg, rl.s.slice(0, 130)]);
    }
    prev = { shape, cfg: rl.s.slice(0, 130) };
  }
  if (t.step - lastLog > 2e9) { lastLog = t.step; console.error('t=' + t.step, 'eras=' + eras, 'shapes=' + shapes.size, 'maxRuns=' + maxRuns); }
}
console.log('eras:', eras, 'shapes:', shapes.size, 'maxRuns:', maxRuns, '@', maxRunsT);
console.log('tail-length histogram (runs beyond work zone):');
const hist = {};
for (const s of shapes.keys()) { const n = s.split(',').length; hist[n] = (hist[n] || 0) + 1; }
console.log(JSON.stringify(hist));
console.log('special (non-self) edges with samples:');
let nspecial = 0;
for (const [k, v] of specialEdges) { if (!k.split('=>')[0].split(',').slice(0,5).join(',')+1) {} nspecial++; }
// print edges where the work zone prefix changes or first 5 runs differ
for (const [k, v] of specialEdges) {
  const [A, B] = k.split('=>');
  const prefix = x => x.split(',').slice(0, 5).join(',');
  if (prefix(A) !== prefix(B) || true) {
    console.log('EDGE', k, 'n=' + v.length);
    for (const [tt, f, to] of v.slice(0, 2)) console.log('   t=' + tt, f, '=>', to);
  }
}
