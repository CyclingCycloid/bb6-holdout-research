// casecheck-entry.mjs — W3: entry classification, pop bookkeeping, invariant-net checks.
// One line: node casecheck-entry.mjs
//
// (1) Per-branch pop deltas: for every dispatch branch the era's pop change is measured
//     on the bare machine (same compositions as casecheck-dispatch) and compared with the
//     stated closed-form delta. This replaces the old claim "pop = input pop + 3..6 per
//     reset branch" — the true per-branch deltas are in {-4..+5} (see the printed table).
// (2) Parameter-grid closure: starting from the blank-tape seed (outR(5)), iterate the
//     verified branch formulas (families A/g5B/g6o1/g6o2/g3/g12/gE/g1g1/g2L/g4A/outR,
//     tails front in {empty, (g1,S), (g2,S)}, parameters bounded by GRID) to fixpoint.
//     Sinks (out-left excursion states, g4, unverified shape variants) are counted but
//     not expanded. On the closure we assert:
//       INV-L  : 2 not in g5B-L and not in g6o1-L; 3 not in g6o1-L; {4,5} not in A-L
//       INV-M  : 1 not in g2L-M   (all reachable g2L have M>=2)
//       INV-R  : 1 not in g1g1-R
//       INV-T  : no reachable era output creates a (gap=1, block=1) tail pair
//       HALT   : no reachable state is one of the six halt-input families
import { buildAt, runList, check, summary, runWord, lapWord, fillWord, l1Word,
  dancePrefix, danceTail, danceFillTail, sWord, dblExpectedWord, cellsAround, mergeRuns } from './checklib.mjs';

const GRID = 24, SMAX = 12;
const deep = [[0, 2], [1, 7]];
const lapK = k => Array.from({ length: k }, () => lapWord).flat();
const danceClean = s => [...dancePrefix(s), ...danceTail];
const danceFillW = s => [...dancePrefix(s), ...danceFillTail(s + 3)];
const l1Halt = [[0, 0, 1, 1, 1], [1, 1, 0, 1, 2], ['H', 0]];

// --- era runner on the bare machine; returns {pop, out:{start,parts,head}, halt} ------
function runEraCfg(inParts, head, compose) {
  const t = buildAt(0, inParts, head);
  const popIn = runList(t).pop;
  for (const part of compose) {
    if (part && part.dbl !== undefined) {
      const gen = dblExpectedWord(cellsAround(t, part.dbl, t.head), t.head, part.dbl);
      if (!runWord(t, gen.word, 'entry')) return { err: true };
      if (gen.end === 'HALT') return { halt: true, popIn, popOut: runList(t).pop };
    } else {
      const r = runWord(t, part, 'entry');
      if (r === 'HALT') return { halt: true, popIn, popOut: runList(t).pop };
      if (!r) return { err: true };
    }
  }
  const rl = runList(t);
  return { popIn, popOut: rl.pop, start: rl.lo, runs: rl.runs.map(r => [r.v, r.len]), head: rl.head };
}

// --- (1) per-branch pop-delta table ----------------------------------------------------
const famA = (L, M, Rw, T) => [[1, L], [0, 1], [1, M], [0, 5], [1, Rw], ...T];
const fam5B = (L, M, Rw, T) => [[1, L], [0, 5], [1, M], [0, 2], [1, Rw], ...T];
const fam6o1 = (L, Rw, T) => [[1, L], [0, 6], [1, Rw], ...T];
const fam3 = (L, M, Rw, T) => [[1, L], [0, 1], [1, M], [0, 3], [1, Rw], ...T];
const fam12 = (L, M, Rw, T) => [[1, L], [0, 1], [1, M], [0, 2], [1, Rw], ...T];
const famGE = (L, M) => [[1, L], [0, 1], [1, M]];
const fam11 = (L, M, Rw, T) => [[1, L], [0, 1], [1, M], [0, 1], [1, Rw], ...T];
const fam2L = (L, M, Rw, T) => [[1, L], [0, 2], [1, M], [0, 2], [1, Rw], ...T];
const fam4A = (L, M, Rw, T) => [[1, L], [0, 1], [1, M], [0, 4], [1, Rw], ...T];
const tG2 = S => [[0, 2], [1, S]];

