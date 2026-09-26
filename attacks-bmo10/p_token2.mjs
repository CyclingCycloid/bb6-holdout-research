// p_token2.mjs — level-2 (chain-collapsed) parameterized macro tokens for the
// deterministic rightmost-# play of BMO 10.
//
// Level-1 tokens were RLE runs (H1/H2, a=1, b=11, Z_m).  Bounded windows over
// level-1 tokens cannot see the length of runs of repeated atoms (101010…,
// 100100…), which caused phantom closure failures.  Level-2 tokens collapse
// MAXIMAL runs of identical atoms `1 0^k` into a counted chain token:
//
//   H1, H2        '#' run of length 1 / 2
//   b             '11' (1-run of length 2; rare R1-seam)
//   u             lone '1' not followed by a 0-run (i.e. followed by '#')
//   Z_m           0-run of exact length m (only directly after H/b/u/Z or at start)
//   CH(k,c)       maximal chain of c >= 1 atoms `1 0^k` (k >= 1 exact)
//   CHinf(k,c)    chain of c-1 atoms `1 0^k` + final `1` + 0^inf (word end)
//   Zinf          trailing 0^inf without a preceding bare 1 (word end)
//
// Canonicality: every '1' binds its FULL following 0-run; 1-runs of length 2
// are the token b followed by a lone Z-run; maximality means consecutive CH
// tokens have different k.  The deterministic step is still implemented by
// expand -> string rewrite -> retokenize (exactness by construction).

import { Det, detFromCore } from './p_lib.mjs';

const PATS = [['0', '1'], ['100', '000#'], ['110', '000#'], ['1010', '1010##']];
export const RNAMES = ['R1:#0->1', 'R2:#100->000#', 'R3:#110->000#', 'R4:#1010->1010##'];

export function tokenize2(w) {
  // runs
  const runs = [];
  let i = 0;
  let zend = w.length;
  while (zend > 0 && w[zend - 1] === '0') zend--;
  const infTail = zend < w.length;
  const s = infTail ? w.slice(0, zend) : w;
  while (i < s.length) {
    const c = s[i];
    let j = i;
    while (j < s.length && s[j] === c) j++;
    runs.push([c, j - i]);
    i = j;
  }
  const toks = [];
  let curChain = null; // {k, c, inf}
  const flush = () => {
    if (curChain) {
      toks.push(curChain.inf ? { t: 'CH', k: curChain.k, c: curChain.c, inf: true } : { t: 'CH', k: curChain.k, c: curChain.c });
      curChain = null;
    }
  };
  for (let ri = 0; ri < runs.length; ri++) {
    const [c, n] = runs[ri];
    if (c === '#') { flush(); toks.push({ t: 'H', n }); continue; }
    if (c === '0') { flush(); toks.push({ t: 'Z', n }); continue; }
    // c === '1'
    if (n >= 2) { flush(); toks.push({ t: 'b', n }); continue; } // 11 (or longer: 111+ shouldn't happen; keep exact n)
    // single '1': atom; its 0-run is the next run (or 0-length if none / next is #)
    const nr = ri + 1 < runs.length ? runs[ri + 1] : null;
    let k = 0;
    if (nr && nr[0] === '0') { k = nr[1]; ri++; }
    if (k === 0) { flush(); toks.push({ t: 'u' }); continue; } // '1' followed by '#' (or another 1 is impossible: runs maximal)
    const atEnd = ri === runs.length - 1 && infTail;
    // the final atom's 0-run merges into 0^inf
    if (atEnd) {
      // flush current chain, emit CHinf(k, cur.c+1) — chain continues into inf
      if (curChain && curChain.k === k) { toks.push({ t: 'CH', k, c: curChain.c + 1, inf: true }); curChain = null; }
      else { flush(); toks.push({ t: 'CH', k, c: 1, inf: true }); }
      continue;
    }
    if (curChain && curChain.k === k) curChain.c++;
    else { flush(); curChain = { k, c: 1 }; }
  }
  flush();
  if (infTail && (toks.length === 0 || toks[toks.length - 1].inf !== true)) {
    // trailing 0-run not bound to a 1 (e.g. after H or b)
    // note: if the last run was a 0-run we already pushed Z — convert to Zinf
    const last = toks[toks.length - 1];
    if (last && last.t === 'Z') toks[toks.length - 1] = { t: 'Z', n: 'INF' };
    else toks.push({ t: 'Z', n: 'INF' });
  }
  return toks;
}

export function tokStr(tk) {
  if (tk.t === 'H') return 'H' + tk.n;
  if (tk.t === 'b') return tk.n === 2 ? 'b' : 'w' + tk.n; // w3+ = 111-run (forbidden, but representable)
  if (tk.t === 'u') return 'u';
  if (tk.t === 'Z') return tk.n === 'INF' ? 'Zinf' : 'Z_' + tk.n;
  if (tk.t === 'CH') return (tk.inf ? 'CHinf_' : 'CH_') + tk.k + '_' + tk.c;
  throw new Error('bad token ' + JSON.stringify(tk));
}
export function tokensKey(toks) { return toks.map(tokStr).join(' '); }
export function decodeTok2(s) {
  if (s === 'H1') return { t: 'H', n: 1 };
  if (s === 'H2') return { t: 'H', n: 2 };
  if (s === 'b') return { t: 'b', n: 2 };
  if (s.startsWith('w')) return { t: 'b', n: parseInt(s.slice(1)) };
  if (s === 'u') return { t: 'u' };
  if (s === 'Zinf') return { t: 'Z', n: 'INF' };
  if (s.startsWith('Z_')) return { t: 'Z', n: parseInt(s.slice(2)) };
  let m = /^CH_(-?\d+)_(\d+)$/.exec(s);
  if (m) return { t: 'CH', k: parseInt(m[1]), c: parseInt(m[2]) };
  m = /^CHinf_(-?\d+)_(\d+)$/.exec(s);
  if (m) return { t: 'CH', k: parseInt(m[1]), c: parseInt(m[2]), inf: true };
  throw new Error('bad token string ' + s);
}

