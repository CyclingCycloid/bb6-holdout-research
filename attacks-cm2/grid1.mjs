// grid1.mjs — census: construct marker states 1^a 0^1 1^b 0^5 1^c (+tail), run one era, record map
import { FastTape, macroStepFast } from './macro3.mjs';
// marker: A at 0^5 gap[1]. Build config: block a at [0..a-1], gap1, block b, gap5, block c, then tail.
// positions: a:0..a-1, gap a..a, b: a+1..a+b, gap5: a+b+1..a+b+5, c: a+b+6..a+b+5+c
// marker head = gap5[1] = a+b+2
function build(a, b, c, tail) { // tail = array of {g, len} after c
  const t = new FastTape();
  let p = 0;
  const put = (v, len) => { for (let i = 0; i < len; i++, p++) if (v) t.write(p, 1); };
  put(1, a); p++; put(1, b); p += 5; put(1, c);
  for (const { g, len } of tail) { p += g; put(1, len); }
  t.head = a + b + 2; t.st = 0;
  return t;
}
const rows = [];
const cases = [];
for (let a = 3; a <= 30; a += 3) for (let b = 1; b <= 12; b++) for (const c of [1, 2, 3, 5, 9, 20]) cases.push([a, b, c]);
for (const [a, b, c] of cases) {
  const t = build(a, b, c, [{ g: 2, len: 7 }]);
  const r0 = t.rle();
  let routines = [], halt = null;
  for (let i = 0; i < 5000; i++) {
    const r = macroStepFast(t);
    routines.push(r.kind);
    if (String(r.kind).startsWith('HALT')) { halt = r.kind + '@' + t.step; break; }
    if (r.kind === 'Dance' || r.kind === 'DanceFill' || r.kind === 'DBL' || r.kind === 'L1') break; // next marker
  }
  const r1 = t.rle();
  rows.push({ a, b, c, halt, eras: routines.length, from: r0.s, to: r1.s, head: t.head });
}
// classify
let bad = 0;
for (const r of rows) {
  if (r.halt) { console.log('HALT!!', JSON.stringify(r)); bad++; }
}
console.log('census cells:', rows.length, 'halts:', bad);
// print map for small b
for (const r of rows) { if (r.b <= 4) console.log(`a=${r.a} b=${r.b} c=${r.c}: ${r.from} => ${r.to}  [${r.eras} routines] h=${r.head}`); }
