# BMO 1 — adversarial cross-validation report

**Machine:** `1RB1RE_1LC0RA_0RD1LB_---1RC1LF1RE_0LB0LE` (BMO 1, BB(6) holdout).
**Date:** 2026-09-25. **Verifier:** independent cross-validation agent.
**Method:** every claim below was re-implemented from scratch (fresh C TM simulator `crossval/sim.c`, fresh BigInt recurrence in `crossval/orbitgen.mjs` + per-group scripts, fresh backward BFS `crossval/backward.c`). Team scripts were consulted only to clarify definitions/notation (anchor convention, D1 summation window, the "wrong-order" α variant), never as evidence. Raw outputs: `crossval/my_anchors_2e9.log` and the console logs quoted below.
**Environment:** Node v24.16.0 (BigInt), gcc 15.2.0 (MinGW-W64), Win32.

## Verdict summary

| Claim | Verdict | Key evidence (fresh) |
|---|---|---|
| A1 no halt ≤ 2×10⁹ TM steps | **CONFIRMED** | own simulator: `DONE 2000000000 steps, no halt` (7 s) |
| A2 anchor chain + f-recurrence | **CONFIRMED** | 1st anchor f(0,3)@5; 52 anchors in 2×10⁹ steps; 51/51 consecutive transitions exact; my 47 anchors ≤ 5×10⁸ identical (step,a,b) to `sim/anchors_5e8.log` |
| A3 grid check (30 random + 3 halt) | **CONFIRMED** | 99/99 cases over 3 seeds (incl. extra seeds); all b=a+2 starts halt, all others hit predicted next anchor, 0 exceptions |
| A4 b=1 boundary | **CONFIRMED** (convention note) | f(0,1), f(7,1), f(5,1): halt read after **2 completed transitions** (the undefined transition would be #3) — matches the report's convention |
| B1 z-identity / monovariant | **CONFIRMED** | 500 BigInt steps: sum strictly increases; increments exactly +1 (T2, 321×) and +2b+2 (T1, 179×); z₅₀₀ = 6.7954×10⁻³⁶ ≈ reported 6.8×10⁻³⁶ |
| B2 α = 0.3621250257705563 | **CONFIRMED** | exact rational nested intervals (newest branch applied **innermost**): α = 0.36212502577055629092; \|I₆₃\| = 3.18×10⁻¹⁷ (reported 3.2×10⁻¹⁷); \|I₂₀₀\| = 3.05×10⁻⁵⁴ (reported 3×10⁻⁵⁴); log₁₀\|Iₙ\|/n ∈ [−0.273, −0.262] ≈ −0.27 |
| B3 density normalization + FP identity | **CONFIRMED** | ∫₀^∞ f = 1 with error 1.6×10⁻¹⁴ (target 10⁻⁸); FP residual ≤ 1.11×10⁻¹⁶ over 20 random y (target 10⁻¹²; report had 5.6×10⁻¹⁷); identity also re-proved algebraically |
| B4 drift 0.1509769445 | **CONFIRMED** | singularity-free quadrature: 0.150976944502 (+2.4×10⁻¹²); closed form (−π²/12+(3/2)ln²2+Li₂(¼))/ln3 = 0.1509769445 with Li₂(¼)=0.267652639083 |
| B5 modular occurrences | **CONFIRMED** | first a≡b (mod M), 0-based steps (reports' convention): M=8→7, M=24→24, M=64→340, M=128→340; T₈ prefix {7,11,24,44,55} matches literature-analysis §3.4 exactly |
| C1 L2 strict monovariant | **CONFIRMED** | 100 000 BigInt transitions, 0 failures; algebra re-derived (T2: (2a+1)+(b−a)=s+1; T1: (a−b)+(4b+2)=s+2b+2) |
| C2 L3 invariant, z ≢ 0 (mod 4) | **CONFIRMED** | 0 failures over states 1..10⁵; census cross-check: 2542 halters in [1,512]², exactly 128 with z≡0 mod 4, **all** step-0 diagonal seeds (nontrivial 0) — matches attack-invariants Cor. 2.2 exactly |
| C3 backward tree, (1,2) absent, ≈4N | **CONFIRMED** (phrasing note) | complete BFS, seeds z≤10⁴, exact bound B=2×10⁴: 40 142 nodes = 4.011× seeds, layers decay ×0.75, max depth 31, **(1,2) not present**; box [1,500]²: 2 459 (z≤10⁴) / 2 477 (z≤4×10⁶ forward census); [1,512]²: **2542 = report's exact number**; non-diagonal count 1 977 ≈ 3.95N |
| C4 L7 cycle maps | **CONFIRMED** | 2000/2000 cycles: (u′,v′)=M_k(u,v)+c exact with M_k=[[2^{k+1}−1,−1],[−4(2^k−1),4]], c=(1−k,4k−1); k=⌊log₂((a+b+2)/(a+1))⌋ exact 2000/2000 (BigInt) |
| D1 hitting sum 0.3947263753 | **CONFIRMED** (report formula) | S(10⁵) = **0.3947263753** (all 10 quoted decimals); partials match table exactly at the report's window (states 0..N−1): S₂₉=0.3925723713, S₅₈=0.3947045287, S₉₉=0.3947263494; S₃₀/S∞ = 0.99455 ("99.4%") |
| D2 \|a−b\| ≤ 64 only early | **CONFIRMED** | 16 events in 10⁵ states, all at 0-based states ≤ 24 (15 if the initial state (1,2), d=1, is excluded — the reports exclude it); event list matches attack-heuristics §4.1 digit-for-digit |
| D3 P(r<1) vs empirical | **CONFIRMED** | empirical a>b fraction = 0.37013 vs ln(3/2)/ln3 = 0.369070 (Δ=0.0011 < 0.005) |
| E1 evidence-table vs artifacts | **CONFIRMED with 1 off-by-one** | macro_1e7.json matches every E7 number; anchors_1e11.log has **65** anchor records (66 lines incl. DONE) vs "66 anchors" claimed; 65/65 anchors match my fresh macro orbit; f-recurrence 64/64 within their log |
| E2 §4 orbit prefix | **CONFIRMED** | 30/30 pairs match my fresh iteration |

**Totals: 19/19 claims substantively CONFIRMED. No claim failed. Four documentation-level defects found (all minor, none load-bearing): one off-by-one in formal-reduction.md (E2 row), two label/wording errors in literature-analysis.md erratum 6, and an ambiguity in attack-invariants L5's "≈4N".** (Three further errors were in the *task briefing's restatement* of the claims, not in the reports — see §Discrepancies.)

---

## A. Reduction machinery (own simulator `crossval/sim.c`)

Fresh transition-table parse (A: 1RB/1RE, B: 1LC/0RA, C: 0RD/1LB, D: ---/1RC, E: 1LF/1RE, F: 0LB/0LE), byte-array tape, step = one executed transition; anchor = state D, global tape exactly `(10)^a 1^b`, head on the first 1 of the `1^b` block (formal-reduction §1.1 definition). Anchor detection uses an O(1) precheck (D ∧ tape[h]=1 ∧ tape[h+1]=1 ∧ (h at left visited edge ∨ tape[h−1]=0)) followed by a full-tape pattern verification; over 2×10⁹ steps the precheck fired 52 times, all 52 genuine anchors (zero false positives, zero missed anchors possible for b≥2 by construction).

- **A1.** `run 2000000000` → `DONE 2000000000 steps, no halt`. CONFIRMED.
- **A2.** First anchor `ANCHOR 5 0 3` (= f(0,3) at TM step 5) ✓. Anchor list begins (5,0,3),(23,2,2),(45,1,7),(113,4,5),(249,0,19),(331,2,18),(569,6,15),(1091,14,8),… **52 anchors** in 2×10⁹ steps, **51/51** consecutive transitions satisfy: b<a+2 → f(a−b+1, 4b−1); b>a+2 → f(2a+2, b−a−1); (no b=a+2 case arose). Independent cross-check: my 47 anchors with step ≤ 5×10⁸ are **identical** (step, a, b) to the team's `sim/anchors_5e8.log`. (52 vs the briefing's "~45–50": consistent with the team's own logs — 47 @ 5×10⁸, 59 @ 10¹⁰, 65 @ 10¹¹.) CONFIRMED.
- **A3.** `grid` × 3 seeds (12345, 777, 20260925): 99 cases total (90 random a∈[0,60], b∈[2,100] + 9 explicit/random b=a+2). Every b=a+2 start halted (e.g. f(0,2) after 16, f(29,31) after 5526, f(58,60) after 21128 completed transitions); every other start reached exactly the predicted next anchor (e.g. f(49,85)→f(100,35)@22004, f(57,47)→f(11,187)@13072, f(13,14)→f(0,55)@1126). **0 mismatches, 0 timeouts.** CONFIRMED.
- **A4.** `b1`: f(0,1), f(7,1), f(5,1) all halt on the read of D0 after **2 completed transitions** (D1→1RC, C0→0RD, then D reads 0). formal-reduction §1.4 counts exactly these two executed steps ("2 步内停机"), consistent with the standard convention that the undefined transition is not executed. Under a convention that counts the halting read as a step it would be 3 — documented, no substance. CONFIRMED.

## B. literature-analysis.md (fresh computation, `crossval/b.mjs`, `b34.mjs`, `b2wrong.mjs`)

- **B1.** 500 exact BigInt steps: a+b strictly increases every step; increment = 1 on all 321 a<b steps and = 2b+2 on all 179 a>b steps (the homogenization recursion 1/z_{n+1} − 1/z_n = 1 resp. 2b_n+2). z₅₀₀ = 1/(a₅₀₀+b₅₀₀+1) = 6.7954×10⁻³⁶ (report appendix: "z_500 = 6.8×10⁻³⁶"). CONFIRMED.
- **B2.** Exact BigInt rationals; g₁(y)=(3y+1)/(2y+2), g₂(y)=y/2; itinerary sₖ = branch of the k-th state, **s₁ = branch of (1,2) = 2**. Evaluating I_n = g_{s₁}(g_{s₂}(⋯g_{s_n}((0,1))⋯)) literally (g_{s_n} applied first/innermost, g_{s₁} outermost) for n = 60…200:

  | n | interval midpoint | width | log₁₀(w)/n |
  |---|---|---|---|
  | 63 | 0.3621250257705563 | 3.179×10⁻¹⁷ | −0.262 |
  | 100 | 0.36212502577055629 | 1.50×10⁻²⁷ | −0.268 |
  | 200 | 0.36212502577055629092 | 3.05×10⁻⁵⁴ | −0.268 |

  α = 0.36212502577055629092 matches the claimed 0.3621250257705563 to 16 significant digits; \|I₆₃\| and \|I₂₀₀\| match the report's 3.2×10⁻¹⁷ and 3×10⁻⁵⁴; shrink rate ≈ 10^{−0.27n} ✓. **Wrong-order probe:** the running-interval update (newest g applied outside, the team's original `temp/verify.py`) reads 0.3136877116290085 at its depth N=130 — the reported 0.3136… value; however that sequence does **not** converge (e.g. 0.0916@125, 0.5839@126, 0.3137@130, 0.1568@131), so erratum 6's phrase "the opposite order converges to a wrong number" is loose, and its label "the newest branch is applied *outermost*" describes the **wrong** variant — in the correct formula the newest branch is applied **innermost** (the formula as printed is right; the prose label is backwards). CONFIRMED (formula, α, rates); wording defect logged.
