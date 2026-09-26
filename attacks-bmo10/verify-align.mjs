// Rigorous alignment verification: run the TM; at every step, check if tape (nonzero
// span) equals del(S_g) for the current expected game state under rightmost-# play.
// We track the sequence: TM passes through del(S_0), del(S_1), ... in order, possibly
// with long gaps. Verify every game step 0..N gets an exact TM match in order.
// Also record the state/head at each match, and where F is entered.
import { RULESETS, canon, activePositions, applyAt, tailOf } from './game.mjs';

const rs = RULESETS.bmo10;
const NGAME = parseInt(process.argv[2] || '300');
const NTM = parseInt(process.argv[3] || '200000');

// game rightmost-# play
let S = '';
const gseq = [{ S, del: '' }];
for (let i = 0; i < NGAME; i++) {
  const act = activePositions(S, rs);
  if (!act.length) break;
  S = applyAt(S, act[act.length - 1], rs);
  gseq.push({ S, del: S.replace(/#/g, '') });
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
let g = 0; // next game index to match
while (g < gseq.length && gseq[g].del.length === 0) g++; // skip empty-del states (tape=alt only, ambiguous)
const matches = [];
let fEntries = 0;
const isAlt = (s) => { for (let i = 1; i < s.length; i++) if (s[i] === s[i - 1]) return false; return true; };
// tape (as string of nonzero span) matches game state g if
// tape = (alternating string) + del(S_g)  [alternating = pristine periodic part]
const matchTape = (s, g) => {
  const d = gseq[g].del;
  if (d.length === 0) return false;
  if (!s.endsWith(d)) return false;
  const left = s.slice(0, s.length - d.length);
  return isAlt(left);
};
for (let step = 0; step < NTM && g < gseq.length; step++) {
  // tape string
  let l2 = head, h2 = head;
  for (const [p, v] of tape) { if (v) { l2 = Math.min(l2, p); h2 = Math.max(h2, p + 1); } }
  let s = '';
  for (let p = l2; p < h2; p++) s += rd(p);
  if (state === 5) fEntries++;
  if (matchTape(s, g)) {
    matches.push({ g, t: step, state: String.fromCharCode(65 + state), head, lo: l2 });
    // advance past states matching this tape, then past any empty-del states
    while (g < gseq.length && matchTape(s, g)) g++;
    while (g < gseq.length && gseq[g].del.length === 0) g++;
  }
  const sy = rd(head);
  const tr = T[state * 2 + sy];
  if (tr.n < 0) { console.log(`HALT at TM step ${step}`); break; }
  tape.set(head, tr.w); head += tr.d; state = tr.n;
}
console.log(`game steps matched in order: ${matches.length}/${gseq.length} (stuck at g=${g})`);
console.log(`F-state entries seen: ${fEntries}`);
// print match stats: TM steps per game step
const per = [];
for (let i = 1; i < matches.length; i++) per.push(matches[i].t - matches[i - 1].t);
console.log('TM steps between consecutive game macro-steps (first 40):', per.slice(0, 40).join(','));
console.log('match states (first 40):', matches.slice(0, 40).map(m => `${m.g}:${m.t}:${m.state}@${m.head - m.lo}`).join(' '));
console.log('last match:', JSON.stringify(matches[matches.length - 1]));
console.log('game state at last match: S=', gseq[matches[matches.length - 1]?.g]?.S);
