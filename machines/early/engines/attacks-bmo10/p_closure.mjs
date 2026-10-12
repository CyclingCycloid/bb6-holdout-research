// p_closure.mjs — k-gram inductive closure engine for the DETERMINISTIC rightmost-#
// play of BMO 10.
//
// PROOF METHOD (sound, machine-checkable induction on rewrite steps):
//   P = set of k-grams occurring along the first N steps of the deterministic orbit
//   (word = ...10#10# . core . 0000..., two-sided fill).  F = complement.
//   If
//     (i)  every k-gram of the initial word lies in P, and
//     (ii) for every f in F: every one-step preimage of f is BLOCKED, where a
//          preimage is a local context p (firing # at q) with
//            - rule LHS matching at q,
//            - no '#' right of q anywhere (deterministic play fires at the
//              RIGHTMOST # only),
//          and BLOCKED means at least one of:
//            (a) p's span already contains a k-gram from F (so p cannot sit inside
//                an F-free word), or
//            (b) p's span contains a '#' right of q, or
//            (c) p is not realizable: no right extension (binary, eventually all
//                0s, all k-grams in P) or no left extension (into the periodic
//                fill, all k-grams in P) exists,
//   then by induction every word along the orbit avoids F forever.
//   If additionally every k-gram containing any of 111 / 1011 / 1#0 / 1#1 / 11#
//   is in F, the KEY LEMMA follows: those patterns never occur anywhere, so the
//   rightmost # is always active, so the game (rightmost-# play) is never won.
//
// Usage:
//   node p_closure.mjs orbit N k    — census (writes p_grams_k.bin + meta)
//   node p_closure.mjs check k [maxPhantoms] — closure check

import { Det } from './p_lib.mjs';
import fs from 'node:fs';

const C2I = { '0': 0, '1': 1, '#': 2 };
const LHS = ['#0', '#100', '#110', '#1010'];
const RHS = ['1', '000#', '000#', '1010##'];

export function idxOf(str) {
  let idx = 0;
  for (const c of str) idx = idx * 3 + C2I[c];
  return idx;
}

function dec(idx, k) {
  let s = '';
  for (let i = 0; i < k; i++) { s = '01#'[idx % 3] + s; idx = Math.floor(idx / 3); }
  return s;
}

// ---- orbit census -----------------------------------------------------------
export function orbitCensus(N, k) {
  const d = new Det();
  const size = Math.pow(3, k);
  const P = new Uint8Array(size);
  const markFrom = (w, from) => {
    for (let i = Math.max(0, from); i + k <= w.length; i++) {
      let idx = 0;
      for (let j = 0; j < k; j++) idx = idx * 3 + C2I[w[i + j]];
      P[idx] = 1;
    }
  };
  markFrom(d.w, 0);
  for (let s = 0; s < N; s++) {
    if (d.ruleAtRightmost() < 0) throw new Error('rightmost # inactive at step ' + s + ' word=' + d.w);
    d.step();
    const m = d.w.lastIndexOf('#');
    markFrom(d.w, m - 24); // changed region is always within [m-10, m+6]
    if (s % 100000 === 99999) { // verify incremental marking by full rescan
      const P2 = new Uint8Array(size);
      for (let i = 0; i + k <= d.w.length; i++) {
        let idx = 0;
        for (let j = 0; j < k; j++) idx = idx * 3 + C2I[d.w[i + j]];
        P2[idx] = 1;
      }
      let missed = 0;
      for (let i = 0; i < size; i++) if (P2[i] && !P[i]) missed++;
      if (missed) throw new Error(`incremental census missed ${missed} grams at step ${s}`);
    }
  }
  let n = 0;
  for (let i = 0; i < size; i++) n += P[i];
  return { P, present: n, size };
}

