# BMO1 (BB(6) holdout): heuristic halt-probability analysis

**Date:** 2026-09-25. **Status: HEURISTIC (non-rigorous).** All numbers below are model-based
estimates, not proofs. Scripts: `attacks-heur/{run_orbit.mjs, fp_solve.mjs, integrals.mjs}`;
raw outputs: `attacks-heur/{run1e6.json, fp_solve.json, integrals.json}`.
Verified simulator `sim/macro.mjs` (read-only) defines the macro recurrence; this analysis
independently re-implements it (milestones match: bits(1e5)=21781 exactly).

## 0. Setup

Blank-tape BMO1 behavior = iterating `(a,b)` from `(1,2)` (machine-checked vs raw TM for 59
anchors / 10^10 TM steps; `sim/anchors_1e10.log`):

```
a > b :  (a, b) -> (a - b, 4b + 2)        ("branch 1")
a < b :  (a, b) -> (2a + 1, b - a)        ("branch 2")
a = b :  HALT
```

Step convention below: state after `n` applications = step `n`; anchor "element k" (1-based) =
step `k-1`. Anchor element 4 = step 3 = (5,4); element 18 = step 17 = (83,81) — both reproduced.

## 1. Invariant density of the ratio r = b/a (recomputed from scratch)

### 1.1 The deterministic limit map and Frobenius-Perron

For large a,b the integer corrections (+1, +2) are relatively O(1/a); the ratio
`r = b/a` follows (branch 1 is r<1, branch 2 is r>1):

```
r < 1 :  r' = (4b+2)/(a-b)  ->  Phi(r) = 4r/(1-r)
r > 1 :  r' = (b-a)/(2a+1)  ->  Phi(r) = (r-1)/2
```

Frobenius-Perron for the density: `f(y) = sum_{x in Phi^-1(y)} f(x)/|Phi'(x)|`.
Preimages: `y = 4r/(1-r)` gives `r = y/(y+4)` with `Phi' = (y+4)^2/4`; `y = (r-1)/2` gives
`r = 2y+1` with `Phi' = 1/2`. So the FP equation is

```
f(y) = 4/(y+4)^2 * f(y/(y+4)) + 2 * f(2y+1).
```

Substituting the ansatz `f(r) = C/((r+1)(r+3))`: term 1 = `C/(2(y+2)(y+3))`, term 2 =
`C/(2(y+1)(y+2))`, sum = `C/((y+1)(y+3))` — **exact fixed point**. Pointwise residual of the
functional equation, evaluated in double precision: max 5.6e-17 (`integrals.json: fp_residual`).

Normalization on the actual support r in (0, inf):
`int dr/((r+1)(r+3)) = (ln 3)/2`, hence

```
C = 2/ln 3 = 1.820478453253675     (CORRECT)
```

**The Math.SE 4939082 constant `C = 2 ln 3 = 2.197224577` is wrong: it gives total mass
(ln 3)^2 = 1.206949. The shape `C/((r+1)(r+3))` is right; only the constant is off by the
factor (ln 3)^2.** (Expectations normalize, which is why the same post's growth constant can
still be correct — see section 2.)

Handy closed forms: CDF `F(r) = ln(3(r+1)/(r+3))/ln 3`; quantile function
`F^{-1}(p) = 3(3^p - 1)/(3 - 3^p)`; **median r = sqrt(3) = 1.7321**; `P(r<1) = ln(3/2)/ln 3
= 0.369070`; heavy tail `f(r) ~ C/r^2` (E[r] diverges — r spikes to ~4/delta after near-diagonal
events; observed log2 r range in 10^6 steps: [-21.6, +20.4]).

Conjugate form (used for numerics): with the cross-ratio `w = (r+1)/(r+3) in (1/3, 1)`,
the map becomes `w < 1/2: w' = 4w - 1` (slope 4), `w > 1/2: w' = w/(2-w)` (slope 2/(2-w)^2 in
(8/9, 2)); both branches map onto the whole interval (full-branch, eventually expanding), and
`f(r) dr = dw/(w ln 3)`, i.e. density `g(w) = 1/(w ln 3)`.

### 1.2 Numerical FP solutions (both converge to the analytic density)

(a) **Direct discretized FP in w-space** (10^4 uniform bins, linear-interpolation push
`g_{k+1}(y) = g_k((y+1)/4)/4 + g_k(2y/(1+y))*2/(1+y)^2`, renormalized). Started from uniform,
left-concentrated, and right-concentrated densities — all three converge in 34-58 iterations
to the same fixed point; distance to `1/(w ln3)`: L1 = 9.8e-6, L_inf = 6.3e-5 (= discretization
level of 10^4 bins).

