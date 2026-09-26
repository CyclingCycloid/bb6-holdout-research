// era2.mjs — era-level dynamics: boundaries at dance-family routines (Dance/DanceFill/DBL/L1/HALT)
import { FastTape, macroStepFast } from './macro3.mjs';
const CAP = +process.argv[2] || 1e9;
const SHOW = +process.argv[3] || 0;
const t = new FastTape();
const eras = [];
let kinds = {};
while (t.step < CAP) {
  const r = macroStepFast(t);
  kinds[r.kind] = (kinds[r.kind] || 0) + 1;
  if (String(r.kind).startsWith('HALT')) { console.log('HALT', r.kind, 'at', t.step); break; }
  if (r.kind === 'Dance' || r.kind === 'DanceFill' || r.kind === 'DBL' || r.kind === 'L1') {
    const rl = t.rle();
    eras.push({ t: t.step, k: r.kind, h: t.head, pop: rl.pop, w: rl.w, s: rl.s });
  }
}
console.log('routines:', JSON.stringify(kinds));
console.log('era boundaries (dance-family):', eras.length);
if (SHOW) for (let i = 0; i < Math.min(SHOW, eras.length); i++) console.log(String(i).padStart(5), String(eras[i].t).padStart(10), eras[i].k.padEnd(9), 'h=' + String(eras[i].h).padStart(6), 'pop=' + String(eras[i].pop).padStart(5), eras[i].s);
if (process.argv[4]) {
  const fs = await import('fs');
  fs.writeFileSync(process.argv[4], eras.map(e => `${e.t}\t${e.k}\t${e.h}\t${e.pop}\t${e.s}`).join('\n'));
  console.log('written', process.argv[4]);
}
