// Verify the structural hypothesis on reachable states:
//   S  decodes as  W = ...10#10#10#  .  S  .  0^inf
//   Hypothesis: S = A . (10##)^j . R   with A in a small finite set,
//   R (right end) in a finite set, j >= 0 highway counter.
// Tabulate (A, R) pairs vs depth; check stabilization and whether the
// rightmost # ever sits inside the highway (it shouldn't - highway #s inactive).
import { RULESETS, bfs, tailOf } from './game.mjs';

const DEPTH = parseInt(process.argv[2] || '60');
const rs = RULESETS.bmo10;
const r = bfs(rs, DEPTH, 5000000, 900);
const states = [...r.visited.keys()];
const depthOf = (S) => r.visited.get(S).depth;
console.error(`bfs: ${states.length} states`);

// strip leading "10##" units repeatedly; return {pre, j, R}
// pre = the part of S before the highway
function decompose(S) {
  // candidate: find maximal j >= 0 s.t. S = A (10##)^j R with A as long as possible?
  // Instead: find the LAST occurrence where a highway can start: try all splits.
  // Simpler operational def: let A = longest prefix of S that contains no "##" at all? no...
  // Empirical: highway = maximal run of "10##" units somewhere in the middle.
  // We try: for each j from high to low and each A-length, S = A + "10##"*j + R with
  // R not starting with "10##" (maximal j). Take the split with max j; tie -> longest A? no, shortest A?
  // Cleanest: R = shortest suffix s.t. remainder = A + (10##)^j. Compute greedily:
  // strip "10##" from the RIGHT? Highway units could be stripped from right only if R starts "10##" - excluded.
  // Do: while S ends with... no. Use: find all positions p where "10##" repeats to the end-ish...
  // Operational: Rmax = S; j = 0;
  // while (Rmax.startsWith('10##')) { Rmax = Rmax.slice(4); j++; }
  // pre = '' -> this assumes A empty. General: try every split point for A.
  let best = null;
  for (let a = 0; a <= Math.min(S.length, 8); a++) {
    const A = S.slice(0, a);
    let rest = S.slice(a), j = 0;
    while (rest.startsWith('10##')) { rest = rest.slice(4); j++; }
    const R = rest;
    if (!best || j > best.j || (j === best.j && R.length < best.R.length)) best = { A, j, R };
  }
  return best;
}

const table = new Map(); // key A + '|' + R -> max depth seen
const rlen = new Map();
for (const S of states) {
  const d = decompose(S);
  const key = d.A + '|' + d.R;
  const e = table.get(key) || { count: 0, maxDepth: -1 };
  e.count++; e.maxDepth = Math.max(e.maxDepth, depthOf(S));
  table.set(key, e);
  rlen.set(d.R.length, (rlen.get(d.R.length) || 0) + 1);
}
console.log(`distinct (A,R) pairs: ${table.size}`);
const As = new Set([...table.keys()].map(k => k.split('|')[0]));
console.log(`distinct A prefixes: ${As.size}:`, [...As].sort().join(' '));
console.log(`R length distribution:`, [...rlen.entries()].sort((a,b)=>a[0]-b[0]).map(([k,v])=>`${k}:${v}`).join(' '));
const sorted = [...table.entries()].sort((a,b) => b[1].maxDepth - a[1].maxDepth);
console.log('max |R| =', Math.max(...[...table.keys()].map(k => k.split('|')[1].length)));
console.log('deepest (A,R) keys:');
for (const [k, v] of sorted.slice(0, 10)) console.log(`  depth<=${v.maxDepth} x${v.count}: A="${k.split('|')[0]}" R="${k.split('|')[1]}"`);

// stabilization: which keys are attained at exactly depth DEPTH?
const atTop = [...table.entries()].filter(([k, v]) => v.maxDepth >= DEPTH - 2);
console.log(`keys with maxDepth >= ${DEPTH - 2}: ${atTop.length}`);

// does the rightmost # ever sit "inside" highway? i.e. is tailOf ever starting with "10##"?
// goal-relevant: highway #s followed by "10#..." are inactive; check that in all states,
// the RIGHTMOST # is the last # of S and the tail avoids 111/1011 (already known).
// Also: check every highway # followed by 10# pattern or 10R-head -> active only if R allows.
let rightmostInsideHighway = 0;
for (const S of states) {
  // last # position; check if the 4 symbols before it are "10##" and it's not the R-region start
}
// simpler stat: tail heads starting "10##"? impossible (tail after rightmost # has no #)... skip.

// print all R with their max depth (for finite-set certificate)
const Rset = new Map();
for (const [k, v] of table) { const R = k.split('|')[1]; const e = Rset.get(R) || 0; Rset.set(R, Math.max(e, v.maxDepth)); }
console.log(`distinct R values: ${Rset.size}`);
console.log(JSON.stringify([...Rset.entries()].sort((a,b)=>b[1]-a[1]).slice(0, 400)));
