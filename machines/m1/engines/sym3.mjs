// sym2.mjs — symbolic shape-family engine for M1 on-class anchors (n ≡ 3 mod 6).
// Ground model = phase1.mjs rules (xval'd vs raw oracle o1.exe). Values are affine
// forms in u = (w-3)/6 >= 0 (w ≡ 3 mod 6, w = 6u+3): value = {a: c0, b: c1} = c0 + c1*u.
//   - parity fixed iff c1 even (then = c0 mod 2); c1 odd => SPLIT u = 2u' + p
//     (values (c0,c1)->(c0+c1*p,2c1); lo -> ceil((lo-p)/2); subs gains bit p).
//   - comparisons with small constants: increasing forms; exceptional finite u-ranges
//     walked as constant sub-paths ({u:k} subs entry pins all values).
// Iterative worklist (no recursion-depth limit).
// Start: Phi(w,m) = G(w-1, w-1, 2w, 4w, ..., 2^(m-1)w, 2^m w - 1)  (m >= 1)
//   = post-prologue state after the nu2(n+3)=m odd halving rounds from G(n+2,n+1).
// Output: per-path derivation (rules, every G-state form, anchor landing n'),
// written to sym2-m<m>.json.  CLI: node sym2.mjs m
import { writeFileSync } from 'fs';

const C = (x) => ({ a: BigInt(x), b: 0n });
const A = (x, y) => ({ a: x.a + y.a, b: x.b + y.b });
const S = (x, y) => ({ a: x.a - y.a, b: x.b - y.b });
const M = (x, k) => ({ a: x.a * BigInt(k), b: x.b * BigInt(k) });
const eq = (x, y) => x.a === y.a && x.b === y.b;
const par = (x) => (x.b % 2n === 0n ? (((x.a % 2n) + 2n) % 2n === 0n ? 0 : 1) : null);
const isConst = (x) => x.b === 0n;
const show = (x) => (x.b === 0 ? `${x.a}` : `(${x.a}+${x.b}u)`);
const h1 = (x) => ({ a: (x.a - 1n) / 2n, b: x.b / 2n }); // (x-1)/2, x odd on domain
const h2 = (x) => ({ a: (x.a - 2n) / 2n, b: x.b / 2n }); // (x-2)/2, x even on domain
function substAll(st, p) {
  const f = (x) => ({ a: x.a + x.b * BigInt(p), b: 2n * x.b });
  return { t: st.t, r: st.r.map(f) };
}

const toArr = (c) => { const a = []; while (c) { a.push(c.h); c = c.t; } return a.reverse(); };
const MAXDEPTH = 1000000, MAXPATHS = 20000, FINITE_CAP = 500;
const paths = [];
const work = [];

