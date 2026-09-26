// RLE n-gram invariant for BMO10: learn allowed run n-grams from reachable data,
// verify closure under the 4 rules via exhaustive DFS over allowed contexts.
// Includes a differential test of the abstract rule engine against the string-level
// simulator over ALL reachable transitions (catches modeling bugs).
//
// Run tokens: 'o1','o2' (1-runs), 'z1'..'z7' (0-runs), 'h1'..'h8' (hash-runs),
// 'h9p' (>=9 hashes), 'R' (infinite right 0-run). Sequences alternate run types.
// Left context: prepend 3 periodic units [o1 z1 h1].
import { RULESETS, bfs, windowOf, activePositions } from './game.mjs';

const rs = RULESETS.bmo10;
const DEPTH = parseInt(process.argv[2] || '60');
const NGRAM = parseInt(process.argv[3] || '5');
const CTXLEN = parseInt(process.argv[4] || '9');

function runsOf(S) {
  const runs = []; let i = 0;
  while (i < S.length) { let j = i; while (j < S.length && S[j] === S[i]) j++; runs.push([S[i], j - i]); i = j; }
  return runs;
}
const ZCAP = 8, HCAP = 9;
function tok(type, len) {
  if (len === Infinity) return 'R';
  if (type === '0') return len >= ZCAP ? 'z8p' : 'z' + len;
  if (type === '1') return len >= 3 ? 'o3p' : 'o' + len;
  if (type === '#') return len >= HCAP ? 'h9p' : 'h' + len;
}
function typeOf(t) { return (t[0] === 'z' || t === 'R') ? '0' : t[0] === 'o' ? '1' : '#'; }
function lenOf(t) { if (t === 'R') return Infinity; if (t === 'z8p') return ZCAP; if (t === 'h9p') return HCAP; if (t === 'o3p') return 3; return parseInt(t.slice(1)); }

function seqOf(S) {
  const seq = ['o1', 'z1', 'h1', 'o1', 'z1', 'h1', 'o1', 'z1', 'h1'];
  for (const [c, k] of runsOf(S)) seq.push(tok(c, k));
  seq.push('R');
  return seq;
}
function merge(arr) {
  const out = [];
  for (const t of arr) {
    if (!t) continue;
    if (out.length && typeOf(out[out.length - 1]) === typeOf(t)) {
      const a = out.pop();
      out.push(tok(typeOf(a), (lenOf(a) === Infinity || lenOf(t) === Infinity) ? Infinity : lenOf(a) + lenOf(t)));
    } else out.push(t);
  }
  return out;
}
// consume d symbols off the left of a 0- or hash-run token; returns list of variants
function consume(t, d) {
  if (t === 'R') return [d >= 1 ? 'R' : 'R']; // consuming finitely many of infinity
  const L = lenOf(t);
  if (t === 'z8p' || t === 'h9p') {
    // run length >= cap: after consuming d, length >= cap-d: possible tokens:
    const out = [];
    for (let m = Math.max(1, (t === 'z8p' ? ZCAP : HCAP) - d); m <= (t === 'z8p' ? ZCAP - 1 : HCAP - 1); m++) out.push(tok(typeOf(t), m));
    out.push(t); // still >= cap
    if ((t === 'z8p' ? ZCAP : HCAP) - d <= 0) { /* consumed the whole run possibly */ out.push(null); }
    return [...new Set(out)];
  }
  const rem = L - d;
  return rem >= 1 ? [tok(typeOf(t), rem)] : [null];
}

