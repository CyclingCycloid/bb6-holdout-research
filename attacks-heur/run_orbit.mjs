// BMO1 heuristic analysis - 10^6-step BigInt macro orbit with statistics.
// Recurrence (verified): (a,b)=(1,2); a>b -> (a-b, 4b+2); a<b -> (2a+1, b-a); a=b -> HALT.
// Tracks: ratio histogram (r=b/a), bit growth, near-misses to the halt lines,
// residue statistics, per-step halting-probability accumulation (log domain).
import { writeFileSync } from 'node:fs';

const N = Number(process.argv[2] ?? 1e6);
const OUT = process.argv[3] ?? 'run_orbit.json';
const LN2 = Math.log(2), LN3 = Math.log(3);
const Cf = 2 / LN3;                                  // correct density constant
const f15 = Cf / ((1 / 5 + 1) * (1 / 5 + 3));        // f(1/5)
const f3 = Cf / (4 * 6);                             // f(3)
const KAP1 = f15 / 5, KAP2 = f3;                     // per-branch hitting coefficients (x 1/a)

let a = 1n, b = 2n;
// exact bit lengths + float shadow (value = h * 2^(bl-1), h in [1,2))
let bla = 1, blb = 2, ha = 1.0, hb = 1.0;

const bitLenBig = x => x.toString(2).length;
function refreshShadow() {                           // exact re-extraction of h from BigInt
  const sa = bla - 53;
  ha = sa > 0 ? Number(a >> BigInt(sa)) / 2 ** 52 : Number(a) / 2 ** (bla - 1);
  const sb = blb - 53;
  hb = sb > 0 ? Number(b >> BigInt(sb)) / 2 ** 52 : Number(b) / 2 ** (blb - 1);
  if (!(ha >= 1 && ha < 2 && hb >= 1 && hb < 2)) throw new Error('shadow refresh failed ' + [bla, blb, ha, hb]);
}
refreshShadow();

// ---------- statistics containers ----------
const NW = 200, WLO = 1 / 3, WHI = 1;
const histW = new Float64Array(NW);
const NR = 96, RLOGMIN = -16, RLOGMAX = 16;          // log2 r histogram, clamped
const histR = new Float64Array(NR);
const PSI_BINS = 120, PSI_LO = -1, PSI_HI = 1;       // psi = m/a (branch1) and k/a (branch2)
const histPsi1 = new Float64Array(PSI_BINS), histPsi2 = new Float64Array(PSI_BINS);
let nSampW = 0, nSampPsi1 = 0, nSampPsi2 = 0, nBranch1Samp = 0, nBranch2Samp = 0;
// exact relative-difference tail (delta = |a-b|/max), per step via 52-bit top division
const NDL = 181, DL_MIN = -18;                        // log10 delta bins on [-18, 0]
const histDelta = new Float64Array(NDL);
const deepEvents = [];                                // delta < 1e-7
const deltaLtCount = new Float64Array(16);            // count(delta < 10^-j), j=0..15
const wSamples = [];                                  // for KS (thinned every 32)
let sumW = 0, sumW2 = 0, sumLogW = 0;
let branch1Count = 0, log2rMax = -1e9, log2rMin = 1e9;

// mod-q residue tracking
const QLIST = [2, 3, 4, 5, 7, 8, 9, 11, 13, 16, 17, 25, 27, 31, 32, 49, 64, 97, 128];
const mA = new Int32Array(QLIST), mB = new Int32Array(QLIST);
const histM = QLIST.map(() => new Float64Array(0));   // resized later
const histK = QLIST.map(() => new Float64Array(0));
QLIST.forEach((q, i) => { histM[i] = new Float64Array(q); histK[i] = new Float64Array(q); });
const firstM0 = QLIST.map(() => -1), firstK0 = QLIST.map(() => -1);