- **B3.** In the u = (r+1)/(r+3) coordinate (f dr = du/(u ln3)): ∫₀^∞ f = 1 with numerical error 1.6×10⁻¹⁴ (target 10⁻⁸). Frobenius–Perron residual \|f(y) − [4/(y+4)² f(y/(y+4)) + 2 f(2y+1)]\| ≤ 1.11×10⁻¹⁶ over 20 seeded random y ∈ (0.01,100) (target 10⁻¹²). The identity was also re-derived by hand: 4/(y+4)²·f(y/(y+4)) = 1/(ln3(y+2)(y+3)) and 2f(2y+1) = 1/(ln3(y+1)(y+2)), summing to 2/(ln3(y+1)(y+3)). CONFIRMED.
- **B4.** E[Δ ln a] = ∫₀¹ f(r) ln(1−r) dr + ln2·P(r>1), computed with the s=t² substitution that removes the ln singularity: **0.150976944502** (claim 0.1509769445, diff 2.4×10⁻¹² ≪ 10⁻⁶). Independent closed form (−π²/12 + (3/2)ln²2 + Li₂(¼))/ln3 with Li₂(¼) = Σ¼ᵏ/k² = 0.267652639083 gives the same 0.1509769445 (literature quotes 0.2676526391 ✓). CONFIRMED.
- **B5.** Exact orbit, 10⁵ steps. First state with a≡b (mod M), in the reports' 0-based step numbering: **M=8 → step 7** (state (15,7)); **M=24 → step 24** ((191,143)); **M=64 → step 340**; **M=128 → step 340** (both at (1640732024450153893324667, 242464353640544262439291)). All occur within 10⁵ steps ✓. T₈ sequence starts {7, 11, 24, 44, 55, 60, 78, 83} — the first five match literature-analysis §3.4's "T₈ = {7, 11, 24, 44, 55, …}" exactly. CONFIRMED.

