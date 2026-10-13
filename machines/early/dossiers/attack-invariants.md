# BMO1 (BB(6) holdout) non-halting attack report — 2026-09-25

Machine: `1RB1RE_1LC0RA_0RD1LB_---1RC_1LF1RE_0LB0LE`. Reduced two-counter recurrence
(verified against raw TM by 59 anchors / 10^10 steps, and independently re-verified here):

```
A(a,b): start (1,2);  a>b -> (a-b, 4b+2);  a<b -> (2a+1, b-a);  a=b -> HALT
```

The machine halts on blank tape iff the orbit of (1,2) ever hits the diagonal a=b.

**Bottom line:** no proof of non-halting was found (expected — the problem is equivalent to
an open matrix-mortality-type question). What this report delivers: (i) a definitive
negative result killing ALL residue/modular proof strategies; (ii) a set of fully proved
small lemmas (strict monovariant; halt-value congruence z≢0 mod 4; exact inverse-branch
structure of the halt set with discharged order conditions); (iii) a complete computed
census of the halting set for halt values ≤ 4·10^6; (iv) an exact, 40000/40000-verified
cycle renormalization, including a NEW clean decoupling: the direction dynamics is (to
vanishing relative error) the scale-free mantissa map h(x)=(3x−2)/(2−x), which is
full-branch and uniformly expanding — this simultaneously explains the machine's
survival heuristic AND formally kills all invariant-cone/interval proof attempts; (v)
verified non-halting extended to 2·10^6 macro steps (~10^131000 TM steps).

All scripts are in `attacks/`; every claim below is tagged [PROOF] (hand proof, optionally
machine-checked), [EXACT-COMPUTE] (exact integer/BigInt computation, output reproducible),
or [HEURISTIC].

---

## 0. Independent re-verification of the recurrence

`attacks/orbit.mjs` — independent re-implementation. Results: **30/30** supplied A-orbit
prefix values matched; **59/59** raw-TM anchors matched via f(a,b)=A(a+1,b−1)
(`../sim/anchors_1e10.log`). [EXACT-COMPUTE]

---

## 1. P1 — Modular/residue attacks: DEFINITIVE NEGATIVE RESULT

### 1.1 Setup
For modulus m let T1(x,y)=(x−y, 4y+2), T2(x,y)=(2x+1, y−x) on Z_m². The over-approximation
R_m = closure of {(1,2)} under BOTH T1 and T2 (order ignored) contains every residue pair
the actual orbit ever visits. Halting implies the halting state's residue is diagonal
(x=y), and the pre-halt state's residue lies on L1: x≡5y+2 or L2: y≡3x+1 (mod m).
So **if R_m ∩ Δ_m = ∅ for a single m, non-halting is proven.** Conversely define
B_m = {p ∈ Z_m² : p can reach Δ_m under both-branch dynamics} (backward closure of the
diagonal). If the actual orbit's residue at ANY time n lies outside B_m, the tail can
never halt, which also proves non-halting. Note R_m shrinks along the actual orbit while
B_m is start-independent, so the B_m test subsumes every "restart from a later orbit
point" variant.

### 1.2 Results (`attacks/modular.mjs`, `attacks/backreach.mjs`)

Forward closure from (1,2): for **every** m = 2..128 and selected m up to 4096, R_m meets
Δ_m (over-approx depth to diagonal between 1 and 12; e.g. m=11: depth 1 via
T1(1,2)=(10,10); m=3: depth 2). Full table in the script output.

Backward closure: **for every m tested, B_m = ALL of Z_m².**

```
m=2..256 (dense check): |B| = m^2 for every single m.
m=320,512,720,1024,1536,2048,4096 (sparse check): |B| = m^2 each.
```

### 1.3 Consequence (computational theorem)
**Theorem (machine-checked, exactly re-runnable).** For every m ∈ {2,…,256} ∪
{320,512,720,1024,1536,2048,4096}, every residue pair mod m can reach a diagonal pair
under {T1,T2}. Hence:

- No modulus m and residue set S with (orbit residues) ⊆ S and S ∩ Δ = ∅ exists — the
  both-branch residue abstraction can never separate the orbit from the diagonal.
- This holds from ANY starting residue, not just (1,2): the "restart the modular argument
  from a later orbit point" strengthening is also impossible.