| w | fixed point | 1/(w ln3) |
|---|---|---|
| 0.34 | 2.67685 | 2.67691 |
| 0.50 | 1.82035 | 1.82036 |
| 0.70 | 1.30041 | 1.30040 |
| 0.99 | 0.91942 | 0.91940 |

(b) **Ulam method in r-space** (10^4 log-spaced bins over [2^-40, 2^40], 8 subsamples/bin,
iterated to L1 change < 1e-12): from 3 different starts, ~106 iterations, fixed point vs
analytic bin masses: L1 = 0.17, chi2 = 0.30 (df = 10^4-scale) — agreement at the
bin-discretization level, e.g. bin containing r=1: 1.2394e-3 vs 1.2627e-3 analytic.

### 1.3 Empirical validation: 10^6-step BigInt orbit histogram

Full integer recurrence, native BigInt, exact bit-lengths (float shadow resynced every 16
steps; near-diagonal/cancellation cases computed exactly from the BigInts). Runtime 7 s.
Ratio sampled every 32 steps (lag-1 autocorrelation of w: -0.004 to +0.004, effectively
independent; n_eff ~ n).

- Chi-square, 50 equal-mass bins in w: **chi2 = 49.5, df = 49, p = 0.45** (no rejection).
- Kolmogorov-Smirnov vs `G(w) = ln(3w)/ln 3`: **D = 0.00444, p = 0.57**.
- Empirical `P(r<1)` = 0.36971 vs theory 0.36907.
- Empirical quantiles of r vs theory: p=0.05: 0.090/0.087; p=0.25: 0.555/0.563;
  **p=0.50: 1.7320/1.73205**; p=0.75: 5.254/5.328; p=0.95: 33.7/34.4.

w-density (orbit histogram vs `1/(w ln3)`), selected bins:

| w | emp | analytic | | w | emp | analytic |
|---|---|---|---|---|---|---|
| 0.35 | 2.534 | 2.601 | | 0.65 | 1.382 | 1.400 |
| 0.45 | 1.862 | 2.023 | | 0.75 | 1.430 | 1.214 |
| 0.55 | 1.622 | 1.655 | | 0.85 | 0.960 | 1.071 |
| 0.5833 | 1.546 | 1.560 | | 0.95 | 0.816 | 0.958 |

(Deviation at w in [0.44, 0.50] ~ +5-8% of bin mass; consistent with chi2/KS: the orbit is one
realization, bin SE ~ 2-3%.)

**Conclusion 1: the orbit of BMO1 equidistributes (to measurable precision) according to
`f(r) = (2/ln3)/((r+1)(r+3))`. The claimed density shape is confirmed; the claimed constant
2 ln 3 must be replaced by 2/ln 3.**

## 2. Expected log-growth per step

Under the invariant density (all three must agree in stationarity, and they do):

- `E[Delta ln a] = int_0^1 ln(1-r) f dr + ln2 * P(r>1)`
  with `int_0^1 ln(1-r)/((r+1)(r+3)) dr = (1/2)(Li2(1/4) - Li2(1/2))` gives the closed form

```
g = ln2 * (1 - ln(3/2)/ln3) + (Li2(1/4) - Li2(1/2))/ln 3
  = 0.15097694450241955  nats/step  =  0.2178136891 bits/step
```

- `E[Delta ln b] = ln4*P(r<1) + (Li2(1/2) - Li2(3/4))/ln 3 = 0.1509769445024197` (same).
- `E[Delta ln max(a,b)]` (piecewise: r<1/5: ln(1-r); 1/5<r<1: ln(4r); 1<r<3: ln(2/r); r>3:
  ln(1-1/r)) = 0.15097694450241253 (numerical, w-coordinate Simpson; agrees to 1e-14).

**Claim check: the quoted "E[ln a] ~= 0.15097694 per step" is CORRECT to 4.5e-9 and is in
nats (natural-log units): 0.150976944/ln 2 = 0.2178137 bits/step, matching the measured
0.2178 bits/step and the setup's "21781 bits at n=10^5".** (The post's wrong density constant
cancels in normalized expectations, which is why their growth number survives.)

