// Forbidden-substring (factorial language) invariant discovery + machine verification.
//
// Idea: find a finite set F of forbidden substrings over {0,1,#} such that
//   (i)  the initial word  ...10#10#10#0000...  avoids F;
//   (ii) each rewrite rule preserves "avoids F" (checked by exhaustive context
//        enumeration over all local windows - this makes it a PROOF, not a
//        heuristic);
//   (iii) F forbids "111" and "1011" (so the tail after the rightmost # can
//        never start with 111 or 1011 => rightmost # always active => NO).
//
// Heuristic to propose F: collect all substrings of length k that occur in the
// forward-BFS reachable set (with periodic/zero fills); F0 = complement. Then
// verify closure; if closure fails, add the enabling context's smallest
// non-initial substring to F and repeat.
import { RULESETS, bfs } from './game.mjs';

const ALPH = ['0', '1', '#'];

function allWords(n) {
  const out = [''];
  for (let i = 0; i < n; i++) {
    const nxt = [];
    for (const p of out) for (const a of ALPH) nxt.push(p + a);
    out.length = 0; out.push(...nxt);
  }
  return out;
}

// appearing substrings of length k in word = periodic-left + S + zero-right
function appearingSet(states, k) {
  const app = new Set();
  const LP = '10#'.repeat(Math.ceil(k / 3) + 1);
  for (const S of states) {
    const Y = LP + S + '0'.repeat(k + 1);
    for (let i = 0; i + k <= Y.length; i++) app.add(Y.slice(i, i + k));
  }
  return app;
}

// does string w avoid F (set of forbidden substrings, all length <= k)?
function avoids(w, F) {
  for (let i = 0; i < w.length; i++) {
    for (let j = i + 1; j <= w.length; j++) {
      if (F.has(w.slice(i, j))) return false;
    }
  }
  return true;
}
// faster: F grouped by length
function avoidsFast(w, FbyLen) {
  for (const [len, set] of FbyLen) {
    if (w.length < len) continue;
    for (let i = 0; i + len <= w.length; i++) if (set.has(w.slice(i, i + len))) return false;
  }
  return true;
}
function byLen(F) {
  const m = new Map();
  for (const f of F) { const l = f.length; if (!m.has(l)) m.set(l, new Set()); m.get(l).add(f); }
  return m;
}

// Closure check: for each rule, for each context Lctx + LHS + Rctx (|Lctx|=|Rctx|=m),
// if the pre-window avoids F then the post-window Lctx+RHS+Rctx avoids F.
// Returns list of counterexamples [ctx, rule, createdBad].
function checkClosure(F, rs, m, collect = 20) {
  const Fb = byLen(F);
  const cex = [];
  const ctxs = allWords(m);
  for (let pi = 0; pi < rs.pats.length; pi++) {
    const [lhs, rhs] = rs.pats[pi];
    const pre = m + lhs.length + m; // window length
    for (const Lc of ctxs) {
      for (const Rc of ctxs) {
        const W1 = Lc + lhs + Rc;
        if (!avoidsFast(W1, Fb)) continue;
        const W2 = Lc + rhs + Rc;
        if (!avoidsFast(W2, Fb)) {
          // find the bad substring in W2
          let bad = null;
          for (let i = 0; i < W2.length && !bad; i++)
            for (let j = i + 1; j <= W2.length; j++)
              if (F.has(W2.slice(i, j))) { bad = W2.slice(i, j); break; }
          cex.push({ Lc, Rc, rule: pi, bad });
          if (cex.length >= collect) return cex;
        }
      }
    }
  }
  return cex;
}

// initial word avoids F?
function checkInit(F, k) {
  const LP = '10#'.repeat(20);
  const Y = LP + '0'.repeat(30);
  return avoidsFast(Y, byLen(F));
}

const k = parseInt(process.argv[2] || '6');
const DEPTH = parseInt(process.argv[3] || '60');
const rs = RULESETS.bmo10;
const t0 = Date.now();
const r = bfs(rs, DEPTH, 5000000, 800);
const states = [...r.visited.keys()];
console.error(`bfs: ${states.length} states in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

const app = appearingSet(states, k);
const all = allWords(k);
const F0 = new Set(all.filter(w => !app.has(w)));
console.error(`k=${k}: appearing=${app.size}/${all.length}, absent=${F0.size}`);
console.error('init avoids F0:', checkInit(F0, k));

// iterative refinement
let F = new Set(F0);
for (let round = 0; round < 12; round++) {
  const cex = checkClosure(F, rs, Math.max(2, k - 1), 5);
  console.error(`round ${round}: |F|=${F.size}, closure counterexamples: ${cex.length}`);
  if (cex.length === 0) {
    console.log('CLOSED INVARIANT FOUND, |F| =', F.size);
    // dump F sorted
    const arr = [...F].sort();
    console.log(JSON.stringify(arr));
    // final init check
    console.log('init avoids F:', checkInit(F, k));
    // verify goal excluded: 111 and 1011 must be forbidden by F directly or via shorter patterns
    console.log('111 forbidden:', F.has('111'), ' 1011 forbidden:', F.has('1011'));
    process.exit(0);
  }
  for (const c of cex) console.error(`  cex: rule=${rs.ruleNames[c.rule]} ctx=${c.Lc}|${c.Rc} bad=${c.bad}`);
  // add the "bad" pattern itself? No - bad is already in F. We must forbid the PRE side:
  // add some substring of W1 (the enabling context). Choose the shortest substring of
  // W1 that is NOT a substring of the initial word.
  const INIT = new Set();
  {
    const LP = '10#'.repeat(30); const Y = LP + '0'.repeat(60);
    for (let i = 0; i < Y.length; i++) for (let j = i + 1; j <= Y.length && j - i <= k + 2; j++) INIT.add(Y.slice(i, j));
  }
  let added = 0;
  for (const c of cex) {
    const W1 = c.Lc + rs.pats[c.rule][0] + c.Rc;
    // try shortest substrings of W1 not in INIT
    let done = false;
    for (let len = 2; len <= W1.length && !done; len++) {
      for (let i = 0; i + len <= W1.length && !done; i++) {
        const s = W1.slice(i, i + len);
        if (!INIT.has(s) && !F.has(s)) { F.add(s); added++; done = true; }
      }
    }
    if (!done) { console.error('cannot refine for', W1); process.exit(1); }
  }
  if (!added) { console.error('no refinement possible'); process.exit(1); }
  // re-check init
  if (!checkInit(F, k)) { console.error('refinement broke init!'); process.exit(1); }
}
console.error('did not converge');
