// UNIT-LEVEL INVARIANT for BMO 10.
// Word = ...10#10# (periodic) followed by units (#^r, B): maximal #-runs and the
// finite nonempty blocks between them, ending with the tail (infinite 0s).
// Rules at the LAST # of a run r facing block B:
//   R1 (B starts '0') : previous block A += '1'; if r>=2: run r-1, B -> B[1:]
//                       if r==1: run dies, A and B[1:] FUSE: A + '1' + B[1:]
//   R2 (B starts '100'): A += '000'; run unchanged (r); B -> B[3:]
//   R3 (B starts '110'): A += '000'; run unchanged (r); B -> B[3:]
//   R4 (B starts '1010'): A += '1010'; run r+1; B -> B[4:]
// (R2/R3: the leftover r-1 #s and the new # fuse through the empty gap into run r.)
// Tokens: runs capped at 9 (= >=9). Blocks from a finite set learned from data.
// Plan: learn block set + allowed unit n-grams from reachable data; differential-test
// the unit engine vs the string engine on ALL transitions; then closure-check.
import { RULESETS, bfs, windowOf, activePositions } from './game.mjs';

const rs = RULESETS.bmo10;
const DEPTH = parseInt(process.argv[2] || '60');
const NGRAM = parseInt(process.argv[3] || '3');
const CTXLEN = parseInt(process.argv[4] || '8');

const RCAP = 9; // run token 9 means >=9

export function parseUnits(W) {
  // W = virtual window string. Returns array of units {r, B} for the part after the
  // leading periodic context, plus we prepend periodic units separately.
  // We scan W from index 6 (S region) but the boundary # at index 5 belongs to the
  // first run if S starts with #s... handled by caller passing full window.
  const units = [];
  let i = 0;
  while (i < W.length) {
    // expect a run of #s (at least... could be zero only at start)
    let r = 0;
    while (i < W.length && W[i] === '#') { r++; i++; }
    if (r === 0) break; // no more runs (only fill zeros remain)
    // block after the run (until next # or end); trailing zeros = TAIL marker
    let j = i;
    while (j < W.length && W[j] !== '#') j++;
    let B = W.slice(i, j);
    // if this run of block reaches the window end, the block is finite-prefix of
    // the infinite zero tail: strip trailing zeros -> TAIL if any stripped and rest
    let tail = false;
    if (j === W.length) {
      // B is inside the fill+tail region: strip trailing zeros
      let k = B.length; while (k > 0 && B[k - 1] === '0') k--;
      if (k < B.length) { tail = true; B = B.slice(0, k); }
    }
    units.push({ r, B: B || '', tail });
    i = j;
  }
  return units;
}

export function tok(u) { return Math.min(u.r, RCAP) + ':' + (u.tail ? (u.B ? u.B + '|' : '') + 'T' : (u.B === '' ? 'E' : u.B)); }
// T = infinite zero tail follows (possibly after finite block content B)
// E = empty block, no tail (cannot happen at end; interior empty impossible after canonical merge)

// ---- learn block inventory and unit n-grams ----
const r = bfs(rs, DEPTH, 5000000, 900);
const states = [...r.visited.keys()];
console.error(`states: ${states.length}`);
const blockSet = new Set();
const allowed = new Set();
let badBlocks = 0;
const unitSeqs = new Map(); // S -> token seq (cache)
for (const S of states) {
  const W = windowOf(S); // '10#10#' + S + zeros
  const units = parseUnits(W.slice(5)); // include the boundary # at W[5]
  const seq = [];
  seq.push('1:10', '1:10', '1:10'); // periodic prefix units
  for (const u of units) {
    seq.push(tok(u));
    if (!u.tail && u.B !== '') blockSet.add(u.B);
  }
  for (let n = 1; n <= NGRAM; n++)
    for (let i = 0; i + n <= seq.length; i++) allowed.add(seq.slice(i, i + n).join(' '));
  unitSeqs.set(S, seq);
}
console.error(`distinct blocks: ${blockSet.size}, max len ${Math.max(...[...blockSet].map(b => b.length))}`);
console.error(`allowed unit n-grams (<=${NGRAM}): ${allowed.size}`);
const maxBlock = Math.max(...[...blockSet].map(b => b.length));
for (const b of blockSet) if (b.includes('111') || b.includes('1011')) { console.error('BLOCK CONTAINS GOAL PATTERN', b); process.exit(1); }

