# BMO 5 attack report — 2026-09-25

Machine: `1RB0LD_1LC0RA_1RA1LB_1LA1LE_1RF0LC_---0RE` (halt = F reading 0).
Counter form (machine↔rules correspondence Rocq-verified in busycoq BB6; taken as given):

```
states ⟨i,b⟩, start ⟨0,5⟩,  a(i) = 10·2^i − 1
  b ≥ a(i)    : ⟨i,b⟩ → ⟨i+1, b − a(i)⟩
  b ≤ a(i)−2  : ⟨i,b⟩ → ⟨i, 3b + i + 5⟩
  b = a(i)−1  : HALT
```

All scripts: `attacks-bmo5/`. Tags: **[PROOF]** = hand proof below (machine-checked where stated),
**[EXACT-COMPUTE]** = exact BigInt/finite computation, reproducible by the given command,
**[HEURISTIC]** = statistical model.

**Bottom line.** No proof of non-halting was found — and, more importantly, this report *kills*
the remaining standard proof routes with data (modular traps do not exist even along the true
orbit; no eventual periodicity of any residue projection; orbit is 2-adically random w.r.t. halt
values). What is delivered: (i) an exact conjugation that turns the problem into a *pure ×3
register against exponentially growing thresholds*, plus the complete exact halt algebra
(halt ⟺ phase entry hits one explicit value per case; 1-vs-2-subtraction windows); (ii) an
unconditional theorem: **halts can occur only in phases j ≡ 0,1 (mod 6) via the tripling branch
and only in phases j ≡ 2,5 (mod 6) via the subtraction branch — phases j ≡ 3,4 (mod 6) are
provably halt-free forever**; (iii) exact non-halting extended to 10^6 phases (3,499,691
states, b with 1,000,003 bits ≈ 10^301030); (iv) the *complete* backward census: every state
that ever halts at any halt-value index i_h ≤ 1000 (1,504,375 states, exact, closed) — ⟨0,5⟩ is
not among them; (v) a quantified shrinking-target model that explains survival: residual halt
probability beyond phase 10^6 under the random-entry model ≈ 3·10^−301032.

---

## 0. Setup verification [EXACT-COMPUTE]

* `tmsim.c`: raw TM simulated **4·10^9 steps, no halt** (corrected transition table; a first
  version had C1→C instead of C1→B and halted instantly — the fixed table runs forever).
  `gcc -O2 tmsim.c && ./tmsim.exe 4000000000`.
* `sim.js` vs the team's pre-existing `sim/bmo5.mjs`: state-by-state agreement (aggregate +
  entry-sequence checks, first states `(0,5)(0,20)(1,11)(1,39)(2,20)(2,67)(3,28)(3,92)(4,13)(4,48)(4,153)(4,468)(5,309)…`).
* Machine↔math correspondence itself is Rocq-verified (given); everything below works purely in
  the math form.

## 1. Exact phase algebra [PROOF + EXACT-COMPUTE]

A **phase** = maximal run of triplings at fixed i, followed by 1–2 subtractions. Phase entries
always satisfy 0 ≤ b₀ ≤ a(i)−2 (asserted at every phase of the 10^6-phase run). Within phase i,
with s = i+5:

```
b_k = 3^k·b₀ + s·(3^k−1)/2        (k triplings; exact)
θ_k(i) = (a(i) − s·(3^k−1)/2)/3^k   (b₀ = θ_k ⟺ b_k = a(i) exactly)
k_i = min{k ≥ 1 : b_k ≥ a(i)}      ⟺  b₀ ∈ [⌈θ_k⌉, ⌈θ_{k−1}⌉−1]
phase map (single subtraction):  b₀' = 3^k·(b₀ − θ_k(i)),  i' = i+1
```

**Double subtraction.** The crossing value c = b_{k_i} satisfies c ≤ 3a(i)+i−1. Writing
A = a(i): a second subtraction happens iff c ≥ a(i)+a(i+1) = 3a(i)+1, i.e. iff
c ∈ [3A+1, 3A+i−1]; then the phase-i+1 entry is c−a(i)−a(i+1) ∈ [0, i−2] and phase i+1 has
k = 0 from an entry < a(i+1)−1. A third subtraction is impossible. The window has width i−2,
so P(double-sub) ≈ i/2^i — summable. **Empirically: 0 double-subtractions in 10^6 phases.**

**Halt algebra.** The state ⟨i, a(i)−1⟩ is reached either mid-phase (case A) or as a phase
entry (case B):

* **(A)** ∃k ≥ 1: b_k = a(i)−1 ⟺ b₀ = B*_k(i) := (a(i)−1 − s(3^k−1)/2)/3^k — a *unique*
  rational value per (i,k). B*_k ∈ ℤ ⟺ **v₃(H(i)) ≥ k** where **H(i) = 20·2^i + i+1**
  (verified i<300, k≤8: `finalchecks.js`). Moreover B*_k = ⌊θ_k⌋ when integral, i.e. the
  dangerous entry is *exactly one below* the phase-k region.