// hitting-probability accumulation, log domain, per 1e5-step block
const NB = Math.ceil(N / 1e5);
const blockLogSum = new Float64Array(NB).fill(-Infinity);
let Slog = -Infinity;
const lse = (s, t) => { if (t === -Infinity) return s; if (s === -Infinity) return t;
  return s > t ? s + Math.log1p(Math.exp(t - s)) : t + Math.log1p(Math.exp(s - t)); };

// near-miss / calibration
const DLIST = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096];
const Dobs = new Float64Array(DLIST.length);
const Dpred = new Float64Array(DLIST.length);
const nearMiss = [];
const SIX1 = 611281n, SIX2 = 347027n;
let sixHit = null;

// record-min relative difference
let recDelta = Infinity, recDeltaAt = -1, recDeltaD = -1, recDeltaBits = -1;
const recEvents = [];
// growth samples
const growthSamples = [];                             // [n, blmax] at sync steps
const orbitTable = [];
const t0 = Date.now();

// ---------- helpers ----------
const log2big = x => {                                // accurate log2 of BigInt
  const bl = bitLenBig(x);
  if (bl <= 53) return Math.log2(Number(x));
  return (bl - 53) + Math.log2(Number(x >> BigInt(bl - 53)) / 2 ** 52);
};

// ---------- main loop ----------
let halted = false;
for (let n = 0; n < N; n++) {
  const ab = a > b;
  if (ab) branch1Count++;
  // per-step halting prob (state n): P(halt at step n+1) ~ coef / a_n
  const logp = (ab ? Math.log(KAP1) : Math.log(KAP2)) - (bla - 1) * LN2 - Math.log(ha);
  Slog = lse(Slog, logp);
  const blk = Math.min(NB - 1, Math.floor(n / 1e5));
  blockLogSum[blk] = lse(blockLogSum[blk], logp);
  const p = Math.exp(logp);
  for (let j = 0; j < DLIST.length; j++) Dpred[j] += Math.min(1, (2 * DLIST[j] + 1) * p);

  // mod-q updates happen after the branch step below (for the new state)

  // ratio stats (state n)
  const log2r = (blb - bla) + Math.log2(hb / ha);
  if (log2r > log2rMax) log2rMax = log2r;
  if (log2r < log2rMin) log2rMin = log2r;
  if (n % 32 === 0) {
    const r = Math.min(1e308, Math.exp(Math.min(709, log2r * LN2)));
    const w = (r + 1) / (r + 3);
    histW[Math.min(NW - 1, Math.max(0, Math.floor((w - WLO) / (WHI - WLO) * NW)))]++;
    nSampW++;
    sumW += w; sumW2 += w * w; sumLogW += Math.log(w);
    histR[Math.min(NR - 1, Math.max(0, Math.floor((log2r - RLOGMIN) / (RLOGMAX - RLOGMIN) * NR)))]++;
    if (ab) { nBranch1Samp++; } else { nBranch2Samp++; }
    if (ab) { // psi = m/a ~ 1-5r
      const psi = 1 - 5 * r;
      if (psi >= PSI_LO && psi <= PSI_HI) { histPsi1[Math.floor((psi - PSI_LO) / (PSI_HI - PSI_LO) * PSI_BINS)]++; nSampPsi1++; }
    } else {  // k/a ~ r-3
      const psi = r - 3;
      if (psi >= PSI_LO && psi <= PSI_HI) { histPsi2[Math.floor((psi - PSI_LO) / (PSI_HI - PSI_LO) * PSI_BINS)]++; nSampPsi2++; }
    }
    if (wSamples.length < 40000) wSamples.push(w);
  }

  // ---- the macro step ----
  let na, nb, blna, blnb, hna, hnb;
  if (ab) {
    na = a - b;
    nb = (b << 2n) + 2n;
    blnb = blb + 2;                                   // exact: 2^{blb+1} <= 4b+2 < 2^{blb+2}
    hnb = hb + (blb < 60 ? Math.pow(2, -blb) : 0);    // (4b+2)/2^{blb+1} = hb + 2^{-blb}, in [1,2)
    let t = ha - hb * Math.pow(2, blb - bla);         // na/2^(bla-1)  (blb<=bla here)
    if (!(t > 0) || t < 1e-5 * ha) {                  // cancellation: exact fallback
      blna = bitLenBig(na);
      const sa = blna - 53;
      hna = sa > 0 ? Number(na >> BigInt(sa)) / 2 ** 52 : Number(na) / 2 ** (blna - 1);
    } else {
      const l2 = Math.log2(t), fr = l2 - Math.floor(l2);
      if (fr < 1e-4 || fr > 1 - 1e-4) {               // ambiguous power of 2: exact fallback
        blna = bitLenBig(na);
        const sa = blna - 53;
        hna = sa > 0 ? Number(na >> BigInt(sa)) / 2 ** 52 : Number(na) / 2 ** (blna - 1);
      } else { blna = bla + Math.floor(l2); hna = t * Math.pow(2, bla - blna); }
    }
  } else {
    na = (a << 1n) + 1n;
    nb = b - a;
    blna = bla + 1;                                   // exact: 2^{bla} <= 2a+1 < 2^{bla+1}
    hna = ha + (bla < 60 ? Math.pow(2, -bla) : 0);    // (2a+1)/2^{bla} = ha + 2^{-bla}, in [1,2)
    let t = hb - ha * Math.pow(2, bla - blb);         // nb/2^(blb-1)  (bla<=blb here)
    if (!(t > 0) || t < 1e-5 * hb) {
      blnb = bitLenBig(nb);
      const sb = blnb - 53;
      hnb = sb > 0 ? Number(nb >> BigInt(sb)) / 2 ** 52 : Number(nb) / 2 ** (blnb - 1);
    } else {
      const l2 = Math.log2(t), fr = l2 - Math.floor(l2);
      if (fr < 1e-4 || fr > 1 - 1e-4) {
        blnb = bitLenBig(nb);
        const sb = blnb - 53;
        hnb = sb > 0 ? Number(nb >> BigInt(sb)) / 2 ** 52 : Number(nb) / 2 ** (blnb - 1);
      } else { blnb = blb + Math.floor(l2); hnb = t * Math.pow(2, blb - blnb); }
    }
  }
  if (!(hna >= 1 && hna < 2 && hnb >= 1 && hnb < 2 && blna >= 1 && blnb >= 1))
    throw new Error(`shadow norm broken at n=${n}: ${[blna, hna, blnb, hnb]}`);

  // diff of the NEW state d_{n+1} = |m_n| or |k_n|; also next branch
  const d = na > nb ? na - nb : nb - na;
  if (d === 0n) { console.log(`HALT at step ${n + 1}: a=b=${na}`); halted = true; a = na; b = nb; break; }

  // near-miss events and calibration
  for (let j = 0; j < DLIST.length; j++) if (d <= BigInt(DLIST[j])) Dobs[j]++;
  if (d <= 64n) nearMiss.push({ step: n + 1, d: d.toString(), aBits: blna, bBits: blnb, r_approx: Math.min(1e300, Math.exp(Math.min(690, ((blnb - blna) + Math.log2(hnb / hna)) * LN2))) });
  if (na === SIX1 && nb === SIX2) sixHit = { step: n + 1, which: '(a,b)=(611281,347027)' };
  if (na === SIX2 && nb === SIX1) sixHit = { step: n + 1, which: '(a,b)=(347027,611281)' };

  // record-min relative difference + EXACT per-step delta via 52-bit tops
  {
    const mx = na > nb ? na : nb;
    const blm = Math.max(blna, blnb);
    let dex;
    if (blm <= 52) dex = Number(d) / Number(mx);
    else {
      const sa = BigInt(blm - 52);
      const hiD = Number(d >> sa);
      dex = hiD === 0 ? 0 : hiD / Number(mx >> sa);   // 0 only if delta < 2^-52
    }
    const ld = dex === 0 ? DL_MIN - 1 : Math.log10(dex);
    histDelta[ld >= 0 ? NDL - 1 : Math.max(0, Math.floor((ld - DL_MIN) * NDL / 18))]++;
    for (let j = 0; j < 16; j++) if (dex < Math.pow(10, -j)) deltaLtCount[j]++;
    if (dex < 1e-7) deepEvents.push({ step: n + 1, delta: dex, dBits: d.toString(2).length, maxBits: blm });
    if (dex < recDelta) { recDelta = dex; recDeltaAt = n + 1; recDeltaBits = blm;
      if (n + 1 >= 100) recEvents.push({ step: n + 1, delta: dex, dBits: d.toString(2).length, maxBits: blm }); }
  }

  // mod-q residues of the NEW state + m/k histograms for the state we just left
  for (let qi = 0; qi < QLIST.length; qi++) {
    const q = QLIST[qi];
    if (ab) {
      const mm = ((mA[qi] - 5 * mB[qi] - 2) % q + q) % q;
      histM[qi][mm]++; if (mm === 0 && firstM0[qi] < 0) firstM0[qi] = n + 1;
    } else {
      const kk = ((mB[qi] - 3 * mA[qi] - 1) % q + q) % q;
      histK[qi][kk]++; if (kk === 0 && firstK0[qi] < 0) firstK0[qi] = n + 1;
    }
    let naq, nbq;
    if (ab) { naq = (mA[qi] - mB[qi] + q) % q; nbq = (4 * mB[qi] + 2) % q; }
    else { naq = (2 * mA[qi] + 1) % q; nbq = (mB[qi] - mA[qi] + q) % q; }
    mA[qi] = naq; mB[qi] = nbq;
  }

  // commit
  a = na; b = nb; bla = blna; blb = blnb; ha = hna; hb = hnb;
  if (n % 16 === 15) refreshShadow();
  if (n % 16 === 0) growthSamples.push([n, Math.max(bla, blb)]);
  if ([10, 100, 1000, 1e4, 1e5, 2e5, 5e5, 1e6].includes(n + 1))
    orbitTable.push({ step: n + 1, aBits: bla, bBits: blb, log2r: (blb - bla) + Math.log2(hb / ha) });
  if ((n + 1) % 100000 === 0) console.error(`step ${n + 1}: bits=${Math.max(bla, blb)}, ${(Date.now() - t0) / 1000 | 0}s`);
}