const INF_EXPAND = 400;

export function expand2(toks) {
  let s = '';
  for (const tk of toks) {
    if (tk.t === 'H') s += '#'.repeat(tk.n);
    else if (tk.t === 'b') s += '1'.repeat(tk.n);
    else if (tk.t === 'u') s += '1';
    else if (tk.t === 'Z') s += tk.n === 'INF' ? '0'.repeat(INF_EXPAND) : '0'.repeat(tk.n);
    else if (tk.t === 'CH') {
      const full = ('1' + '0'.repeat(tk.k)).repeat(tk.c);
      s += tk.inf ? full.slice(0, full.length - tk.k) + '0'.repeat(INF_EXPAND) : full;
    } else throw new Error('bad');
  }
  return s;
}

// deterministic step at the last '#', level-2 tokens
export function tokenStep2(toks) {
  let hasH = false;
  for (const tk of toks) if (tk.t === 'H') { hasH = true; break; }
  if (!hasH) return { inactive: true };
  const s = expand2(toks);
  const q = s.lastIndexOf('#');
  let rule = -1;
  for (let p = 0; p < PATS.length; p++) {
    const lhs = PATS[p][0];
    let ok = true;
    for (let j = 0; j < lhs.length; j++) if (s[q + 1 + j] !== lhs[j]) { ok = false; break; }
    if (ok) { rule = p; break; }
  }
  if (rule < 0) return { inactive: true };
  const [lhs, rhs] = PATS[rule];
  const s2 = s.slice(0, q) + rhs + s.slice(q + 1 + lhs.length);
  return { toks: tokenize2(s2), rule };
}

// strip leading pure-fill units (CH_1_1 H1)*
export function stripFill2(toks) {
  while (toks.length >= 2 && tokStr(toks[0]) === 'CH_1_1' && tokStr(toks[1]) === 'H1') toks = toks.slice(2);
  return toks;
}

// differential verification vs the string simulator
export function verifyTokenStep2(nSamples, seed = 987654) {
  let s = seed >>> 0;
  const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  const rint = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  let checked = 0, mismatches = 0, inactive = 0;
  const blocks = ['000', '1010', '1', '10', '0000000', '100', '11', '0101', '0000', '101010',
    '#', '##', '0#', '10#', '#10#', '#1010', '#100', '000#', '0#10', '#0', '1010##', '0#1', '00#000',
    '101010101010', '100100', '100100100', '01001', '100010001', '0001000100'];
  for (let it = 0; it < nSamples; it++) {
    let core = '';
    const nb = rint(0, 18);
    for (let i = 0; i < nb; i++) core += blocks[rint(0, blocks.length - 1)];
    core = core.replace(/0+$/, '');
    const d0 = detFromCore(core);
    const toks = tokenize2(d0.w);
    const ts = tokenStep2(toks);
    const ruleDet = d0.ruleAtRightmost();
    if (ts.inactive || ruleDet < 0) {
      if (!!ts.inactive !== (ruleDet < 0)) { console.log('MISMATCH inactive-flag', JSON.stringify(core), ts.inactive, ruleDet); mismatches++; }
      inactive++;
      continue;
    }
    d0.step();
    if (ruleDet !== ts.rule) { console.log('MISMATCH rule', JSON.stringify(core), ruleDet, ts.rule); mismatches++; continue; }
    const tkAfter = tokenize2(d0.w);
    if (tokensKey(stripFill2(tkAfter)) !== tokensKey(stripFill2(ts.toks))) {
      console.log('MISMATCH toks', JSON.stringify(core));
      console.log('  det :', tokensKey(stripFill2(tkAfter)));
      console.log('  tok :', tokensKey(stripFill2(ts.toks)));
      mismatches++;
    }
    checked++;
  }
  return { checked, inactive, mismatches };
}

export function orbitTokenCensus2(N, T) {
  const d = new Det();
  const P = new Map();
  const addWord = (toks) => {
    for (let i = 0; i + T <= toks.length; i++) {
      const key = toks.slice(i, i + T).map(tokStr).join(' ');
      P.set(key, (P.get(key) || 0) + 1);
    }
  };
  addWord(tokenize2(d.w));
  for (let st = 0; st < N; st++) {
    d.step();
    addWord(tokenize2(d.w));
  }
  return P;
}

const args = process.argv.slice(2);
if (args.length && args[0] === 'verify') {
  const n = parseInt(args[1] || '10000');
  const t0 = Date.now();
  console.log(JSON.stringify({ ...verifyTokenStep2(n), ms: Date.now() - t0 }));
} else if (args.length && args[0] === 'census') {
  const N = parseInt(args[1]), T = parseInt(args[2]);
  const t0 = Date.now();
  const P = orbitTokenCensus2(N, T);
  const { writeFileSync } = await import('node:fs');
  writeFileSync(`p_tok2P_T${T}_N${N}.json`, JSON.stringify({ N, T, windows: [...P.entries()] }));
  console.log(`census2 N=${N} T=${T}: ${P.size} distinct windows (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
}
