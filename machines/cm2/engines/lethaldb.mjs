// lethaldb.mjs — comprehensive verified lethal-terminal database:
// all tail-less A-terminals (L, M∈{1,2,3,4}, R) with L ≤ 60, R ≤ 20 that HALT within 300 eras.
// Output: machine-readable DB + parameter-domain summary.
import { build, runEra } from '../reverify-cm2/ref-lib.mjs';
import fs from 'fs';
const DB = [];
for (const M of [1,2,3,4]) for (let L = 3; L <= 60; L++) for (let R = 1; R <= 20; R++) {
  const t = build([{v:1,len:L},{v:0,len:1},{v:1,len:M},{v:0,len:5},{v:1,len:R}], L+1+M+1);
  for (let e = 0; e < 300; e++) { const r = runEra(t);
    if (r.halt) { DB.push({ M, L, R, kind: r.halt, eras: e + 1 }); break; }
    if (r.nonterm) { DB.push({ M, L, R, kind: 'NONTERM', eras: e + 1 }); break; } }
}
console.log('lethal cells (L<=60, R<=20):', DB.length);
// parameter domains per M
for (const M of [1,2,3,4]) {
  const cells = DB.filter(x => x.M === M);
  console.log(`--- M=${M}: ${cells.length} lethal cells`);
  // group by R
  const byR = {};
  for (const c of cells) (byR[c.R] = byR[c.R] || []).push(c.L);
  for (const R of Object.keys(byR).map(Number).sort((a,b)=>a-b)) {
    const Ls = byR[R].sort((a,b)=>a-b);
    // summarize as ranges
    const ranges = []; let s = Ls[0], p = Ls[0];
    for (const L of Ls.slice(1)) { if (L === p + 1) { p = L; continue; } ranges.push(s===p?`${s}`:`${s}-${p}`); s = p = L; }
    ranges.push(s===p?`${s}`:`${s}-${p}`);
    console.log(`  R=${String(R).padStart(2)}: L ∈ {${ranges.join(',')}} [${Ls.length} cells]`);
  }
}
fs.writeFileSync('lethal-db.json', JSON.stringify(DB));
console.log('written lethal-db.json:', DB.length, 'cells');