// ---------- analysis of the run ----------
// regularized upper incomplete gamma via Lanczos + series/continued fraction
const LG_C = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155,
  0.1208650973866179e-2, -0.5395239384953e-5];
function gammaln(x) {
  let y = x, tmp = x + 5.5; tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) ser += LG_C[j] / ++y;
  return -tmp + Math.log(2.5066282746310005 * ser / x);
}
function gammaQ2(a, x) {                              // Q(a,x) via series/continued fraction
  if (x < 0 || a <= 0) return NaN;
  if (x === 0) return 1;
  if (x < a + 1) {
    let ap = a, sum = 1 / a, del = sum;
    for (let i = 0; i < 1000; i++) { ap++; del *= x / ap; sum += del; if (Math.abs(del) < Math.abs(sum) * 1e-16) break; }
    return 1 - sum * Math.exp(-x + a * Math.log(x) - gammaln(a));
  }
  // continued fraction for Q
  const FPMIN = 1e-300;
  let b = x + 1 - a, c = 1 / FPMIN, d = 1 / b, h = d;
  for (let i = 1; i < 1000; i++) {
    const an = -i * (i - a);
    b += 2; d = an * d + b; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = b + an / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d; const del = d * c; h *= del;
    if (Math.abs(del - 1) < 1e-16) break;
  }
  return Math.exp(-x + a * Math.log(x) - gammaln(a)) * h;
}
function ksPvalue(lambda) {
  let s = 0;
  for (let j = 1; j <= 100; j++) s += (j % 2 ? 1 : -1) * Math.exp(-2 * j * j * lambda * lambda);
  return Math.max(0, Math.min(1, 2 * s));
}

