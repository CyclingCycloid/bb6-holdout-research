'use strict';
// BMO 5 exact phase-level simulator (BigInt).
// States <i,b>, a(i)=10*2^i-1, start <0,5>.
//   b >= a(i)   : <i+1, b - a(i)>
//   b <= a(i)-2 : <i, 3b + i + 5>
//   b == a(i)-1 : HALT
// Phase = maximal run of triplings (same i) followed by 1 or 2 subtractions.
// Telemetry per phase (entry i, entry value b0):
//   k     = #triplings in the phase (k>=1; entries always satisfy b0 < a(i))
//   ns    = #subtractions at phase end (1 or 2)
//   alpha = max over kk in [1..k] of v2( b_kk - (a(i)-1) )   [2-adic proximity to halt (A)]
//           halt (A) iff some b_kk == a(i)-1 exactly
//   beta  = v2( crossing - 3*a(i) )  [halt (B): crossing == 3a(i) => next entry = a(i+1)-1 = halt]
//   r     = b0 / a(i) (float, ~53-bit)
//   b0 mod 2^48, 3^30, 5^20, 7^12, 11^9, 13^8  (residues, Float64-exact)
//   gapMin per phase = min over states in phase of |b - (a(i)-1)| (capped at 2^52)
// Usage: node sim.js MAXPHASES [dumpfile.bin]
const fs = require('fs');
const MAXPH = parseInt(process.argv[2] || '100000', 10);
const DUMP = process.argv[3] || '';

const M2 = 2 ** 48, M3 = 3 ** 30, M5 = 5 ** 20, M7 = 7 ** 12, M11 = 11 ** 9, M13 = 13 ** 8;
const B_M2 = BigInt(M2), B_M3 = BigInt(M3), B_M5 = BigInt(M5), B_M7 = BigInt(M7), B_B11 = BigInt(M11), B_M13 = BigInt(M13);

// arrays
const IARR = new Int32Array(MAXPH);
const KARR = new Int16Array(MAXPH);
const NSARR = new Uint8Array(MAXPH);
const ALP = new Int16Array(MAXPH);   // v2 max proximity to (A)
const BET = new Int16Array(MAXPH);   // v2(crossing - 3a(i))
const AKARG = new Int8Array(MAXPH);  // which kk achieved alpha (1-based; 0 if k=0 impossible / none)
const RTOP = new Float64Array(MAXPH);
const R2 = new Float64Array(MAXPH), R3 = new Float64Array(MAXPH), R5 = new Float64Array(MAXPH),
      R7 = new Float64Array(MAXPH), R11 = new Float64Array(MAXPH), R13 = new Float64Array(MAXPH);
const GAPMIN = new Float64Array(MAXPH); // min |b-(a(i)-1)| within the phase, capped 2^52
const G3 = new Int8Array(MAXPH);      // g(i) = v3(20*2^i + i + 1), capped at 13
const ALPG = new Int16Array(MAXPH);   // alpha restricted to k <= min(k_i, g(i)) (3-adically allowed k)
const EV2 = new Int16Array(MAXPH);    // v2(b0+1)   [= alpha_{i-1} identity check]
const TV2 = new Int16Array(MAXPH);    // v2(b0 - (a(i)-1))  [= beta_{i-1} identity check]
const XV2 = new Int16Array(MAXPH);    // v2(crossing - tgt) [= v2(entry_{i+1}+1) identity check]

function v2Big(d) { // exact v2 of nonzero BigInt (assumed |d|>0), returns 1000 if 0
  if (d === 0n) return 1000;
  if (d < 0n) d = -d;
  let v = 0;
  let t = d & 0xFFFFFFFFn;
  while (t === 0n) { d >>= 32n; v += 32; t = d & 0xFFFFFFFFn; }
  return v + Math.log2(Number(t & -t));
}
function mantExp(x) { // x = m * 2^e with m in [2^52, 2^53) float-exact
  const s = x.toString(2);
  const bl = s.length;
  if (bl <= 53) return { m: Number(x), e: 0 };
  return { m: Number(x >> BigInt(bl - 53)), e: bl - 53 };
}

let i = 0;
let b = 5n;
let halted = false, haltPhase = -1;
let minGap = 0xFFFFFFFFFFFF; // global min |b-(a(i)-1)| capped; exact for small
let minGapInfo = '';
let states = 0, triples = 0, subs = 0;
const kHist = new Map();
const t0 = Date.now();
let maxAlpha = -1, maxAlphaAt = -1, maxBeta = -1, maxBetaAt = -1;
const alphaGE = { 8: 0, 12: 0, 16: 0, 20: 0, 24: 0, 32: 0, 40: 0, 48: 0, 56: 0, 64: 0 };
let betaGE = { 8: 0, 12: 0, 16: 0, 20: 0, 24: 0, 32: 0, 40: 0, 48: 0, 56: 0, 64: 0 };