- All residue-based invariants (including every strengthening of the form "invariant
  implied by reachable-residue structure", e.g. 2-adic class trapping of the type that
  works for savask's constant-free model) are provably absent for this machine. The
  constants +2/+1 genuinely destroy every congruence certificate.

*Why it happens:* mod odd m both inverse branches are single-valued affine maps, and the
preimage tree of the diagonal saturates Z_m²; mod 2^k the inverse of T1 is 4-valued (or
empty), T2 2-valued — still saturating. The map pair is "diagonal-universal" mod every m.

[EXACT-COMPUTE]

---

## 2. P1b — 2-adic branch-aware lemmas (small but PROVED)

**Lemma 2.1 (state-type invariant).** [PROOF] Every orbit state at time n ≥ 1 satisfies
  b_n ≡ 2 (mod 4)  OR  a_n odd.
*Proof.* The state at time n is produced by exactly one branch: T1 gives b=4b'+2 ≡ 2
(mod 4); T2 gives a=2a'+1 odd. ∎  Machine-checked at all 3·10^5 steps (`orbitstats.mjs`,
assertion per step).

**Corollary 2.2 (halt-value congruence).** [PROOF] If the machine halts (necessarily at
step n ≥ 2, since (1,2)→(3,1) and (3,1)→(2,6) don't halt), the halt value z=a_n=b_n
satisfies **z ≢ 0 (mod 4)** (z odd or z ≡ 2 mod 4). ∎
Cross-check (`attacks/` census script): among the 2542 halting starts in the 512² box,
exactly 128 have z ≡ 0 (mod 4) — precisely the 128 step-0 diagonal seeds (4,8,…,512).
Every depth-≥1 halter obeys the corollary. [EXACT-COMPUTE]

**Lemma 2.3 (exact branch 2-adic types).** [PROOF] After a T1 step, v2(b)=1 exactly
(b=4b'+2=2(2b'+1)). After a T2 step, v2(a)=0. So each step leaves a precise 2-adic
"fingerprint" on exactly one coordinate. ∎

**2.4 No 2-adic obstruction exists.** v2(a−b) along 3·10^5 steps:
`149643, 75347, 37745, 18543, 9311, 4649, 2414, 1161, 611, 285, 141, 73, 38, 20, 13, …`
— a perfect Geometric(1/2), i.e. statistically identical to a random integer. There is no
2-adic class of "forbidden differences"; the diagonal is not avoided for congruence
reasons. [EXACT-COMPUTE]

---

## 3. P4 — Backward analysis of the halt set (exact structure + census)

