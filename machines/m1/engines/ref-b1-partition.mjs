// ref-b1-partition.mjs — REFEREE (read-only audit) for v6 §1 root/child partition completeness.
// Independent re-derivation:
//  (a) raw TM sim from blank tape -> anchor chain (n, step) vs collapsed engine (n', cost) exact;
//  (b) uncollapsed per-event walk: S-entry births sourced ONLY by R / L / G (S-sourced = sweep interior dup);
//  (c) provenance: R(a≠1) at a birth must be an L3->R relay (or the anchor init R(n,n), counted separately);
//  (d) closed forms: G-entry head == producing S-entry's A; E6 child A' == (a+1)/2; descendant odd part
//      == last ROOT's odd part; E1-reentry birth divisible by 3;
//  (e) uncollapsed root sequence == collapsed root sequence (same anchors).
// Usage: node ref-b1-partition.mjs [MAXEVENTS=2e7] [RAWANCHORS=10]
import { stepFastB, transitionFastB } from './bstep.mjs';
const B = BigInt;

// ---------- (a) independent raw TM simulator ----------
const CODE = '1RB1LA0RC0RD1LC1LA1RE1RD1LF0LA---0LE';
const TR = [];
for (let i = 0; i < 12; i++) {
  const t = CODE.slice(3 * i, 3 * i + 3);
  TR[i] = t[0] === '-' ? null : { w: +t[0], d: t[1] === 'L' ? -1 : 1, n: t[2].charCodeAt(0) - 65 };
}
function rawWalk(maxAnchors, maxSteps) {
  const tape = new Map();
  const rd = (p) => tape.get(p) || 0;
  const wr = (p, v) => { if (v) tape.set(p, v); else tape.delete(p); };
  let st = 0, head = 0, step = 0;
  const anchors = [];
  while (anchors.length < maxAnchors && step < maxSteps) {
    if (st === 3 && rd(head) === 0) { // state D reading 0: candidate anchor event
      const ks = [...tape.keys()].sort((a, b) => a - b);
      const lo = ks[0], hi = ks[ks.length - 1];
      let nn = 0; while (rd(lo + nn) === 1) nn++;
      // pure P(n): 1^n 0 1^n contiguous, head just right of right block
      if (nn >= 2 && rd(lo + nn) === 0 && head === hi + 1 && ks.length === 2 * nn && hi === lo + 2 * nn) {
        let ok = true;
        for (let i = 0; i < nn; i++) if (rd(lo + nn + 1 + i) !== 1) { ok = false; break; }
        if (ok) anchors.push({ step, n: nn });
      }
    }
    const c = rd(head);
    const tr = TR[st * 2 + c];
    if (!tr) return { anchors, haltStep: step };
    wr(head, tr.w); head += tr.d; st = tr.n; step++;
  }
  return { anchors, haltStep: null };
}
const RAWANCHORS = Number(process.argv[3] ?? 10);
const raw = rawWalk(RAWANCHORS + 2, 2e9);
console.log(`[raw] anchors (step,n): ${raw.anchors.slice(0, RAWANCHORS + 2).map(a => `(${a.step},${a.n})`).join(' ')}`);
let rawOK = 0, rawBad = 0;
for (let i = 0; i < RAWANCHORS; i++) {
  const n = raw.anchors[i].n;
  const r = transitionFastB(n);
  if (r.n2 === B(raw.anchors[i + 1].n) && B(raw.anchors[i + 1].step - raw.anchors[i].step) === r.cost) rawOK++;
  else { rawBad++; console.log(`  raw MISMATCH n=${n}: raw next=(${raw.anchors[i + 1].step},${raw.anchors[i + 1].n}) engine n'=${r.n2} cost=${r.cost}`); }
}
console.log(`[raw-vs-engine] ${rawOK}/${RAWANCHORS} anchor transitions exact in n' AND cost (bad=${rawBad})`);