const deltaTable = [];
function delta(branch, inParts, head, compose, expectDelta) {
  const r = runEraCfg(inParts, head, compose);
  if (r.err || r.halt) { check('delta:' + branch, false, r.err ? 'err' : 'halt'); return; }
  const d = r.popOut - r.popIn;
  deltaTable.push([branch, d]);
  check(`delta:${branch}`, d === expectDelta, `measured ${d}, stated ${expectDelta}`);
}
delta('A(M>=5)', famA(6, 9, 2, deep), 6 + 9 + 2, [lapK(9), fillWord, sWord(9), danceClean(2)], 0);
delta('A(M=4)', famA(6, 4, 2, deep), 6 + 4 + 2, [lapK(4), fillWord, sWord(4), danceClean(2)], 0);
delta('A(M=3)', famA(6, 3, 2, deep), 6 + 3 + 2, [lapK(3), fillWord, sWord(3), danceFillW(2)], +5);
delta('A(M=2)', famA(6, 2, 2, deep), 6 + 2 + 2, [lapK(2), fillWord, sWord(2), { dbl: 10 }], -1);
delta('A(M=1)', famA(6, 1, 2, deep), 6 + 1 + 2, [lapK(1), fillWord, sWord(1), danceClean(3)], 0);
delta('D1(L>=5)', fam5B(9, 2, 2, deep), 10, [lapK(9), fillWord, sWord(9), danceClean(2)], 0);
delta('D1(L=4)', fam5B(4, 2, 2, deep), 5, [lapK(4), fillWord, sWord(4), danceClean(2)], 0);
delta('D1(L=3)', fam5B(3, 2, 2, deep), 4, [lapK(3), fillWord, sWord(3), danceFillW(2)], +5);
delta('D1(L=1)', fam5B(1, 2, 2, [[0, 1], [1, 1], ...deep]), 2, [lapK(1), fillWord, sWord(1), danceClean(3)], 0);
delta('D2(L>=5)', fam6o1(9, 2, deep), 10, [lapK(9), fillWord, sWord(9), danceClean(2)], 0);
delta('D2(L=4)', fam6o1(4, 2, deep), 5, [lapK(4), fillWord, sWord(4), danceClean(2)], 0);
delta('D2(L=3)', fam6o1(3, 2, deep), 4, [lapK(3), fillWord, sWord(3), danceFillW(2)], +5);
delta('D2(L=1)', fam6o1(1, 2, [[0, 1], [1, 1], ...deep]), 2, [lapK(1), fillWord, sWord(1), danceClean(3)], 0);
delta('D3(g2front)', fam6o1(6, 2, tG2(5)), 8, [fillWord, lapK(9), fillWord, sWord(11), danceClean(2)], +3);
delta('D3(g1front)', fam6o1(6, 2, [[0, 1], [1, 3]]), 8, [fillWord, lapK(9), fillWord, sWord(11), l1Word], +4);
delta('D3(empty)', fam6o1(6, 2, []), 8, [fillWord, lapK(9), fillWord, sWord(11), danceClean(2)], +3);
delta('D4(M\'>=1,E)', fam3(3, 5, 2, []), 3 + 5 + 2, [lapK(5), fillWord, sWord(7), danceClean(2)], 0);
delta('D4(M\'>=1,g2)', fam3(3, 5, 2, tG2(5)), 3 + 5 + 2, [lapK(5), fillWord, sWord(7), danceClean(2)], 0);
delta('D4(M\'=0)', fam3(3, 3, 1, tG2(5)), 3 + 3 + 2, [lapK(3), fillWord, sWord(4), danceClean(2)], 0);
delta('D4(M\'=-1)', fam3(3, 2, 1, []), 3 + 2 + 2, [lapK(2), fillWord, sWord(3), danceFillW(2)], +5);
delta('D4(M\'<=-2)', fam3(3, 1, 1, []), 3 + 1 + 2, [lapK(1), fillWord, sWord(2), { dbl: 7 }], 2 - 3);
delta('D4(g1front)', fam3(3, 3, 2, [[0, 1], [1, 3]]), 3 + 3 + 2, [lapK(3), fillWord, sWord(5), l1Word], +1);
delta('g12(M>=5)', fam12(11, 5, 2, deep), 12, [sWord(5), danceClean(2)], -3);
delta('g12(M=4)', fam12(11, 4, 2, deep), 12, [sWord(4), danceClean(2)], -3);
delta('g12(M=3)', fam12(11, 3, 2, deep), 12, [sWord(3), danceFillW(2)], +2);
delta('g12(M=2)', fam12(11, 2, 2, deep), 12, [sWord(2), { dbl: 12 }], -4);
delta('g12(M=1)', fam12(11, 1, 2, deep), 12, [sWord(1), danceClean(3)], -3);
delta('gE(M>=5)', famGE(11, 5), 12, [sWord(5), danceClean(2)], -3);
delta('gE(M=3)', famGE(11, 3), 12, [sWord(3), danceFillW(2)], +2);
delta('gE(M=2)', famGE(11, 2), 12, [sWord(2), { dbl: 12 }], -4);
delta('gE(M=1)', famGE(14, 1), 15, [sWord(1), danceClean(3)], -3);
delta('g1g1(R>=3)', fam11(35, 3, 4, deep), 36, [sWord(3), l1Word], -2);
delta('g1g1(R=2,g2)', fam11(35, 3, 2, deep), 36, [sWord(3), l1Word], -2);
delta('g2L(M>=2)', fam2L(5, 3, 2, deep), 6, [l1Word], -2);
delta('g4A(R>=3)', fam4A(3, 3, 4, deep), 3 + 3 + 2, [lapK(3), fillWord, sWord(3), l1Word], +1);
delta('g4A(R=2)', fam4A(3, 3, 2, deep), 3 + 3 + 2, [lapK(3), fillWord, sWord(3), l1Word], +1);
delta('outR', [[1, 8]], 10, [fillWord, lapK(11), fillWord, sWord(11), danceClean(2)], +3);

