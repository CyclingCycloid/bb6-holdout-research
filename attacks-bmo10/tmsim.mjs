// Direct TM simulator for BMO10/BMO11 with readable tape dumps.
// Usage: node tmsim.mjs <code> <steps> <checkpointEvery>
import { readFileSync } from 'node:fs';

const code = process.argv[2];
const STEPS = parseInt(process.argv[3]);
const CPE = parseInt(process.argv[4] || '0');
const SNAPFROM = parseInt(process.argv[5] || '0');
const SNAPTO = parseInt(process.argv[6] || '0');

// parse: 12 transitions "wDn"
const T = [];
for (let i = 0; i < 12; i++) {
  const t = code.slice(3 * i, 3 * i + 3);
  T.push({ w: t[0] === '0' ? 0 : 1, d: t[1] === 'L' ? -1 : 1, n: t[2] === '-' ? -1 : t.charCodeAt(2) - 65 });
}
// tape as Map
const tape = new Map();
const rd = (p) => tape.get(p) ?? 0;
const wr = (p, v) => tape.set(p, v);
let head = 0, state = 0, step = 0;
const hist = [];
while (step < STEPS) {
  if ((CPE > 0 && step > 0 && step % CPE === 0) || (SNAPFROM && step >= SNAPFROM && step <= SNAPTO)) {
    let lo = head, hi = head;
    while (rd(lo - 1) === 1 || tape.has(lo - 1)) lo--; // include written cells
    while (rd(hi) === 1 || tape.has(hi)) hi++;
    // restrict to nonzero span but include head
    let l2 = head, h2 = head;
    for (const [p, v] of tape) { if (v) { l2 = Math.min(l2, p); h2 = Math.max(h2, p + 1); } }
    let s = '';
    for (let p = l2; p < h2; p++) s += rd(p);
    const mark = head - l2;
    console.log(`t=${step} ${String.fromCharCode(65 + state)} pos=${head} tape[${l2}..${h2 - 1}]=${s.slice(0, mark)}[${state >= 0 ? s[mark] : '?'}]${s.slice(mark + 1)}`);
  }
  const sy = rd(head);
  const tr = T[state * 2 + sy];
  if (tr.n < 0) { console.log(`HALT at step ${step} state ${String.fromCharCode(65 + state)} head ${head} reading ${sy}`); break; }
  wr(head, tr.w);
  head += tr.d;
  state = tr.n;
  step++;
}
console.log(`ran ${step} steps`);