// ---------- (b)-(e) uncollapsed per-event walk ----------
function step1(c) { // one D-on-0 event; independently transcribed
  if (c.t === 'R') { const [a, b] = c.r; return { c: { t: 'S', r: [a + 1n, b - 2n, 1n] } }; }
  if (c.t === 'S') {
    const [x, y, z, ...rest] = c.r;
    if (y >= 3n) return { c: { t: 'S', r: [x + 1n, y - 2n, z + 1n, ...rest] } };
    if (y === 2n) return { c: { t: 'G', r: [x + 1n, z + 1n, ...rest] } };
    if (y === 1n) {
      if (rest.length === 0) return { c: { t: 'R', r: [1n, x + z + 3n] } };
      return { c: { t: 'L', r: [1n, x + z + 3n, ...rest] } };
    }
    return { degenerate: 'S y=' + y };
  }
  if (c.t === 'G') {
    const [a, b, ...rest] = c.r;
    if (a >= 4n) return { c: { t: 'S', r: [1n, a - 3n, 1n, b + 1n, ...rest] } };
    if (a === 2n) return { c: { t: 'L', r: [1n, b + 1n, b + 1n, ...rest] } };
    if (a === 3n) return { halt: true };
    return { degenerate: 'G a=' + a };
  }
  if (c.t === 'L') {
    const [r1, r2, r3, ...rest] = c.r;
    if (r3 >= 2n) return { c: { t: 'L', r: [r1 + 1n, r2, r3 - 1n, ...rest] } };
    if (r3 === 1n) {
      if (c.r.length === 3) return { c: { t: 'R', r: [r1 + 1n, r2] } };
      return { c: { t: 'S', r: [r1 + 1n, r2, ...rest] } };
    }
    return { degenerate: 'L r3=' + r3 };
  }
  return { degenerate: '?' };
}

const MAXEV = Number(process.argv[2] ?? 2e7);
let n = 3n, events = 0, anchorCount = 0;
let births = 0, rootBirths = 0, childBirths = 0;
const srcCount = { R: 0, L: 0, G: 0, Sint: 0, ANCHOR: 0 };
let otherSrc = 0;
let provenanceBad = 0, inheritBad = 0, oddPartBad = 0, gHeadBad = 0, e1r3bad = 0, e1rCount = 0;
let pow2 = 0, anchorEvenBirth = 0;
const oddPart = (v) => { let x = B(v); while ((x & 1n) === 0n) x >>= 1n; return x; };

let c, cFrom, cFromRule;   // cFrom: 'ANCHOR-INIT' | 'R' | 'L' | 'G' | 'S'; cFromRule = rule that PRODUCED the previous config
let cFromCtx, prodOf = 'INIT';
let lastRootOdd = null, prevGHead = null, curSweepA = null;
const rootSeqUn = [];

outer:
for (let k = 0; ; k++) {
  c = { t: 'R', r: [n, n] }; cFrom = 'ANCHOR-INIT'; cFromRule = 'INIT'; cFromCtx = c.r;
  curSweepA = null;
  anchorCount++;
  for (let it = 0; it < 5000000; it++) {
    if (c.t === 'S' && (c.r[1] & 1n) === 0n) {
      const A = c.r[0] + c.r[1] / 2n + 1n;
      births++;
      if (cFrom === 'S') { srcCount.Sint++; }              // sweep interior duplicate
      else if (cFrom === 'R' || cFrom === 'ANCHOR-INIT') {
        srcCount.R++;
        if (cFrom === 'ANCHOR-INIT') {
          srcCount.ANCHOR++; rootBirths++;
          rootSeqUn.push({ ty: 'ANCHOR', A: A.toString() });
          if ((n & 1n) === 0n) { anchorEvenBirth++; console.log(`!!! EVEN-ANCHOR BIRTH n=${n} A=${A}`); }
          if (oddPart(A) === 1n) { pow2++; console.log(`!!! POW2 ANCHOR ROOT A=${A} n=${n}`); }
        } else {
          const [a] = cFromCtx;
          rootBirths++;
          if (a === 1n) {
            e1rCount++; if (A % 3n !== 0n) e1r3bad++;
            rootSeqUn.push({ ty: 'E1r', A: A.toString() });
          } else {
            if (cFromRule !== 'L3->R') { provenanceBad++; if (provenanceBad < 8) console.log(`L3-PROVENANCE FAIL: R from rule ${cFromRule} anchor=${k}`); }
            rootSeqUn.push({ ty: 'L3', A: A.toString() });
          }
        }
        lastRootOdd = oddPart(A);
        if (oddPart(A) === 1n && cFrom !== 'ANCHOR-INIT') { pow2++; console.log(`!!! POW2 ROOT A=${A} anchor=${k} n=${n}`); }
      }
      else if (cFrom === 'L') { srcCount.L++; rootBirths++; rootSeqUn.push({ ty: 'Lk', A: A.toString() }); lastRootOdd = oddPart(A); if (oddPart(A) === 1n) { pow2++; console.log(`!!! POW2 ROOT A=${A} anchor=${k}`); } }
      else if (cFrom === 'G') {
        srcCount.G++; childBirths++;
        if (prevGHead === null || A !== prevGHead / 2n) { inheritBad++; if (inheritBad < 5) console.log(`INHERIT FAIL A=${A} prevGHead=${prevGHead}`); }
        if (lastRootOdd !== null && oddPart(A) !== lastRootOdd) { oddPartBad++; if (oddPartBad < 5) console.log(`ODDPART FAIL A=${A} rootOdd=${lastRootOdd}`); }
        if (oddPart(A) === 1n) { pow2++; console.log(`!!! POW2 CHILD A=${A} anchor=${k}`); }
      }
      else otherSrc++;
      curSweepA = A;
    }
    if (c.t === 'G') {
      const head = c.r[0] + 1n;
      if (cFrom !== 'S') { gHeadBad++; if (gHeadBad < 5) console.log(`G FROM NON-S: ${cFrom}`); }
      else if (curSweepA === null || head !== curSweepA) { gHeadBad++; if (gHeadBad < 5) console.log(`G-HEAD FAIL head=${head} sweepA=${curSweepA}`); }
      prevGHead = head; curSweepA = null;
    }
    // step
    const from = c.t, fromCtx = c.r;
    let appliedRule; // rule applied to the old config == producing rule of the NEW config
    if (from === 'L') appliedRule = c.r[2] >= 2n ? 'Lsw' : (c.r.length === 3 ? 'L3->R' : 'L->S');
    else if (from === 'S') appliedRule = c.r[1] === 2n ? 'S->G' : 'S';
    else if (from === 'R') appliedRule = 'R->S';
    else if (from === 'G') appliedRule = 'G->S';
    const prodPrev = prodOf; // rule that produced the OLD (previous) config
    const st1 = step1(c);
    events++;
    if (st1.degenerate || st1.halt) { console.log('UNCOLLAPSED END', st1.degenerate || 'HALT', 'anchor', k); break outer; }
    c = st1.c; cFrom = from; cFromCtx = fromCtx; cFromRule = prodPrev; prodOf = appliedRule;
    if (c.t === 'R' && c.r[0] === c.r[1] && c.r[0] >= 2n) break; // segment end (next anchor)
    if (events >= MAXEV) break outer;
  }
  n = c.r[0];
  if (events >= MAXEV) break;
}