// k-consistency check: does k (and ns) depend only on i mod K? count violations after transient
const KLIST = [2, 3, 4, 6, 8, 12, 16, 24, 32, 48, 64, 96, 128, 192, 256, 384, 512, 768, 1024, 1536, 2048, 3072, 4096, 6144, 8192];
const kLast = new Map(); // key K+'_'+(i%K)+'k' -> value ; same for 'n'
const kViol = new Map();
const TRANSIENT = 64;

function noteViol(K, kind, cls, val) {
  const key = K + '_' + cls + '_' + kind;
  const prev = kLast.get(key);
  if (prev === undefined) { kLast.set(key, val); return; }
  if (prev !== val) {
    kLast.set(key, val); // keep most recent
    const vk = K + '_' + kind;
    kViol.set(vk, (kViol.get(vk) || 0) + 1);
  }
}

let ph = 0;
// 3-adic helper state: p2 = 20*2^i mod 3^13 ; x3 = (p2 + i + 1) mod 3^13
const P3 = 3 ** 13;
let p2 = 20 % P3;
function g3Of(i) { const x = (p2 + i + 1) % P3; if (x === 0) return 13; let v = 0, y = x; while (y % 3 === 0) { y /= 3; v++; } return v; }
for (; ph < MAXPH; ph++) {
  // ---- phase entry (i, b), invariant: 0 <= b < a(i) ----
  let A = (10n << BigInt(i)) - 1n;
  if (b >= A) { console.error('INVARIANT BROKEN: entry >= a(i) at phase ' + ph + ' i=' + i); process.exit(1); }
  const tgt = A - 1n;
  IARR[ph] = i;
  // residues of entry
  R2[ph] = Number(b % B_M2); R3[ph] = Number(b % B_M3); R5[ph] = Number(b % B_M5);
  R7[ph] = Number(b % B_M7); R11[ph] = Number(b % B_B11); R13[ph] = Number(b % B_M13);
  { const mb = mantExp(b), ma = mantExp(A); RTOP[ph] = mb.m / ma.m * Math.pow(2, mb.e - ma.e); }
  const g3 = g3Of(i);
  G3[ph] = g3;
  EV2[ph] = v2Big(b + 1n);
  { const d = b - tgt; TV2[ph] = v2Big(d); }
  // entry state
  if (b === tgt) { halted = true; haltPhase = ph; break; }
  let gmin = Math.min(Number(b - tgt < 0n ? tgt - b : b - tgt) || Infinity, 2 ** 52);
  states++;
  // ---- tripling loop ----
  let k = 0, alpha = -1, akarg = 0, alphag = -1;
  while (b <= tgt - 1n) { // b <= a(i)-2
    b = 3n * b + BigInt(i) + 5n;
    k++; states++; triples++;
    if (b === tgt) { halted = true; haltPhase = ph; break; }
    const d = b - tgt;
    const g = d < 0n ? Number(-d) : Number(d);
    if (g < gmin) gmin = g;
    const v = v2Big(d);
    if (v > alpha) { alpha = v; akarg = k; }
    if (k <= g3 && v > alphag) alphag = v;
  }
  if (halted) break;
  KARR[ph] = k; ALP[ph] = alpha < 0 ? 0 : alpha; AKARG[ph] = akarg; ALPG[ph] = alphag < 0 ? 0 : alphag;
  if (alpha > maxAlpha) { maxAlpha = alpha; maxAlphaAt = i; }
  for (const t in alphaGE) if (alpha >= +t) alphaGE[t]++;
  kHist.set(k, (kHist.get(k) || 0) + 1);
  if (ph >= TRANSIENT) for (const K of KLIST) noteViol(K, 'k', i % K, k);
  // b >= a(i) here (crossing value c = b)
  const c = b;
  { const d = c - 3n * A; const v = v2Big(d); BET[ph] = v; if (v > maxBeta) { maxBeta = v; maxBetaAt = i; } for (const t in betaGE) if (v >= +t) betaGE[t]++; }
  // gap of crossing state
  { const g = Number(c - tgt); if (g < gmin) gmin = g; XV2[ph] = v2Big(c - tgt); }
  // ---- subtraction(s) ----
  let ns = 0;
  while (b >= A) {
    b -= A; i++; ns++; states++; subs++;
    p2 = (p2 * 2) % P3;
    A = (10n << BigInt(i)) - 1n;
    if (b >= A) { if (ns >= 2) { console.error('INVARIANT BROKEN: triple subtraction at phase ' + ph); process.exit(1); } continue; }
    // state (i, b) reached
    const t2 = A - 1n;
    if (b === t2) { halted = true; haltPhase = ph; break; }
    const d = b - t2;
    const g = d < 0n ? Number(-d) : Number(d);
    if (g < gmin) gmin = g;
    if (i >= 4 && b >= t2) { console.error('IMPOSSIBLE'); process.exit(1); }
  }
  if (halted) break;
  if (ns !== 1 && ns !== 2) { console.error('INVARIANT BROKEN ns=' + ns); process.exit(1); }
  NSARR[ph] = ns;
  GAPMIN[ph] = gmin;
  if (gmin < minGap) { minGap = gmin; minGapInfo = 'phase ' + ph + ' (i=' + IARR[ph] + ', k=' + k + ')'; }
  if (ph > 0 && ph % 200000 === 0) console.error('  ... phase ' + ph + ' i=' + i + ' bits=' + b.toString(2).length + ' elapsed=' + ((Date.now() - t0) / 1000).toFixed(1) + 's');
}