const res = { N, halted, ms: Date.now() - t0, finalBits: { a: bla, b: blb } };

// growth fit
{
  const pts = growthSamples.filter(p => p[0] >= 2e5);
  const n = pts.length;
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (const [x, y] of pts) { sx += x; sy += y; sxx += x * x; sxy += x * y; }
  const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx);
  const icpt = (sy - slope * sx) / n;
  let ssr = 0; for (const [x, y] of pts) ssr += (y - icpt - slope * x) ** 2;
  const se = Math.sqrt(ssr / (n - 2) / (n * sxx - sx * sx));
  res.growth = { samples: n, fitFrom: 2e5, slope_bits_per_step: slope, slope_se: se, intercept: icpt,
    theory_bits: Cf === undefined ? 0 : 0 };
  // per-block slopes
  const bs = [];
  for (let lo = 0; lo < 1e6; lo += 1e5) {
    const q = growthSamples.filter(p => p[0] >= lo && p[0] < lo + 1e5);
    if (q.length > 1) { const y0 = q[0][1], y1 = q[q.length - 1][1]; bs.push(((y1 - y0) / (q[q.length - 1][0] - q[0][0]))); }
  }
  res.growth.blockSlopes = bs;
}

// histogram comparison (w-space): analytic g(w) = 1/(w ln3), CDF G(w) = ln(3w)/ln3
{
  const nw = nSampW;
  const G = w => Math.log(3 * w) / LN3;
  // chi2 on 50 equal-mass bins
  const NBINS = 50;
  const edges = []; for (let i = 0; i <= NBINS; i++) edges.push(Math.exp((i / NBINS) * LN3) / 3);
  const obs = new Float64Array(NBINS);
  for (const w of wSamples) {
    let lo = 0, hi = NBINS;
    while (lo < hi - 1) { const mid = (lo + hi) >> 1; if (w < edges[mid]) hi = mid; else lo = mid; }
    obs[lo]++;
  }
  let chi2 = 0; const expct = wSamples.length / NBINS;
  for (let i = 0; i < NBINS; i++) chi2 += (obs[i] - expct) ** 2 / expct;
  // KS
  const sorted = [...wSamples].sort((x, y) => x - y);
  let D = 0;
  for (let i = 0; i < sorted.length; i++) {
    const F = G(sorted[i]);
    D = Math.max(D, Math.abs((i + 1) / sorted.length - F), Math.abs(i / sorted.length - F));
  }
  // lag-1 autocorrelation of w samples
  const nn = sorted.length;
  const mw = sumW / nw;
  let g0 = 0, g1 = 0;
  for (let i = 1; i < nn; i++) { g0 += (wSamples[i] - mw) ** 2; g1 += (wSamples[i] - mw) * (wSamples[i - 1] - mw); }
  const rho1 = g1 / (g0 + (wSamples[0] - mw) ** 2);
  const neff = nn * (1 - rho1) / (1 + rho1);
  const lam = (Math.sqrt(nn) + 0.12 + 0.11 / Math.sqrt(nn)) * D;
  const lamEff = (Math.sqrt(neff) + 0.12 + 0.11 / Math.sqrt(neff)) * D;
  res.hist = {
    n_samples: nw, mean_w: mw, theory_mean_w: 1 - 1 / LN3,
    chi2_50bins: chi2, df: NBINS - 1, chi2_p: gammaQ2((NBINS - 1) / 2, chi2 / 2),
    ks_D: D, ks_p_n: ksPvalue(lam), rho1, n_eff: neff, ks_p_neff: ksPvalue(lamEff),
    emp_P_r_lt_1: branch1Count / N, theory_P_r_lt_1: Math.log(1.5) / LN3,
    // table: bin centers vs analytic (density in w)
    table: Array.from({ length: 20 }, (_, i) => {
      const j = i * 10;
      const wmid = WLO + (j + 5) / NW * (WHI - WLO);
      return { w: +wmid.toFixed(4), emp_density_w: histW[j] / nw / ((WHI - WLO) / NW), analytic_w: 1 / (wmid * LN3) };
    }),
    log2r_range: [log2rMin, log2rMax],
    histR_log2r_bins: Array.from(histR),
  };
  // empirical quantiles of r from w samples
  const qs = {};
  for (const p of [0.01, 0.05, 0.25, 0.5, 0.75, 0.95, 0.99]) {
    const wq = sorted[Math.floor(p * (nn - 1))];
    const r = (3 * wq - 1) / (1 - wq);
    qs[p] = { r_emp: r, r_theory: 3 * (Math.pow(3, p) - 1) / (3 - Math.pow(3, p)) };
  }
  res.hist.quantiles = qs;
}

