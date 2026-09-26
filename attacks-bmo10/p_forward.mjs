// p_forward.mjs — forward token-window closure check (the key-lemma induction
// engine) for the deterministic rightmost-# play of BMO 10.
//
// Given P (set of T-token windows observed along the orbit, exact parameters),
// enumerate EVERY finite token context C that could be the neighborhood of the
// active (rightmost) '#' inside a word all of whose T-windows lie in P:
//   - C = [T left-margin tokens] [active H1/H2 at position p >= T] [tail tokens:
//     no H] either (A) ending in Zinf (short tail; the word ends there) with
//     tail length <= TAILMAX, or (B) of length >= T + 1 + ZRIGHT (long tail;
//     the step and its result windows stay inside C),
//   - every T-window of C is in P,
//   - C's left margin extends (within P) to the periodic fill 10#10#...,
// then apply tokenStep (exact string-level macro step) at the last H and require
// every T-window of the result to be in P.  If no context violates, and the
// initial word is P-clean, then by induction on steps every word along the
// orbit stays P-clean; since P contains no window with 111/1011/1#0/1#1/11#,
// the KEY LEMMA follows.
//
// Usage: node p_forward.mjs T N   (loads/creates census p_tokP_T{T}_N{N}.json)

import { Det } from './p_lib.mjs';
import { tokenize, tokStr, tokensKey, tokenStep, orbitTokenCensus } from './p_token.mjs';
import fs from 'node:fs';

// Context geometry (T = window length): result windows span [q-T, q+T+4] in
// word positions around the active # at q, so the enumerated context must
// cover T tokens left of q and T+5 tokens right of q.
export function contextParams(T) {
  return { ZRIGHT: T + 6, TAILMAX: T + 6 };
}

export function loadP(T, N) {
  const f = `p_tokP_T${T}_N${N}.json`;
  if (!fs.existsSync(f)) {
    const P = orbitTokenCensus(N, T);
    fs.writeFileSync(f, JSON.stringify({ N, T, windows: [...P.entries()] }));
  }
  const j = JSON.parse(fs.readFileSync(f, 'utf8'));
  const P = new Set(j.windows.map((e) => e[0]));
  return P;
}

// forbidden-pattern check on P: no window may contain these raw patterns
export function pExcludesForbidden(T, N) {
  const P = loadP(T, N);
  const pats = ['111', '1011', '1#0', '1#1', '11#'];
  const bad = [];
  for (const w of P) {
    // decode window tokens to a partial string (Zinf as 0000...)
    const toks = w.split(' ').map(decodeTok);
    let str = '';
    for (const tk of toks) str += tk.n === 'INF' ? '00000000' : (tk.t === 'H' ? '#' : tk.t).repeat(tk.n);
    for (const p of pats) if (str.includes(p)) bad.push({ w, p });
  }
  return { ok: bad.length === 0, bad: bad.slice(0, 10) };
}

export function decodeTok(s) {
  if (s === 'Zinf') return { t: '0', n: 'INF' };
  if (s === 'H1') return { t: 'H', n: 1 };
  if (s === 'H2') return { t: 'H', n: 2 };
  if (s === 'a') return { t: '1', n: 1 };
  if (s === 'b') return { t: '1', n: 2 };
  if (s === 'c') return { t: '1', n: 3 };
  const m = /^Z_(\d+)$/.exec(s);
  if (!m) throw new Error('bad token ' + s);
  return { t: '0', n: parseInt(m[1]) };
}

// build the de Bruijn graph over P: node = (T-1)-token key; edges node->t exist
// iff window(node + t) in P
function buildGraph(P, T) {
  const out = new Map(); // nodeKey -> Map(token -> windowKey)
  for (const w of P) {
    const toks = w.split(' ');
    const node = toks.slice(0, T - 1).join(' ');
    const t = toks[T - 1];
    if (!out.has(node)) out.set(node, new Map());
    out.get(node).set(t, w);
  }
  return out;
}

// left-extendable nodes: (T-1)-token sequences from which the periodic fill can
// be reached by prepending tokens while keeping windows in P.
function leftGoodNodes(graph, P, T) {
  // fill (T-1)-nodes: rotations of (a Z_1 H)^inf
  const period = ['a', 'Z_1', 'H1'];
  const fillNodes = new Set();
  const cyc = [];
  for (let i = 0; i < T + 4; i++) cyc.push(period[i % 3]);
  for (let i = 0; i < 3; i++) fillNodes.add(cyc.slice(i, i + T - 1).join(' '));
  // reverse DFS: from fill nodes, prepend tokens c s.t. window(c + node) in P
  const cands = ['H1', 'H2', 'a', 'b', 'c', 'Zinf', ...zTokens(P)];
  const good = new Set(fillNodes);
  const stack = [...fillNodes];
  while (stack.length) {
    const node = stack.pop();
    const toksN = node.split(' ');
    // window of length T = c + node's T-1 tokens
    for (const c of cands) {
      const wkey = [c, ...toksN].join(' ');
      if (P.has(wkey)) {
        const nnode = [c, ...toksN.slice(0, T - 2)].join(' ');
        if (!good.has(nnode)) { good.add(nnode); stack.push(nnode); }
      }
    }
  }
  return good;
}