// --- (2) grid closure with the verified closed forms -----------------------------------
// state: [fam, params..., tailFront] where tailFront in {0:'empty',1:(g1,S),2:(g2,S)} + S.
// Era map (family -> list of outputs); 'sink' states counted, not expanded; 'HALT' recorded.
function eraMap(st) {
  const [f, ...p] = st;
  const tf = st[st.length - 2], S = st[st.length - 1]; // tail front encoding
  const core = st.slice(1, -2); // family params without tail encoding
  const T = tf === 0 ? [] : (tf === 1 ? [[0, 1], [1, S]] : [[0, 2], [1, S]]);
  const TRest = st.length > 3 ? [[0, 2], [1, 7]] : []; // simplified: rest fixed empty here
  const out = [];
  const push = (f2, params, dPop) => out.push({ st: [f2, ...params], dPop });
  if (f === 'A') {
    const [L, M, R] = core;
    if (M >= 5) push('A', [L + 3, M - 4, R + 1, tf, S], 0);
    else if (M === 4) push('g6o2', [L + 3, R + 1, tf, S], 0);
    else if (M === 3) {
      if (tf === 2) push('g12', [L + 8, R, S, 0, 0], +5);
      else if (tf === 1 && S >= 2) push('g1g1', [L + 8, R, S - 2, 0, 0], +3);
      else if (tf === 0) push('gE', [L + 8, R, 0, 0], +5);
      else out.push({ st: 'HALT', dPop: 0 });
    } else if (M === 2) { if (L >= 3) push('g5B', [L - 2, 2, R + 1, tf, S], -1); else out.push({ st: 'HALT', dPop: 0 }); }
    else if (M === 1) push('g6o1', [L, R + 1, tf, S], 0);
  } else if (f === 'g5B') {
    const [L, M, R] = core;
    if (L >= 5) push('A', [3, L - 4, M + 1, tf, S], 0);
    else if (L === 4) push('g6o2', [3, M + 1, tf, S], 0);
    else if (L === 3) push('g12', [8, M, R, tf, S], +5);
    else if (L === 1) out.push({ st: 'sink:out-left', dPop: 0 });
    else out.push({ st: 'HALT', dPop: 0 });
  } else if (f === 'g6o1') {
    const [L, R] = core;
    if (L >= 5) push('A', [3, L - 4, 1, R >= 1 ? 1 : 0, R >= 1 ? R : 0], 0); // tail front (g1,R) for R>=1
    else if (L === 4) push('g6o2', [3, 1, R >= 1 ? 1 : 0, R >= 1 ? R : 0], 0);
    else if (L === 3) push('g2L', [8, R, tf, S], +5);
    else if (L === 1) out.push({ st: 'sink:out-left', dPop: 0 });
    else out.push({ st: 'HALT', dPop: 0 });
  } else if (f === 'g6o2') {
    const [L, R] = core;
    if (tf === 1) { if (S >= 2) push('g3L', [L, R, S, tf, S], +4); else out.push({ st: 'HALT', dPop: 0 }); }
    else push('A', [3, L + R - 1, tf === 2 ? S + 1 : 1, tf === 2 ? 2 : 0, tf === 2 ? S : 0], +3);
  } else if (f === 'g3') {
    const [L, M, R] = core;
    const Mp = M + R - 4;
    if (tf === 1) { if (S >= 2) push('g3L2', [L, M + R, S, tf, S], +4); else out.push({ st: 'HALT', dPop: 0 }); }
    else if (Mp >= 1) push('A', [L + 3, Mp, tf === 2 ? S + 1 : 1, tf === 2 ? 2 : 0, tf === 2 ? S : 0], 0);
    else if (Mp === 0) push('g6o2', [L + 3, tf === 2 ? S + 1 : 1, tf === 2 ? 2 : 0, tf === 2 ? S : 0], 0);
    else if (Mp === -1) { if (tf === 2) push('g12', [L + 8, S, 0, 0, 0], +5); else push('outR', [L + 8], +5); }
    else push('g5B', [1, 2, 1, tf, S], 2 - L);
  } else if (f === 'g3L') { // 1^3 0^1 1^(L+R+3) 0^3 1^(S-2) rest, head at block-left: next era
    const [L, R, S] = core;
    push('A', [3, L + R - 1, S - 1, 2, S], -3);
  } else if (f === 'g3L2') {
    const [L, MR, S] = core;
    push('A', [L + 3, MR - 4, S - 1, tf, S], -5);
  } else if (f === 'g12') {
    const [L, M, R] = core;
    if (M >= 5) push('A', [L, M - 4, R + 1, tf, S], -3);
    else if (M === 4) push('g6o2', [L, R + 1, tf, S], -3);
    else if (M === 3) { if (tf === 2) push('g12', [L + 5, R, S, 2, S], +2); else if (tf === 1 && S >= 2) push('g1g1', [L + 5, R, S, 1, S], +2); else if (tf === 0) push('gE', [L + 5, R, 0, 0], +2); else out.push({ st: 'HALT', dPop: 0 }); }
    else if (M === 2) push('g5B', [L - 5, 2, R + 1, tf, S], -4);
    else push('g6o1', [L - 3, R + 1, tf, S], -3);
  } else if (f === 'gE') {
    const [L, M] = core;
    if (M >= 5) push('A', [L, M - 4, 1, 0, 0], -3);
    else if (M === 4) push('g6o2', [L, 1, 0, 0], -3);
    else if (M === 3) push('outR', [L + 5], +2);
    else if (M === 2) push('g5B', [L - 5, 2, 1, 0, 0], -4);
    else push('g6o1', [L - 3, 1, 0, 0], -3);
  } else if (f === 'g1g1') {
    const [L, M, R] = core;
    if (R >= 3) push('g3', [L, M, R - 2, tf, S], -2);
    else if (R === 2) {
      if (tf === 2) push('g3', [L, M, S, 0, 0], -2);
      else if (tf === 1) out.push({ st: 'sink:g1g1-R2-g1front', dPop: -1 });
      else out.push({ st: 'sink:g1g1-R2-empty', dPop: -1 });
    } else out.push({ st: 'HALT', dPop: 0 });
  } else if (f === 'g2L') {
    const [L, M] = core;
    if (M >= 2) out.push({ st: 'sink:g4', dPop: -2 });
    else out.push({ st: 'HALT', dPop: 0 });
  } else if (f === 'g4A') {
    const [L, M, R] = core;
    if (R >= 3) push('g3', [L + 3, M, R - 2, tf, S], +1);
    else if (R === 2) { if (tf === 2) push('A', [L + 3, M, S, 2, S], +1); else out.push({ st: 'sink:g4A-R2', dPop: +1 }); }
    else out.push({ st: 'HALT', dPop: 0 });
  } else if (f === 'outR') {
    const [L] = core;
    push('A', [3, L - 1, 1, 0, 0], +3);
  } else out.push({ st: st[0], dPop: 0 }); // already a sink
  return out;
}
const isHaltInput = st => {
  const [f, ...p] = st; const core = st.slice(1, -2); const tf = st[st.length - 2], S = st[st.length - 1];
  if (f === 'g5B') return core[0] === 2;
  if (f === 'g6o1') return core[0] === 2;
  if (f === 'g6o2') return tf === 1 && S === 1;
  if (f === 'g3') return tf === 1 && S === 1;
  if (f === 'g1g1') return core[2] === 1;
  if (f === 'g2L') return core[1] === 1;
  if (f === 'g4A') return core[2] === 1;
  return false;
};
const tailHasG11 = st => st[st.length - 2] === 1 && st[st.length - 1] === 1;

