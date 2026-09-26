// p_engine3.mjs — parameterized class-window closure engine (the key-lemma
// induction) for the deterministic rightmost-# play of BMO 10.
//
// Level-2 tokens (chain-collapsed RLE, see p_token2.mjs) carry exact integer
// parameters (0-run length m; atom zero-length k; chain count c).  Enumerating
// them exactly leaves "relational phantoms": locally P-clean compositions whose
// step result (e.g. a chain merge c -> c+2) was never observed.  We therefore
// CLASSIFY parameters: exact values 1..E and a class "+" meaning >= E+1.  With
// E = 11 and instantiations of "+" from {12, 13, 14, 40}, every arithmetic
// operation the rules perform (m-1, m-2, m+3, k-1, k-2, c-1, c-2, c+1, c+2,
// and the exact equalities that trigger merges) maps instantiation-results
// back to determined classes:
//   x - 2 for x >= 14  -> ">=12"  (12->10, 13->11 exact; 40->38 "+")
//   x + 1, x + 2, x + 3 for x >= 12 -> "+"
// so checking the four representative values covers every x >= 12.
//
// P = set of CLASS-windows (length T) observed along the orbit.  Forward check:
// enumerate every class-context around the active '#' (as in p_forward2.mjs),
// instantiate the parameterized tokens of the ACTIVE ZONE (trailing material
// token, the H, and the first 6 tail tokens) over their value sets, run the
// exact string-level step, re-tokenize, classify the result windows, and
// require membership in P.  Far tokens are represented by any representative
// value: they influence neither the step (rules read at most the 4 tail tokens
// and merge only with the trailing material token) nor the classes of result
// windows outside the zone.
//
// If the check passes for every context and the initial word is P-clean, then
// by induction on rewrite steps every word along the deterministic orbit is
// P-clean forever; since P excludes all windows containing 111 / 1011 / 1#0 /
// 1#1 / 11#, the rightmost '#' is active at every step: the game is never won.
//
// Usage: node p_engine3.mjs T N [maxViol]

import { Det } from './p_lib.mjs';
import { tokenize2, tokStr, tokensKey, tokenStep2, decodeTok2, orbitTokenCensus2 } from './p_token2.mjs';
import fs from 'node:fs';

export const E = 11;          // exact parameter values 1..E; class "+" = >= E+1
const PLUS_VALS = [12, 13, 14, 40]; // representative values of "+"

export function clsNum(n) { return n <= E ? String(n) : '+'; }

export function classTokStr(tk) {
  if (tk.t === 'H') return 'H' + tk.n;
  if (tk.t === 'b') return tk.n === 2 ? 'b' : 'w' + tk.n;
  if (tk.t === 'u') return 'u';
  if (tk.t === 'Z') return tk.n === 'INF' ? 'Zinf' : 'Z_' + clsNum(tk.n);
  if (tk.t === 'CH') return (tk.inf ? 'CHinf_' : 'CH_') + clsNum(tk.k) + '_' + clsNum(tk.c);
  throw new Error('bad token');
}

// representative CONCRETE token for a class token string (used for far context)
export function reprTok(s) {
  const d = decodeTok2(s.replace(/_(\d+)_(\+|\d+)$/, (m0, k, c) => '_' + k + '_' + (c === '+' ? '40' : c)).replace(/_(\+)(?=_|$)/, '_40'));
  // simpler: replace '+' parts by 40
  return d;
}

export function decodeClassTok(s) {
  // like decodeTok2 but with '+' parameters kept symbolic: we represent them
  // internally as the concrete representative 40 (max of PLUS_VALS); the
  // instantiation logic overrides zone tokens with all PLUS_VALS anyway.
  return decodeTok2(s.split('_').map((p) => (p === '+' ? '40' : p)).join('_'));
}

export function valueSetsFor(s) {
  // the set of concrete parameter tuples to try for a class token in the zone:
  // exact values -> itself; '+' -> PLUS_VALS (applied to every '+': Z_m has one
  // param, CH_k_c has two, independently)
  const parts = s.split('_');
  const out = [];
  const repl = (i, cur) => {
    if (i >= parts.length) { out.push(cur.join('_')); return; }
    if (parts[i] === '+') { for (const v of PLUS_VALS) { cur.push(String(v)); repl(i + 1, cur); cur.pop(); } }
    else { cur.push(parts[i]); repl(i + 1, cur); cur.pop(); }
  };
  repl(0, []);
  return out;
}