## C. attack-invariants.md (`crossval/c.mjs`, `crossval/backward.c`, `crossval/zmod.c`)

- **C1 (L2).** 100 000 BigInt transitions: 37 013 T1 steps (sum increment exactly 2b+2), 62 987 T2 steps (increment exactly 1), zero exceptions; sums strictly increase throughout. Algebra independently re-derived. CONFIRMED.
- **C2 (L3).** Every state n ≥ 1 (10⁵ states): b ≡ 2 (mod 4) or a odd — zero violations ((1,2) itself: b=2 ✓). Halt-value consequence (z,z) ⟹ z odd or z≡2 (mod 4) ⟹ z ≢ 0 (mod 4) is a valid one-line implication. Extra census cross-check of their Corollary 2.2: among the 2542 halting starts in [1,512]², exactly **128** have z ≡ 0 (mod 4) and **all 128 are step-0 diagonal seeds** (nontrivial: 0) — matches their claim exactly. CONFIRMED.
- **C3 (L5, fresh smaller version).** Complete backward BFS from all seeds (z,z), z ≤ 10⁴, with inverse branches T1⁻¹(a,b) = (a+(b−2)/4, (b−2)/4) (b≡2 mod 4, b≥6) and T2⁻¹(a,b) = ((a−1)/2, b+(a−1)/2) (a odd, a≥3); bound B = 2×10⁴ is *exact* (not a truncation) because every coordinate on a backward path is smaller than its state's sum and sums strictly decrease backward, so all nodes have coordinates < 2·z_max. Results: **40 142 halting states** (ratio 4.011× seeds, matching their "ratio exactly 4.0x seeds" from the 4×10⁶-seed census), layer sizes 10000, 7498, 5623, 4215, 3159, … (decay ≈ ×3/4 per layer, their subcritical-branching observation), max depth 31, and **(1,2) is absent** ✓. Box counts: BFS(z≤10⁴) ∩ [1,500]² = 2459; exact forward census of [1,500]² (halt values z ≤ 4×10⁶; exact because sums strictly increase, so exceeding sum 8×10⁶ forecloses any smaller z) = **2477** (500 diagonal seeds + 1977 nontrivial); the same forward census at N=512 gives **2542 — exactly the report's number**. So "≈4N halting states in [1,N]²" is accurate for the *non-diagonal* halters (1977 ≈ 3.95N at N=500, 2030 ≈ 3.96N at N=512) and for the tree-nodes-per-seed ratio (4.01), while the *total* including seeds is 4.95N at N=512 (their own data: 4.62N at N=10⁶, drifting down toward 4). Absence of (1,2) additionally confirmed much more strongly by the forward argument: 10⁵ BigInt steps with no diagonal ⇒ (1,2) lies in no backward tree of any z ≤ ~2^21000. CONFIRMED (phrasing note logged).
- **C4 (L7).** Parsed 2000 cycles (k consecutive a<b steps + one a>b step) from the 10⁵-step orbit. Affine identity (u′,v′) = M_k (u,v) + c on (u,v) = (a+1,b+1) with M_k = [[2^{k+1}−1, −1], [−4(2^k−1), 4]], c = (1−k, 4k−1): **2000/2000 exact** (BigInt). Run-length formula 2ᵏ(a+1) ≤ a+b+2 < 2ᵏ⁺¹(a+1): **2000/2000 exact**. (Also re-derived by hand: after i T2 steps a_i+1 = 2ⁱu, b_i+1 = v−(2ⁱ−1)u+i; then T1.) CONFIRMED.

