// BMO 10 / BMO 11 rewrite-game simulator.
//
// Word representation: W = ...#10#10#10# . S . 0000...  where the left part is the
// infinite periodic repetition of "10#" (ending with #), S is a finite string over
// {0,1,#}, and the right part is all 0s forever.
//
// Canonical form of S: (a) absorb leading "10#" units into the periodic part,
// (b) strip trailing '0's (they are part of the 0-inf fill).
//
// A '#' is active iff the symbols following it (using the periodic/zero fills)
// start with one of the rule LHS patterns. Note: at any given # at most one
// pattern can match (patterns are pairwise prefix-incompatible), so "which rule
// fires at this #" is well defined; the only choice in the game is WHICH active #.
//
// Modes:
//   node game.mjs play  <ruleset> <rightmost|leftmost|random> <nsteps>
//   node game.mjs bfs   <ruleset> <maxdepth> <maxstates> [maxlen]
//   node game.mjs replay <ruleset> <k1,k2,k3,...>     (k = 0-based index among active #s, left-to-right)
//   node game.mjs stats <ruleset> <maxdepth> <maxstates>   (reachable tail-head stats)

import assert from 'node:assert';

export const RULESETS = {
  bmo10: {
    name: 'BMO10',
    // LHS after '#', RHS
    pats: [['0', '1'], ['100', '000#'], ['110', '000#'], ['1010', '1010##']],
    ruleNames: ['R1:#0->1', 'R2:#100->000#', 'R3:#110->000#', 'R4:#1010->1010##'],
    // rightmost # inactive iff tail starts with one of these:
    inactiveTails: ['111', '1011'],
  },
  bmo11: {
    name: 'BMO11',
    pats: [['0', '1'], ['100', '010#'], ['1010', '1010##'], ['10110', '10101'], ['11', '10']],
    ruleNames: ['R1:#0->1', 'R2:#100->010#', 'R3:#1010->1010##', 'R4:#10110->10101', 'R5:#11->10'],
    inactiveTails: ['10111'],
  },
};

const PAD = 12; // zeros appended for matching/goal purposes (max LHS len is 5)
const LEFTCTX = '10#10#'; // the last unit of the periodic part, ending at the boundary #

export function canon(S) {
  while (S.startsWith('10#')) S = S.slice(3);
  return S.replace(/0+$/, '');
}

// virtual window
export function windowOf(S) {
  return LEFTCTX + S + '0'.repeat(PAD);
}

// find rule index matching at '#' position i of V, or -1
function matchAt(V, i, rs) {
  assert(V[i] === '#');
  for (let p = 0; p < rs.pats.length; p++) {
    const lhs = rs.pats[p][0];
    let ok = true;
    for (let j = 0; j < lhs.length; j++) {
      if (V[i + 1 + j] !== lhs[j]) { ok = false; break; }
    }
    if (ok) return p;
  }
  return -1;
}

// all active '#' positions in V, ascending (indices >= 5; index 5 is the boundary #)
export function activePositions(S, rs) {
  const V = windowOf(S);
  const out = [];
  for (let i = 5; i < V.length; i++) {
    if (V[i] === '#' && matchAt(V, i, rs) >= 0) out.push(i);
  }
  return out;
}

// apply rule at V-index i; returns new canonical S
export function applyAt(S, i, rs) {
  const V = windowOf(S);
  assert(V[i] === '#');
  const p = matchAt(V, i, rs);
  if (p < 0) throw new Error('not active at ' + i);
  const [lhs, rhs] = rs.pats[p];
  const V2 = V.slice(0, i) + rhs + V.slice(i + 1 + lhs.length);
  // If the boundary # (i==5) was consumed, the periodic/S boundary moves left:
  // V2[0..4] = "10#10" is still pristine periodic; the last pristine # is V2[2].
  // New S starts after it, i.e. at V2 index 3 (this re-attaches "10" to S; canon
  // will re-absorb leading "10#" units if the word allows shifting back).
  const S2 = i === 5 ? V2.slice(3) : V2.slice(6);
  return canon(S2);
}

// tail after the rightmost '#'
export function tailOf(S) {
  const li = S.lastIndexOf('#');
  return (li < 0 ? S : S.slice(li + 1)) + '0'.repeat(PAD);
}

export function isGoal(S, rs) {
  const t = tailOf(S);
  return rs.inactiveTails.some((g) => t.startsWith(g));
}

