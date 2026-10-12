// Structural analysis of the forward-reachable set for BMO10.
import { RULESETS, canon, activePositions, applyAt, tailOf, isGoal, bfs } from './game.mjs';

const rs = RULESETS.bmo10;
const DEPTH = parseInt(process.argv[2] || '60');
const r = bfs(rs, DEPTH, 5000000, 600);
const states = [...r.visited.keys()];
console.log(`visited=${states.length} result=${r.result}`);

// 1. tail heads (first 10 symbols) reachable
const tails = new Set(), tails8 = new Map();
// 2. suffix of block before rightmost #, first 10 symbols left of the last #
const us = new Set();
// 3. windows: for each state, max ones in any 4-window of tail (first 24 symbols)
let maxOnes4 = 0, maxOnes4State = '';
// where does "11" appear in tails (offset from head), min offset seen
let min11 = Infinity, min11State = '';
// does any visited state contain "111" or "1011" ANYWHERE in S (not just tail)?
let any111 = [], any1011 = [];
// full-S structure: collect all S, look at which substrings appear
const substr8 = new Map();

for (const S of states) {
  const t = tailOf(S);
  tails.add(t.slice(0, 10));
  tails8.set(t.slice(0, 8), (tails8.get(t.slice(0, 8)) || 0) + 1);
  const li = S.lastIndexOf('#');
  if (li >= 0) us.add(S.slice(Math.max(0, li - 10), li));
  // ones in 4-windows of first 24 tail symbols
  for (let i = 0; i + 4 <= Math.min(24, t.length); i++) {
    const w = t.slice(i, i + 4);
    const ones = (w.match(/1/g) || []).length;
    if (ones > maxOnes4) { maxOnes4 = ones; maxOnes4State = S; }
    const j = w.indexOf('11');
    if (j >= 0 && i + j < min11) { min11 = i + j; min11State = S; }
  }
  if (S.includes('111')) any111.push(S);
  if (S.includes('1011')) any1011.push(S);
  for (let i = 0; i + 8 <= S.length; i++) {
    const w = S.slice(i, i + 8);
    substr8.set(w, (substr8.get(w) || 0) + 1);
  }
}

console.log(`distinct tail-heads(10): ${tails.size}`);
console.log([...tails].sort().map(t => '  ' + t).join('\n'));
console.log(`distinct u-suffixes(before last #): ${us.size}`);
console.log([...us].sort().slice(0, 80).map(t => '  ' + t).join('\n'));
console.log(`max ones in any 4-window of tail head: ${maxOnes4}  e.g. ${maxOnes4State}`);
console.log(`min offset of "11" in tail head: ${min11 === Infinity ? 'none' : min11}  e.g. ${min11State}`);
console.log(`states containing 111 anywhere: ${any111.length}  e.g. ${any111.slice(0,5)}`);
console.log(`states containing 1011 anywhere: ${any1011.length}  e.g. ${any1011.slice(0,5)}`);

// 4. Try to see if every visited S lies in a simple regular language.
// Hypothesis battery: test each regex against ALL visited states.
function testRe(name, re) {
  const bad = states.filter(S => !re.test(S));
  console.log(`regex ${name}: violations ${bad.length}${bad.length ? ' e.g. ' + bad.slice(0,3).join(' ; ') : ''}`);
}
// language guesses (to be refined by looking at actual states)
testRe('no 111', /^(?!.*111)/);
testRe('no 1011', /^(?!.*1011)/);
testRe('no 111 & no 1011', /^(?!.*111)(?!.*1011)/);
testRe('no ## inside except from R4 (i.e. ## always preceded by 1010)', /^(?!.*(?<!1010)##)/);
testRe('every # followed by 1 or is rightmost-ish...', /x^/);

// 5. longest common structural summary: print states at exactly depth DEPTH (sample)
const atDepth = states.filter(S => r.visited.get(S).depth === DEPTH);
console.log(`states at depth ${DEPTH}: ${atDepth.length}; sample:`);
console.log(atDepth.slice(0, 12).map(s => '  ' + s).join('\n'));

// 6. distribution of nActive
const na = new Map();
for (const S of states) { const a = activePositions(S, rs).length; na.set(a, (na.get(a)||0)+1); }
console.log('active-#-count distribution:', [...na.entries()].sort().map(([k,v])=>`${k}:${v}`).join(' '));

// 7. # counts
const hc = new Map();
for (const S of states) { const h = (S.match(/#/g)||[]).length; hc.set(h, (hc.get(h)||0)+1); }
console.log('#-count distribution in S:', [...hc.entries()].sort().map(([k,v])=>`${k}:${v}`).join(' '));
