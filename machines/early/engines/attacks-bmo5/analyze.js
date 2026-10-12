'use strict';
// Analysis of the sim.js binary dump.
// Layout: header 16 bytes (magic, nphases, narrays, pad) then arrays in order, little-endian, first `n` entries each:
// IARR Int32, KARR Int16, NSARR Uint8, ALP Int16, ALPG Int16, G3 Int8, EV2 Int16, TV2 Int16, XV2 Int16,
// RTOP F64, R2 F64, R3 F64, R5 F64, R7 F64, R11 F64, R13 F64, GAPMIN F64
const fs = require('fs');
const DUMP = process.argv[2] || 'dump1e6.bin';
const buf = fs.readFileSync(DUMP);
const n = buf.readUInt32LE(4);
console.log('dump: ' + DUMP + ' phases=' + n);
let off = 16;
const rdI32 = () => { const a = new Int32Array(n); for (let q = 0; q < n; q++) a[q] = buf.readInt32LE(off + 4 * q); off += 4 * n; return a; };
const rdI16 = () => { const a = new Int16Array(n); for (let q = 0; q < n; q++) a[q] = buf.readInt16LE(off + 2 * q); off += 2 * n; return a; };
const rdU8 = () => { const a = new Uint8Array(n); for (let q = 0; q < n; q++) a[q] = buf.readUInt8(off + q); off += n; return a; };
const rdI8 = () => { const a = new Int8Array(n); for (let q = 0; q < n; q++) a[q] = buf.readInt8(off + q); off += n; return a; };
const rdF64 = () => { const a = new Float64Array(n); for (let q = 0; q < n; q++) a[q] = buf.readDoubleLE(off + 8 * q); off += 8 * n; return a; };
const I = rdI32(), K = rdI16(), NS = rdU8(), ALP = rdI16(), ALPG = rdI16(), G = rdI8(), EV2 = rdI16(), TV2 = rdI16(), XV2 = rdI16();
const RTOP = rdF64(), R2 = rdF64(), R3 = rdF64(), R5 = rdF64(), R7 = rdF64(), R11 = rdF64(), R13 = rdF64(), GAPMIN = rdF64();

// ---- 1. ns/k/g/r stats ----
const nsH = new Map(), kH = new Map();
let rmin = Infinity, rmax = -Infinity, rminAt = -1, gmax = 0, kmax = 0;
for (let q = 0; q < n; q++) {
  nsH.set(NS[q], (nsH.get(NS[q]) || 0) + 1);
  kH.set(K[q], (kH.get(K[q]) || 0) + 1);
  if (RTOP[q] && RTOP[q] < rmin) { rmin = RTOP[q]; rminAt = I[q]; }
  if (RTOP[q] > rmax) rmax = RTOP[q];
  if (G[q] > gmax) gmax = G[q];
  if (K[q] > kmax) kmax = K[q];
}
console.log('ns histogram: ' + JSON.stringify([...nsH.entries()]));
console.log('k: max=' + kmax + ' hist: ' + [...kH.entries()].sort((a, b) => a[0] - b[0]).map(([kk, c]) => kk + ':' + c).join(' '));
console.log('r range: [' + rmin.toExponential(4) + ' (i=' + rminAt + '), ' + rmax.toFixed(6) + ']');
console.log('g(i)=v3(20*2^i+i+1) max (cap 13): ' + gmax);
{
  const h = new Array(11).fill(0);
  for (let q = 0; q < n; q++) { const j = Math.min(10, Math.max(0, Math.floor(-Math.log(RTOP[q]) / Math.log(3)))); h[j]++; }
  console.log('r in [3^-(j+1),3^-j) hist j=0..10+: ' + h.join(' '));
}

// ---- 2. v2 proximity stats vs random model ----
{
  let states = 0; for (let q = 0; q < n; q++) states += K[q] + 1;
  console.log('total states (entries+crossings+mid) ~ ' + states);
  for (const [name, arr] of [['alpha (mid-phase prox)', ALP], ['alphaG (3-adic allowed k)', ALPG], ['v2(entry+1)', EV2], ['v2(entry-tgt)', TV2]]) {
    const cnt = { 8: 0, 12: 0, 16: 0, 20: 0, 24: 0, 28: 0 };
    let mx = 0;
    for (let q = 0; q < n; q++) { if (arr[q] > mx) mx = arr[q]; for (const t of Object.keys(cnt)) if (arr[q] >= +t) cnt[t]++; }
    const exp = Object.keys(cnt).map(t => (n * Math.pow(2, -t)).toFixed(2)).join(',');
    console.log('  ' + name + ': max=' + mx + ' >=8/12/16/20/24/28: ' + Object.values(cnt).join(',') + ' (random expect ' + exp + ')');
  }
}

