// q_tmalign.mjs — fixed TM = rightmost-#-strategy correspondence check.
// (p_tmalign.mjs had a bug: window w = max(9,...) exceeded early game states' del
//  length so g never advanced past 4. Here w = min(W, dg.length).)
//
// Runs the deterministic game (rightmost-# play) alongside the TM
// (code 1RB0LB0RC0LD1LD1RE0LA0RF0RD1RF0RC---) and checks: the TM tape's nonzero
// span always equals (alternating periodic prefix) + del(S_g) for the current
// expected game state, matched windowed: suffix window W, alternating-left check.
// g advances strictly in order; states sharing the same window skip together.
//
// Usage: node q_tmalign.mjs NGAME W NTM

import { Det } from './p_lib.mjs';

const NGAME = parseInt(process.argv[2] || '100000');
const W = parseInt(process.argv[3] || '48');
const NTM = parseInt(process.argv[4] || '5000000');

const d = new Det();
const dels = [''];
const delOf = (w) => w.replace(/#/g, '');
dels[0] = '';
for (let g = 1; g <= NGAME; g++) {
  if (d.ruleAtRightmost() < 0) { console.log('game won at', g); break; }
  d.step();
  let c = d.w;
  while (c.startsWith('10#')) c = c.slice(3);
  c = c.replace(/0+$/, '');
  dels[g] = c.replace(/#/g, '');
}

const code = '1RB0LB0RC0LD1LD1RE0LA0RF0RD1RF0RC---';
const T = [];
for (let i = 0; i < 12; i++) {
  const t = code.slice(3 * i, 3 * i + 3);
  T.push({ w: t[0] === '0' ? 0 : 1, d: t[1] === 'L' ? -1 : 1, n: t[2] === '-' ? -1 : t.charCodeAt(2) - 65 });
}
const tape = new Map();
const rd = (p) => tape.get(p) ?? 0;
let head = 0, state = 0, lo = 0, hi = 0;

const isAlt = (s) => { for (let i = 1; i < s.length; i++) if (s[i] === s[i - 1]) return false; return true; };

let g = 1;
let matched = 0, maxGapSteps = 0, lastMatchStep = 0, ambiguousSkips = 0, hardSkips = 0;
const edOf = (x) => x.slice(0, x.lastIndexOf('1') + 1);
for (let tmStep = 0; tmStep < NTM && g < dels.length; tmStep++) {
  let nlo = Infinity, nhi = -Infinity;
  for (const [p, v] of tape) if (v) { if (p < nlo) nlo = p; if (p + 1 > nhi) nhi = p + 1; }
  if (nlo < Infinity) {
    // try to match any of the next LOOKAHEAD game states (monotone scan-ahead)
    for (let j = g; j < Math.min(g + 60, dels.length); j++) {
      const ed = edOf(dels[j]);
      const w = Math.min(W, ed.length);
      if (w < 2) continue;
      const from = Math.max(nlo, nhi - w - 2);
      let s = '';
      for (let p = from; p < nhi; p++) s += rd(p);
      const sufTape = s.slice(-w);
      const leftTape = s.slice(0, s.length - w);
      if (sufTape.length === w && ed.endsWith(sufTape) && (leftTape.length === 0 || isAlt(leftTape))) {
        let advanced = 0;
        while (g <= j) { if (g < j) hardSkips++; g++; advanced++; }
        matched += advanced;
        if (tmStep - lastMatchStep > maxGapSteps) maxGapSteps = tmStep - lastMatchStep;
        lastMatchStep = tmStep;
        break;
      }
    }
  }
  const sy = rd(head);
  const tr = T[state * 2 + sy];
  if (tr.n < 0) { console.log(`HALT at TM step ${tmStep}`); break; }
  tape.set(head, tr.w);
  if (head < lo) lo = head;
  if (head + 1 > hi) hi = head + 1;
  head += tr.d;
  state = tr.n;
}
console.log(`TM steps: ${g < dels.length ? NTM : 'all'}, game states matched in order: ${matched}/${dels.length - 1} (next unmatched g=${g})`);
console.log(`max TM steps between matches: ${maxGapSteps}, ambiguous batch-skips: ${ambiguousSkips}`);
console.log(`tape span at end: ${hi - lo}, state ${String.fromCharCode(65 + state)}`);