// ---- unit-level rule engine ----
// seq: array of tokens 'r:B' (B possibly 'x|T' tail form, 'E', '10', 'T')
function detok(t) {
  const c = t.indexOf(':');
  let r = parseInt(t.slice(0, c));
  let B = t.slice(c + 1);
  let tail = false;
  if (B.endsWith('|T')) { tail = true; B = B.slice(0, -2); }
  else if (B === 'T') { tail = true; B = ''; }
  else if (B === 'E') B = '';
  return { r, B, tail };
}
function maketok(u) { return Math.min(u.r, RCAP) + ':' + (u.tail ? (u.B ? u.B + '|' : '') + 'T' : (u.B === '' ? 'E' : u.B)); }

// apply rule at unit index p (p>=3 required in practice; unit p = (#run, block);
// fire at the LAST # of the run). String-accurate semantics:
//  R1 (B+fill starts '0'):  x #^r 0 y -> x #^{r-1} 1 y     (r>=2)
//                           x # 0 y    -> x 1 y            (r=1: fuse into A)
//  R2 (B+fill starts '100'): x #^r 100 y -> x #^{r-1} 000 # y   (r>=2)
//                            x # 100 y    -> x 000 # y         (r=1: '000' fuses onto A)
//  R3: same as R2 with '110'.
//  R4 (B+fill starts '1010'): x #^r 1010 y -> x #^{r-1} 1010 ## y (r>=2)
//                             x # 1010 y    -> x 1010 ## y        (r=1: '1010' fuses onto A)
// The block B may extend into the infinite 0-tail. Emptied non-tail blocks merge runs.
// Boundary (p==3): A is the (infinite) periodic '10' supply: keep 3 periodic units.
export function applyUnit(seqToks, p) {
  const u = detok(seqToks[p]);
  if (p < 3) return null;
  const A = detok(seqToks[p - 1]);
  const isBoundary = p === 3; // A is periodic material '10' (index 2); infinite supply
  const Bx = u.B + (u.tail ? '00000000' : ''); // pattern view incl. tail
  const out = [];
  const emit = (preUnits, midUnits, postIdx) => {
    // seq = preUnits ++ midUnits ++ seqToks(postIdx..)
    let arr = [...preUnits, ...midUnits, ...seqToks.slice(postIdx)];
    // post-merge: a unit with empty non-tail block merges its run into the NEXT unit's run
    const merged = [];
    for (const t of arr) {
      const d = detok(t);
      if (!d.tail && d.B === '' && d.r >= 1 && merged.length) {
        // merge into next: peek
        // handled below by lazy pass
      }
      merged.push(t);
    }
    // lazy merge pass
    const res = [];
    for (let i = 0; i < merged.length; i++) {
      const d = detok(merged[i]);
      if (!d.tail && d.B === '' && d.r >= 1 && i + 1 < merged.length && i >= 3) {
        const nxt = detok(merged[i + 1]);
        res.push(maketok({ r: Math.min(RCAP + 1, d.r + nxt.r) > RCAP ? RCAP : d.r + nxt.r, B: nxt.B, tail: nxt.tail }));
        i++;
        continue;
      }
      res.push(maketok(d));
    }
    out.push(res);
  };
  const rVariants = (r) => (r >= RCAP ? [RCAP - 1, RCAP] : [r]); // r=9 token means >=9
  const decVariants = u.r >= RCAP ? [RCAP - 1, RCAP] : (u.r - 1 >= 1 ? [u.r - 1] : [0]); // decrement of u.r

  if (Bx.startsWith('0')) {
    const rest = u.B.slice(1), restTail = u.tail;
    for (const nr of u.r >= 2 ? decVariants : [0]) {
      // nr = new run length at this unit (u.r-1), or 0 = run died
      if (nr >= 1) {
        const newB = '1' + rest;
        emit(isBoundary ? ['1:10', '1:10', '1:10'] : seqToks.slice(0, p),
          [maketok({ r: nr, B: newB, tail: restTail })], p + 1);
      } else {
        // r=1: fuse A with '1'+rest
        if (isBoundary) {
          emit(['1:10', '1:10', '1:10'], [maketok({ r: 1, B: '10' + '1' + rest, tail: restTail })], p + 1);
        } else {
          emit(seqToks.slice(0, p - 1),
            [maketok({ r: A.r, B: A.B + '1' + rest, tail: restTail })], p + 1);
        }
      }
    }
    return dedup(out);
  }
  if (Bx.startsWith('100') || Bx.startsWith('110')) {
    const rest = u.B.slice(3), restTail = u.tail;
    for (const nr of u.r >= 2 ? decVariants : [0]) {
      if (nr >= 1) {
        emit(isBoundary ? ['1:10', '1:10', '1:10'] : seqToks.slice(0, p),
          [maketok({ r: nr, B: '000', tail: false }), maketok({ r: 1, B: rest, tail: restTail })], p + 1);
      } else {
        if (isBoundary) {
          emit(['1:10', '1:10', '1:10'],
            [maketok({ r: 1, B: '10' + '000', tail: false }), maketok({ r: 1, B: rest, tail: restTail })], p + 1);
        } else {
          emit(seqToks.slice(0, p - 1),
            [maketok({ r: A.r, B: A.B + '000', tail: false }), maketok({ r: 1, B: rest, tail: restTail })], p + 1);
        }
      }
    }
    return dedup(out);
  }
  if (Bx.startsWith('1010')) {
    const rest = u.B.slice(4), restTail = u.tail;
    for (const nr of u.r >= 2 ? decVariants : [0]) {
      if (nr >= 1) {
        emit(isBoundary ? ['1:10', '1:10', '1:10'] : seqToks.slice(0, p),
          [maketok({ r: nr, B: '1010', tail: false }), maketok({ r: 2, B: rest, tail: restTail })], p + 1);
      } else {
        if (isBoundary) {
          emit(['1:10', '1:10', '1:10'],
            [maketok({ r: 1, B: '10' + '1010', tail: false }), maketok({ r: 2, B: rest, tail: restTail })], p + 1);
        } else {
          emit(seqToks.slice(0, p - 1),
            [maketok({ r: A.r, B: A.B + '1010', tail: false }), maketok({ r: 2, B: rest, tail: restTail })], p + 1);
        }
      }
    }
    return dedup(out);
  }
  return null;
}
function dedup(a) { return [...new Set(a.map(x => x.join(' ')))].map(x => x.split(' ')); }

