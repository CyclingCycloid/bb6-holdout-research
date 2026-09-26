// Variable-length forbidden-substring invariant with data-guided refinement.
// F = set of forbidden substrings (start: goal patterns 111, 1011).
// L(F) = words avoiding F. Closure check: for each rule, all local contexts whose
// pre-window avoids F must have post-window avoiding F. On violation, add the
// shortest data-absent substring of the pre-window to F. Data oracle = substrings
// present in forward-reachable states up to depth D (those are provably reachable;
// forbidding them would doom the loop).
// Success (closed F, init avoids F) => PROOF that 111/1011 unreachable => NO.
import { RULESETS, bfs } from './game.mjs';

const rs = RULESETS.bmo10;
const DORACLE = parseInt(process.argv[2] || '26');
const MCTX = parseInt(process.argv[3] || '6'); // context length each side
const MAXPAT = parseInt(process.argv[4] || '7'); // max F pattern length
const ROUNDS = parseInt(process.argv[5] || '300');

// oracle
const ro = bfs(rs, DORACLE, 5000000, 400);
const ostates = [...ro.visited.keys()];
const oracle = new Set();
for (const S of ostates) {
  const W = '10#10#10#10#' + S + '0'.repeat(10);
  for (let i = 0; i < W.length; i++)
    for (let l = 1; l <= 8 && i + l <= W.length; l++) oracle.add(W.slice(i, i + l));
}
console.error(`oracle: ${ostates.length} states, ${oracle.size} substrings (<=8)`);

// F and helpers
const F = ['111', '1011'];
const FbyLen = new Map();
function rebuild() { FbyLen.clear(); for (const f of F) { if (!FbyLen.has(f.length)) FbyLen.set(f.length, []); FbyLen.get(f.length).push(f); } }
rebuild();
function avoidsF(w) {
  for (const [len, pats] of FbyLen) {
    if (w.length < len) continue;
    for (let i = 0; i + len <= w.length; i++)
      for (const p of pats) { let ok = true; for (let j = 0; j < len; j++) if (w[i + j] !== p[j]) { ok = false; break; } if (ok) return false; }
  }
  return true;
}

// contexts
function allWords(n) {
  const out = [''];
  for (let i = 0; i < n; i++) { const nx = []; for (const p of out) for (const a of ['0', '1', '#']) nx.push(p + a); out.length = 0; out.push(...nx); }
  return out;
}
const ctxs = allWords(MCTX);

function closurePass(collect = 50) {
  const viols = [];
  for (let pi = 0; pi < rs.pats.length; pi++) {
    const [lhs, rhs] = rs.pats[pi];
    for (const Lc of ctxs) for (const Rc of ctxs) {
      const W1 = Lc + '#' + lhs + Rc;
      if (!avoidsF(W1)) continue;
      const W2 = Lc + rhs + Rc;
      if (!avoidsF(W2)) {
        // find data-absent substring of W1, shortest
        let cand = null;
        outer: for (let l = 2; l <= Math.min(MAXPAT, W1.length); l++) {
          for (let i = 0; i + l <= W1.length; i++) {
            const s = W1.slice(i, i + l);
            if (!oracle.has(s) && !F.includes(s)) { cand = s; break outer; }
          }
        }
        viols.push({ W1, W2, cand, rule: pi });
        if (viols.length >= collect) return viols;
      }
    }
  }
  return viols;
}

// init word check
function initAvoidsF() {
  const W = '10#'.repeat(12) + '0'.repeat(12);
  return avoidsF(W);
}

let round = 0;
for (; round < ROUNDS; round++) {
  const viols = closurePass();
  if (viols.length === 0) {
    console.log(`CLOSED after ${round} rounds! |F| = ${F.length}, max len ${Math.max(...F.map(f => f.length))}`);
    console.log('F =', JSON.stringify(F));
    console.log('init avoids F:', initAvoidsF());
    console.log('=> invariant: all reachable words avoid F; F contains 111 and 1011;');
    console.log('=> the rightmost # is active in every reachable configuration => BMO 10 ANSWER: NO.');
    process.exit(0);
  }
  const stuck = viols.filter(v => !v.cand);
  if (stuck.length) {
    console.error(`round ${round}: STUCK - ${stuck.length} unfixable violations; |F|=${F.length}`);
    for (const v of stuck.slice(0, 5)) console.error(`  rule=${rs.ruleNames[v.rule]} W1=${v.W1} W2=${v.W2}`);
    process.exit(1);
  }
  // add one candidate per distinct W1
  const seen = new Set(); let added = 0;
  for (const v of viols) { if (seen.has(v.W1)) continue; seen.add(v.W1); F.push(v.cand); added++; }
  rebuild();
  if (!initAvoidsF()) { console.error('round', round, ': refinement broke init!'); process.exit(1); }
  if (round % 10 === 0) console.error(`round ${round}: viol=${viols.length} added=${added} |F|=${F.length}`);
}
console.log('did not converge in', ROUNDS, 'rounds; |F| =', F.length);
