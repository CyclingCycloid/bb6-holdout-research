// p_forward2.mjs — forward closure check with level-2 (chain-collapsed) tokens.
// Same method as p_forward.mjs; see there for the soundness argument.
//
// Usage: node p_forward2.mjs T N [maxViol]

import { Det } from './p_lib.mjs';
import { tokenize2, tokStr, tokensKey, tokenStep2, decodeTok2, orbitTokenCensus2, expand2 } from './p_token2.mjs';
import fs from 'node:fs';

export function loadP(T, N) {
  const f = `p_tok2P_T${T}_N${N}.json`;
  if (!fs.existsSync(f)) {
    const P = orbitTokenCensus2(N, T);
    fs.writeFileSync(f, JSON.stringify({ N, T, windows: [...P.entries()] }));
  }
  const j = JSON.parse(fs.readFileSync(f, 'utf8'));
  return new Set(j.windows.map((e) => e[0]));
}

export function pExcludesForbidden(T, N) {
  const P = loadP(T, N);
  const pats = ['111', '1011', '1#0', '1#1', '11#'];
  const bad = [];
  for (const w of P) {
    const toks = w.split(' ').map(decodeTok2);
    const str = expand2(toks.map((tk) => tk.t === 'Z' && tk.n === 'INF' ? { ...tk, n: 12 } : tk));
    for (const p of pats) if (str.includes(p)) bad.push({ w, p });
  }
  return { ok: bad.length === 0, bad: bad.slice(0, 10) };
}

function buildGraph(P, T) {
  const out = new Map();
  for (const w of P) {
    const toks = w.split(' ');
    const node = toks.slice(0, T - 1).join(' ');
    const t = toks[T - 1];
    if (!out.has(node)) out.set(node, new Map());
    out.get(node).set(t, w);
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
      const wkey = [c, ...toksN].join(' ');
      if (P.has(wkey)) {
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
  let nCtx = 0, nViol = 0, nInactive = 0;
  const violations = [];

  const rreal = new Map();
  const zinfOk = (suf) => P.has([...suf, 'Zinf'].join(' ')) || suf.some((t) => t.startsWith('CHinf_')) && P.has(suf.join(' '));
  // a context suffix "right-realizable" if the word can end (Zinf/CHinf) or
  // extend H-free with P-windows to such an end. For simplicity accept if the
  // suffix itself contains an inf-token (word ends here) or a Zinf-close or an
  // H-free P-extension reaches one (DFS below).
  function rightRealizable(suf) {
    const key = suf.join(' ');
    if (rreal.has(key)) return rreal.get(key);
    rreal.set(key, false);
    let ans = P.has([...suf.slice(0, T - 1), 'Zinf'].join(' ')) || key.includes('CHinf_') || key.includes('Zinf');
    if (!ans) {
      const node = graph.get(key);
      if (node) {
        for (const t of node.keys()) {
          if (t.startsWith('H') || t === 'Zinf') continue;
          if (rightRealizable([...suf.slice(1), t])) { ans = true; break; }
        }
      }
    }
    rreal.set(key, ans);
    return ans;
  }

  // tryContext(seqStr, truncated): if truncated, the true word continues past
  // the context.  We append a guard token 'u' (a lone '1') so that retokeniza-
  // tion keeps the context's last token intact, and skip result windows that
  // touch the last two result tokens (guard + possible merge artifact).  The
  // step's zone windows lie strictly left of those (context geometry).
  const tryContext = (seqStrIn, truncated) => {
    nCtx++;
    const seqStr = truncated ? [...seqStrIn, 'u'] : seqStrIn;
    const toks = seqStr.map(decodeTok2);
    const res = tokenStep2(toks);
    if (res.inactive) {
      nInactive++;
      if (violations.length < maxViol) violations.push({ kind: 'INACTIVE', ctx: seqStrIn.join(' ') });
      nViol++;
      return;
    }
    const out = res.toks;
    const maxI = truncated ? out.length - 2 : out.length;
    for (let i = 0; i + T <= maxI; i++) {
      const wk = out.slice(i, i + T).map(tokStr).join(' ');
      if (!P.has(wk)) {
        nViol++;
        if (violations.length < maxViol) violations.push({ kind: 'WINDOW', ctx: seqStrIn.join(' '), bad: wk, at: i, rule: res.rule });
        return;
      }
    }
  };

  // type-A close: the word ends after seq2. The final token must absorb 0^inf:
  // CH(k,c) -> CHinf(k,c); Z_m -> Zinf; H/b/u -> append Zinf.
  const closeTypeA = (seq2) => {
    const last = seq2[seq2.length - 1];
    if (last.startsWith('CHinf_') || last === 'Zinf') return seq2;
    if (/^CH_\d+_\d+$/.test(last)) {
      const closed = [...seq2.slice(0, -1), last.replace(/^CH_/, 'CHinf_')];
      return closed;
    }
    if (/^Z_\d+$/.test(last)) return [...seq2.slice(0, -1), 'Zinf'];
    return [...seq2, 'Zinf'];
  };

  // active H fixed at index T: [0..T-1] margin (seed T-1 + 1 free), [T] = H1/H2,
  // then tail tokens without H, closing type A (Zinf) or type B (ZRIGHT tail).
  const dfs = (seq, activePlaced) => {
    const node = seq.slice(-(T - 1)).join(' ');
    const edges = graph.get(node);
    if (!edges) return;
    for (const t of edges.keys()) {
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
      if (t.startsWith('CHinf_') || t === 'Zinf') {
        // word genuinely ends here (inf token from P): full check, no artifact
        if (tailLen <= TAILMAX) tryContext(seq2, false);
        continue;
      }
      if (tailLen <= TAILMAX - 1) {
        // type A: word ends after this tail: close by absorbing 0^inf
        const closed = closeTypeA(seq2);
        if (P.has(closed.slice(-(T)).join(' '))) tryContext(closed, false);
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
  return { nCtx, nViol, nInactive, violations };
}

const args = process.argv.slice(2);
if (args.length) {
  const T = parseInt(args[0]), N = parseInt(args[1]);
  const maxViol = args[2] ? parseInt(args[2]) : 10;
  const t0 = Date.now();
  const ex = pExcludesForbidden(T, N);
  console.log(`P excludes forbidden patterns: ${ex.ok}${ex.ok ? '' : ' ' + JSON.stringify(ex.bad)}`);
  const r = forwardCheck(T, N, maxViol);
  console.log(JSON.stringify({ ...r, ms: Date.now() - t0 }, null, 2));
}