// ---- DIFFERENTIAL TEST vs string engine over all transitions ----
function reunitize(S2) {
  const W = windowOf(S2);
  const units = parseUnits(W.slice(5));
  const seq = ['1:10', '1:10', '1:10'];
  for (const u of units) seq.push(tok(u));
  return seq;
}
let dtest = 0, dfail = 0, blocksOutside = 0;
for (const S of states) {
  const seq = unitSeqs.get(S);
  const act = activePositions(S, rs);
  for (const vi of act) {
    const S2 = strApply(S, vi);
    // which unit fired? vi is a W-index; units start at W-index 5 (boundary #).
    const si = vi - 5; // coordinate within W.slice(5)
    let p = null;
    {
      const units = parseUnits(windowOf(S).slice(5));
      let idx = 3, pos = 0;
      for (const u of units) {
        if (si >= pos && si < pos + u.r) { p = idx; break; }
        pos += u.r + u.B.length;
        idx++;
      }
    }
    if (p === null) { console.error('MAPFAIL', S, vi); dfail++; continue; }
    const expected = reunitize(S2);
    const outs = applyUnit(seq, p);
    dtest++;
    // block-set check on expected
    for (const t of expected) { const u = detok(t); if (!u.tail && u.B !== '' && u.B !== '10' && !blockSet.has(u.B)) blocksOutside++; }
    if (!outs) { console.error('DIFF no-fire', S, vi, seq.join(' '), 'p=' + p); dfail++; continue; }
    const ok = outs.some(o => o.join(' ') === expected.join(' '));
    if (!ok) { if (dfail < 8) console.error('DIFF', S, vi, 'exp', expected.join(' '), 'got', outs.map(o => o.join(' ')).join(' | ')); dfail++; }
  }
}
console.error(`differential: ${dtest} transitions, ${dfail} failures, ${blocksOutside} out-of-set blocks in successors`);
if (dfail > 0) process.exit(1);
if (blocksOutside > 0) { console.error('BLOCK SET NOT CLOSED under one step -> extend set or fail'); }
// save artifacts for the closure phase
import { writeFileSync } from 'node:fs';
writeFileSync('unit-blocks.json', JSON.stringify({ blocks: [...blockSet], allowed: [...allowed], NGRAM, RCAP, maxBlock, dtest, dfail, blocksOutside, states: states.length }, null, 1));
console.error('wrote unit-blocks.json');
function strApply(S, vi) {
  const V = windowOf(S);
  let p = -1;
  for (let q = 0; q < rs.pats.length; q++) {
    const lhs = rs.pats[q][0];
    let ok = true;
    for (let j = 0; j < lhs.length; j++) if (V[vi + 1 + j] !== lhs[j]) { ok = false; break; }
    if (ok) { p = q; break; }
  }
  if (p < 0) throw new Error('inactive');
  const [lhs, rhs] = rs.pats[p];
  const V2 = V.slice(0, vi) + rhs + V.slice(vi + 1 + lhs.length);
  const S2 = vi === 5 ? V2.slice(3) : V2.slice(6);
  let s = S2;
  while (s.startsWith('10#')) s = s.slice(3);
  return s.replace(/0+$/, '');
}
