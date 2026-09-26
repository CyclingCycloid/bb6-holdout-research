// shapegraph.mjs — collect era-start shape transition graph over a deep run
import { FastTape, macroStepFast } from './macro3.mjs';
const CAP = +process.argv[2] || 1e9;
const t = new FastTape();
let kinds = {};
let prevShape = null, prevDetail = null;
const shapeNodes = new Map(); // shape -> count
const edges = new Map(); // shapeA|shapeB -> count
const specialTrans = []; // non-clean transitions with details
let eras = 0, maxRuns = 0;
let lastDance = null;
while (t.step < CAP) {
  const r = macroStepFast(t);
  kinds[r.kind] = (kinds[r.kind] || 0) + 1;
  if (String(r.kind).startsWith('HALT')) { console.log('HALT', r.kind, 'at', t.step); break; }
  if (r.kind === 'Dance' || r.kind === 'DanceFill' || r.kind === 'DBL' || r.kind === 'L1') {
    eras++;
    const rl = t.rle();
    if (rl.w > maxRuns) maxRuns = 0; // placeholder
    const runs = rl.s ? rl.s.split(' ').length : 0;
    if (runs > maxRuns) { maxRuns = runs; console.log('new max runs', runs, 'at t=' + t.step, rl.s.slice(0, 120)); }
    const rs = rl.s ? rl.s.split(' ').map(x => { const [v, l] = x.split('^'); return { v: +v, len: +l }; }) : [];
    const shape = rs.map(x => x.v ? 'B' : 'g' + x.len).join(',');
    shapeNodes.set(shape, (shapeNodes.get(shape) || 0) + 1);
    if (prevShape !== null) {
      const key = prevShape + '=>' + shape;
      edges.set(key, (edges.get(key) || 0) + 1);
      if (edges.get(key) <= 2 && specialTrans.length < 1e6) specialTrans.push({ t: t.step, from: prevDetail, to: rl.s, shape });
    }
    prevShape = shape; prevDetail = rl.s;
  }
}
console.log('routines:', JSON.stringify(kinds));
console.log('eras:', eras, 'distinct shapes:', shapeNodes.size, 'distinct edges:', edges.size, 'maxRuns:', maxRuns);
const ent = [...shapeNodes.entries()].sort((a, b) => b[1] - a[1]);
console.log('top shapes:'); for (const [s, c] of ent.slice(0, 15)) console.log(String(c).padStart(8), s);
const ee = [...edges.entries()].sort((a, b) => b[1] - a[1]);
console.log('top edges:'); for (const [s, c] of ee.slice(0, 15)) console.log(String(c).padStart(8), s);
