// births1.mjs — extract the BIRTH SEQUENCE of M1's real orbit (from R(3,3)) and classify.
// Birth = S-entry with y even; value A = x + y/2 + 1 (conserved during the sweep; = future G head a+1).
// Sources: E1 (R with b even, ROOT), E9b (L with r2 even, ROOT), E6 (G with a odd, DESCENDANT A'=(a+1)/2).
// HALT <=> some birth A = 2^t <=> some ROOT birth is a power of 2 (descendants inherit odd part).
// Usage: node births1.mjs [NANCH=2000] [stats|dump|quiet]
import { stepFastB } from './bstep.mjs';

const NANCH = Number(process.argv[2] ?? 2000);
const MODE = process.argv[3] ?? 'stats';
const B = BigInt;

const mod = (v, m) => Number(((v % B(m)) + B(m)) % B(m));
const nu2 = (v) => { let n = 0; let x = B(v); while ((x & 1n) === 0n) { n++; x >>= 1n; } return { j: n, q: x }; };

let n = 3n;
const births = [];          // {A, src, kk, ctx, anchor}
let totSteps = 0;
let halted = false, degenerate = null;

outer:
for (let k = 0; k < NANCH; k++) {
  let c = { t: 'R', r: [n, n] };
  let prevT = 'START', prevC = '';
  for (let it = 0; it < 5000000; it++) {
    if (c.t === 'S') {
      const [x, y] = c.r;
      if ((y & 1n) === 0n) {
        const A = x + y / 2n + 1n;
        births.push({ A, src: prevT, kk: c.r.length, ctx: prevC, anchor: k });
      }
    }
    prevT = c.t; prevC = c.r.map(String).join(',');
    const st = stepFastB(c);
    totSteps++;
    if (st.degenerate) { degenerate = st.degenerate + ' at ' + prevC; break outer; }
    if (st.halt) { halted = true; break outer; }
    c = st.c;
    if (c.t === 'R' && c.r[0] === c.r[1] && c.r[0] >= 2n) break;
  }
  n = c.r[0];
}

console.log(`anchors attempted ${NANCH}, done n=${n}, collapsed-steps=${totSteps}, births=${births.length}, halted=${halted}, degenerate=${degenerate}`);

// classification stats
const bySrc = { R: [], G: [], L: [] };
for (const b of births) bySrc[b.src]?.push(b);

function stats(list, name) {
  const A3 = { 0: 0, 1: 0, 2: 0 }, Aj = {}, q3 = { 0: 0, 1: 0, 2: 0 };
  let qmin = null;
  let amin = null, amax = null, pow2 = 0;
  const residues = {};
  for (const b of list) {
    A3[mod(b.A, 3)]++;
    const { j, q } = nu2(b.A);
    Aj[j] = (Aj[j] || 0) + 1;
    q3[mod(q, 3)]++;
    if (qmin === null || q < qmin) qmin = q;
    if (amin === null || b.A < amin) amin = b.A;
    if (amax === null || b.A > amax) amax = b.A;
    if (q === 1n) pow2++;
  }
  console.log(`${name}: count=${list.length} A mod3 = ${JSON.stringify(A3)} nu2 hist=${JSON.stringify(Aj)} q mod3=${JSON.stringify(q3)} q_min=${qmin} A in [${amin}..${amax}] POW2=${pow2}`);
}
stats(bySrc.R, 'E1 roots  (R,b even)');
stats(bySrc.L, 'E9b roots (L,r2 even)');
stats(bySrc.G, 'E6 desc   (G,a odd)');
stats(births, 'ALL births');

// E1 roots: sub-classify reentry a=1 vs other
const e1re = bySrc.R.filter(b => b.ctx.split(',')[0] === '1');
const e1ot = bySrc.R.filter(b => b.ctx.split(',')[0] !== '1');
stats(e1re, 'E1 reentry (a=1)');
stats(e1ot, 'E1 other  (a!=1)');

// E9b roots: context distribution (r1,r2 at exit L) — print first 40
if (MODE === 'dump') {
  console.log('\nfirst 60 births:'); for (const b of births.slice(0, 60)) console.log(`  ${b.src} ctx=[${b.ctx}] A=${b.A}`);
  console.log('\nfirst 40 E9b roots:'); for (const b of bySrc.L.slice(0, 40)) console.log(`  L ctx=[${b.ctx}] A=${b.A}`);
  console.log('\nfirst 40 E1 other roots:'); for (const b of e1ot.slice(0, 40)) console.log(`  R ctx=[${b.ctx}] A=${b.A}`);
}

// root birth sequence: consecutive relations (A_{n+1} vs A_n)
const rootA = [...bySrc.R, ...bySrc.L].sort((p, q) => p.anchor - q.anchor); // rough order; ties unlikely matter for stats
// better: keep orbit order — rebuild by scanning births array
const rootSeq = births.filter(b => b.src !== 'G').map(b => b.A);
let inc = 0, dec = 0, same = 0;
for (let i = 1; i < rootSeq.length; i++) { if (rootSeq[i] > rootSeq[i-1]) inc++; else if (rootSeq[i] < rootSeq[i-1]) dec++; else same++; }
console.log(`root births (orbit order): n=${rootSeq.length}, inc=${inc} dec=${dec} same=${same}`);
console.log(`root A first 30: ${rootSeq.slice(0, 30).map(String).join(' ')}`);
console.log(`root A last 10: ${rootSeq.slice(-10).map(String).join(' ')}`);
// ratios growth of successive roots
const rat = [];
for (let i = 1; i < Math.min(rootSeq.length, 20000); i++) { const r = Number(rootSeq[i] * 10000n / rootSeq[i-1]) / 10000; rat.push(r); }
if (rat.length) {
  rat.sort((a,b)=>a-b);
  console.log(`root ratio pctiles: p0=${rat[0]} p50=${rat[Math.floor(rat.length/2)]} p100=${rat[rat.length-1]}`);
}