// ---- preimage construction --------------------------------------------------
// Relative coordinates: firing # at position 0 of the preimage word w.
// Rule replaces w[0..l) by RHS (r chars):
//   w'[i] = w[i]          (i < 0)
//   w'[i] = RHS[i]        (0 <= i < r)
//   w'[i] = w[i + l - r]  (i >= r)
// Target f (length k) = w'[rel .. rel+k).  Determined w-positions:
//   [0, l) from the LHS; and for each f char at w'-pos ip:
//     ip < 0        -> w-pos ip
//     ip >= r       -> w-pos ip + l - r
//     0 <= ip < r   -> no constraint (that char is RHS by construction)
// The span is the convex hull of determined positions (all must be covered).
// Inconsistent assignments -> null.
function buildPreimage(rule, rel, f, k) {
  const l = LHS[rule].length, r = RHS[rule].length;
  const posset = [];
  for (let j = 0; j < l; j++) posset.push(j);
  for (let j = 0; j < k; j++) {
    const ip = rel + j;
    if (ip < 0) posset.push(ip);
    else if (ip >= r) posset.push(ip + l - r);
  }
  let lo = Infinity, hi = -Infinity;
  for (const p of posset) { if (p < lo) lo = p; if (p + 1 > hi) hi = p + 1; }
  const len = hi - lo;
  const cells = new Array(len).fill(null);
  const setw = (pos, c) => {
    const j = pos - lo;
    if (cells[j] !== null && cells[j] !== c) return false;
    cells[j] = c;
    return true;
  };
  for (let j = 0; j < l; j++) if (!setw(j, LHS[rule][j])) return null;
  for (let j = 0; j < k; j++) {
    const ip = rel + j;
    let wpos;
    if (ip < 0) wpos = ip;
    else if (ip >= r) wpos = ip + l - r;
    else continue;
    if (!setw(wpos, f[j])) return null;
  }
  for (let j = 0; j < len; j++) if (cells[j] === null) return null;
  return { span: cells.join(''), q: -lo, lo };
}

// sanity check: applying the rule to the span at q reproduces f at index rel-lo
function reproduces(rule, span, q, lo, rel, f, k) {
  const l = LHS[rule].length;
  const post = span.slice(0, q) + RHS[rule] + span.slice(q + l);
  return post.startsWith(f, rel - lo);
}

// ---- realizability ----------------------------------------------------------
function rightRealizable(span, P, k) {
  // extend right with {0,1}, must eventually go to all 0s; all new k-grams in P
  const start = span.slice(-(k - 1));
  const canFinish = (suf) => {
    let cur = suf;
    for (let t = 0; t < k - 1; t++) {
      cur = cur.slice(1) + '0';
      if (P[idxOf(cur)] !== 1) return false;
    }
    return true; // suffix becomes 0^(k-1); every further window is 0^k in P
  };
  const seen = new Set();
  const dfs = (suf) => {
    if (canFinish(suf)) return true;
    if (seen.has(suf)) return false;
    seen.add(suf);
    for (const c of ['0', '1']) {
      const g = suf + c;
      if (P[idxOf(g)] === 1 && dfs(g.slice(1))) return true;
    }
    return false;
  };
  return dfs(start);
}

function leftRealizable(span, P, k) {
  // extend left with {0,1,#}, must reach the periodic fill 10#10#...
  const fillNodes = new Set();
  const base = '10#'.repeat(k + 2);
  for (let i = 0; i < 3; i++) fillNodes.add(base.slice(i, i + (k - 1)));
  const start = span.slice(0, k - 1);
  const seen = new Set();
  const dfs = (pre) => {
    if (fillNodes.has(pre)) return true;
    if (seen.has(pre)) return false;
    seen.add(pre);
    for (const c of ['0', '1', '#']) {
      const g = c + pre;
      if (P[idxOf(g.slice(0, k))] === 1 && dfs(g.slice(0, k - 1))) return true;
    }
    return false;
  };
  return dfs(start);
}