Orbit measurement (10^6 steps, exact bit lengths, fit over [2e5, 1e6]):
slope = 0.21802 bits/step; per-10^5-step block slopes range 0.21743-0.21852 (mean 0.2180);
theory 0.217814 sits well inside the orbit's own fluctuation (per-step sigma(Delta ln a) =
0.888, so a 8e5-step time average has ~0.1% spread). Milestones (bits of a, b):

| step n | 10 | 100 | 10^3 | 10^4 | 10^5 | 10^6 |
|---|---|---|---|---|---|---|
| bits(a) | 6 | 26 | 228 | 2190 | 21781 | 217962 |
| bits(b) | 3 | 24 | 225 | 2193 | 21782 | 217957 |

Also: `P(r<1/5) = 0.10721`, `P(r>3) = 0.36907` — note branch 1 with r in (1/5, 1) (where b
quadruples) and branch 2 with r in (1, 3) (where a doubles) are the growth engines.

## 3. Hitting model: probability of ever reaching a = b

### 3.1 The halt lines

Halting at step n+1 means `a_{n+1} = b_{n+1}`, i.e. the state at step n lies on one of two
lattice lines:

```
L1 (branch 1, a>b):  a - b = 4b + 2   <=>   a = 5b + 2   (r = 1/5 + O(1/a))
L2 (branch 2, a<b):  2a + 1 = b - a   <=>   b = 3a + 1   (r = 3 + O(1/a))
```

These are exactly the "max-switch" lines of the growth pieces in section 2. Moreover the
observed difference sequence is precisely the distance to these lines:
`d_{n+1} = |a_{n+1} - b_{n+1}| = |a_n - 5b_n - 2|` (branch 1) or `|b_n - 3a_n - 1|` (branch 2).
So "|a-b| small" statistics ARE the near-miss-to-halting statistics, one step shifted.

### 3.2 Per-step halting probability

Lattice-strip estimate under the invariant density (strip width in r: `dr/dm = -1/(5a)` for
L1 at fixed b; `dr/dk = 1/a` for L2):

```
p_n = P(halt at step n+1) ~= f(1/5)/(5 a_n) * 1{a_n > b_n} + f(3)/a_n * 1{a_n < b_n}
   = 0.09481659/a_n  (branch 1)   or   0.07585327/a_n  (branch 2)
   combined coefficient kappa = f(1/5)/5 + f(3) = 3/(16 ln 3) = 0.170670
```

Conditional densities of the scaled line-distances, measured on the orbit (sampled steps),
vs theory `f((1-psi)/5)*(1/5)/P(r<1)` and `f(3+psi)/P(r>1)`: at psi = 0: branch 1:
emp 0.249 vs 0.257; branch 2: emp 0.104 vs 0.120 — consistent within sampling error.
**No enrichment or depletion at the critical lines.**

### 3.3 Realized sum along the actual orbit (exact BigInt replay)

`S(N) = sum_{n=0}^{N} p_n` using the orbit's own a_n and branch sequence:

| through step | S | remaining tail |
|---|---|---|
| 30 | 0.3925723713 | — |
| **59 (verified region end)** | 0.3947045287 | **2.185e-5** |
| 100 | 0.3947263494 | 2.59e-8 |
| 200 | 0.3947263753 | 9.5e-15 |
| 1000 | 0.3947263753 | < 1e-6560 |
| 10^6 (this run) | 0.3947263753 | < 1e-6560 |

Interpretation (model): the "expected number of halts" over all time is **0.3947**, i.e. an
iid-model probability `1 - e^{-0.395} = 0.33` that such a machine halts *at some step* — and
99.4% of that mass sits in the first 30 steps, which are exactly the steps everyone has
exhaustively checked. Survival is not surprising (p ~ 0.67) but the *conditional* tail is what
matters:

- **P(halt after the machine-verified 59 anchors / 10^10 TM steps) ~= 2.2e-5** (realized-orbit
  model; trend-based model gives 1.7e-4 — see error bars).
- Beyond step ~200 the per-step probabilities are < 10^{-6000} each and decay geometrically.

Trend extrapolation for the deep tail (`a_n ~ 2^{0.21781 n}`, multiplier 1/(1-e^{-g}) = 7.14):

```
P(halt after step N) ~= 1.216 * 2^{-0.21781 N}:
  N = 10^6 steps  ->  log10 P ~= -65,569
  N = 4.59e6 steps (= 10^6 bits, the community bound)  ->  log10 P ~= -301,030
```

### 3.4 Calibration and modular checks (honest error bars)

- **Near-miss count calibration.** Observed vs predicted counts of events `|d| <= D`
  (prediction = sum_n min(1, (2D+1) p_n)) over 10^6 steps:

| D | 1 | 2 | 4 | 8 | 16 | 32 | 64 | 128 | 256 | 512 | 1024 | 2048 | 4096 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| obs | 1 | 3 | 4 | 8 | 9 | 13 | 15 | 18 | 23 | 29 | 36 | 40 | 44 |
| pred | 1.18 | 1.97 | 3.55 | 6.13 | 9.47 | 12.9 | 17.0 | 21.2 | 25.6 | 29.5 | 33.7 | 37.9 | 42.6 |

  Agreement within Poisson noise across two orders of magnitude — the strip model (density x
  lattice uniformity) is validated wherever it is testable. (All |d|<=64 events occur at
  steps <= 24; predicted counts beyond step ~100 are < 1e-4 and none are seen, as predicted.)

- **Modular structure.** Residues of `m = a-5b-2` (at branch-1 steps) and `k = b-3a-1`
  (branch-2 steps) mod q for q in {2,...,128}: bias of residue 0 relative to uniform is
  within +-1.6% for every q (e.g. q=2: 0.996; q=32: 0.992; q=128: 0.984); residue 0 is
  *reached* for every q (first occurrence within the first few hundred steps); product over
  prime powers <= 64: 0.990 (m), 0.993 (k). **No congruence obstruction and no systematic
  lattice bias** — the equidistribution assumption behind kappa passes every test available.
  (Some q show mild global chi2 nonuniformity of *other* residues, e.g. q=32 p=0.001 — this
  does not affect residue-0 rates, which is what halting needs.)

- **Error bars on the tail.** (i) Density uncertainty from the chi2/KS fit: a few percent on
  kappa. (ii) Lattice bias: < 2%. (iii) Trajectory fluctuations: sigma(Delta ln a) = 0.888
  nats/step is large, so `sum 1/a_n` along a *random* model trajectory is lognormal-flavored;
  the honest number is the realized-orbit sum (0.3947 total), and for the deep tail the
  multiplier is between the naive 7.14 and a log-corrupted variant (the continuum
  E[1/(1-r)] diverges only logarithmically before the lattice cuts it off) — this shifts
  log10 P by O(1), irrelevant at -65,000. (iv) The model cannot be tested at the exact
  lattice scale 1/a at large n; that is the fundamental epistemic gap.

## 4. Near-miss statistics (10^6-step run)

### 4.1 All events with |a-b| <= 64

15 events, ALL at steps 1-24 (none later in 10^6 steps):

| step | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 14 | 15 | 17 | 24 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| d | 2 | 4 | **1** | 17 | 14 | 7 | 8 | 22 | 5 | 30 | 8 | 30 | 41 | **2** | 48 |

Step 3 is the (5,4) state (anchor element 4); step 17 is (83,81) (anchor element 18,
r = 81/83 = 0.9759). Matches the setup's list; nothing new through 10^6 steps.
The community pair **(611281, 347027) is NOT an orbit state** (neither ordering occurs in
10^6 steps) — that ratio (1.7614) belongs to some other analysis; it is close to but not
equal to the median ratio sqrt(3) = 1.7321.

### 4.2 Relative difference delta = |a-b|/max(a,b): tail

Per-step exact delta (52-bit top division of the exact BigInts). Empirical
`P(delta < eps)` vs continuum prediction `2 f(1) eps = 0.45512 eps`:

| eps | 0.1 | 0.01 | 1e-3 | 1e-4 | 1e-5 | 1e-6 |
|---|---|---|---|---|---|---|
| count | 47907 | 4565 | 447 | 39 | 3 | 1 |
| emp/pred | 1.05 | 1.00 | 0.98 | 0.86 | 0.66 | 2.2 |

Power-law fit on the tail: beta = 1.09 (vs 1 predicted; Poson-consistent — 3 and 1 events at
the deep end). **No anomalous concentration near the diagonal**: the near-diagonal statistics
follow the invariant density. (An earlier draft of this analysis had an artifact suggesting
delta ~ 1e-9 records; that was a bug in a log2 helper, fixed — exact replay confirms the
values here.)

### 4.3 Record minima and their scaling

Record events of min delta (step, delta, bits(d), bits(max)):

| step | 177 | 585 | 1216 | 4636 | 8261 | 8870 | 24363 | 269844 | 301058 | 343246 | 629367 | 920120 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| delta e-4 | 35.3 | 26.0 | 18.7 | 2.00 | 1.72 | 0.488 | 0.266 | 0.209 | 0.187 | 0.110 | 0.0285 | 0.0061 |
| bits(d) | 35 | 126 | 265 | 1023 | 1810 | 1939 | 5308 | 58782 | 65552 | 74758 | 137126 | 200558 |