// number of #s in the "disturbed" window S plus boundary
export function hashCount(S) {
  let c = (S.match(/#/g) || []).length;
  return c;
}

// pretty word for display: show 4 units of left context + S + right zeros
export function pretty(S) {
  return '#10#10#10#10' + '|' + S + '|000...';
}

// ---- deterministic play ----
export function play(rs, strategy, nsteps, S0 = '') {
  let S = canon(S0);
  const hist = [];
  for (let step = 0; step < nsteps; step++) {
    const act = activePositions(S, rs);
    if (isGoal(S, rs)) { hist.push({ step, S, goal: true }); return hist; }
    if (act.length === 0) { hist.push({ step, S, stuck: true }); return hist; }
    let i;
    if (strategy === 'rightmost') i = act[act.length - 1];
    else if (strategy === 'leftmost') i = act[0];
    else i = act[Math.floor(Math.random() * act.length)];
    const V = windowOf(S);
    const p = matchAt(V, i, rs);
    const S2 = applyAt(S, i, rs);
    hist.push({ step, S, i, p, S2, nActive: act.length });
    S = S2;
  }
  return hist;
}

// apply by k-th active position (0-based left-to-right); for replaying witnesses
export function applyK(S, k, rs) {
  const act = activePositions(S, rs);
  if (k < 0 || k >= act.length) throw new Error(`no active # index ${k} (have ${act.length})`);
  return applyAt(S, act[k], rs);
}

// ---- BFS ----
export function bfs(rs, maxDepth, maxStates, maxLen = 400, verbose = false) {
  const S0 = '';
  const visited = new Map(); // S -> {prev, moveK, depth}
  visited.set(S0, { prev: null, moveK: -1, depth: 0 });
  let frontier = [S0];
  let found = null;
  for (let d = 1; d <= maxDepth && !found; d++) {
    const next = [];
    for (const S of frontier) {
      const act = activePositions(S, rs);
      for (let k = 0; k < act.length; k++) {
        const S2 = applyAt(S, act[k], rs);
        if (S2.length > maxLen) continue;
        if (isGoal(S2, rs)) {
          visited.set(S2, { prev: S, moveK: k, depth: d });
          found = S2;
          break;
        }
        if (!visited.has(S2)) {
          visited.set(S2, { prev: S, moveK: k, depth: d });
          next.push(S2);
          if (visited.size > maxStates) return { result: 'limit-states', visited, depth: d };
        }
      }
      if (found) break;
    }
    frontier = next;
    if (verbose) console.error(`depth ${d}: frontier=${frontier.length} visited=${visited.size} maxlen=${Math.max(...frontier.map(s=>s.length))}`);
    if (frontier.length === 0) break;
  }
  if (found) {
    // reconstruct
    const path = [];
    let cur = found;
    while (cur !== null) {
      const e = visited.get(cur);
      path.push({ S: cur, moveK: e.moveK });
      cur = e.prev;
    }
    path.reverse();
    return { result: 'goal', path, visited, goalState: found };
  }
  return { result: 'no-goal-in-depth', visited, depth: maxDepth };
}

// ---- CLI ----
const args = process.argv.slice(2);
const isMain = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('game.mjs');
if (args.length && isMain) {
  const mode = args[0];
  const rs = RULESETS[args[1]];
  if (!rs) { console.error('ruleset: bmo10|bmo11'); process.exit(2); }
  if (mode === 'play') {
    const [_, __, strategy, nsteps] = args;
    const hist = play(rs, strategy, parseInt(nsteps));
    for (const h of hist) {
      if (h.goal) { console.log(`step ${h.step}: GOAL ${pretty(h.S)}`); break; }
      if (h.stuck) { console.log(`step ${h.step}: STUCK ${pretty(h.S)}`); break; }
      console.log(`step ${h.step}: nActive=${h.nActive} rule=${rs.ruleNames[h.p]} -> ${pretty(h.S2)}`);
    }
  } else if (mode === 'bfs') {
    const maxDepth = parseInt(args[2]), maxStates = parseInt(args[3]);
    const maxLen = args[4] ? parseInt(args[4]) : 400;
    const t0 = Date.now();
    const r = bfs(rs, maxDepth, maxStates, maxLen, true);
    console.error(`bfs done in ${((Date.now()-t0)/1000).toFixed(1)}s: ${r.result}, visited=${r.visited.size}`);
    if (r.result === 'goal') {
      console.log('WITNESS MOVES (0-based index among active #s, left-to-right):');
      console.log(r.path.slice(1).map(e => e.moveK).join(','));
      console.log('states:');
      for (const e of r.path) console.log(pretty(e.S));
    }
  } else if (mode === 'replay') {
    const moves = args[2].split(',').map(x => parseInt(x));
    let S = '';
    console.log(`start: ${pretty(S)}  active=${activePositions(S, rs).length}`);
    for (let n = 0; n < moves.length; n++) {
      const act = activePositions(S, rs);
      const V = windowOf(S);
      const p = matchAt(V, act[moves[n]], rs);
      S = applyK(S, moves[n], rs);
      console.log(`move ${n + 1}: k=${moves[n]} rule=${rs.ruleNames[p]} -> ${pretty(S)} goal=${isGoal(S, rs)}`);
    }
  } else if (mode === 'stats') {
    // reachable tail heads + last-block stats up to depth
    const maxDepth = parseInt(args[2]), maxStates = parseInt(args[3]);
    const r = bfs(rs, maxDepth, maxStates);
    const tails = new Map();
    for (const S of r.visited.keys()) {
      const t = tailOf(S).slice(0, 8);
      tails.set(t, (tails.get(t) || 0) + 1);
    }
    const sorted = [...tails.entries()].sort((a, b) => b[1] - a[1]);
    console.log(`visited ${r.visited.size} states, result=${r.result}`);
    console.log('top tail heads:');
    for (const [t, c] of sorted.slice(0, 40)) console.log(`  ${t}  x${c}`);
  }
}