function walk(st0, subs0, lo0, events0, gstates0, depth0) {
  work.push({ st: st0, subs: subs0, lo: lo0, events: events0, gstates: gstates0, depth: depth0 });
  while (work.length) {
    const { st, subs, lo, events, gstates, depth } = work.pop();
    if (paths.length > MAXPATHS) continue;
    const key = st.t + st.r.map(v => `(${v.a},${v.b})`).join(',');
    if (depth > MAXDEPTH) { paths.push({ subs, lo, events, gstates, outcome: 'DEPTH-CAP', tag: key }); continue; }
    const push = (st2, subs2, lo2, ev2, gs2, dep2) => work.push({ st: st2, subs: subs2, lo: lo2, events: ev2, gstates: gs2, depth: dep2 });
    const finiteWalks = (hi) => {
      if (hi > lo + FINITE_CAP) { paths.push({ subs, lo, events, gstates, outcome: `FINITE-RANGE-TOO-BIG [${lo},${hi})`, tag: key }); return; }
      for (let u = lo; u < hi; u++) {
        const sub = (x) => ({ a: x.a + x.b * BigInt(u), b: 0n });
        push({ t: st.t, r: st.r.map(sub) }, [...subs, { u }], 0, events, gstates, depth + 1);
      }
    };
    const thresh = (v, c) => {
      const cc = BigInt(c); let q = (cc - v.a + v.b - 1n) / v.b; if (q < 0n) q = 0n; const t = Number(q);
      return t <= lo ? { always: true } : { thr: t };
    };
    if (st.t === 'R') {
      const [a, b] = st.r;
      if (eq(a, b)) {
        if (isConst(a)) {
          if (a.a >= 2n) { paths.push({ subs, lo, events, gstates, outcome: `ANCHOR n'=${show(a)}`, tag: key }); continue; }
          paths.push({ subs, lo, events, gstates, outcome: `DEGEN R a=b=${a.a}`, tag: key }); continue;
        }
        if (a.b < 0) { paths.push({ subs, lo, events, gstates, outcome: `R a neg-slope`, tag: key }); continue; }
        const t2 = thresh(a, 2);
        if (t2.always) { paths.push({ subs, lo, events, gstates, outcome: `ANCHOR n'=${show(a)}`, tag: key }); continue; }
        finiteWalks(t2.thr);
        paths.push({ subs, lo: t2.thr, events, gstates, outcome: `ANCHOR n'=${show(a)}`, tag: key }); continue;
      }
      const d0 = a.a - b.a, d1 = a.b - b.b;
      let stopAt = null;
      if (d1 !== 0n && d0 % d1 === 0n) { const nu = Number(-d0 / d1); if (nu >= lo) stopAt = nu; }
      if (stopAt !== null) {
        if (stopAt > lo + FINITE_CAP) { paths.push({ subs, lo, events, gstates, outcome: `R-EQ-RANGE-TOO-BIG u*=${stopAt}`, tag: key }); continue; }
        finiteWalks(stopAt + 1);
        push({ t: 'S', r: [A(a, C(1)), S(b, C(2)), C(1)] }, subs, stopAt + 1, {h:'R->S3',t:events}, gstates, depth + 1);
        continue;
      }
      if (isConst(b)) {
        if (b.a < 3n) { paths.push({ subs, lo, events, gstates, outcome: `DEGEN R b=${b.a}`, tag: key }); continue; }
      } else if (b.b < 0) { paths.push({ subs, lo, events, gstates, outcome: `R b neg-slope`, tag: key }); continue; }
      else {
        const t3 = thresh(b, 3);
        if (!t3.always) { finiteWalks(t3.thr); push({ t: 'S', r: [A(a, C(1)), S(b, C(2)), C(1)] }, subs, t3.thr, {h:'R->S3',t:events}, gstates, depth + 1); continue; }
      }
      push({ t: 'S', r: [A(a, C(1)), S(b, C(2)), C(1)] }, subs, lo, {h:'R->S3',t:events}, gstates, depth + 1);
      continue;
    }
    if (st.t === 'S') {
      const [x, y, z, ...rest] = st.r;
      const p = par(y);
      if (p === null) {
        for (const pp of [0, 1]) push(substAll(st, pp), [...subs, pp], Math.ceil((lo - pp) / 2), events, gstates, depth);
        continue;
      }
      if (isConst(y)) {
        if (y.a >= 3n) {
          if (p === 1) {
            const j = h1(y); const nz = A(A(x, j), A(A(z, j), C(3)));
            if (rest.length === 0) push({ t: 'R', r: [C(1), nz] }, subs, lo, {h:'Sw(y1)->R',t:events}, gstates, depth + 1);
            else push({ t: 'L', r: [C(1), nz, ...rest] }, subs, lo, {h:'Sw(y1)->L',t:events}, gstates, depth + 1);
          } else {
            const j = h2(y);
            push({ t: 'G', r: [A(A(x, j), C(1)), A(A(z, j), C(1)), ...rest] }, subs, lo, {h:'Sw(y2)->G',t:events}, gstates, depth + 1);
          }
          continue;
        }
        if (y.a === 2n) { push({ t: 'G', r: [A(x, C(1)), A(z, C(1)), ...rest] }, subs, lo, {h:'S(y2)->G',t:events}, gstates, depth + 1); continue; }
        if (y.a === 1n) {
          if (rest.length === 0) push({ t: 'R', r: [C(1), A(A(x, z), C(3))] }, subs, lo, {h:'S3(y1)->R',t:events}, gstates, depth + 1);
          else push({ t: 'L', r: [C(1), A(A(x, z), C(3)), ...rest] }, subs, lo, {h:'S(y1)->L',t:events}, gstates, depth + 1);
          continue;
        }
        paths.push({ subs, lo, events, gstates, outcome: `DEGEN S y=${y.a}`, tag: key }); continue;
      }
      if (y.b < 0) { paths.push({ subs, lo, events, gstates, outcome: `S y neg-slope ${show(y)}`, tag: key }); continue; }
      const t3 = thresh(y, 3);
      const loMain = t3.always ? lo : t3.thr;
      if (!t3.always) finiteWalks(t3.thr);
      if (p === 1) {
        const j = h1(y); const nz = A(A(x, j), A(A(z, j), C(3)));
        if (rest.length === 0) push({ t: 'R', r: [C(1), nz] }, subs, loMain, {h:'Sw(y1)->R',t:events}, gstates, depth + 1);
        else push({ t: 'L', r: [C(1), nz, ...rest] }, subs, loMain, {h:'Sw(y1)->L',t:events}, gstates, depth + 1);
      } else {
        const j = h2(y);
        push({ t: 'G', r: [A(A(x, j), C(1)), A(A(z, j), C(1)), ...rest] }, subs, loMain, {h:'Sw(y2)->G',t:events}, gstates, depth + 1);
      }
      continue;
    }
    if (st.t === 'G') {
      const [a, b, ...rest] = st.r;
      const gs = {h: st.r.map(show).join(','), t: gstates};
      if (isConst(a)) {
        if (a.a === 3n) { paths.push({ subs, lo, events, gstates: gs, outcome: 'HALT(G a=3)', tag: key }); continue; }
        if (a.a === 2n) { push({ t: 'L', r: [C(1), A(b, C(1)), A(b, C(1)), ...rest] }, subs, lo, {h:'G(a2)->L',t:events}, gs, depth + 1); continue; }
        if (a.a >= 4n) { push({ t: 'S', r: [C(1), S(a, C(3)), C(1), A(b, C(1)), ...rest] }, subs, lo, {h:'G->S',t:events}, gs, depth + 1); continue; }
        paths.push({ subs, lo, events, gstates: gs, outcome: `DEGEN G a=${a.a}`, tag: key }); continue;
      }
      if (a.b < 0) { paths.push({ subs, lo, events, gstates: gs, outcome: `G a neg-slope ${show(a)}`, tag: key }); continue; }
      const t4 = thresh(a, 4);
      if (t4.always) { push({ t: 'S', r: [C(1), S(a, C(3)), C(1), A(b, C(1)), ...rest] }, subs, lo, {h:'G->S',t:events}, gs, depth + 1); continue; }
      finiteWalks(t4.thr);
      push({ t: 'S', r: [C(1), S(a, C(3)), C(1), A(b, C(1)), ...rest] }, subs, t4.thr, {h:'G->S',t:events}, gs, depth + 1);
      continue;
    }
    if (st.t === 'L') {
      const [r1, r2, r3, ...rest] = st.r;
      const step2 = (nr1, loUse) => rest.length === 0
        ? push({ t: 'R', r: [nr1, r2] }, subs, loUse, {h:'L-sw',t:events}, gstates, depth + 1)
        : push({ t: 'S', r: [nr1, r2, ...rest] }, subs, loUse, {h:'L-sw',t:events}, gstates, depth + 1);
      // unified sweep: after r3-1 steps of r1+=1, r3=1 fires S(r1+r3, r2, rest); covers r3=1 too
      if (isConst(r3)) {
        if (r3.a >= 1n) { step2(A(r1, r3), lo); continue; }
        paths.push({ subs, lo, events, gstates, outcome: `DEGEN L r3=${r3.a}`, tag: key }); continue;
      }
      if (r3.b < 0) { paths.push({ subs, lo, events, gstates, outcome: `L r3 neg-slope`, tag: key }); continue; }
      const t1 = thresh(r3, 1);
      if (t1.always) { step2(A(r1, r3), lo); continue; }
      finiteWalks(t1.thr);
      step2(A(r1, r3), t1.thr);
      continue;
    }
    paths.push({ subs, lo, events, gstates, outcome: 'UNKNOWN', tag: key });
  }
}