// psi histograms: conditional densities given the branch.
// psi1 = m/a | branch1 has density f((1-psi)/5)*(1/5)/P(r<1); value at 0: f(1/5)/(5 P(r<1))
// psi2 = k/a | branch2 has density f(3+psi)/P(r>1); value at 0: f(3)/P(r>1)
{
  const bw = (PSI_HI - PSI_LO) / PSI_BINS;
  const dens1 = [], dens2 = [];
  for (let i = 0; i < PSI_BINS; i++) {
    const c = PSI_LO + (i + 0.5) * bw;
    if (Math.abs(c) < 0.5) {
      dens1.push({ psi: +c.toFixed(3), emp: histPsi1[i] / nBranch1Samp / bw, theory: Cf / (((1 - c) / 5 + 1) * ((1 - c) / 5 + 3)) * 0.2 / (Math.log(1.5) / LN3) });
      dens2.push({ psi: +c.toFixed(3), emp: histPsi2[i] / nBranch2Samp / bw, theory: Cf / ((3 + c + 1) * (3 + c + 3)) / (1 - Math.log(1.5) / LN3) });
    }
  }
  res.psi = {
    f15_over_5: f15 / 5, f3,
    table1: dens1.filter((_, i) => i % 6 === 0), table2: dens2.filter((_, i) => i % 6 === 0),
    n_branch1_samples: nBranch1Samp, n_branch2_samples: nBranch2Samp,
  };
}

