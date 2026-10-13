// ref-b2-counts.mjs — REFEREE: independent recount of root-birth statistics (attack B/E).
// My own collapsed walker (independent of births1-11 code path): counts by type, 3|A for E1r,
// moat b≡2 (mod 3) for ALL reentries (even and odd b), q_min, pow2 among ALL births and roots,
// anchor n mod 12/6 histogram, m-records vs n=3·2^m−3, E6 inheritance inline recheck.
// Usage: node ref-b2-counts.mjs [NANCH=1000000]
import { stepFastB } from './bstep.mjs';
const NANCH = Number(process.argv[2] ?? 1000000);
const B = BigInt;
const nu2 = (v) => { let n = 0; let x = B(v); while ((x & 1n) === 0n) { n++; x >>= 1n; } return { j: n, q: x }; };

let n = 3n;
let e1r = 0, e1r3 = 0, lk = 0, l3 = 0, anchorRoot = 0;
let allBirths = 0, pow2All = 0;
let qminE1r = null;
let reentryTotal = 0, reentryMoatBad = 0, reentryEven = 0;
const nmod12 = {};
const mrecs = [];
let maxM = 0;
let inheritBad = 0;
let prevGHead = null;
let lastRootOdd = null;
const oddPart = (v) => { let x = B(v); while ((x & 1n) === 0n) x >>= 1n; return x; };
let steps = 0;

outer:
for (let k = 0; k < NANCH; k++) {
  const nm = Number(n % 12n);
  nmod12[nm] = (nmod12[nm] || 0) + 1;
  if ((n & 1n) === 0n) { console.log(`!!! EVEN ANCHOR n=${n} at k=${k}`); }
  let x = n + 3n, m = 0;
  while ((x & 1n) === 0n) { m++; x >>= 1n; }
  if (m > maxM) { maxM = m; const expect = 3n * (1n << BigInt(m)) - 3n; mrecs.push(`m=${m} k=${k} n=${n} ${n === expect ? '==3·2^m−3 OK' : '!= expected ' + expect}`); }
  let c = { t: 'R', r: [n, n] };
  let pT = 'INIT', pC = null, pIsAnchor = true;
  for (let it = 0; it < 9000000; it++) {
    if (c.t === 'S' && (c.r[1] & 1n) === 0n) {
      const A = c.r[0] + c.r[1] / 2n + 1n;
      allBirths++;
      const { q } = nu2(A);
      if (q === 1n) { pow2All++; console.log(`!!! POW2 BIRTH A=${A} at anchor ${k}`); }
      if (pT === 'R' && pC.r[0] === 1n) {
        e1r++; if (A % 3n !== 0n) e1r3++;
        const qq = nu2(A).q; if (qminE1r === null || qq < qminE1r) qminE1r = qq;
        lastRootOdd = q;
      } else if (pT === 'R') {
        if (pIsAnchor) { anchorRoot++; console.log(`!!! ANCHOR ROOT BIRTH n=${n} A=${A} k=${k}`); }
        else l3++;
        lastRootOdd = q;
      } else if (pT === 'L') { lk++; lastRootOdd = q; }
      // pT === 'G' children: inherit
      else if (pT === 'G') {
        if (prevGHead === null || A !== prevGHead / 2n) inheritBad++;
        if (lastRootOdd !== null && q !== lastRootOdd) inheritBad++;
      }
    }
    if (c.t === 'G') prevGHead = c.r[0] + 1n;
    if (c.t === 'R' && c.r[0] === 1n) {
      reentryTotal++;
      if (c.r[1] % 3n !== 2n) reentryMoatBad++;
      if ((c.r[1] & 1n) === 0n) reentryEven++;
    }
    pT = c.t; pC = c; pIsAnchor = false;
    const st = stepFastB(c);
    steps++;
    if (st.degenerate || st.halt) { console.log('END', st.degenerate || 'HALT', 'at anchor', k); break outer; }
    c = st.c;
    if (c.t === 'R' && c.r[0] === c.r[1] && c.r[0] >= 2n) break;
  }
  n = c.r[0];
  if ((k & 131071) === 0) console.error(`@k=${k} n=${n} e1r=${e1r} lk=${lk} l3=${l3} births=${allBirths} pow2=${pow2All}`);
}
const roots = e1r + lk + l3 + anchorRoot;
console.log(`DONE anchors=${NANCH} finalN=${n} collapsedSteps=${steps}`);
console.log(`roots: E1r=${e1r} (3|A violations=${e1r3}, q_min=${qminE1r}) Lk=${lk} L3=${l3} anchorRoot=${anchorRoot} TOTAL=${roots}`);
console.log(`E1r share of roots = ${(100 * e1r / roots).toFixed(3)}%  L-exit share = ${(100 * (lk + l3) / roots).toFixed(3)}%`);
console.log(`all births (incl descendants)=${allBirths} pow2=${pow2All} inheritBad=${inheritBad}`);
console.log(`reentries: total=${reentryTotal} moat b≡2mod3 violations=${reentryMoatBad} even-b=${reentryEven}`);
console.log(`anchor n mod 12: ${JSON.stringify(nmod12)}`);
console.log(`maxM=${maxM}; m-records (${mrecs.length}):`);
for (const r of mrecs) console.log('  ' + r);