// seed: blank -> first marker 1^3 @t=8 -> era -> outR(5) (composition verified separately)
let frontier = [['g6o1', 8, 0, 0, 0]]; // = the L0 marker era output 1^8 @gap[1] (verified in casecheck-dispatch)
const seen = new Set(); const halts = []; const g11creations = []; const sinks = {};
let rounds = 0;
while (frontier.length && rounds < 50) {
  rounds++;
  const next = [];
  for (const st of frontier) {
    const key = st.join(',');
    if (seen.has(key)) continue; seen.add(key);
    if (isHaltInput(st)) { halts.push(key); continue; }
    if (tailHasG11(st)) g11creations.push(key);
    if (typeof st[0] === 'string' && st[0].startsWith('sink:')) { sinks[st[0]] = (sinks[st[0]] || 0) + 1; continue; }
    for (const o of eraMap(st)) {
      if (o.st === 'HALT') { halts.push('edge:' + key); continue; }
      if (typeof o.st === 'string' && o.st.startsWith('sink:')) { sinks[o.st] = (sinks[o.st] || 0) + 1; continue; }
      // grid bound
      const params = o.st.slice(1, -2);
      if (params.some(v => v > GRID || v < -GRID)) continue;
      if (o.st[o.st.length - 1] > SMAX) continue;
      next.push(o.st);
    }
  }
  frontier = next;
}
console.log(`(closure: ${seen.size} states, ${rounds} rounds; sinks: ${JSON.stringify(sinks)})`);
check('INV: no reachable halt-input state', halts.length === 0, halts.slice(0, 5).join(' | '));
check('INV-T: no (g1,1) tail pair ever created', g11creations.length === 0, g11creations.slice(0, 5).join(' | '));
{
  const famL = f => [...seen].filter(k => k.startsWith(f + ',')).map(k => k.split(',').map(Number));
  const g5BL = famL('g5B').map(a => a[1]); const g6o1L = famL('g6o1').map(a => a[1]);
  const AL = famL('A').map(a => a[1]); const g2LM = famL('g2L').map(a => a[2]); const g11R = famL('g1g1').map(a => a[3]);
  check('INV-L: 2 not in g5B-L', !g5BL.includes(2), `g5B-L set: ${[...new Set(g5BL)].sort((a, b) => a - b)}`);
  check('INV-L: 2 not in g6o1-L', !g6o1L.includes(2), `g6o1-L set: ${[...new Set(g6o1L)].sort((a, b) => a - b)}`);
  check('INV-L: 3 not in g6o1-L', !g6o1L.includes(3), `g6o1-L set: ${[...new Set(g6o1L)].sort((a, b) => a - b)}`);
  check('INV-L: {4,5} not in A-L', !AL.includes(4) && !AL.includes(5), `A-L set: ${[...new Set(AL)].sort((a, b) => a - b)}`);
  check('INV-M: 1 not in g2L-M', !g2LM.includes(1), `g2L-M set: ${[...new Set(g2LM)].sort((a, b) => a - b)}`);
  check('INV-R: 1 not in g1g1-R', !g11R.includes(1), `g1g1-R set: ${[...new Set(g11R)].sort((a, b) => a - b)}`);
}
summary('casecheck-entry');