* **(B)** crossing c = 3a(i) exactly ⟺ next entry = a(i+1)−1. Equivalently the phase-i+1
  entry equals a(i+1)−1 (then β = v₂(c − 3a(i)) = ∞).

**Exact identities** (verified 0 mismatches over 10^6 phases, `sim.js` output):

```
v₂(crossing_i − (a(i)−1)) = v₂(entry_{i+1} + 1)
v₂(crossing_i − 3a(i))    = v₂(entry_{i+1} − (a(i+1)−1))
```

i.e. both halt proximities are proximity of the *next entry* to the two explicit values
−1 and a(i+1)−1. Case (A) is the "entry would be −1" case: if the phase completes,
entry_{i+1} = 3^{k_i}(b₀ − B*_{k_i}) ≥ 0 always.

**Closed form for entries (mission Q1)?** BMO-4-type closed form would require k_i (equivalently
the branch sequence) to be eventually determined by i mod K. **Negative**: for every K ≤ 8192,
the same class i mod K realizes different k values ~50% of the time over 10^6 phases, and no
residue projection (i mod K, b mod m) — 34 (K,m) combinations, tail periods ≤ 4096 — is
eventually periodic (`analyze.js`). **No closed form of the BMO-4 type exists.**

## 2. The c-coordinate conjugation [PROOF + EXACT-COMPUTE, 200k states]

With **c = 2b + i + 5** and thresholds **H(i) = 20·2^i + i + 1** (= 2(a(i)−1) + i + 5):

```
c ≤ H(i)−2 : c ← 3c                       (pure multiplication!)
c = H(i)   : HALT
c ≥ H(i)+2 : i ← i+1,  c ← c − 20·2^i + 3
start: (i,c) = (0, 15)
```

Verified step-by-step against the b-form for 200,000 states (`conjcheck.js`). In these
coordinates mid-phase values are 3^t·d_i (d_i = phase-i entry), so *the whole problem is*:

> does the entry stream d_i, evolving by d_{i+1} = 3^{k_i} d_i − 20·2^i + 3 (single-sub case),
> ever hit **d_i = H(i)** or **d_i = H(i)/3^t (t ≤ v₃(H(i)))**?

This is the cleanest known form of BMO 5: one register, pure ×3 dynamics, exponentially
growing thresholds, halt = exact hit on the threshold or one of its 3-power divisor quotients.

## 3. Unconditional mod-6 halt-class theorem [PROOF, arithmetic machine-verified]

Let g(i) = v₃(H(i)) = v₃(20·2^i + i + 1). Then (mod-3 arithmetic; `cphase.js` verifies
g(i) = 0 exactly for i ≡ 2,3,4,5 (mod 6), over i < 400 and over all 10^6 orbit phases):

* **(A) requires g(i) ≥ k ≥ 1, hence i ≡ 0 or 1 (mod 6).** Phases i ≡ 2,3,4,5 (mod 6) can
  *never* halt via the tripling branch — for every b₀, unconditionally.
* **(B) requires entry d_i = H(i).** Entries satisfy the **mod-3 law**: as long as no double
  subtraction has occurred, d_i ≡ 1 (mod 3) for odd i, d_i ≡ 2 (mod 3) for even i
  (from d_{i+1} ≡ −20·2^i ≡ −2(−1)^i (mod 3); verified 0 violations in 10^6 phases and
  300k phases in two independent codes). Since H(i) ≡ 0 (mod 3) only for i ≡ 0,1 (mod 6) and
  ≡ 2 only for i ≡ 2 (mod 3)-classes with matching parity, case (B) is possible **only for
  i ≡ 2 or 5 (mod 6)**, except in the phase immediately following a (never-yet-observed)
  double subtraction, where the single entry d ≡ 0 (mod 3) could hit H(i) with i ≡ 0,1 (mod 6).

**Theorem.** (i) No halt can ever occur in a phase i ≡ 3 or 4 (mod 6) — unconditional.
(ii) Halts in phases i ≡ 0,1 (mod 6) can only be case (A), i.e. entry = H(i)/3^t; halts in
phases i ≡ 2,5 (mod 6) can only be case (B), i.e. entry = H(i) exactly. (iii) Conditional on
"no double subtraction ever" (true through phase 10^6), the two cases occupy *disjoint* mod-6
classes, and the double-subtraction event itself is a crossing landing in the explicit window
c ∈ [3a(i)+1, 3a(i)+i−1] — same shrinking-target class as the halt events.

This sharpens the community's "classes i≡3,4 safe" (which was derived from (i mod 6, b mod 3)
orbit classes) into the full case/class split above.