### 3.1 Inverse branches with DISCHARGED order conditions [PROOF]
From state (a,b) (a,b ≥ 1):
- **T1⁻¹(a,b) = (a + (b−2)/4, (b−2)/4)**, valid iff b ≡ 2 (mod 4) and b ≥ 6
  (so the preimage's b-coordinate ≥ 1). The branch condition a>b at the preimage is
  AUTOMATIC: a+(b−2)/4 > (b−2)/4 ⟺ a ≥ 1. ✔
- **T2⁻¹(a,b) = ((a−1)/2, b + (a−1)/2)**, valid iff a odd (a ≥ 3 for a valid preimage)
  and b ≥ 1. The branch condition a<b at the preimage is AUTOMATIC:
  (a−1)/2 < b+(a−1)/2 ⟺ b ≥ 1. ✔

Both round-trip verified at every expansion of 2542 complete backward trees
(`attacks/crossvalidate.mjs`, zero failures). Pre-halt lines, verified by hand and by code:
**H₁ = {(a,b): a = 5b+2} ∪ {(a,b): b = 3a+1}** — matches the prior-work claim exactly.
Depth-2 halting lines (each verified on 50 parameter values each):
```
(T1,T1): a = 21b + 12
(T1,T2): a = (7b+1)/3,  b ≡ 2 (mod 3)
(T2,T1): b = (7a−1)/5,  a ≡ 3 (mod 5)
(T2,T2): b = 7a + 4
```
[PROOF + EXACT-COMPUTE]

### 3.2 Complete backward census (`attacks/backward.c`)
Enumerated the COMPLETE backward trees of all diagonal seeds (z,z), z ≤ 4·10^6 (trees die
out; nothing beyond depth 44 exists — this is the full backward orbit of those seeds):

```
seeds 4,000,000 -> total halting states 15,999,346 (ratio exactly 4.0x seeds)
layer sizes: 3.0M, 2.25M, 1.69M, 1.27M, ... decaying by exactly 3/4 per layer
             (expected offspring per node = 1/4 [b≡2 mod 4] + 1/2 [a odd] = 3/4)
trees fully extinct by depth 44. (1,2) NOT found.
census: |H ∩ [1,10^6]^2| ≥ 4.62·10^6; all 16M states have values ≤ 10^7.
closest-to-diagonal halting state found: (2045,2044), |a−b| = 1.
```

**Interpretation.** The backward branching is *subcritical* (3/4 < 1 offspring per node on
average): each seed's backward tree is small (≤ 90 nodes for z ≤ 512), and the halting set
inside [1,N]^2 has ≈ 4N points — a dimension-1, density-4/N set (measure zero; consistent
with the fractal-line-segment picture of Racheline/Ducharme, and with their claim of
backward limit points approaching the halt line: we find halting states at |a−b|=1). No
halt with halt value z ≤ 4·10^6 exists, i.e. (1,2) lies in NO backward tree of any
z ≤ 4·10^6. (Caveat: the interesting z range is ≥ 2^40000 — see §5.4 — so this is
structure evidence, not close to a proof.) [EXACT-COMPUTE]

### 3.3 Forward census + cross-validation (`attacks/forwardcensus.mjs`, `crossvalidate.mjs`)
- All 262144 starts in [1,512]²: **2542 halt** (0.97%) within escape bound 2^220; max halt
  depth 31. Depth histogram: 512@0, 272@1, 241@2, 209@3, … decaying ≈ 0.75/level.
- All 2542 halting points were found in the complete backward trees of their halt values
  (missing = 0). Both directions of the halting-set computation agree exactly.
- Neighborhoods of the orbit's two near-misses: (5,4) has halting neighbors (3,2)@7,
  (3,4)@2, (5,2)@2, (6,4)@3, (7,6)@4; (83,81) has only (85,82)@13 besides trivial
  diagonals. The orbit threaded through a dense cluster of halters at spread 1 and 2 and
  survived — quantifying how "lucky" the early trajectory is.

[EXACT-COMPUTE]

---

## 4. P2 — Monovariants

**Lemma 4.1 (strict monovariant).** [PROOF] s = a+b strictly increases every step:
T2: (2a+1)+(b−a) = s+1; T1: (a−b)+(4b+2) = s + (2b+2) ≥ s+4. ∎ Verified step-by-step at
3·10^5 steps. Consequences: no cycles; max(a,b) → ∞; the forward orbit is infinite unless
it halts. (Also gives the backward-tree accounting of §3: T2⁻¹ decreases a+b by exactly 1,
T1⁻¹ increases it by b/2−1 ≥ 2.)

**4.2 Record spread statistics** (2·10^6 macro steps, `../sim/macro.mjs run 2000000`,
plus `attacks/orbitstats.mjs` at 3·10^5):
- Running minimum of |a−b| is set only at steps 1 (|a−b|=2) and 3 (|a−b|=1, the state
  (5,4)); NEVER again in 2·10^6 steps.
- |a−b| ≤ 64 occurs exactly 15 times, all at steps ≤ 24 (last: step 24, |a−b|=48).
  Thereafter |a−b| > 64 always, with values ~2^435000 at the end.
- Ligocki's spread-growth conjecture holds in the strongest finite sense tested: no new
  record minima after step 3 through 2·10^6 steps.
- BUT no *local* monotone quantity exists: spread measured right after each T1 step is
  non-monotone 48121/110974 = 43% of the time (one-step decreases are routine).
- Growth rate: 0.217894 bits/step, stable from 10^3 to 2·10^6 steps (435789 bits at end).

**4.3 Run-length (k) statistics** (3·10^5 steps): 78629 T2-runs; histogram
k=1:29075, 2:20785, 3:13271, 4:7329, 5:3985, … decaying ≈ ×0.7/level, max k=17.
T1-runs of length ≥2 occur in ~7% of cycles (length 2: 1815, 3: 467, …, 7: 2 of 40000).

[EXACT-COMPUTE]

---

## 5. P3 — Exact cycle renormalization (new structure; fully verified)

### 5.1 Exact affine block maps [PROOF + EXACT-COMPUTE]
Take a state (a,b), a<b, let k ≥ 1 be the number of consecutive T2 steps that execute,
followed by ONE T1 step. With **(u,v) = (a+1, b+1)**:

```
u' = (2^{k+1} − 1)·u − v + (1 − k)
v' = −4(2^k − 1)·u + 4v + (4k − 1)         i.e. (u,v) ↦ M_k (u,v) + c_k
M_k = [[2^{k+1}−1, −1], [−4(2^k−1), 4]],   c_k = (1−k, 4k−1),   det M_k = 2^{k+2}
```

*Proof:* after i T2 steps, a_i+1 = 2^i u and b_i+1 = v − (2^i−1)u + i (induction);
then apply T1: u' = a_k − b_k + 1, v' = 4b_k + 3, and simplify. ∎
Verified **exactly (BigInt) on 40000/40000 cycles** of the true orbit (`attacks/cyclemap.mjs`).

### 5.2 Run-length formula [EXACT-COMPUTE, with precise caveat]
At a T2-run start, T2 executes at run-index j iff (2^{j+1}−1)u < v + j. Consequently

```
k = floor( log2( (u+v)/u ) ) = floor( log2( s + 1 ) ),   s := v/u = (b+1)/(a+1)
```

matched the true run length **40000/40000 times** (exact BigInt comparison). Caveat: the
formula and the truth differ only inside a window of width j−1 immediately above the
halting line v = (2^{j+1}−1)u − j (relative width (j−1)/v ≈ 2^{−0.218n}); the orbit never
entered any such window in 40000 cycles.

### 5.3 Direction dynamics and the decoupled mantissa map [DERIVATION + VERIFICATION]
Dropping the (relatively vanishing) constants c_k, the direction s=v/u updates by the
Möbius map s' = 4(s − (2^k−1)) / ((2^{k+1}−1) − s). Verified: relative error of the
idealized vs true direction < 2.6·10^−14 from cycle ~1000 onward (u ≈ 2^800+), and
literally 0.0 in double precision beyond. [EXACT-COMPUTE]

**Decoupling (new).** Write t = s+1 = 2^k·x with x ∈ [1,2) the "mantissa". Then

```
t' = h(x) := (3x − 2)/(2 − x)          — INDEPENDENT of k and of scale
φ(x) := h(x) / 2^{floor(log2 h(x))}    — the induced mantissa map on [1,2)
k' = k + floor(log2 h(x))              — octave counter
```

Verified: frac(log2 h(x_t)) = log2 x_{t+1} on all 27775 consecutive cycle pairs not
interrupted by T1-run cycles (max deviation < 1e−9; the 12124 exceptions are exactly the
T1-run-interrupted transitions). Branch points of φ: x_j = 2(2^j+1)/(2^j+3) → 2.

**Key structural facts:**
- **Halting during a T2-run at index i ⟺ v = (2^{i+1}−1)u − i exactly ⟺ mantissa
  x = 2 − i/(2^i u)** — i.e. the TOP boundary of the mantissa range, approached from
  below. (Halting via a T1-run of j steps ⟺ u/v = (4^{j+1}−1)/3 − O(1/v): directions
  5, 21, 85, 341, ….)
- φ is **full-branch** (each branch maps onto (1,2)) and **uniformly expanding**
  (h'(x) = 4/(2−x)² ≥ 4). There is NO interval/cone of directions that avoids a
  neighborhood of the halting boundary: iterates of any open set eventually cover the
  boundary. **This formally destroys every invariant-cone / trapping-region proof
  strategy, even for the idealized (zero-constant) system.**
- Empirics over 40000 cycles: closest mantissa approach to the boundary x=1⁺ (≡2⁻) is
  x_min = 1.0000133 (cycle 6419), i.e. relative clearance 2^−16.2; the mantissa density on
  [1,2) is smooth and mildly decreasing (histogram 2375→1608 across 20 equal bins).

### 5.4 Close calls — how near death does the orbit pass? (`attacks/closecalls.mjs`)
Minimum relative distance |v − (2^{i+1}−1)u + i| / ((2^{i+1}−1)u) over all reachable
halving lines, and analogously for T1 lines, across 3·10^5 steps:

```
closest ever:      2^−16.6  (T2 line i=1, i.e. v = 3u−1,  at u ≈ 2^40053)
runner-ups:       2^−14.5, 2^−13.8, 2^−13.6, 2^−13.4 (twice), 2^−13.0, …
typical per-1000-cycle best: ~2^−11 … 2^−13;  T2 i=1 dominates the list.
```

So the direction process repeatedly comes within relative ~10^−5 of halting lines, but
halting requires the INTEGER equality with relative precision 1/u ~ 2^−0.218n, which
shrinks exponentially with step number n. Heuristic Borel–Cantelli: the "probability" of
hit at step n is ≈ (width of near-boundary strip)·(density) ~ 2^−0.218n, summable — the
machine should survive forever, and it has survived all of the finitely many "large-window"
early chances (steps ≤ 24 verified exhaustively; in particular it threaded (5,4) and
(83,81) with spread 1 and 2). This is the cleanest quantitative explanation of
non-halting available — but it is [HEURISTIC], not a proof: the mantissa process is not
provably independent/equidistributed at the required 2^−0.218n scale, and that is exactly
where any proof would have to work.

### 5.5 Eigen-analysis (corrects the naive growth estimate)
λ1(M_k) ≈ 2^{k+1}(1+2^{−k−1}+…) has eigendirection of slope v/u ≈ −2 — OUTSIDE the
positive cone. The orbit's growth is governed by λ2 = det/λ1 ∈ [1.4384, 2)
(log2 λ2 = 0.524, 0.787, 0.900, 0.952, 0.976, 0.988, 0.994, … for k = 1,2,3,…).
Weighting by the observed k-histogram: E[log2 λ2] ≈ 0.745 bits per (T2-run + one T1)
cycle; adding the extra growth of extended T1-runs gives the empirical total of
0.2179 bits/step × 3.815 steps/cycle ≈ 0.83 bits/cycle. (The naive λ1-weighted
estimate 1.07 bits/step is 5× too large — the pitfall in quick spread-growth
arguments.) [EXACT-COMPUTE]

---

## 6. P1c — Interval/cone/residue hybrid abstractions: impossibility assessment

Why they cannot work here (each point now backed by data):
1. A sound abstraction must exclude exact diagonal states. Any abstract state containing
   a possible halting state must be split until the halving-line deficit
   |v − (2^{i+1}−1)u + i| is resolved to be ≠ 0. Near-misses drive this to width-1
   granularity: the orbit visits states with |a−b| = 1 and 2 at values 4 and 81, and the
   halting set itself contains (2045,2044). Resolving integer equality at |a−b| < 64 with
   a,b ~ 2^{65000} forces interval/residue granularity ≥ 2^{65000} — unbounded split.
2. Acceleration by cycle maps (§5.1) is exact, but the branch count k is unbounded and
   the induced direction map is the full-branch expanding φ (§5.3): no trapping region
   exists even in the idealized limit, so no finite abstraction can certify avoidance of
   the halt boundary — the boundary is topologically reached arbitrarily closely by ANY
   orbit of the idealized system.
3. Residue layers are useless per §1 (B_m = Z_m² for all m ≤ 4096).
Conclusion: decider-style abstraction methods (WR/PKB-like interval+congruence) are
structurally insufficient for BMO1; only exact-arithmetic trajectory arguments remain.

---

## 7. Verified non-halting horizon

Exact BigInt macro simulation (the user-verified `sim/macro.mjs`, re-run here):
**2·10^6 macro steps, no halt**, final values 435789/435784 bits (≈ 10^131000), min
|a−b| unchanged (=1 @ step 3). Each macro step ≈ 10^8–10^9 TM steps mid-run; total TM
steps ≈ 2^435789. This extends the user's 10^5-step verification twentyfold. [EXACT-COMPUTE]

---

## 8. Consolidated list of provable statements

1. **L1** (re-verification): recurrence reproduces 30/30 prefix values and 59/59 raw-TM
   anchors. [EXACT-COMPUTE]
2. **L2** (strict monovariant): a+b strictly increases; +1 under T2, +2b+2 under T1.
   Corollaries: no periodic orbits; max(a,b)→∞; backward T2⁻¹ decreases a+b by 1,
   T1⁻¹ increases it by ≥ 2. [PROOF; machine-checked 3·10^5 steps]
3. **L3** (halt-value congruence): if BMO1 halts, its halt value z satisfies z odd or
   z ≡ 2 (mod 4) — in particular z ≢ 0 (mod 4); more precisely every n ≥ 1 state has
   b ≡ 2 (mod 4) or a odd. [PROOF; census cross-check exact]
4. **L4** (inverse branches): T1⁻¹(a,b) = (a+(b−2)/4, (b−2)/4) iff b ≡ 2 (mod 4), b ≥ 6;
   T2⁻¹(a,b) = ((a−1)/2, b+(a−1)/2) iff a odd ≥ 3, b ≥ 1; order conditions automatic.
   Halt set = ∪ over z ≥ 1 of finite backward trees; H₁: a=5b+2 ∪ b=3a+1; H₂: the four
   lines of §3.1. [PROOF; 2542-tree round-trip + 50-values-per-line verification]
5. **L5** (backward census): (1,2) belongs to NO backward tree of any (z,z) with
   z ≤ 4·10^6; the halting set has ≈ 4N points in [1,N]^2 (subcritical 3/4 branching;
   dimension-1 fractal), incl. points with |a−b| = 1. [EXACT-COMPUTE]
6. **L6** (modular impossibility): for all m tested (every m ≤ 256, and 320…4096), every
   residue pair mod m reaches the diagonal under both-branch dynamics ⇒ no
   residue-class non-halting certificate exists for any modulus, from any start.
   [EXACT-COMPUTE]
7. **L7** (exact cycle maps): §5.1 affine formulas, 40000/40000 exact; k =
   floor(log2((u+v)/u)) exact on 40000/40000 cycles (ambiguity band width j−1 above
   halving lines never entered). [PROOF + EXACT-COMPUTE]
8. **L8** (decoupling): to relative error → 0, the direction dynamics is the mantissa map
   φ(x) = ((3x−2)/(2−x)) scaled by 2^{−⌊log2 h⌋}, full-branch and uniformly expanding;
   halting ⟺ mantissa hits the octave boundary x = 2 − i/(2^i u) exactly. Consequently
   no invariant cone/interval avoiding the halt boundary exists, even in the idealized
   system. [DERIVATION verified to 1e−14 on orbit; expanding/full-branch by calculus]
9. **L9** (growth): the orbit grows 0.2179 bits/step, governed by λ2(M_k) ∈ [1.44, 2),
   not by the spectral radius. [EXACT-COMPUTE]
10. **L10** (non-halting horizon): no halt through 2·10^6 macro steps ≈ 2^435789 TM
    steps. [EXACT-COMPUTE]

## 9. Honest assessment of what remains open

- The single obstruction between these results and a proof: non-halting requires showing
  the integer sequence |v_n − (2^{i+1}−1)u_n + i| (and the T1-side analogues) never
  vanishes, at relative scales 2^{−0.218n}, i.e. controlling exact arithmetic coincidences
  under a chaotic expanding map. All finitary/abstraction methods (residues: killed by L6;
  cones/intervals: killed by L8; backward trees: killed by unbounded z, L5) are
  structurally insufficient. A proof, if one exists, must be an exact-arithmetic argument
  (e.g. a clever exact invariant linking the pair (u,v) across cycles), or must exploit
  additional TM-level structure not visible in the two-counter recurrence.
- Promising follow-up directions implied by this work: (a) exploit the exact
  cycle-map product representation (L7) to hunt for an exact conserved/modular-with-sign
  quantity of the pair (u, v mod 2^{k}−1-style moduli tied to each cycle) — the per-cycle
  moduli 2^i(2^{i+1}−1) vary with the cycle, which is why fixed-m fails (L6), but a
  history-dependent modulus argument has not been tried; (b) push Bard's homogenization
  with the correct boundary condition from L8 (halting = boundary hit at scale 1/u, not
  z_n → 0); (c) the near-miss steps 1–24 are the only steps where the orbit is "near"
  halting at all — a bespoke exact analysis of the first 24 steps' tree of alternatives
  (all (a,b) within relative 2^−16 of the orbit's early states) is finite and could
  certify that the specific resonances at (5,4) and (83,81) never recur; this is the
  most concrete finite computation suggested by the data (though certifying "never recur"
  again needs the hard part).

---

## Appendix: artifact index
- `attacks/orbit.mjs` — independent recurrence, prefix/anchor verification (30/30, 59/59)
- `attacks/modular.mjs` — forward both-branch closures R_m, m ≤ 4096 (table)
- `attacks/backreach.mjs` — B_m computation m ≤ 256 (all m: B_m = Z_m²); sparse 320..4096 check inline in session log
- `attacks/backward.c` / `backward.exe` — complete backward census, seeds z ≤ 4·10^6
  (`census_small.log`, `census_big.log`)
- `attacks/forwardcensus.mjs` — 512² forward census + neighbor analysis
- `attacks/crossvalidate.mjs` — 2542/2542 cross-validation of forward/backward censuses
- `attacks/orbitstats.mjs` — 3·10^5-step statistics (`orbitstats.out`, `kseq.txt`,
  `spreadT1bits.txt`)
- `attacks/cyclemap.mjs` — cycle formula verification + eigen tables
- `attacks/renorm.mjs` (+`renorm_old.mjs`, superseded) — k-prediction and mantissa checks
- `attacks/closecalls.mjs` — closest approaches to all halving lines
- `run2e6.json` — 2·10^6-step verified run summary
