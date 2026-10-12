// grand.mjs — extract macro-cycle structure: configs at "quiet" points (state A, after E1)
import { RunTape } from './runsim.mjs';
const CAP = +process.argv[2] || 200000;
const MODE = process.argv[3] || 'A0left';
const t = new RunTape();
let prevTr = '';
const rows = [];
while (t.step < CAP) {
  const v = t.read(t.head);
  const tr = `${'ABCDEF'[t.st]}${v}`;
  const r = t.step1();
  if (r.halt) { console.log('HALT at', t.step); break; }
  prevTr = tr;
  if (tr === 'E1' && t.st === 0) { // E1 -> A: wave restart
    const rl = t.rle();
    rows.push({ t: t.step, h: t.head, ...rl });
  }
}
console.log('restarts:', rows.length);
for (let i = 0; i < Math.min(rows.length, +process.argv[4] || 120); i++) {
  const e = rows[i];
  console.log(String(i).padStart(4), String(e.t).padStart(8), 'h=' + String(e.h).padStart(5), 'pop=' + String(e.pop).padStart(5), 'w=' + String(e.w).padStart(6), e.s);
}