Log-log fit of record delta vs step: slope **-0.88** (12 points) vs -1 predicted;
`E[min_{k<=n} delta] = 1/(2 f(1) n) = (2 ln 3)/n` (2.20e-6 at n = 10^6; observed record
6.1e-7 — same order). So the *relative* approach to the diagonal improves only as ~1/n
("fractal near-misses" get relatively closer, absolutely farther: bits(d) grows ~0.218n),
while the *halting* target (d = 0 exactly) needs a lattice-scale hit whose probability
~ kappa/a_n decays like 2^{-0.218n}. This is the quantitative content of the community's
"drift away from the diagonal": correct in absolute terms; in relative terms delta is
stationary (E[delta] = 0.635) with minimum ~ 2 ln3 / n.

## 5. Verdict (HEURISTIC — not a proof)

**Expected behavior: never halts.** Quantitative model estimates:

| conditioning horizon | P(halts at some later step) |
|---|---|
| unconditional (model) | 0.33 (mass concentrated in first ~30 steps, all checked) |
| after machine-verified 10^10 TM steps (59 anchors) | ~ 2.2e-5 (trend model: 1.7e-4) |
| after this 10^6-step macro run | ~ 10^{-65,569} |
| after community 10^6-bit no-halt bound (~4.6e6 steps) | ~ 10^{-301,030} |

Every testable prediction of the equidistribution model passed: invariant density
(chi2 p=0.45, KS p=0.57), growth constant (0.21781 bits/step to 4+ digits on the orbit),
branch frequencies, quantiles, near-miss counts across D = 1..4096, delta-tail slope 1,
residue-0 rates mod q <= 128 within 2%, psi-density at both halt lines. There is no drift
toward the diagonal, no modular obstruction, no excess of near-misses. Within this model
class, BMO1 is "probviously" non-halting with a margin that becomes astronomical once the
numbers grow (the conditional probability halves every ~4.6 steps of survival).

**Caveats (why this is not a proof).**
1. The system is deterministic; the "randomness" is low-order-bit chaos. The model's central
   assumption — equidistribution at the lattice scale 1/a_n near the two halt lines — cannot
   be verified directly at large n; it is only extrapolated from coarse-scale agreement.
2. Heuristic arguments have mispredicted halting behavior for individual machines before
   (the BB(5) program's "probviously non-halting" machines that later fell to explicit
   constructions; the BB(6) Antihydra, where the analogous random model sits near 50% and is
   explicitly distrusted in the community literature). A single structured orbit can violate
   a random model in ways no finite sample exposes — e.g., a hidden semi-invariant that
   eventually forces a line hit, or one that provably avoids it (the mod-q scan here rules
   out the *simplest* avoidance invariants only, q <= 128).
3. The post-59-anchors conditional (~2e-5) is small but NOT astronomical: the astronomical
   numbers require trusting macro-simulation beyond the machine-verified anchor chain (my
   10^6-step run uses the same verified recurrence, but the raw-TM cross-check extends only
   to 59 anchors).
4. The growth/density constants inherit O(1%) model error; this moves log10 P by O(1), which
   is immaterial at -65,000 but worth stating.

**Bottom line:** all heuristic evidence, quantified as carefully as I can, says BMO1 never
halts; the residual risk is model risk (deterministic structure invisible to statistics),
not statistical noise.

## 6. Reproducibility

- `attacks-heur/run_orbit.mjs [N] [out.json]` — BigInt orbit with exact bit tracking, ratio
  histogram, delta tail, near-miss/records, mod-q, calibration, log-domain hitting sums.
  10^6 steps in ~7 s (Node v24.16.0).
- `attacks-heur/fp_solve.mjs` — w-space direct FP and r-space Ulam (10^4 bins each, 3 starts).
- `attacks-heur/integrals.mjs` — dilogarithm closed forms, substitution integrals, constants
  (writes `integrals.json`).
- Key constants: C = 2/ln3 = 1.82047845; g = 0.150976944502 nats = 0.2178136891 bits;
  kappa = 3/(16 ln3) = 0.170670; 2 f(1) = 0.455120; E[min delta] = (2 ln3)/n;
  median r = sqrt(3); P(r<1) = ln(3/2)/ln3 = 0.369070.