## D. attack-heuristics.md (`crossval/d.mjs`)

- **D1.** The report's actual formula (§3.2–3.3): p_n = [f(1/5)/5]/a_n on branch a>b and f(3)/a_n on branch a<b, f(r) = 2/(ln3(r+1)(r+3)). Coefficients reproduce: c₁ = 0.094816586 (claim 0.09481659), c₂ = 0.075853269 (claim 0.07585327), c₁+c₂ = 3/(16 ln3) = 0.1706698550 ✓. Realized sums on my own 10⁵-state orbit: S(∞) = **0.3947263753** — matches the claimed value to all 10 quoted decimals. The table's "through step N" corresponds to summing states 0..N−1 (N terms); direct recomputation at those windows: S(0..29) = 0.3925723713, S(0..58) = 0.3947045287, S(0..99) = 0.3947263494, S(0..199) = 0.3947263753 — all four match the table to ≤ 5×10⁻¹¹ (float rounding). S(30 terms)/S(∞) = 0.99455 ✓ "99.4% from the first 30 steps". (Pedantic note: the report's formula line "S(N) = Σ_{n=0}^{N} p_n" is off by one relative to its own table, which sums N terms.) **Note:** the *briefing's* restatement "S = Σ κ/a_n with κ = 3/(16 ln3)" is wrong — κ is the sum of the two branch coefficients, not the common one; that restated sum evaluates to 0.858296 on my orbit. The report itself is correct and unambiguous. CONFIRMED (report), restatement error documented.
- **D2.** Over 100 001 states: |a−b| ≤ 64 occurs **16 times**, at 0-based states {0,1,2,3,4,5,6,7,8,9,10,11,14,15,17,24} with d = {1,2,4,1,17,14,7,8,22,5,30,8,30,41,2,48} — nothing after 0-based state 24 in 10⁵ states. attack-heuristics §4.1's table (15 events at steps 1–24, excluding the initial state) matches my list digit-for-digit once the initial state is excluded; formal-reduction E7's "最小 |a−b|=1@第3步、=2@第17步" ✓ (0-based (5,4), (83,81)). CONFIRMED.
- **D3.** Empirical fraction of a>b steps = 37013/100001 = **0.37013** vs P(r<1) = ln(3/2)/ln3 = 0.369070246: difference 0.0011, within the expected 0.369 ± 0.005. (attack-heuristics' own 10⁶-step value: 0.36971 — consistent.) CONFIRMED.

## E. Consistency (`crossval/e.mjs` + direct file inspection)

- **E1.** formal-reduction.md evidence table vs artifacts:
  - *E7 row vs `macro_1e7.json`:* N = 10⁷ ✓; aBits = **2178111** ✓; bBits = 2178113 (so "a,b > 2^2,178,000 bit" ✓); driftBitsPerStep = "0.217811" ✓ (= 0.150977 ln/step ✓); nearDiagCount = 15 with all events at steps 1–24 (0-based, initial state excluded) ✓; topClose min-d entries step 3 (d=1) and step 17 (d=2) ✓; ms = 1 759 372 = 29.3 min ✓ ("29 分钟"). **All quoted numbers match.**
  - *E2/E3/E4 rows vs `sim/anchors_1e11.log`:* the file contains **65 ANCHOR records** (+ 1 `DONE 100000000000` line = 66 lines); anchor steps strictly increasing ✓ (checked). The claim "66 个锚点" is an **off-by-one** (it counts the DONE line / total lines; attack-invariants counted the 10¹⁰ log correctly as 59). "65/65 转移零误差" matches the 65 anchor records (labeled "transitions"; the actual count of consecutive anchor-to-anchor transitions is 64). Last anchor f(64051,172399)@73,032,919,021 ✓ exactly as quoted. My fresh macro orbit reproduces **65/65** anchors through the conjugation f(a,b) = A(a+1, b−1), and the f-recurrence holds **64/64** between consecutive anchors of their log — i.e., their 10¹¹-step artifact is genuine and consistent with the recurrence.
  - *E5 row:* 31×39 = 1209 grid cases, 1178 + 31 = 1209 ✓ arithmetic; independently corroborated by my 99-case random grid (A3).
  - *E6 row:* matches my A4 (2 completed transitions).
  - *E8 row* (negative result about E-state starts): not re-run; out of scope of the assigned claims, no artifact contradiction.
- **E2.** All **30/30** pairs of the §4 prefix match my fresh iteration exactly (including the easily-miscomputed tail (97,526),(195,429),(391,234),(157,938)). CONFIRMED.

## Discrepancies found (investigated and adjudicated)

1. **formal-reduction.md, E2 row: "66 anchors" — actually 65** (66 lines including the `DONE` marker). Severity: **minor off-by-one, cosmetic**. The same 66 also appears in the task briefing's background facts. The dependent claims ("65/65", last-anchor quote) are internally consistent with 65. Adjudication: report error (line-count slip), no consequence.
2. **literature-analysis.md, erratum 6 (α composition order): prose label backwards + "converges" imprecise.** The printed formula I_n = g_{s₁}(g_{s₂}(⋯g_{s_n}((0,1))⋯)) is correct and yields α = 0.3621250257705563 (verified exactly), but the sentence "the newest branch is applied *outermost*" describes the opposite (wrong) evaluation order — in the correct evaluation the newest branch is applied innermost/first. The "wrong number 0.3136…" is real (0.3136877116290085, reproduced from the running-update construction at depth 130, which is literally what their first attempt `temp/verify.py` did), but that variant does not converge — it passes through 0.3136… at that particular depth (neighbouring depths: 0.157, 0.636, 0.092, …). Severity: **minor wording defect in a warning note**; α itself and all its quoted digits/rates are correct. The task briefing copied the same backwards label.
3. **attack-invariants.md, L5: "the halting set has ≈ 4N points in [1,N]²".** Exact fresh counts: 2477 (N=500) and 2542 (N=512) *including* the N diagonal seeds — i.e. ≈ 4.95N total, of which ≈ 3.95N are non-diagonal; their own census gives 4.62N at N=10⁶. The "4×" is exact for tree-nodes-per-seed (my 40 142/10 000 = 4.011) and accurate for non-diagonal halters, but the literal "total in box ≈ 4N" is 20–25% low at small N. Severity: **phrasing ambiguity**, numbers behind it are right (my N=512 count equals their 2542 exactly).
4. **Task-briefing restatement errors (not report errors):** (a) D1 restated as "S = Σ κ/a_n with κ = 3/(16 ln3)" — the report's formula is branch-dependent (c₁ on a>b steps, c₂ on a<b steps; κ = c₁+c₂ is only their combined constant); the restated sum gives 0.858, not 0.3947. (b) B2's parenthetical "NEWEST branch OUTERMOST" — see item 2. (c) E1's "anchors_1e11.log has 66 anchors" — 65. (d) A2's "expect ~45–50" anchors in 2×10⁹ — actual 52 (their own artifacts imply this; expectation was low). A fifth, sub-minor item: attack-heuristics §3.3's summation line "S(N) = Σ_{n=0}^{N} p_n" is off by one vs its own table (table sums N terms, states 0..N−1).

No discrepancy affects any theorem-strength claim: the reduction, recurrence, invariants, cycle algebra, α, density, drift, hitting-sum, and all artifact numbers verify independently, in most cases to the full quoted precision.

## Reproduction

```
cd bb6/crossval
gcc -O2 -o sim.exe sim.c      && ./sim.exe run 2000000000 > my_anchors_2e9.log   # A1/A2 (+ A3: ./sim.exe grid <seed>; A4: ./sim.exe b1 <a>)
gcc -O2 -o backward.exe backward.c && ./backward.exe                              # C3 (BFS + forward census)
gcc -O2 -o zmod.exe zmod.c    && ./zmod.exe                                       # C2 census cross-check
node b.mjs   # B1, B2, B5          node b34.mjs    # B3, B4
node b2wrong.mjs  # wrong-order probe             node c.mjs  # C1, C2, C4
node d.mjs   # D1, D2, D3          node e.mjs      # E1b, E2
```