// CLI: node sym2.mjs m
const m = +(process.argv[2] || 2);
const W = { a: 3n, b: 6n };
const runs = [S(W, C(1)), S(W, C(1))];
for (let i = 1; i <= m - 1; i++) runs.push(M(W, 2n ** BigInt(i)));
runs.push(S(M(W, 2n ** BigInt(m)), C(1)));
walk({ t: 'G', r: runs }, [], 0, null, null, 0);
const dist = {};
for (const p of paths) { const k = p.outcome.split('(')[0].split(' ')[0]; dist[k] = (dist[k] || 0) + 1; }
console.log(`m=${m}: paths=${paths.length} outcomes=${JSON.stringify(dist)}`);
const seen = new Set();
for (const p of paths) {
  const o = p.outcome.slice(0, 60);
  if (seen.has(o)) continue; seen.add(o);
  const sub = p.subs.map(s => typeof s === 'object' ? `u=${s.u}` : s).join(',');
  console.log(`  [subs ${sub} lo=${p.lo}] ${p.outcome}  (g=${toArr(p.gstates).length} ev=${toArr(p.events).length})`);
}
// dup removed
writeFileSync(`sym2-m${m}.json`, JSON.stringify(paths.map(p => ({ subs: p.subs, lo: p.lo, outcome: p.outcome, gstates: toArr(p.gstates), events: toArr(p.events) })), null, 1));