// Apply the (unique) rule at the last # of run index p. Returns list of result
// sequences (variants from cap-nondeterminism) or null if inactive.
function applyRule(seq, p) {
  const t = seq[p]; if (typeOf(t) !== '#') return null;
  const k = lenOf(t);
  const r1 = seq[p + 1], r2 = seq[p + 2], r3 = seq[p + 3], r4 = seq[p + 4];
  const T1 = r1 ? typeOf(r1) : null;
  const pre = seq.slice(0, p);
  const outs = [];
  const push = (mid, rest) => { outs.push(merge([...pre, ...mid.filter(x => x !== null), ...rest])); };
  // R1: #0 -> 1
  if (T1 === '0') {
    for (const zr of consume(r1, 1)) {
      if (k >= 2) {
        for (const hr of consume(t, 1)) push([hr, 'o1', zr], seq.slice(p + 2));
      } else push(['o1', zr], seq.slice(p + 2));
    }
    return outs;
  }
  // R2: #100 -> 000#   (r1 = o1, r2 zeros len>=2)
  if (r1 === 'o1' && r2 && typeOf(r2) === '0' && lenOf(r2) >= 2) {
    for (const zr of consume(r2, 2)) {
      if (k >= 2) { for (const hr of consume(t, 1)) push([hr, 'z3', 'h1', zr], seq.slice(p + 3)); }
      else push(['z3', 'h1', zr], seq.slice(p + 3));
    }
    return outs;
  }
  // R3: #110 -> 000#   (r1 = o2, r2 zeros len>=1)
  if (r1 === 'o2' && r2 && typeOf(r2) === '0' && lenOf(r2) >= 1) {
    for (const zr of consume(r2, 1)) {
      if (k >= 2) { for (const hr of consume(t, 1)) push([hr, 'z3', 'h1', zr], seq.slice(p + 3)); }
      else push(['z3', 'h1', zr], seq.slice(p + 3));
    }
    return outs;
  }
  // R4: #1010 -> 1010## (r1=o1, r2=z1, r3=o1, r4 zeros len>=1)
  if (r1 === 'o1' && r2 === 'z1' && r3 === 'o1' && r4 && typeOf(r4) === '0' && lenOf(r4) >= 1) {
    for (const zr of consume(r4, 1)) {
      if (k >= 2) { for (const hr of consume(t, 1)) push([hr, 'o1', 'z1', 'o1', 'z1', 'h2', zr], seq.slice(p + 5)); }
      else push(['o1', 'z1', 'o1', 'z1', 'h2', zr], seq.slice(p + 5));
    }
    return outs;
  }
  return null;
}

// ---------- learn allowed n-grams from reachable set ----------
const r = bfs(rs, DEPTH, 5000000, 900);
const states = [...r.visited.keys()];
console.error(`reachable states: ${states.length}`);
const allowed = new Set();
let maxZ = 0, maxH = 0, maxO = 0;
for (const S of states) {
  for (const [c, k] of runsOf(S)) {
    if (c === '0') maxZ = Math.max(maxZ, k);
    if (c === '#') maxH = Math.max(maxH, k);
    if (c === '1') maxO = Math.max(maxO, k);
  }
  const seq = seqOf(S);
  for (let n = 1; n <= NGRAM; n++)
    for (let i = 0; i + n <= seq.length; i++) allowed.add(seq.slice(i, i + n).join(' '));
}
console.error(`max interior runs: z=${maxZ} h=${maxH} o=${maxO}`);
if (maxZ >= ZCAP || maxO >= 3) { console.error('CAP PROBLEM: data exceeds exact caps'); process.exit(1); }
console.error(`allowed n-grams(<=${NGRAM}): ${allowed.size}; [o1 z1 o2] present? ${allowed.has('o1 z1 o2')}`);

// ---------- differential test: abstract engine vs string simulator ----------
// For every reachable state and every ACTIVE # in the virtual window, map to the
// corresponding #-run index in seq and compare applyRule's outputs with seqOf(result).
function seqWithoutPeriodicPrefix(seq) {
  let s = seq.slice();
  while (s.length >= 3 && s[0] === 'o1' && s[1] === 'z1' && s[2] === 'h1') s = s.slice(3);
  return s;
}
let dtests = 0, dfail = 0;
for (const S of states) {
  const seq = seqOf(S);
  const runs = runsOf(S);
  const act = activePositions(S, rs); // V-indices of active #s (>=5; 5 = boundary)
  for (const vi of act) {
    const S2 = r2apply(S, vi);
    const expected = seqWithoutPeriodicPrefix(seqOf(S2));
    let p;
    if (vi === 5) p = 8; // boundary #: 3rd prepended periodic h1
    else {
      const si = vi - 6;
      let pos = 0, runIdx = -1;
      for (let q = 0; q < runs.length; q++) { if (si >= pos && si < pos + runs[q][1]) { runIdx = q; break; } pos += runs[q][1]; }
      if (runIdx < 0 || runs[runIdx][0] !== '#') { console.error('MAP FAIL', S, vi); dfail++; continue; }
      p = 9 + runIdx;
    }
    const outs = applyRule(seq, p);
    dtests++;
    if (outs === null) { console.error(`DIFF: no abstract rule fired for S=${S} vi=${vi}`); dfail++; continue; }
    const okv = outs.some(o => seqWithoutPeriodicPrefix(o).join(' ') === expected.join(' '));
    if (!okv) { console.error(`DIFF: S=${S} vi=${vi} expected=${expected.join(' ')} got=${outs.map(o => seqWithoutPeriodicPrefix(o).join(' ')).join(' | ')}`); dfail++; }
  }
}
console.error(`differential test: ${dtests} transitions, failures: ${dfail}`);
if (dfail) process.exit(1);

