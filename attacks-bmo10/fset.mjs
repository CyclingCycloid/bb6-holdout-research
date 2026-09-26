// Focused forbidden-set closure: F0 = minimal blockers; add shortest data-absent
// substring of violating pre-contexts (oracle: exact presence in depth-60 set).
import { RULESETS, bfs } from './game.mjs';

const rs = RULESETS.bmo10;
const D = parseInt(process.argv[2] || '60');
const r = bfs(rs, D, 5000000, 900);
const states = [...r.visited.keys()];
const Wfull = states.map(S => '10#10#' + S + '0000'); // fills included
console.error(`data: ${states.length} states`);

function present(s) { for (const w of Wfull) if (w.includes(s)) return true; return false; }

let F = ['111', '1011', '11#', '1#01', '0#01', '1#0#', '#011', '#0011'];
const INITW = '10#'.repeat(15) + '0'.repeat(15);
const initHas = (s) => INITW.includes(s);
function buildFb() {
  const m = new Map();
  for (const f of F) { if (!m.has(f.length)) m.set(f.length, []); m.get(f.length).push(f); }
  return m;
}
let Fb = buildFb();
function avoidsF(w) {
  for (const [len, pats] of Fb) {
    if (w.length < len) continue;
    for (let i = 0; i + len <= w.length; i++)
      for (const p of pats) { let ok = true; for (let j = 0; j < len; j++) if (w[i + j] !== p[j]) { ok = false; break; } if (ok) return false; }
  }
  return true;
}
function allWords(n) {
  const out = [''];
  for (let i = 0; i < n; i++) { const nx = []; for (const p of out) for (const a of ['0', '1', '#']) nx.push(p + a); out.length = 0; out.push(...nx); }
  return out;
}
const M = 6;
const ctxs = allWords(M);

function findViol() {
  for (let pi = 0; pi < rs.pats.length; pi++) {
    const [lhs, rhs] = rs.pats[pi];
    for (const Lc of ctxs) for (const Rc of ctxs) {
      const W1 = Lc + '#' + lhs + Rc;
      if (!avoidsF(W1)) continue;
      const W2 = Lc + rhs + Rc;
      if (!avoidsF(W2)) return { pi, W1, W2 };
    }
  }
  return null;
}

// cache presence for speed
const pcache = new Map();
function presentC(s) { if (!pcache.has(s)) pcache.set(s, present(s)); return pcache.get(s); }

for (let round = 0; round < 400; round++) {
  const v = findViol();
  if (!v) {
    console.log(`CLOSED after ${round} rounds. |F|=${F.length}`);
    console.log('F =', JSON.stringify(F));
    // verify init avoids F
    const initW = '10#'.repeat(15) + '0'.repeat(15);
    console.log('init avoids F:', avoidsF(initW));
    // verify all data states avoid F (sanity: they must, being reachable)
    let bad = 0; for (const w of Wfull) if (!avoidsF(w)) bad++;
    console.log('data states violating F (must be 0):', bad);
    console.log('=> INVARIANT PROOF: reachable words avoid 111 and 1011 => rightmost # always active => ANSWER NO');
    process.exit(0);
  }
  // find shortest substring of W1 that is data-absent, not in F, and not in init
  let cand = null;
  outer: for (let l = 2; l <= W1LEN(v.W1); l++) {
    for (let i = 0; i + l <= v.W1.length; i++) {
      const s = v.W1.slice(i, i + l);
      if (F.includes(s)) continue;
      if (initHas(s)) continue;
      if (!presentC(s)) { cand = s; break outer; }
    }
  }
  if (!cand) {
    console.log(`STUCK at round ${round}: violation with fully data-present context`);
    console.log(`  rule=${rs.ruleNames[v.pi]} W1=${v.W1} W2=${v.W2}`);
    process.exit(1);
  }
  F.push(cand); Fb = buildFb();
  // init must still avoid F
  const initW = '10#'.repeat(15) + '0'.repeat(15);
  if (!avoidsF(initW)) { console.log('broke init at round', round, 'with', cand); process.exit(1); }
  if (round % 10 === 0) console.error(`round ${round}: added so far |F|=${F.length}, last viol rule=${rs.ruleNames[v.pi]} W1=${v.W1}`);
}
function W1LEN(w) { return w.length; }
console.log('no convergence');