// delta-tail analysis: P(delta < eps) vs continuum prediction 2 f(1) eps
{
  const rows = [];
  for (let j = 1; j <= 12; j++) {
    const eps = Math.pow(10, -j);
    const obs = deltaLtCount[j] / N;
    const pred = 2 * (Cf / 8) * eps;
    const pois = deltaLtCount[j];
    rows.push({ eps, count: pois, emp_P: obs, pred_P: pred, ratio: obs / pred,
      pois_sd: Math.sqrt(Math.max(pois, 0.5)) / N });
  }
  // power-law fit on the tail: count(delta<eps) ~ A eps^beta using j=3..9
  let sx = 0, sy = 0, sxx = 0, sxy = 0, cnt = 0;
  for (let j = 3; j <= 9; j++) {
    if (deltaLtCount[j] < 2) continue;
    const x = -j * Math.LN10, y = Math.log(deltaLtCount[j]);
    sx += x; sy += y; sxx += x * x; sxy += x * y; cnt++;
  }
  res.deltaTail = {
    N, histDelta: Array.from(histDelta), counts_vs_eps: rows,
    powerlaw_beta: cnt > 2 ? (cnt * sxy - sx * sy) / (cnt * sxx - sx * sx) : null,
    continuum_beta: 1,
    deepEvents,
  };
}