// string-level apply (duplicate of game.mjs applyAt for independence)
function r2apply(S, vi) {
  const V = windowOf(S);
  let p = -1;
  for (let q = 0; q < rs.pats.length; q++) {
    const lhs = rs.pats[q][0];
    let ok = true;
    for (let j = 0; j < lhs.length; j++) if (V[vi + 1 + j] !== lhs[j]) { ok = false; break; }
    if (ok) { p = q; break; }
  }
  if (p < 0) throw new Error('inactive');
  const [lhs, rhs] = rs.pats[p];
  const V2 = V.slice(0, vi) + rhs + V.slice(vi + 1 + lhs.length);
  const S2 = vi === 5 ? V2.slice(3) : V2.slice(6);
  let s = S2;
  while (s.startsWith('10#')) s = s.slice(3);
  return s.replace(/0+$/, '');
}

// ---------- closure DFS ----------
function checkClosure() {
  const viol = [];
  const syms = ['o1', 'o2', 'z1', 'z2', 'z3', 'z4', 'z5', 'z6', 'z7', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'h7', 'h8', 'h9p', 'R'];
  const byType = { '0': [], '1': [], '#': [] };
  for (const t of syms) byType[typeOf(t)].push(t);
  const stack = [[]];
  let nctx = 0;
  while (stack.length) {
    const seq = stack.pop();
    if (seq.length === CTXLEN) {
      nctx++;
      for (let p = 1; p < seq.length; p++) {
        if (typeOf(seq[p]) !== '#') continue;
        const outs = applyRule(seq, p);
        if (!outs) continue;
        for (const out of outs) {
          for (let i = 0; i + NGRAM <= out.length; i++) {
            const g = out.slice(i, i + NGRAM).join(' ');
            if (!allowed.has(g)) {
              viol.push({ seq, p, out, g });
              if (viol.length <= 40) console.error(`VIOL: ${seq.join(' ')} @${p} => ${out.join(' ')} bad: ${g}`);
              break;
            }
          }
        }
      }
      if (nctx % 2000000 === 0) console.error(`  ctx ${nctx} viol ${viol.length}`);
      continue;
    }
    const lastType = seq.length ? typeOf(seq[seq.length - 1]) : null;
    for (const ty of ['0', '1', '#']) {
      if (ty === lastType) continue;
      for (const t of byType[ty]) {
        const seq2 = [...seq, t];
        if (seq2.length >= NGRAM) { if (!allowed.has(seq2.slice(-NGRAM).join(' '))) continue; }
        else if (!allowed.has(seq2.join(' '))) continue;
        stack.push(seq2);
      }
    }
  }
  console.error(`closure: contexts tested ${nctx}, violations ${viol.length}`);
  return viol;
}

const viol = checkClosure();
if (viol.length === 0) {
  console.log('CLOSED under all 4 rules.');
  console.log('=> every word reachable from w0 avoids substrings 111 and 1011;');
  console.log('=> the tail after the rightmost # never starts 111 or 1011;');
  console.log('=> the rightmost # is active in every reachable configuration: ANSWER NO.');
} else {
  console.log(`NOT CLOSED: ${viol.length} violations`);
}
