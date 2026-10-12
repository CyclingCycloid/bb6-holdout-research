// p_token.mjs — token-level (RLE) parameterized macro system for the deterministic
// rightmost-# play of BMO 10, plus the token-window closure engine (key lemma).
//
// TOKENS (the macro alphabet; parameters are exact integers):
//   {H:1}, {H:2}   '#' run of length 1 or 2  (only the rightmost run can have
//                  length 2 — the active run)
//   {1:1} = a      a single '1'
//   {1:2} = b      '11' (transient R1-seam; born from a+a merges)
//   {1:n} n>=3     forbidden (would mean '111' — never in the orbit)
//   {0:m}          0-run of exact length m
//   {0:INF} = Zinf the final 0^infinity run (last token of every word)
//
// tokenStep: the macro rule at the active (last) '#', implemented by expand ->
// string rewrite -> retokenize, so merge/parameter arithmetic is automatically
// exact.  Differential-tested against p_lib's simulator (p_token verify).
//
// Closure engine: P = set of T-token windows observed along the orbit (exact
// parameters).  Forward check: every P-clean, legal, realizable context around
// the active '#' steps to a P-clean word.  If that holds and the initial word is
// P-clean, induction proves every orbit word is P-clean forever; if P excludes
// all windows containing 111 / 1011 / 1#0 / 1#1 / 11#, the KEY LEMMA follows.

import { Det, detFromCore } from './p_lib.mjs';
import fs from 'node:fs';

const PATS = [['0', '1'], ['100', '000#'], ['110', '000#'], ['1010', '1010##']];
export const RNAMES = ['R1:#0->1', 'R2:#100->000#', 'R3:#110->000#', 'R4:#1010->1010##'];

// ---- tokenization ----------------------------------------------------------
// tokens: {t:'H', n:1|2} | {t:'1', n:1|2|3+} | {t:'0', n: int} | {t:'0', n:'INF'}
export function tokenize(w) {
  const toks = [];
  let i = 0;
  // treat the trailing run of zeros as INF if it reaches the string end
  let zend = w.length;
  while (zend > 0 && w[zend - 1] === '0') zend--;
  const hasInfTail = zend < w.length;
  const s = hasInfTail ? w.slice(0, zend) : w;
  while (i < s.length) {
    const c = s[i];
    let j = i;
    while (j < s.length && s[j] === c) j++;
    toks.push(c === '#' ? { t: 'H', n: j - i } : { t: c, n: j - i });
    i = j;
  }
  if (hasInfTail) toks.push({ t: '0', n: 'INF' });
  return toks;
}

export function tokStr(tok) {
  if (tok.n === 'INF') return 'Zinf';
  if (tok.t === 'H') return 'H' + tok.n;          // H1, H2
  if (tok.t === '1') return tok.n >= 3 ? 'c' : tok.n === 2 ? 'b' : 'a';
  return 'Z_' + tok.n;                            // Z_1, Z_2, ...
}
export function tokensKey(toks) { return toks.map(tokStr).join(' '); }

const INF_EXPAND = 400; // expansion length for Zinf in step contexts

export function expand(toks) {
  let s = '';
  for (const tk of toks) {
    if (tk.n === 'INF') s += '0'.repeat(INF_EXPAND);
    else s += (tk.t === 'H' ? '#' : tk.t).repeat(tk.n);
  }
  return s;
}

// ---- the macro step --------------------------------------------------------
// Apply the deterministic step at the LAST '#' of the token sequence.
// Returns { toks, rule } or { inactive: true }.
export function tokenStep(toks) {
  // find last H
  let ai = -1;
  for (let i = toks.length - 1; i >= 0; i--) if (toks[i].t === 'H') { ai = i; break; }
  if (ai < 0) return { inactive: true };
  const s = expand(toks);
  const q = s.lastIndexOf('#');
  // match rule at q
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
  // retokenize; the trailing 0-run is INF again (it always is)
  const t2 = tokenizeKeepInf(s2);
  return { toks: t2, rule };
}

