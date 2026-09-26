// Definitive TM<->game alignment.
// Encoding: TM tape (nonzero span) = word with '#' deleted (right-aligned),
// i.e. tape = (suffix of infinite '1010...' periodic) + del(S).
// Matching in SUBSEQUENCE order: TM passes through del(S_g) for a strictly
// increasing sequence of game states g (rightmost-# strategy); some g may be
// skipped when the tape is mid-mutation. We log: matched pairs, skips, and at
// each match the relation of the TM head to the '#' positions of S_g.
import { RULESETS, activePositions, applyAt } from './game.mjs';

const rs = RULESETS.bmo10;
const NGAME = parseInt(process.argv[2] || '3000');
const NTM = parseInt(process.argv[3] || '3000000');

let S = '';
const gseq = [{ S, del: '' }];
for (let i = 0; i < NGAME; i++) {
  const act = activePositions(S, rs);
  if (!act.length) break;
  S = applyAt(S, act[act.length - 1], rs);
  gseq.push({ S, del: S.replace(/#/g, '') });
}

const code = '1RB0LB0RC0LD1LD1RE0LA0RF0RD1RF0RC---';
const T = [];
for (let i = 0; i < 12; i++) {
  const t = code.slice(3 * i, 3 * i + 3);
  T.push({ w: t[0] === '0' ? 0 : 1, d: t[1] === 'L' ? -1 : 1, n: t[2] === '-' ? -1 : t.charCodeAt(2) - 65 });
}
const tape = new Map();
const rd = (p) => tape.get(p) ?? 0;
let head = 0, state = 0;
const isAlt = (s) => { for (let i = 1; i < s.length; i++) if (s[i] === s[i - 1]) return false; return true; };
const matchTape = (s, g) => {
  const d = gseq[g].del;
  if (d.length === 0) return false;
  if (!s.endsWith(d)) return false;
  return isAlt(s.slice(0, s.length - d.length));
};

let g = 1; // start from game step 1
let matched = 0, skipped = 0, offPath = 0;
const log = [];
let minWrite = 0, maxWrite = 0;
for (let step = 0; step < NTM; step++) {
  let s = '';
  const lo = minWrite, hi = maxWrite;
  for (let p = lo; p < hi; p++) s += rd(p);
  if (s && s.endsWith('1')) { // nonzero span ends with 1; strip leading zeros for span string
    let a = 0; while (s[a] === '0') a++;
    s = s.slice(a);
    if (matchTape(s, g)) {
      log.push({ g, t: step, st: String.fromCharCode(65 + state), head });
      matched++;
      while (g < gseq.length && (gseq[g].del.length === 0 || matchTape(s, g))) g++;
    } else {
      // try skipping ahead: find g' > g matching now (log skips)
      let g2 = g, skippedNow = 0;
      while (g2 < gseq.length && !matchTape(s, g2) && g2 < g + 40) { g2++; skippedNow++; }
      if (g2 < gseq.length && matchTape(s, g2)) {
        log.push({ g: g2, t: step, st: String.fromCharCode(65 + state), head, skipped: skippedNow });
        matched++; skipped += skippedNow;
        g = g2 + 1;
        while (g < gseq.length && gseq[g].del.length === 0) g++;
      }
    }
  }
  const sy = rd(head);
  const tr = T[state * 2 + sy];
  if (tr.n < 0) { console.log(`HALT at TM step ${step}, game g=${g}`); break; }
  tape.set(head, tr.w);
  minWrite = Math.min(minWrite, head); maxWrite = Math.max(maxWrite, head + 1);
  head += tr.d; state = tr.n;
}
console.log(`matched ${matched} game states (skipped ${skipped}), reached g=${g}/${gseq.length}`);
console.log('first 30 log entries:', log.slice(0, 30).map(e => `${e.g}@t${e.t}${e.skipped ? '(skip' + e.skipped + ')' : ''}:${e.st}@${e.head}`).join(' '));
console.log('last 5:', log.slice(-5).map(e => `${e.g}@t${e.t}:${e.st}@${e.head}`).join(' '));

// head-vs-# analysis at match instants: where is the head relative to #s of S_g?
// tape position p corresponds to word S-index: count = number of S chars <= that map to tape cells.
// For match of g at tape string s (span [lo..hi-1], we know del): map each # of S_g to the
// tape position it would occupy (between cells). Then report head relative to nearest #.
// We re-simulate briefly for the logged instants:
{
  const tape2 = new Map(); const rd2 = (p) => tape2.get(p) ?? 0;
  let h2 = 0, st2 = 0;
  const want = new Map(log.map(e => [e.t, e]));
  let mw = 0, xw = 0;
  for (let step = 0; step < NTM; step++) {
    const e = want.get(step);
    if (e) {
      const Sg = gseq[e.g].S;
      // tape index of each S char: #s get "virtual" positions
      let tp = 0; const posOf = [];
      for (const ch of Sg) { if (ch === '#') { posOf.push(null); } else { posOf.push(tp); tp++; } }
      // head is at absolute tape cell; del(S) occupies the rightmost tp cells of the written span
      // right end of del = rightmost nonzero cell R:
      let R = xw - 1; while (R >= mw && rd2(R) === 0) R--;
      const leftEnd = R - tp + 1; // tape cell of S's first non-# char
      // position of head relative to S coords:
      const relHead = head - leftEnd; // in del-coordinates
      // nearest # to the left/right in del coords:
      let dLeft = Infinity, dRight = Infinity, k = 0;
      for (let i = 0; i < Sg.length; i++) {
        if (Sg[i] === '#') {
          // # i sits between del-positions: number of non-# chars before i
          const before = posOf.slice(0, i).filter(x => x !== null).length;
          if (before <= relHead) dLeft = Math.min(dLeft, relHead - before); // # is left of head at del slot 'before'
          else dRight = Math.min(dRight, before - relHead);
        }
      }
      if (e.g <= 400) console.log(`g=${e.g} t=${e.t} state=${e.st} headDelCoord=${relHead} distToLeftHash=${dLeft === Infinity ? '-' : dLeft} distToRightHash=${dRight === Infinity ? '-' : dRight} nHash=${(Sg.match(/#/g) || []).length}`);
    }
    const sy = rd2(h2);
    const tr = T[st2 * 2 + sy];
    if (tr.n < 0) break;
    tape2.set(h2, tr.w);
    mw = Math.min(mw, h2); xw = Math.max(xw, h2 + 1);
    h2 += tr.d; st2 = tr.n;
  }
}
