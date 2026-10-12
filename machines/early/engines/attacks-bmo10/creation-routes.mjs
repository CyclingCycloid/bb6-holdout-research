// Exhaustively enumerate ALL one-step creation routes for 111 and 1011:
// for each rule, for every context (4 symbols left, 5 right), if the pre-window
// avoids {111,1011} but the post-window contains one, record the danger context
// (the minimal pre-context that must be excluded for the invariant to be inductive).
// Then test each danger context against (a) BFS-depth-84 data is unavailable as strings;
// use (b) deep random/rightmost play corpus presence.
import { RULESETS, activePositions, applyAt, windowOf } from './game.mjs';

const rs = RULESETS.bmo10;
const GOAL = ['111', '1011'];
const has = (w, pats) => pats.some(p => w.includes(p));

// enumerate contexts
function allWords(n) {
  const out = [''];
  for (let i = 0; i < n; i++) { const nx = []; for (const p of out) for (const a of ['0', '1', '#']) nx.push(p + a); out.length = 0; out.push(...nx); }
  return out;
}
const L4 = allWords(4), R5 = allWords(5);
const dangers = [];
for (let pi = 0; pi < rs.pats.length; pi++) {
  const [lhs, rhs] = rs.pats[pi];
  for (const Lc of L4) for (const Rc of R5) {
    const W1 = Lc + '#' + lhs + Rc;
    if (has(W1, GOAL)) continue;
    const W2 = Lc + rhs + Rc;
    if (has(W2, GOAL)) {
      // find the created instance and the minimal pre-substring responsible:
      // record the window around the seam: Lc[-2:] + '#' + lhs + Rc[:3]
      dangers.push({ rule: pi, W1: Lc + '#' + lhs + Rc, W2, seam: Lc.slice(-3) + '#' + lhs + Rc.slice(0, 4) });
    }
  }
}
console.log(`total danger contexts: ${dangers.length}`);
// dedupe by seam window
const bySeam = new Map();
for (const d of dangers) {
  const key = d.seam;
  if (!bySeam.has(key)) bySeam.set(key, []);
  bySeam.get(key).push(d);
}
console.log(`distinct seam windows: ${bySeam.size}`);
const seams = [...bySeam.keys()].sort();
console.log(seams.join('\n'));

// now: deep-play corpus presence check
console.log('\npresence in deep play (1.2M rewrites corpus + BFS-84 states re-derived? we use plays):');
// collect corpus of visited windows along plays
const corpus = [];
let S = '';
for (let i = 0; i < 400000; i++) {
  const act = activePositions(S, rs);
  if (!act.length) break;
  S = applyAt(S, act[act.length - 1], rs);
  if (i % 13 === 0) corpus.push(windowOf(S));
}
let rnd = (() => { let x = 12345; return () => (x = (x * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff; })();
for (let i = 0; i < 400000; i++) {
  const act = activePositions(S, rs);
  if (!act.length) break;
  S = applyAt(S, act[Math.floor(rnd() * act.length)], rs);
  if (i % 13 === 0) corpus.push(windowOf(S));
}
console.log('corpus windows:', corpus.length);
const present = (s) => corpus.some(w => w.includes(s));
for (const s of seams) {
  console.log(`  ${JSON.stringify(s)} : ${present(s) ? 'PRESENT (ladder fails here - must be refined)' : 'absent (candidate blocker)'}`);
}
// also the core invariant set and 11#/1#01/#011:
console.log('\ncore invariant patterns in corpus:');
for (const s of ['111', '1011', '11#', '1#01', '#011', '1#0#', '#0#01', '#100011', '#110011', '#1010011']) {
  console.log(`  ${JSON.stringify(s)} : ${present(s) ? 'PRESENT' : 'absent'}`);
}
