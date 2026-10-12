// xval-fast.mjs — run both engines independently; drop S-entries; compare streams.
import { MacroTape } from './macro2.mjs';
import { FastTape, macroStepFast } from './macro3.mjs';
const CAP = +process.argv[2] || 1000000;
const m2 = new MacroTape(); const t3 = new FastTape();
const s2 = [], s3 = [];
let halt2 = null, halt3 = null;
while (m2.step < CAP) { const r = m2.macroStep(); if (r.kind !== 'S') s2.push([r.kind, m2.step, m2.head, m2.t.rle().s]); if (r.kind.startsWith('HALT')) { halt2 = [r.kind, m2.step]; break; } }
while (t3.step < CAP) { const r = macroStepFast(t3); if (r.kind !== 'S') s3.push([r.kind, t3.step, t3.head, t3.rle().s]); if (r.kind.startsWith('HALT')) { halt3 = [r.kind, t3.step]; break; } }
console.log('stream lengths', s2.length, s3.length, 'halt2', halt2, 'halt3', halt3);
let ok = 0, bad = 0;
const n = Math.min(s2.length, s3.length);
for (let i = 0; i < n; i++) {
  if (s2[i][0] === s3[i][0] && s2[i][1] === s3[i][1] && s2[i][2] === s3[i][2] && s2[i][3] === s3[i][3]) ok++;
  else { bad++; if (bad <= 6) console.log('MISMATCH', i, 'm2', JSON.stringify(s2[i]), 'm3', JSON.stringify(s3[i])); }
}
console.log(`xval-fast CAP=${CAP}: ok=${ok} bad=${bad}`);
