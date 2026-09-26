// phases.mjs — segment the cm2 orbit into phase routines using runsim
// A routine = maximal transition sub-word; we log boundaries at "restart" transitions:
//   E1 (wave restart -> A), D1 (F-dance entry), B1 (C-entry after B-erase), F1, and halt-risk C0.
import { RunTape } from './runsim.mjs';
const CAP = +process.argv[2] || 300000;
const t = new RunTape();
let lastTr = '';
const segs = []; // {t0, word, cfg0}
let word = '', t0 = 0, cfg0 = t.rle().s;
const LAST = { 0: 'A', 1: 'A', 2: 'B', 3: 'B', 4: 'C', 5: 'D', 6: 'D', 7: 'E', 8: 'E', 9: 'F', 10: 'F' };
while (t.step < CAP) {
  const v = t.read(t.head);
  const tr = `${'ABCDEF'[t.st]}${v}`;
  const r = t.step1();
  if (r.halt) { console.log('HALT at', t.step); break; }
  word += tr;
  // boundary: after E1,A? after D1? after B1? -> segment ends when next transition is A0 or A1 after a restart marker
  if (tr === 'E1' || tr === 'D1' || tr === 'B1') {
    segs.push({ t0, t1: t.step, word, cfg: t.rle().s, h: t.head, st: 'ABCDEF'[t.st] });
    word = ''; t0 = t.step; cfg0 = '';
  }
}
segs.push({ t0, t1: t.step, word, cfg: t.rle().s, h: t.head, st: 'ABCDEF'[t.st] });
// classify segment words
const cnt = {};
for (const s of segs) { cnt[s.word] = (cnt[s.word] || 0) + 1; }
const ent = Object.entries(cnt).sort((a, b) => b[1] - a[1]);
console.log('segments:', segs.length, 'distinct words:', ent.length);
for (const [w, c] of ent.slice(0, 30)) console.log(String(c).padStart(8), w);
console.log('--- first 40 segments (t0, word, cfg@end, head, state) ---');
segs.slice(0, 40).forEach(s => console.log(s.t0, s.word, '| h=' + s.h, s.st, s.cfg));