// ---- 3. eventual periodicity ----
function checkPeriodic(name, seq) {
  const L = Math.min(1 << 14, seq.length >> 2);
  if (L < 64) { console.log('  ' + name + ': too short'); return; }
  const start = seq.length - L;
  let per = -1;
  outer: for (let p = 1; p <= 4096 && p <= L / 2; p++) {
    for (let q = start; q + p < seq.length; q++) if (seq[q] !== seq[q + p]) continue outer;
    per = p; break;
  }
  if (per < 0) { console.log('  ' + name + ': NO period <= 4096 in tail window'); return; }
  let okFrom = -1;
  for (const T0 of [0, 1000, 10000, 100000]) {
    let ok = true;
    for (let q = T0; q + per < seq.length; q++) if (seq[q] !== seq[q + per]) { ok = false; break; }
    if (ok) { okFrom = T0; break; }
  }
  console.log('  ' + name + ': TAIL period=' + per + (okFrom >= 0 ? (' GLOBAL from ' + okFrom) : ' (tail only)'));
}
console.log('periodicity searches:');
{
  const kk = new Int32Array(n); for (let q = 0; q < n; q++) kk[q] = K[q];
  const kn = new Int32Array(n); for (let q = 0; q < n; q++) kn[q] = K[q] * 2 + NS[q];
  checkPeriodic('k-seq', kk);
  checkPeriodic('(k,ns)-seq', kn);
}
for (const Kc of [6, 12, 24, 48, 96, 192]) {
  for (const m of [4, 16, 64, 256]) {
    const seq = new Int32Array(n); for (let q = 0; q < n; q++) seq[q] = (I[q] % Kc) * m + (R2[q] % m);
    checkPeriodic('(i mod ' + Kc + ', b mod ' + m + ')', seq);
  }
}
for (const m of [9, 27, 81, 243]) {
  const seq = new Int32Array(n); for (let q = 0; q < n; q++) seq[q] = (I[q] % 6) * m + (R3[q] % m);
  checkPeriodic('(i mod 6, b mod ' + m + ')', seq);
}
{
  const seq = new Int32Array(n); for (let q = 0; q < n; q++) seq[q] = (I[q] % 24) * 16 + (K[q] % 16) * 4 + NS[q];
  checkPeriodic('(i mod 24, k, ns)', seq);
}

// ---- 4. halt-danger mass ----
{
  let mass = 0;
  for (let q = 0; q < n; q++) {
    const i = I[q];
    const aex = i < 50 ? (10 * (2 ** i) - 1) : 10 * Math.pow(2, i);
    mass += Math.min(G[q], kmax) / aex + 1 / (2 * aex);
  }
  console.log('random-model expected #halts consumed in first ' + n + ' phases: ' + mass.toExponential(4));
}

// ---- 6. SOUNDNESS: true orbit phase-entries must lie in over-approx reachable set mod 9/27 ----
{
  // R9 from char3adic.js (i mod 6 -> allowed b mod 9); also mod 27 sets keyed by i mod 18 (compute here)
  const R9 = { 0: new Set([0,2,3,5,6,8]), 1: new Set([0,2,3,5,6,8]), 2: new Set([1,2,4,5,7,8]), 3: new Set([1,2,4,5,7,8]), 4: new Set([0,1,3,4,6,7]), 5: new Set([0,1,3,4,6,7]) };
  let v9 = 0;
  for (let q = 0; q < n; q++) if (!R9[I[q] % 6].has(R3[q] % 9)) v9++;
  console.log('true orbit inside over-approx R mod 9: violations=' + v9 + '/' + n + (v9 === 0 ? ' SOUND' : ' UNSOUND!'));
  // mod-3 entry law: c mod 3 = (2b + i + 5) mod 3 should be 1 for odd i, 2 for even i (i>=1, no double-sub)
  let vc = 0;
  for (let q = 1; q < n; q++) {
    const cm3 = ((2 * (R3[q] % 3)) + I[q] + 5) % 3;
    const expect = (I[q] % 2 === 1) ? 1 : 2;
    if (cm3 !== expect) vc++;
  }
  console.log('mod-3 entry law (c=2b+i+5 === 1/2 mod 3 by parity): violations=' + vc + '/' + (n - 1));
}

// ---- 7. chaos quantification ----
{
  let Ek = 0; for (let q = 0; q < n; q++) Ek += K[q]; Ek /= n;
  const lyap = Ek * Math.log(3) - Math.log(2);
  console.log('E[k]=' + Ek.toFixed(4) + ' ; asymptotic per-phase Lyapunov approx E[k]ln3-ln2 = ' + lyap.toFixed(4) + ' (chaotic: intervals contract by e^-' + lyap.toFixed(2) + '/phase)');
}

// ---- 8. gap stats ----
{
  let gminAll = Infinity, gAt = -1, cntSmall = 0;
  const from = Math.max(0, n - 100000);
  for (let q = 0; q < n; q++) if (GAPMIN[q] < gminAll) { gminAll = GAPMIN[q]; gAt = q; }
  for (let q = from; q < n; q++) if (GAPMIN[q] < 1e6) cntSmall++;
  console.log('global min gap = ' + gminAll + ' at phase ' + gAt + ' ; last-100k phases with gap<1e6: ' + cntSmall);
}