function* zTokens(P) {
  const zs = new Set();
  for (const w of P) for (const t of w.split(' ')) { const m = /^Z_(\d+)$/.exec(t); if (m) zs.add(t); }
  yield* zs;
}

// Enumerate contexts and check the step. Returns violations (first few).
export function forwardCheck(T, N, maxViol = 10) {
  const P = loadP(T, N);
  const graph = buildGraph(P, T);
  const good = leftGoodNodes(graph, P, T); // (T-1)-nodes extendable to fill on the left
  let nCtx = 0, nViol = 0, nInactive = 0;
  const violations = [];

  // right realizability for type-B contexts: from suffix, extend H-free with
  // P-windows until a Zinf close is possible (word ends 0^inf, no '#' right).
  const rreal = new Map(); // (T-1)-suffix key -> bool
  const zinfOk = (suf) => P.has([...suf, 'Zinf'].join(' '));
  function rightRealizable(suf) {
    const key = suf.join(' ');
    if (rreal.has(key)) return rreal.get(key);
    rreal.set(key, false); // cycle guard (final value set below)
    let ans = zinfOk(suf);
    if (!ans) {
      const node = graph.get(key);
      if (node) {
        outer: for (const t of node.keys()) {
          if (t === 'H1' || t === 'H2' || t === 'Zinf') continue;
          if (rightRealizable([...suf.slice(1), t])) { ans = true; break outer; }
        }
      }
    }
    rreal.set(key, ans);
    return ans;
  }

  const tryContext = (seqStr) => {
    nCtx++;
    const toks = seqStr.map(decodeTok);
    const res = tokenStep(toks);
    if (res.inactive) {
      nInactive++;
      if (violations.length < maxViol) violations.push({ kind: 'INACTIVE', ctx: seqStr.join(' ') });
      nViol++;
      return;
    }
    const out = res.toks;
    for (let i = 0; i + T <= out.length; i++) {
      const wk = out.slice(i, i + T).map(tokStr).join(' ');
      if (!P.has(wk)) {
        nViol++;
        if (violations.length < maxViol) violations.push({ kind: 'WINDOW', ctx: seqStr.join(' '), bad: wk, at: i, rule: res.rule });
        return;
      }
    }
  };

  // Context layout (active H fixed at index T):
  //   [0..T-1) left margin (seed of length T-1 + 1 free token)
  //   [T] active H (H1 or H2)
  //   [T+1..] tail tokens (NO H), then close:
  //     type A: append Zinf (word ends), Zinf-window in P, tail <= TAILMAX-1
  //     type B: tail length ZRIGHT, context must be right-realizable
  const dfs = (seq, activePlaced) => {
    const node = seq.slice(-(T - 1)).join(' ');
    const edges = graph.get(node);
    if (!edges) return;
    for (const t of edges.keys()) {
      if (t === 'Zinf') continue;
      const seq2 = [...seq, t];
      const p = seq2.length - 1; // position of t
      if (!activePlaced) {
        if (p < T) { dfs(seq2, false); continue; }      // still filling left margin
        if (t === 'H1' || t === 'H2') dfs(seq2, true);  // the active H
        // non-H at p >= T with no active placed yet: impossible (the active H
        // must be at index T): skip
        continue;
      }
      // active placed: t must be tail (no H)
      if (t === 'H1' || t === 'H2') continue;
      const ZRIGHT = T + 6, TAILMAX = T + 6;
      const tailLen = seq2.length - 1 - T;
      // type A close (word ends here)
      if (tailLen <= TAILMAX - 1 && P.has([...seq2.slice(-(T - 1)), 'Zinf'].join(' '))) {
        tryContext([...seq2, 'Zinf']);
      }
      if (tailLen >= ZRIGHT) {
        // type B: enough tail; require the word to continue H-free to its end
        if (rightRealizable(seq2.slice(-(T - 1)))) tryContext(seq2);
        continue; // deeper tails are represented by this same truncated context
      }
      dfs(seq2, true);
    }
  };

  for (const node of good) {
    const seq = node.split(' ');
    if (seq.length !== T - 1) continue;
    dfs(seq, false);
  }
  return { nCtx, nViol, nInactive, violations };
}

const args = process.argv.slice(2);
if (args.length) {
  const T = parseInt(args[0]), N = parseInt(args[1]);
  const t0 = Date.now();
  const ex = pExcludesForbidden(T, N);
  console.log(`P excludes forbidden patterns: ${ex.ok}${ex.ok ? '' : ' ' + JSON.stringify(ex.bad)}`);
  const r = forwardCheck(T, N);
  console.log(JSON.stringify({ ...r, ms: Date.now() - t0 }, null, 2));
}