// collapsed walk over the same number of anchors; compare root sequences
const rootSeqCol = [];
{
  let n2 = 3n;
  outer2:
  for (let k = 0; k < anchorCount; k++) {
    let c2 = { t: 'R', r: [n2, n2] };
    let pT = 'INIT', pC = null;
    for (let it = 0; it < 5000000; it++) {
      if (c2.t === 'S' && (c2.r[1] & 1n) === 0n) {
        const A = c2.r[0] + c2.r[1] / 2n + 1n;
        if (pT === 'L') rootSeqCol.push({ ty: 'Lk', A: A.toString() });
        else if (pT === 'R') rootSeqCol.push({ ty: pC.r[0] === 1n ? 'E1r' : 'L3', A: A.toString() });
        else if (pT === 'INIT') rootSeqCol.push({ ty: 'ANCHOR', A: A.toString() });
      }
      pT = c2.t; pC = c2;
      const st = stepFastB(c2);
      if (st.degenerate || st.halt) break outer2;
      c2 = st.c;
      if (c2.t === 'R' && c2.r[0] === c2.r[1] && c2.r[0] >= 2n) break;
    }
    n2 = c2.r[0];
  }
}
let seqBad = 0, lenUn = rootSeqUn.length;
const Nm = Math.min(rootSeqUn.length, rootSeqCol.length);
for (let i = 0; i < Nm; i++) if (rootSeqUn[i].ty !== rootSeqCol[i].ty || rootSeqUn[i].A !== rootSeqCol[i].A) { if (seqBad < 5) console.log(`SEQ MISMATCH @${i}: un=(${rootSeqUn[i].ty},${rootSeqUn[i].A}) col=(${rootSeqCol[i].ty},${rootSeqCol[i].A})`); seqBad++; }
// ANCHOR-labelled entries in uncollapsed map to 'L3' label in the naive collapsed classifier (a!=1) — expect none (n odd)
const anchorLabelled = rootSeqUn.filter(r => r.ty === 'ANCHOR').length;
console.log(`[walk] anchors=${anchorCount} events=${events} births=${births} roots=${rootBirths} children=${childBirths}`);
console.log(`[sources] R=${srcCount.R} (incl ANCHOR-init births=${srcCount.ANCHOR}) L=${srcCount.L} G=${srcCount.G} S-interior-dups=${srcCount.Sint} other=${otherSrc}`);
console.log(`[checks] L3provenanceBad=${provenanceBad} inheritBad=${inheritBad} oddPartBad=${oddPartBad} gHeadBad=${gHeadBad} sweepOK`);
console.log(`[E1r] count=${e1rCount} 3|A violations=${e1r3bad}  |  [pow2 odd-part-1 births]=${pow2}  |  even-anchor births=${anchorEvenBirth} (ANCHOR-labelled=${anchorLabelled})`);
console.log(`[seq] roots un=${rootSeqUn.length} col=${rootSeqCol.length} mismatches=${seqBad}`);
