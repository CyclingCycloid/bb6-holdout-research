// amacro.mjs — macro transitions = A-state to next A-state. Extract grammar with exact configs.
import { RunTape } from './runsim.mjs';
const CAP = +process.argv[2] || 100000;
const t = new RunTape();
const rows = [];
const rec = () => { const rl = t.rle(); rows.push({ t: t.step, h: t.head, st: t.st, ...rl }); };
rec(); // step 0: A at 0
while (t.step < CAP) {
  const r = t.step1();
  if (r.halt) { console.log('HALT at', t.step); break; }
  if (t.st === 0) rec();
}
console.log('A-visits:', rows.length);
// transitions: rows[i] -> rows[i+1]
const cls = {};
for (let i = 0; i + 1 < rows.length; i++) {
  const a = rows[i], b = rows[i + 1];
  const nstep = b.t - a.t;
  // classify by (a-geometry relative to head, word-len)
  const key = `steps=${nstep}`;
  (cls[key] = cls[key] || []).push(i);
}
const ent = Object.entries(cls).sort((x, y) => y[1].length - x[1].length);
for (const [k, v] of ent.slice(0, 20)) console.log(k, 'count', v.length);
// print first 60 transitions with configs
console.log('--- first transitions ---');
for (let i = 0; i < Math.min(70, rows.length - 1); i++) {
  const a = rows[i], b = rows[i + 1];
  console.log(String(i).padStart(3), `${a.t}->${b.t}`, 'dstep=' + (b.t - a.t), `h ${a.h}->${b.h}`, '|', a.s, '=>', b.s);
}