export function loadP(T, N) {
  const f = `p_clsP_T${T}_N${N}.json`;
  if (!fs.existsSync(f)) {
    const Pc = orbitTokenCensus2(N, T); // exact-level census
    const P = new Map();
    for (const [w] of Pc) {
      const cw = w.split(' ').map((s) => {
        // classify each exact token string
        const cls = s.replace(/Z_(\d+)/, (m, n) => 'Z_' + clsNum(+n)).replace(/^CH(inf)?_(\d+)_(\d+)$/, (m, i, k, c) => 'CH' + (i || '') + '_' + clsNum(+k) + '_' + clsNum(+c));
        return cls;
      }).join(' ');
      P.set(cw, (P.get(cw) || 0) + 1);
    }
    fs.writeFileSync(f, JSON.stringify({ N, T, E, windows: [...P.entries()] }));
  }
  const j = JSON.parse(fs.readFileSync(f, 'utf8'));
  return new Set(j.windows.map((e) => e[0]));
}

function expandClass(toks) {
  // expand a sequence of class-token strings into a concrete string using
  // representative values
  let s = '';
  for (const s0 of toks) {
    const tk = decodeClassTok(s0);
    if (tk.t === 'H') s += '#'.repeat(tk.n);
    else if (tk.t === 'b') s += '1'.repeat(tk.n);
    else if (tk.t === 'u') s += '1';
    else if (tk.t === 'Z') s += tk.n === 'INF' ? '0'.repeat(400) : '0'.repeat(tk.n);
    else if (tk.t === 'CH') {
      const full = ('1' + '0'.repeat(tk.k)).repeat(tk.c);
      s += tk.inf ? full.slice(0, full.length - tk.k) + '0'.repeat(400) : full;
    }
  }
  return s;
}

export function pExcludesForbidden(T, N) {
  const P = loadP(T, N);
  const pats = ['111', '1011', '1#0', '1#1', '11#'];
  const bad = [];
  for (const w of P) {
    const str = expandClass(w.split(' '));
    for (const p of pats) if (str.includes(p)) { bad.push({ w, p }); break; }
  }
  return { ok: bad.length === 0, bad: bad.slice(0, 10) };
}

function buildGraph(P, T) {
  const out = new Map();
  for (const w of P) {
    const toks = w.split(' ');
    const node = toks.slice(0, T - 1).join(' ');
    if (!out.has(node)) out.set(node, new Set());
    out.get(node).add(toks[T - 1]);
  }
  return out;
}

function tokenInventory(P) {
  const inv = new Set();
  for (const w of P) for (const t of w.split(' ')) inv.add(t);
  return [...inv];
}

function leftGoodNodes(P, T) {
  const period = ['CH_1_1', 'H1'];
  const fillNodes = new Set();
  const cyc = [];
  for (let i = 0; i < T + 4; i++) cyc.push(period[i % 2]);
  for (let i = 0; i < 2; i++) fillNodes.add(cyc.slice(i, i + T - 1).join(' '));
  const cands = tokenInventory(P);
  const good = new Set(fillNodes);
  const stack = [...fillNodes];
  while (stack.length) {
    const node = stack.pop();
    const toksN = node.split(' ');
    for (const c of cands) {
      if (P.has([c, ...toksN].join(' '))) {
        const nnode = [c, ...toksN.slice(0, T - 2)].join(' ');
        if (!good.has(nnode)) { good.add(nnode); stack.push(nnode); }
      }
    }
  }
  return good;
}

