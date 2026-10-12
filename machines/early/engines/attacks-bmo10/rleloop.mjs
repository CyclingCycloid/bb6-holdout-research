// Iterative refinement of the RLE n-gram invariant.
// L = words whose run-sequence n-grams are all "allowed". Start: allowed = data n-grams.
// Loop: find closure violations; forbid one pre-context n-gram per violation
// (never forbidding init-essential n-grams); repeat. Monotone: violations only shrink.
// Success (0 violations) => PROOF that all reachable words avoid 111 and 1011 => NO.
import { RULESETS, bfs } from './game.mjs';

const rs = RULESETS.bmo10;
const DEPTH = parseInt(process.argv[2] || '60');
const NGRAM = parseInt(process.argv[3] || '6');
const CTXLEN = parseInt(process.argv[4] || '11');
const ROUNDS = parseInt(process.argv[5] || '40');
const CAPV = parseInt(process.argv[6] || '4000');

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
function consume(t, d) {
  if (t === 'R') return ['R'];
  if (t === 'z8p' || t === 'h9p') {
    const cap = t === 'z8p' ? ZCAP : HCAP;
    const out = [];
    for (let m = Math.max(1, cap - d); m <= cap - 1; m++) out.push(tok(typeOf(t), m));
    out.push(t);
    if (cap - d <= 0) out.push(null);
    return [...new Set(out)];
  }
  const rem = lenOf(t) - d;
  return rem >= 1 ? [tok(typeOf(t), rem)] : [null];
}
function applyRule(seq, p) {
  const t = seq[p]; if (typeOf(t) !== '#') return null;
  const k = lenOf(t);
  const r1 = seq[p + 1], r2 = seq[p + 2], r3 = seq[p + 3], r4 = seq[p + 4];
  const T1 = r1 ? typeOf(r1) : null;
  const pre = seq.slice(0, p);
  const outs = [];
  const push = (mid, rest) => { outs.push(merge([...pre, ...mid.filter(x => x !== null), ...rest])); };
  if (T1 === '0') {
    for (const zr of consume(r1, 1)) {
      if (k >= 2) { for (const hr of consume(t, 1)) push([hr, 'o1', zr], seq.slice(p + 2)); }
      else push(['o1', zr], seq.slice(p + 2));
    }
    return outs;
  }
  if (r1 === 'o1' && r2 && typeOf(r2) === '0' && lenOf(r2) >= 2) {
    for (const zr of consume(r2, 2)) {
      if (k >= 2) { for (const hr of consume(t, 1)) push([hr, 'z3', 'h1', zr], seq.slice(p + 3)); }
      else push(['z3', 'h1', zr], seq.slice(p + 3));
    }
    return outs;
  }
  if (r1 === 'o2' && r2 && typeOf(r2) === '0' && lenOf(r2) >= 1) {
    for (const zr of consume(r2, 1)) {
      if (k >= 2) { for (const hr of consume(t, 1)) push([hr, 'z3', 'h1', zr], seq.slice(p + 3)); }
      else push(['z3', 'h1', zr], seq.slice(p + 3));
    }
    return outs;
  }
  if (r1 === 'o1' && r2 === 'z1' && r3 === 'o1' && r4 && typeOf(r4) === '0' && lenOf(r4) >= 1) {
    for (const zr of consume(r4, 1)) {
      if (k >= 2) { for (const hr of consume(t, 1)) push([hr, 'o1', 'z1', 'o1', 'z1', 'h2', zr], seq.slice(p + 5)); }
      else push(['o1', 'z1', 'o1', 'z1', 'h2', zr], seq.slice(p + 5));
    }
    return outs;
  }
  return null;
}

// ---------- data ----------
const r = bfs(rs, DEPTH, 5000000, 900);
const states = [...r.visited.keys()];
const allowed = new Set();
for (const S of states) {
  const seq = seqOf(S);
  for (let n = 1; n <= NGRAM; n++)
    for (let i = 0; i + n <= seq.length; i++) allowed.add(seq.slice(i, i + n).join(' '));
}
// init-essential n-grams
const initSeq = seqOf('');
const initEss = new Set();
for (let n = 1; n <= NGRAM; n++)
  for (let i = 0; i + n <= initSeq.length; i++) initEss.add(initSeq.slice(i, i + n).join(' '));
console.error(`states=${states.length} allowed=${allowed.size} initEss=${initEss.size}`);

const syms = ['o1', 'o2', 'z1', 'z2', 'z3', 'z4', 'z5', 'z6', 'z7', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'h7', 'h8', 'h9p', 'R'];
const byType = { '0': [], '1': [], '#': [] };
for (const t of syms) byType[typeOf(t)].push(t);

function gatherViolations(cap) {
  const viol = [];
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
        let bad = false;
        for (const out of outs) {
          for (let i = 0; i + NGRAM <= out.length; i++) {
            const g = out.slice(i, i + NGRAM).join(' ');
            if (!allowed.has(g)) { viol.push({ seq, p }); bad = true; break; }
          }
          if (bad) break;
        }
        if (viol.length >= cap) return { viol, nctx };
      }
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
  return { viol, nctx };
}

let prevViol = Infinity;
for (let round = 0; round < ROUNDS; round++) {
  const { viol, nctx } = gatherViolations(CAPV);
  console.error(`round ${round}: contexts ${nctx}, violations(capped) ${viol.length}, allowed ${allowed.size}`);
  if (viol.length === 0) {
    console.log('CLOSED! Invariant verified: every word with all-ngrams-allowed rewrites only to such words;');
    console.log('init is such a word => all reachable words avoid o3p (111) and [o1 z1 o2] (1011)');
    console.log('=> rightmost # always active => BMO 10 ANSWER: NO');
    // dump forbidden summary
    const fs = require('fs');
    fs.writeFileSync('invariant-allowed.txt', [...allowed].sort().join('\n'));
    console.log(`allowed n-grams dumped (${allowed.size}); data had ${'?'} - see invariant-allowed.txt`);
    process.exit(0);
  }
  if (viol.length >= prevViol) { console.error('no progress; stop'); break; }
  prevViol = viol.length;
  // forbid one pre-context n-gram per violation: window centered on site p
  let forb = 0;
  for (const v of viol) {
    // choose window: tokens p-1 .. p+NGRAM-2 (left-anchored at the run before #)
    for (let shift = -2; shift <= 2; shift++) {
      const a = Math.max(0, Math.min(v.seq.length - NGRAM, v.p - 1 + shift));
      const g = v.seq.slice(a, a + NGRAM).join(' ');
      if (!initEss.has(g) && allowed.has(g)) { allowed.delete(g); forb++; break; }
    }
  }
  console.error(`  forbade ${forb} n-grams`);
}
console.log('REFINEMENT DID NOT CONVERGE');