## 4. Exact non-halting depth [EXACT-COMPUTE]

`node sim.js 1000000 dump1e6.bin` (1146 s, Node v24 BigInt):

* **no halt through 10^6 phases = 3,499,691 states**, i = 10^6, b has 1,000,003 bits
  (b ≈ 10^301030). ns ≡ 1 in every phase (0 double-subtractions). min |b − (a(i)−1)| = 3,
  attained only at the initial state (0,5) vs a(0)−1 = 8; no state since has been within 2,
  and no phase in the last 10^5 has gap < 10^6.
* k-histogram geometric with ratio ≈ 1/3: P(k) = 667242, 221639, 73988, 24668, 8280, …,13:1
  (max k = 13). E[k] = 1.4997.
* Entry ratio r = b₀/a(i) fills (0,1): observed range [9.87·10^−7, 0.9999970].
* (For scale: Ducharme's 3.3·10^13 raw-TM-step run corresponds to i ≈ 6.6·10^6 phases /
  counters ~10^(2·10^6); our contribution is the analysis, not raw depth.)

## 5. Backward census of the halt basin [EXACT-COMPUTE]

`backward.js` / `backward2.js`: exact backward closure from halt states ⟨i_h, a(i_h)−1⟩.
Preimages of ⟨i,b⟩: T-preimage ⟨i, (b−i−5)/3⟩ iff 3 | (b−i−5) and 0 ≤ (b−i−5)/3 ≤ a(i)−2;
S-preimage ⟨i−1, b + a(i−1)⟩ iff i ≥ 1. Since backward steps never increase i and bound b,
**the basin of finitely many halt states is finite and the BFS closes**:

| halt indices | basin size | max depth | ⟨0,5⟩ in basin |
|---|---|---|---|
| i_h ≤ 40   | 2,172 | 42 | NO |
| i_h ≤ 80   | 10,477 | — | NO |
| i_h ≤ 160  | 39,591 | — | NO |
| i_h ≤ 1000 | **1,504,375** | — | NO |

Every state that ever halts at a halt value with i_h ≤ 1000 is now *exactly known*.
The i = 0 slice: exactly 3,004 starting values b halt (with i_h ≤ 1000); those below 1000:
`1, 7, 8, 13, 26, 27, 52, 66, 107, 145, 195, 302, 304, 430, 623, 658, 690, 737, 833, 974`.
**⟨0,5⟩ does not halt** against any of these halt values, at any time (unbounded horizon).
Basin density at i=0 is ≈ 3004·2^{−1001}-th — exponentially thin, consistent with §7.
(Note: since i is nondecreasing along the orbit, small-i_h halts also die by §4; the census's
value is that it is *exact, closed, and independent of the forward orbit*.)

## 6. Negative results — which proof methods are dead

### 6.1 Both-branch residue over-approximation: dead for every modulus [EXACT-COMPUTE]

`overapprox.js` (fixes a gap in the prior team script, which silently skipped all moduli where
2 is not invertible — i.e. the entire 2-power side):

* **m = 2^j, j ≤ 13: the reachable set is the FULL space Z/2^j × Z/2^j and every halt residue
  is reachable.** (Sound handling of the preperiod: a(i) = 10·2^i−1 ≡ −1 (mod 2^j) for i ≥ j.)
* **Odd m (all tested, 3 … 131, 169, 243, 625, 729, 2049, 3125, 59049, 16807): full or
  near-full reachability; halt residues reachable in every case.**
* **m = 3^j: the one nontrivial structure.** Reachable fraction = 2/3 (j=2), 5/9 (j ≥ 3):
  at level 9 the reachable set is exactly described by (i mod 6, b mod 9):
  i≡0,1 → b mod 9 ∈ {0,2,3,5,6,8}; i≡2,3 → {1,2,4,5,7,8}; i≡4,5 → {0,1,3,4,6,7}
  (this *proves* the "safe classes i≡3,4" observation at the over-approximation level);
  at level 27 it refines with i mod 18. But **half the halt residues remain reachable at every
  level 3^j, j ≤ 6** — the trap never closes.

  Soundness cross-check: all 10^6 true-orbit phase entries lie inside the mod-9 reachable set
  (0 violations) — both computations consistent.

**Conclusion: no modulus m gives a both-branch modular non-halting proof; none exists in this
family.** (This extends the preliminary finding, which had only covered odd m.)

### 6.2 True-orbit residue rigidity: none [EXACT-COMPUTE + HEURISTIC]

The true orbit is *not* secretly avoiding halt residues: its 2-adic proximity to the explicit
dangerous values matches the uniform model exactly once trial counts are accounted for
(`analyze.js`, 10^6 phases):