// ---- closure check ----------------------------------------------------------
export function closureCheck(P, k, maxPhantoms = 20) {
  const size = Math.pow(3, k);
  const phantoms = [];
  let nF = 0, nCand = 0, nBblocked = 0, nRblocked = 0, nUblocked = 0;
  // precompile per-rule quick filters: which alignments rel are possible at all
  for (let idx = 0; idx < size; idx++) {
    if (P[idx]) continue;
    const f = dec(idx, k);
    nF++;
    for (let rule = 0; rule < 4; rule++) {
      const l = LHS[rule].length, r = RHS[rule].length;
      const zoneEnd = Math.max(l, r);
      for (let rel = -(k - 1); rel <= zoneEnd - 1; rel++) {
        // quick filter: f's chars inside the changed region [0, r) must equal RHS
        let ok = true;
        for (let t = Math.max(0, rel); t < Math.min(r, rel + k); t++) {
          if (f[t - rel] !== RHS[rule][t]) { ok = false; break; }
        }
        if (!ok) continue;
        const pre = buildPreimage(rule, rel, f, k);
        if (!pre) continue;
        nCand++;
        const { span, q, lo } = pre;
        // (b) no '#' right of q in span (rightmost-# legality)
        let bad = false;
        for (let i = q + 1; i < span.length; i++) if (span[i] === '#') { bad = true; break; }
        if (bad) { nRblocked++; continue; }
        // (a) span's k-grams must all be present
        let hasAbsent = false;
        for (let i = 0; i + k <= span.length; i++) {
          if (P[idxOf(span.slice(i, i + k))] !== 1) { hasAbsent = true; break; }
        }
        if (hasAbsent) { nBblocked++; continue; }
        // sanity: the span really reproduces f
        if (!reproduces(rule, span, q, lo, rel, f, k)) throw new Error('preimage does not reproduce f: ' + f + ' rule ' + rule + ' rel ' + rel + ' span ' + span);
        // (c) realizability
        if (!rightRealizable(span, P, k)) { nUblocked++; continue; }
        if (!leftRealizable(span, P, k)) { nUblocked++; continue; }
        phantoms.push({ f, rule, rel, span, q });
        if (phantoms.length >= maxPhantoms) {
          return { closed: false, phantoms, nF, nCand, nBblocked, nRblocked, nUblocked };
        }
      }
    }
  }
  return { closed: phantoms.length === 0, phantoms, nF, nCand, nBblocked, nRblocked, nUblocked };
}

// ---- CLI --------------------------------------------------------------------
const args = process.argv.slice(2);
if (args.length) {
  const mode = args[0];
  if (mode === 'orbit') {
    const N = parseInt(args[1]), k = parseInt(args[2]);
    const t0 = Date.now();
    const { P, present, size } = orbitCensus(N, k);
    const pats = ['111', '1011', '1#0', '1#1', '11#'];
    let allAbsent = true;
    outer: for (let i = 0; i < size; i++) {
      if (!P[i]) continue;
      const g = dec(i, k);
      for (const p of pats) if (g.includes(p)) { allAbsent = false; console.error('PRESENT-but-forbidden:', g, p); break outer; }
    }
    fs.writeFileSync(`p_grams_${k}.bin`, Buffer.from(P));
    fs.writeFileSync(`p_grams_${k}.meta.json`, JSON.stringify({ N, k, present, size, forbiddenFullyAbsent: allAbsent, ms: Date.now() - t0 }, null, 2));
    console.log(`orbit N=${N} k=${k}: present=${present}/${size} forbiddenFullyAbsent=${allAbsent} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  } else if (mode === 'check') {
    const k = parseInt(args[1]);
    const maxPh = parseInt(args[2] || '20');
    const P = new Uint8Array(fs.readFileSync(`p_grams_${k}.bin`));
    const t0 = Date.now();
    const res = closureCheck(P, k, maxPh);
    console.log(JSON.stringify({ ...res, ms: Date.now() - t0 }, null, 2));
  }
}
