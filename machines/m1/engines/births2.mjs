// births2.mjs — deep structural stats on M1 root births (L-exit births + E1-reentry).
// Usage: node births2.mjs [NANCH=20000]
import { stepFastB } from './bstep.mjs';
const NANCH = Number(process.argv[2] ?? 20000);
const B = BigInt;
const mod = (v, m) => Number(((v % B(m)) + B(m)) % B(m));
const nu2 = (v) => { let n = 0; let x = B(v); while ((x & 1n) === 0n) { n++; x >>= 1n; } return { j: n, q: x }; };

let n = 3n;
// L-exit birth records: A, r1, r2, k (L length), where from
const Lexits = [];   // {A, r1, r2, k, anchor, src:'L3'|'Lk'}
const reentryB = []; // reentry R(1,b) even births: A=b/2+2
const anchorsMod = {}; // n mod 12 hist
const reentryMod = {}; // b mod 12 hist for reentries with b even
let nReentryOdd = 0, nReentryEven = 0, nAnchorEven = 0;
let steps = 0;

outer:
for (let k = 0; k < NANCH; k++) {
  anchorsMod[mod(n, 12)] = (anchorsMod[mod(n, 12)] || 0) + 1;
  if ((n & 1n) === 0n) nAnchorEven++;
  let c = { t: 'R', r: [n, n] };
  let prevT = 'START', prevC = null;
  for (let it = 0; it < 5000000; it++) {
    if (c.t === 'S') {
      const [x, y] = c.r;
      if ((y & 1n) === 0n) {
        const A = x + y / 2n + 1n;
        if (prevT === 'L') {
          const [r1, r2] = prevC.r;
          Lexits.push({ A, r1, r2, k: prevC.r.length, anchor: k, src: prevC.r.length === 3 ? 'L3' : 'Lk' });
        } else if (prevT === 'R') {
          const [a, b] = prevC.r;
          if (a === 1n) reentryB.push(A);
        }
        // G-descendants not recorded here
      }
    }
    if (c.t === 'R' && c.r[0] === 1n) {
      const b = c.r[1];
      if ((b & 1n) === 0n) { nReentryEven++; reentryMod[mod(b, 12)] = (reentryMod[mod(b, 12)] || 0) + 1; }
      else nReentryOdd++;
    }
    prevT = c.t; prevC = c;
    const st = stepFastB(c);
    steps++;
    if (st.degenerate || st.halt) { console.log('END', st.degenerate || 'HALT'); break outer; }
    c = st.c;
    if (c.t === 'R' && c.r[0] === c.r[1] && c.r[0] >= 2n) break;
  }
  n = c.r[0];
}
console.log(`anchors=${NANCH} final n=${n} steps=${steps}`);
console.log(`anchor n mod 12: ${JSON.stringify(anchorsMs(anchorsMod))} anchorEven=${nAnchorEven}`);
console.log(`reentries: even=${nReentryEven} odd=${nReentryOdd}; even-b mod 12: ${JSON.stringify(anchorsMs(reentryMod))}`);
function anchorsMs(o) { const r = {}; for (const k of Object.keys(o).map(Number).sort((a, b) => a - b)) r[k] = o[k]; return r; }

// L-exit birth analysis
const l3 = Lexits.filter(e => e.src === 'L3'), lk = Lexits.filter(e => e.src === 'Lk');
function an(list, name) {
  const m3 = {}, m16 = {}, m48 = {}, jh = {}, qm = {};
  let qmin = null, Amin = null, pow2 = 0, bad = 0;
  for (const e of list) {
    m3[mod(e.A, 3)] = (m3[mod(e.A, 3)] || 0) + 1;
    m16[mod(e.A, 16)] = (m16[mod(e.A, 16)] || 0) + 1;
    m48[mod(e.A, 48)] = (m48[mod(e.A, 48)] || 0) + 1;
    const { j, q } = nu2(e.A);
    jh[j] = (jh[j] || 0) + 1;
    qm[mod(q, 6)] = (qm[mod(q, 6)] || 0) + 1;
    if (qmin === null || q < qmin) qmin = q;
    if (Amin === null || e.A < Amin) Amin = e.A;
    if (q === 1n) { pow2++; console.log(`  *** POW2 birth A=${e.A} at anchor ${e.anchor} (${e.src} r1=${e.r1} r2=${e.r2})`); }
  }
  console.log(`${name}: n=${list.length} A%3=${JSON.stringify(m3)} A%16=${JSON.stringify(m16)} A%48=${JSON.stringify(anchorsMs(m48))} nu2=${JSON.stringify(anchorsMs(jh))} q%6=${JSON.stringify(qm)} qmin=${qmin} Amin=${Amin} pow2=${pow2}`);
}
an(l3, 'L3-exit births');
an(lk, 'Lk-exit births (k>=4)');
an(Lexits, 'ALL L-exit births');
an(reentryB.map(A => ({ A })), 'E1-reentry births');

// r1/r2 residue structure at L-exit births
const r1r2 = {};
for (const e of Lexits) { const key = mod(e.r1, 12) + ',' + mod(e.r2, 12); r1r2[key] = (r1r2[key] || 0) + 1; }
console.log('L-exit (r1%12, r2%12):', JSON.stringify(anchorsMs(r1r2)));
// first 30 L-exit samples
console.log('first 20 L3-exit samples:', l3.slice(0, 20).map(e => `(${e.r1},${e.r2})->A=${e.A}`).join(' '));
console.log('first 20 Lk-exit samples:', lk.slice(0, 20).map(e => `(${e.r1},${e.r2},k=${e.k})->A=${e.A}`).join(' '));