const dt = (Date.now() - t0) / 1000;
console.log('== sim: phases=' + ph + ' halted=' + halted + (halted ? (' HALT at phase ' + haltPhase + ' i=' + i + ' b=' + b.toString().slice(0, 40)) : ''));
console.log('   final i=' + i + ' b bits=' + b.toString(2).length + ' states=' + states + ' triples=' + triples + ' subs=' + subs + ' time=' + dt.toFixed(1) + 's');
console.log('   global minGap=' + minGap + ' at ' + minGapInfo);
console.log('   k histogram: ' + [...kHist.entries()].sort((x, y) => x[0] - y[0]).map(([kk, n]) => kk + ':' + n).join(' '));
console.log('   maxAlpha=' + maxAlpha + ' (i=' + maxAlphaAt + ')  alpha>=: ' + JSON.stringify(alphaGE));
console.log('   maxBeta=' + maxBeta + ' (i=' + maxBetaAt + ')   beta>=: ' + JSON.stringify(betaGE));
// identity checks: alpha_{i} should equal v2(b0^{(i+1)}+1) = EV2[i+1]; beta_i = TV2[i+1]
{
  let badx = 0, bm = 0, badb = 0, ag = 0;
  for (let q = 0; q + 1 < ph; q++) {
    if (XV2[q] < 48 && EV2[q + 1] < 48) { if (XV2[q] !== EV2[q + 1]) badx++; }
    if (BET[q] < 48 && TV2[q + 1] < 48) { if (BET[q] !== TV2[q + 1]) badb++; }
    bm = Math.max(bm, ALPG[q]);
  }
  console.log('   IDENTITY v2(cross_i-tgt)==v2(entry_{i+1}+1): mismatches=' + badx + ' ; beta_i==v2(entry_{i+1}-tgt): mismatches=' + badb);
  const alphagGE = { 8: 0, 12: 0, 16: 0, 20: 0, 24: 0 };
  let cand = 0;
  for (let q = 0; q < ph; q++) { if (KARR[q] <= G3[q]) cand++; for (const t in alphagGE) if (ALPG[q] >= +t) alphagGE[t]++; }
  console.log('   (A)-candidate phases (k_i <= g(i)): ' + cand + '/' + ph + ' ; maxAlphaG=' + bm + ' ; alphaG>=: ' + JSON.stringify(alphagGE));
}
console.log('   k-consistency violations (i mod K -> k), i.e. same class maps to different k:');
for (const K of KLIST) { const v = kViol.get(K + '_k') || 0; const n = kViol.get(K + '_n') || 0; if (v || n) console.log('     K=' + K + ': k-violations=' + v + ' ns-violations=' + n); }
const clean = KLIST.filter(K => !(kViol.get(K + '_k') || 0) && !(kViol.get(K + '_n') || 0));
console.log('   K with ZERO k/ns violations (k determined by i mod K): ' + clean.join(', '));

if (DUMP) {
  const parts = [IARR, KARR, NSARR, ALP, ALPG, G3, EV2, TV2, XV2, RTOP, R2, R3, R5, R7, R11, R13, GAPMIN];
  const buf = Buffer.alloc(parts.length * ph * 8 + 4096);
  // header: magic, nphases, narrays, then per-array: type/size info implicit by order
  let off = 0;
  buf.writeUInt32LE(0x354F4D42, off); off += 4; // 'BMO5'
  buf.writeUInt32LE(ph, off); off += 4;
  buf.writeUInt32LE(parts.length, off); off += 4;
  buf.writeUInt32LE(0, off); off += 4;
  for (const arr of parts) {
    let bytes;
    if (arr instanceof Int32Array) bytes = Buffer.from(arr.buffer, arr.byteOffset, ph * 4);
    else if (arr instanceof Int16Array) bytes = Buffer.from(arr.buffer, arr.byteOffset, ph * 2);
    else if (arr instanceof Uint8Array || arr instanceof Int8Array) bytes = Buffer.from(arr.buffer, arr.byteOffset, ph);
    else bytes = Buffer.from(arr.buffer, arr.byteOffset, ph * 8);
    bytes.copy(buf, off); off += bytes.length;
  }
  fs.writeFileSync(DUMP, buf.subarray(0, off));
  console.log('   dump written: ' + DUMP + ' (' + off + ' bytes)');
}
