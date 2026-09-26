// p_tmalign.mjs — deep TM = rightmost-#-strategy correspondence check.
//
// Own TM simulator (code 1RB0LB0RC0LD1LD1RE0LA0RF0RD1RF0RC---, diff-validated
// format vs sim/tm.exe in earlier sessions).  Runs the deterministic game
// (rightmost-# play) alongside; checks the TM tape's nonzero span always equals
// (alternating periodic prefix) + del(S_g) for the current expected game state,
// matched WINDOWED (suffix window W, plus alternating-left check over A
// symbols): the matched g advances strictly in order; a game state counts as
// matched when the window+alternating check hits; states sharing the same
// window are skipped together (ambiguous, but consistently in order).
//
// Usage: node p_tmalign.mjs NGAME W A
import { Det } from './p_lib.mjs';

const NGAME = parseInt(process.argv[2] || '100000');
const W = parseInt(process.argv[3] || '48');
const A = parseInt(process.argv[4] || '64');

// game sequence: del(S_g) for g = 0..NGAME
const d = new Det();
const dels = ['']; // del of S_0 = ''
const delOf = (w) => w.replace(/#/g, '');
dels[0] = delOf(d.w.replace(/10#/g, '').replace(/0+$/, '')); // canonical: fill stripped
for (let g = 1; g <= NGAME; g++) {
  if (d.ruleAtRightmost() < 0) { console.log('game won at', g); break; }
  d.step();
  // canonical core without leading fill units and trailing zeros
  let c = d.w;
  while (c.startsWith('10#')) c = c.slice(3);
  c = c.replace(/0+$/, '');
  dels[g] = c.replace(/#/g, '');
}

// TM
const code = '1RB0LB0RC0LD1LD1RE0LA0RF0RD1RF0RC---';
const T = [];
for (let i = 0; i < 12; i++) {
  const t = code.slice(3 * i, 3 * i + 3);
  T.push({ w: t[0] === '0' ? 0 : 1, d: t[1] === 'L' ? -1 : 1, n: t[2] === '-' ? -1 : t.charCodeAt(2) - 65 });
}
const tape = new Map();
const rd = (p) => tape.get(p) ?? 0;
let head = 0, state = 0;
let lo = 0, hi = 0;

const isAlt = (s) => { for (let i = 1; i < s.length; i++) if (s[i] === s[i - 1]) return false; return true; };

let g = 0;
// skip leading game states whose del is empty or alternating-only (ambiguous)
const skipAmb = () => { while (g < dels.length && (dels[g].length === 0 || isAlt(dels[g]))) g++; };
skipAmb();
let matched = 0, maxGapSteps = 0, lastMatchStep = 0;
const NTM = 40000000;
let tmStep = 0;
let stalls = [];
for (; tmStep < NTM && g < dels.length; tmStep++) {
  // current tape NONZERO span (min/max over cells with value 1)
  let nlo = Infinity, nhi = -Infinity;
  for (const [p, v] of tape) if (v) { if (p < nlo) nlo = p; if (p + 1 > nhi) nhi = p + 1; }
  let s = '';
  const from = Math.max(nlo, nhi - W - A);
  for (let p = from; p < nhi; p++) s += rd(p);
  const dg = dels[g];
  const w = Math.min(W, Math.max(9, dg.length));
  const sufTape = s.slice(-w);
  const leftTape = s.slice(0, s.length - w);
  if (sufTape.length === w && dg.length >= w && dg.endsWith(sufTape) && (leftTape.length === 0 || isAlt(leftTape))) {
    // advance past all game states matching this window
    let advanced = 0;
    while (g < dels.length && dels[g].length >= w && dels[g].endsWith(sufTape)) { g++; advanced++; }
    skipAmb();
    matched += advanced;
    if (tmStep - lastMatchStep > maxGapSteps) maxGapSteps = tmStep - lastMatchStep;
    if (tmStep - lastMatchStep > 2000000) stalls.push({ at: tmStep, g });
    lastMatchStep = tmStep;
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
console.log(`TM steps: ${tmStep}, game states matched in order: ${matched}/${dels.length - 1} (next unmatched g=${g})`);
console.log(`max TM steps between consecutive game-state matches: ${maxGapSteps}`);
console.log(`stalls >2M steps: ${JSON.stringify(stalls.slice(0, 5))}`);
console.log(`tape span at end: ${hi - lo}, state ${String.fromCharCode(65 + state)}`);
