// eras.mjs — Phase 2: group macro routines into grand cycles (era boundaries at Fill),
// extract the (block-triple) state and fit the cycle map.
import { MacroTape } from './macro2.mjs';
const CAP = +process.argv[2] || 50000000;
const mt = new MacroTape();
const fills = []; // config at each Fill (post-fill = era boundary)
let kinds = {};
let lapchain = 0;
while (mt.step < CAP) {
  const r = mt.macroStep();
  kinds[r.kind] = (kinds[r.kind] || 0) + 1;
  if (r.kind.startsWith('HALT')) { console.log('HALT', r.kind, 'at', mt.step); break; }
  if (r.kind === 'Fill') {
    const rl = mt.t.rle();
    fills.push({ t: mt.step, h: mt.head, ...rl });
  }
}
console.log('routines:', JSON.stringify(kinds));
console.log('fills (era boundaries):', fills.length);
// parse RLE into runs
const parse = s => s ? s.split(' ').map(x => { const [v, l] = x.split('^'); return { v: +v, len: +l }; }) : [];
for (let i = 0; i < Math.min(40, fills.length); i++) {
  const f = fills[i];
  console.log(String(i).padStart(3), String(f.t).padStart(9), 'h=' + String(f.h).padStart(6), 'pop=' + String(f.pop).padStart(5), f.s);
}
// Fit: express each era config as (a, B, D) triple-ish: leftmost block a, then gaps/blocks
console.log('--- structured view: blocks as [a,b,c,...] with gaps ---');
for (let i = 0; i < Math.min(40, fills.length); i++) {
  const rs = parse(fills[i].s);
  const desc = rs.map(r => (r.v ? String(r.len) : 'g' + r.len)).join(',');
  console.log(String(i).padStart(3), fills[i].t, 'h=' + fills[i].h, '| ' + desc);
}