function tokenizeKeepInf(s) {
  const toks = tokenize(s);
  // tokenize() marks trailing-run-as-INF only if string ends with 0; after the
  // rewrite it does (word ends in 0^inf), but the expansion makes it 400 zeros;
  // ensure the final token is INF:
  const last = toks[toks.length - 1];
  if (last && last.t === '0' && last.n !== 'INF') {
    toks[toks.length - 1] = { t: '0', n: 'INF' };
  }
  return toks;
}

// strip leading pure-fill units (a Z_1 H)* — representation-independent
export function stripFill(toks) {
  const key = (t) => tokensKey(t);
  while (toks.length >= 3 && key(toks.slice(0, 3)) === 'a Z_1 H1') toks = toks.slice(3);
  return toks;
}

// ---- differential verification of tokenStep vs the string simulator --------
// Random words: fill + random disturbed core + 0-inf.  Compare tokenStep vs Det.
export function verifyTokenStep(nSamples, seed = 12345) {
  let s = seed >>> 0;
  const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  const rint = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  let checked = 0, mismatches = 0, inactive = 0;
  const blocks = ['000', '1010', '1', '10', '0000000', '100', '11', '0101', '0000', '101010',
    '#', '##', '0#', '10#', '#10#', '#1010', '#100', '000#', '0#10', '#0', '1010##', '0#1', '00#000'];
  for (let it = 0; it < nSamples; it++) {
    let core = '';
    const nb = rint(0, 16);
    for (let i = 0; i < nb; i++) core += blocks[rint(0, blocks.length - 1)];
    core = core.replace(/0+$/, '');
    const d0 = detFromCore(core);
    const toks = tokenize(d0.w);
    const ts = tokenStep(toks);
    const ruleDet = d0.ruleAtRightmost();
    if (ts.inactive || ruleDet < 0) {
      if (!!ts.inactive !== (ruleDet < 0)) { console.log('MISMATCH inactive-flag', JSON.stringify(core), ts.inactive, ruleDet); mismatches++; }
      inactive++;
      continue;
    }
    const rule4 = d0.step();
    if (ruleDet !== ts.rule) { console.log('MISMATCH rule', JSON.stringify(core), ruleDet, ts.rule); mismatches++; continue; }
    const tkAfter = tokenize(d0.w);
    if (tokensKey(stripFill(tkAfter)) !== tokensKey(stripFill(ts.toks))) {
      console.log('MISMATCH toks', JSON.stringify(core));
      console.log('  det :', tokensKey(tkAfter));
      console.log('  tok :', tokensKey(ts.toks));
      mismatches++;
    }
    checked++;
  }
  return { checked, inactive, mismatches };
}

// ---- census -----------------------------------------------------------------
export function orbitTokenCensus(N, T) {
  const d = new Det();
  const P = new Map(); // window key -> count
  let cur = tokenize(d.w);
  const addWord = (toks) => {
    for (let i = 0; i + T <= toks.length; i++) {
      const key = toks.slice(i, i + T).map(tokStr).join(' ');
      P.set(key, (P.get(key) || 0) + 1);
    }
  };
  addWord(cur);
  for (let st = 0; st < N; st++) {
    d.step();
    cur = tokenize(d.w);
    addWord(cur);
  }
  return P;
}

// ---- CLI --------------------------------------------------------------------
const args = process.argv.slice(2);
if (args.length) {
  if (args[0] === 'verify') {
    const n = parseInt(args[1] || '10000');
    const t0 = Date.now();
    const r = verifyTokenStep(n);
    console.log(JSON.stringify({ ...r, ms: Date.now() - t0 }));
  } else if (args[0] === 'census') {
    const N = parseInt(args[1]), T = parseInt(args[2]);
    const t0 = Date.now();
    const P = orbitTokenCensus(N, T);
    fs.writeFileSync(`p_tokP_T${T}.json`, JSON.stringify({ N, T, windows: [...P.entries()] }));
    console.log(`census N=${N} T=${T}: ${P.size} distinct windows (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  }
}