// mod-q analysis
{
  const rows = [];
  for (let qi = 0; qi < QLIST.length; qi++) {
    const q = QLIST[qi];
    const c1 = histM[qi].reduce((s, x) => s + x, 0), c2 = histK[qi].reduce((s, x) => s + x, 0);
    let chi2m = 0, chi2k = 0;
    for (let i = 0; i < q; i++) { chi2m += (histM[qi][i] - c1 / q) ** 2 / (c1 / q); chi2k += (histK[qi][i] - c2 / q) ** 2 / (c2 / q); }
    rows.push({
      q, count_branch1_m: c1, count_branch2_k: c2,
      bias_M0: histM[qi][0] / (c1 / q), bias_K0: histK[qi][0] / (c2 / q),
      chi2_M: chi2m, chi2_M_df: q - 1, chi2_M_p: gammaQ2((q - 1) / 2, chi2m / 2),
      chi2_K: chi2k, chi2_K_df: q - 1, chi2_K_p: gammaQ2((q - 1) / 2, chi2k / 2),
      firstM0: firstM0[qi], firstK0: firstK0[qi],
      M_res: Array.from(histM[qi]), K_res: Array.from(histK[qi]),
    });
  }
  res.modq = rows;
  // composite lattice-bias estimate over prime powers <= 64
  const pp = rows.filter(r => [2, 4, 8, 16, 32, 64, 3, 9, 27, 5, 25, 7, 49].includes(r.q));
  let lamM = 1, lamK = 1;
  for (const r of pp) { lamM *= r.bias_M0; lamK *= r.bias_K0; }
  res.modq.lattice_bias_M_product_pp_le_64 = lamM;
  res.modq.lattice_bias_K_product_pp_le_64 = lamK;
}

// calibration: observed vs predicted small-|d| counts
res.calibration = DLIST.map((D, j) => ({ D, observed: Dobs[j], predicted: Dpred[j] }));

// hitting sums
{
  res.hitting = {
    log_total_sum_p: Slog, total_sum_p: Math.exp(Slog),
    block_log_sums: Array.from(blockLogSum).map(x => Math.exp(x)),
    kappa_branch1: KAP1, kappa_branch2: KAP2,
    tail_note: 'P(halt after step N) ~ kappa * sum_{n>N} 1/a_n',
  };
  // realized tail decay: ratio of last two 1e5-blocks of sum 1/a ~ sum p / kappa
  const nb = NB;
  const r1 = blockLogSum[nb - 1] - blockLogSum[nb - 2];   // log ratio of block sums
  const tailMult = -1 / Math.expm1(-r1);                  // geometric extrapolation 1/(1-e^{-|r1|})
  res.hitting.block_ratio_log = r1;
  res.hitting.extrapolated_tail_log_after_N = blockLogSum[nb - 1] + Math.log(tailMult);
}

// records of min relative difference
{
  res.records = { min_delta: recDelta, at_step: recDeltaAt, events: recEvents };
  // log-log fit of record deltas
  const pts = recEvents.filter(e => e.step >= 100);
  if (pts.length >= 3) {
    const n = pts.length;
    let sx = 0, sy = 0, sxx = 0, sxy = 0;
    for (const e of pts) { const x = Math.log(e.step), y = Math.log(e.delta); sx += x; sy += y; sxx += x * x; sxy += x * y; }
    res.records.fit_slope = (n * sxy - sx * sy) / (n * sxx - sx * sx);
    res.records.fit_points = n;
    res.records.pred_slope = -1;
    res.records.pred_const_2ln3 = 2 * LN3;
  }
}

res.nearMiss = nearMiss;
res.sixCheck = sixHit;
res.orbitTable = orbitTable;

writeFileSync(new URL('./' + OUT, import.meta.url), JSON.stringify(res, null, 1));
console.log(`done N=${N} in ${res.ms} ms; finalBits a=${bla} b=${blb}; Slog=${Slog}`);
console.log(JSON.stringify({ growth: res.growth.slope_bits_per_step, chi2: res.hist.chi2_50bins, chi2_p: res.hist.chi2_p, ks_D: res.hist.ks_D, ks_p_neff: res.hist.ks_p_neff, sum_p: res.hitting.total_sum_p, min_delta: recDelta, at: recDeltaAt, nearMiss: nearMiss.length, sixHit, calibration: res.calibration }, null, 1));