export function forwardCheck(T, N, maxViol = 10) {
  const P = loadP(T, N);
  const graph = buildGraph(P, T);
  const good = leftGoodNodes(P, T);
  const ZRIGHT = T + 6, TAILMAX = T + 6;
  const ZONE_TAIL = 6; // tail tokens instantiated exactly
  let nCtx = 0, nInst = 0, nViol = 0, nInactive = 0;
  const violations = [];

  const rreal = new Map();
  function rightRealizable(suf) {
    const key = suf.join(' ');
    if (rreal.has(key)) return rreal.get(key);
    rreal.set(key, false);
    let ans = key.includes('CHinf_') || key.includes('Zinf') || P.has([...suf, 'Zinf'].join(' '));
    if (!ans) {
      const node = graph.get(key);
      if (node) {
        for (const t of node) {
          if (t.startsWith('H') || t === 'Zinf') continue;
          if (rightRealizable([...suf.slice(1), t])) { ans = true; break; }
        }
      }
    }
    rreal.set(key, ans);
    return ans;
  }

  // step a class-context: instantiate zone tokens (alpha at T-1, H at T, tail
  // T+1..T+ZONE_TAIL), representatives elsewhere; check result windows.
  const tryContext = (seqStrIn, truncated) => {
    nCtx++;
    const seqStr = truncated ? [...seqStrIn, 'u'] : seqStrIn;
    // choose zone positions
    const zone = [];
    for (let i = T - 1; i <= T + ZONE_TAIL && i < seqStr.length; i++) zone.push(i);
    // instantiation sets per zone position
    const sets = zone.map((i) => valueSetsFor(seqStr[i]));
    const rec = (zi, cur) => {
      if (zi === zone.length) {
        nInst++;
        const inst = [...seqStr];
        for (let j = 0; j < zone.length; j++) inst[zone[j]] = cur[j];
        let toks;
        try {
          toks = inst.map(decodeClassTok);
        } catch (e) {
          console.error('BAD INST:', JSON.stringify({ seqStr, cur, inst }));
          throw e;
        }
        const res = tokenStep2(toks);
        if (res.inactive) {
          nInactive++;
          if (violations.length < maxViol) violations.push({ kind: 'INACTIVE', ctx: seqStrIn.join(' '), inst: cur.join(',') });
          nViol++;
          return;
        }
        const out = res.toks;
        const maxI = truncated ? out.length - 2 : out.length;
        for (let i = 0; i + T <= maxI; i++) {
          const wk = out.slice(i, i + T).map(classTokStr).join(' ');
          if (!P.has(wk)) {
            nViol++;
            if (violations.length < maxViol) violations.push({ kind: 'WINDOW', ctx: seqStrIn.join(' '), inst: cur.join(','), bad: wk, at: i, rule: res.rule });
            return;
          }
        }
        return;
      }
      for (const v of sets[zi]) rec(zi + 1, [...cur, v]);
    };
    rec(0, []);
  };

  const closeTypeA = (seq2) => {
    const last = seq2[seq2.length - 1];
    if (last.startsWith('CHinf_') || last === 'Zinf') return seq2;
    if (/^CH_(\d+|\+)_(\d+|\+)$/.test(last)) return [...seq2.slice(0, -1), last.replace(/^CH_/, 'CHinf_')];
    if (/^Z_(\d+|\+)$/.test(last)) return [...seq2.slice(0, -1), 'Zinf'];
    return [...seq2, 'Zinf'];
  };

  const dfs = (seq, activePlaced) => {
    const node = seq.slice(-(T - 1)).join(' ');
    const edges = graph.get(node);
    if (!edges) return;
    for (const t of edges) {
      if (t === 'Zinf') continue;
      const seq2 = [...seq, t];
      const p = seq2.length - 1;
      if (!activePlaced) {
        if (p < T) { dfs(seq2, false); continue; }
        if (t === 'H1' || t === 'H2') dfs(seq2, true);
        continue;
      }
      if (t === 'H1' || t === 'H2') continue;
      const tailLen = seq2.length - 1 - T;
      if (t.startsWith('CHinf_')) {
        if (tailLen <= TAILMAX) tryContext(seq2, false);
        continue;
      }
      if (tailLen <= TAILMAX - 1) {
        const closed = closeTypeA(seq2);
        if (P.has(closed.slice(-T).join(' '))) tryContext(closed, false);
      }
      if (tailLen >= ZRIGHT) {
        if (rightRealizable(seq2.slice(-(T - 1)))) tryContext(seq2, true);
        continue;
      }
      dfs(seq2, true);
    }
  };

  for (const node of good) {
    const seq = node.split(' ');
    if (seq.length !== T - 1) continue;
    dfs(seq, false);
  }
  return { nCtx, nInst, nViol, nInactive, violations };
}

// initial word P-cleanliness (explicit check)
export function initialClean(T, N) {
  const P = loadP(T, N);
  const d = new Det();
  const toks = tokenize2(d.w);
  for (let i = 0; i + T <= toks.length; i++) {
    if (!P.has(toks.slice(i, i + T).map(classTokStr).join(' '))) return { ok: false, at: i };
  }
  return { ok: true };
}

const args = process.argv.slice(2);
if (args.length) {
  const T = parseInt(args[0]), N = parseInt(args[1]);
  const maxViol = args[2] ? parseInt(args[2]) : 10;
  const t0 = Date.now();
  const ic = initialClean(T, N);
  console.log(`initial word P-clean: ${ic.ok}`);
  const ex = pExcludesForbidden(T, N);
  console.log(`P excludes forbidden patterns: ${ex.ok}${ex.ok ? '' : ' ' + JSON.stringify(ex.bad.slice(0, 3))}`);
  if (ic.ok && ex.ok) {
    const r = forwardCheck(T, N, maxViol);
    console.log(JSON.stringify({ ...r, ms: Date.now() - t0 }, null, 2));
  }
}