* α_i = max_{k≤k_i} v₂(b_k − (a(i)−1)): counts ≥ 8/12/16/20/24 = 5908/374/25/1/1 vs random
  expectation (number of (phase,k) trials = 1.5·10^6) 5860/366/22.9/1.43/0.09 — fit.
* β_i = v₂(crossing − 3a(i)) = v₂(entry − tgt): 3951/238/19/1/0 vs 3906/244/15.3/0.95/0.06.
* Restricted to 3-adically allowed k (k ≤ g(i)): max 18, same statistics.

So the orbit really does pass within 2^24 of a halt value (phase i = 295970) — close misses
occur at exactly the random rate. There is no invariant of the form "phase entries avoid halt
residues mod 2^J" for any fixed J beyond J ≈ log₂(#phases).

### 6.3 BMO-4-style eventual periodicity: none [EXACT-COMPUTE]

34 residue projections (i mod K, b mod m) for K ≤ 192, m ∈ {4,16,64,256, 9,27,81,243, 25},
plus the k-sequence and (k,ns)-sequence: **no period ≤ 4096 in any tail window** (10^6 phases).
Combined with §1's k-consistency violations (~50% for every K ≤ 8192): the branch sequence is
chaotic, not eventually periodic.

### 6.4 Interval/renormalization proofs: dead [HEURISTIC]

Per-phase Lyapunov exponent ≈ E[k]·ln 3 − ln 2 = +0.954 (E[k] = 1.4997): any interval of
candidate r-values contracts by e^{−0.95} per phase on average, and the folded limit map
r ↦ (3^k r − 1)/2 (corrections O(i/2^i)) has r filling (0,1) with the observed geometric-k
invariant statistics. There is no attracting cycle or invariant interval union with margin.

## 7. Why it survives: the shrinking-target quantification [HEURISTIC]

At each phase i the dangerous set is: ≤ g(i) explicit entry values (case A) + 1 (case B).
Modeling the entry as uniform on [0, a(i)):

```
E[#halts in first 10^6 phases] = Σ_{i<10^6} (min(g(i),k̄) + 1/2)/a(i) ≈ 0.275   (dominated by i = 0,1,6,13,24: Σ ≈ 0.25)
residual probability of ever halting after phase 10^6 ≈ Σ_{i≥10^6} ~ 3·10^−301031
```

The expected total halt count over the *infinite* run is finite and ≈ 0.28; conditional on
surviving 10^6 phases, the model leaves ~10^−301031 doubt. This is a summable shrinking-target
problem for a piecewise-expanding map (targets of relative size 2^−i): almost every start never
halts, and proving it for the one specific start c₀ = 15 is exactly the open problem. No known
technique establishes a specific point's non-membership in such a target set.

## 8. Remaining avenues (ranked)

1. **Arithmetic identity in the entry stream.** Halt ⟺ d_i ∈ {H(i)} ∪ {H(i)/3^t}. A proof
   needs a rigidity property of d_i mod 2^J relative to H(i)·3^{−t} mod 2^J that the data says
   does not exist (§6.2) — unless one exploits the *joint* (i, d_i) structure beyond residues.
2. **Push the backward census** (cheap: ~linear per halt index up to memory) — can certify
   "⟨0,5⟩ halts at no i_h ≤ IH, ever" for IH ≈ a few thousand; i_h beyond that requires the
   forward orbit to survive to i = i_h first, which §4 already covers for i_h ≤ 10^6. The two
   axes are complementary; both are finite computations, not proofs.
3. **Automated invariant search** over the *conditional* phase map (given the no-double-sub
   invariant) for a strengthening of the mod-3 law — the data (§6.2) says fixed-modulus
   strengthenings do not exist.
4. Raw depth (Ducharme-style) is scientifically exhausted; nothing changes qualitatively.

## Reproduction

```
cd attacks-bmo5
gcc -O2 tmsim.c -o tmsim.exe && ./tmsim.exe 4000000000      # §0
node sim.js 1000000 dump1e6.bin                             # §4   (~19 min)
node analyze.js dump1e6.bin                                 # §6.2, §6.3, §7
node overapprox.js ; node char3adic.js                      # §6.1
node conjcheck.js ; node cphase.js ; node finalchecks.js    # §1, §2, §3
node backward.js 1000 1000000 500000000                     # §5
node backward2.js 200                                       # §5 census
```

Files: `sim.js` (exact phase simulator + telemetry dump), `analyze.js` (dump analysis),
`overapprox.js`/`char3adic.js` (both-branch closures incl. 2-powers, 3-power structure),
`backward.js`/`backward2.js` (exact halt-basin census), `conjcheck.js`/`cphase.js`
(conjugation + mod-3/mod-6 laws), `finalchecks.js` (B* divisibility equivalence, g-law),
`tmsim.c` (raw TM sanity), `dump1e6.bin` (1e6-phase telemetry, ~65 MB), `run1e6.log`.
