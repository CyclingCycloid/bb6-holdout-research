# BMO1 Literature Analysis — 1RB1RE_1LC0RA_0RD1LB_---1RC_1LF1RE_0LB0LE

**Subject.** BB(6) holdout "BMO 1" (Beaver Math Olympiad Problem 1), discovered by @-d (Jason Yuen), 25 Jun 2024. Halting status: open; community consensus "probviously non-halting".
Blank-tape behavior reduces to the two-counter piecewise-affine iteration

```
A(a,b) -> A(a-b, 4b+2)  if a > b
A(a,b) -> A(2a+1, b-a)  if a < b
A(a,b) -> Halt          if a = b        Start: A(1,2)
```

First ten pairs (verified here by direct simulation): (1,2),(3,1),(2,6),(5,4),(1,18),(3,17),(7,14),(15,7),(8,30),(17,22).

**Status labels used throughout:** [PROVED] = full proof exists (published, formalized, or verified line-by-line in this report); [CLAIMED] = asserted with sketch, gaps identified; [HEURISTIC] = numerical/probabilistic evidence only; [VERIFIED HERE] = independently checked computationally/algebraically in this report (scripts listed in Appendix).

---

## 0. Executive summary

1. The TM-to-recurrence reduction is **fully proved in Lean** (rwst, `machine.lean`, BusyLean, Apr 2026, theorems `tm_halts_iff`, `math_halts_iff_pair_eq`; macro step counts 6β²+11β+10 / 2α²+4αβ+3α+4 / 6α²+3α+3). Nothing remains there.
2. Four attack routes exist (backward fractal in (m,b)-space; Bard's homogenization/1D-limit; ergodic theory of the simplified model; matrix corner-zero reformulation). **None is anywhere near closing.** The April 2026 audit (rwst repo `previous-work/critique.md`, wiki "Review 2026-Apr-19 by Opus 4.7") is accurate; its two named defects in Bard's paper ("z_n → 0 unproven", "halt case glossed") are both real but **repairable** — this report supplies two-line proofs/repairs (§3.2, §5).
3. Bard's reduction "BMO1 ⟸ α irrational" is a **correct reduction** (after the repairs) to an intractable-looking statement. This report **independently reproduces α = 0.3621250257705563…** by exact rational nested intervals, gives its first 40 continued-fraction terms (no periodicity), and argues irrationality of α is beyond current technique (direct analogue: Braverman's open problem on point-termination of 2D linear loops, which he himself says requires "analysis of the continued fraction expansion of log β").
4. New contributions of this report: (i) exact identity **z_n = 1/(a_n+b_n+1)** making z_n→0 trivial; (ii) proof that the simplified model's ratio map is conjugate to a **uniformly expanding** Lebesgue-preserving map (exact slopes 4(r+1)/(3r+1) and 2(r+3)/(r+5), min 4/3), upgrading the invariant density and drift constant 0.15097694… from folklore to an (easily completable) Lasota–Yorke theorem; (iii) verification of the matrix corner-zero reduction including a proof of its "wrong-branch" sign lemma; (iv) closed-form sign proofs that the Location-1 and Location-2 backward families never hit the halting line; (v) identification of the Location-3 fractal band (1.724 < m < 1.8556) with the unstable "rll" 3-cycle x\* = (3+√57)/6 ≈ 1.758306 of the forward map (the band's lower edge 1.724 is within 0.0012 of the cycle's multiplier y\* = 7−3x\* ≈ 1.725083 — likely not a coincidence); (vi) errata list (§7), including a garbled A′ on the wiki matrix section and a suffix typo in Location 3.
5. Ranked strategies (§6): (1) hybrid ergodic — prove the simplified model's exactness (routine now) and couple to the exact model; (2) backward-route completion by finite suffix classification + per-family exponential-Diophantine sign proofs; (3) formalize the α-equivalence and hunt for α-structure. All three have concrete, provable first lemmas; none has a visible end-to-end path.

---

## 1. The problem and its verified equivalences

BMO 1 asks (wiki BMO page; formalized in DeepMind `formal-conjectures`, `FormalConjectures/Other/BeaverMathOlympiad.lean`, `theorem beaver_math_olympiad_problem_1`, tagged `[category research open, AMS 5 11 68]`):

> Sequences with (a₁,b₁) = (1,2) and
> (a_{n+1}, b_{n+1}) = (a_n−b_n, 4b_n+2) if a_n ≥ b_n; (2a_n+1, b_n−a_n) if a_n < b_n.
> Does some i satisfy a_i = b_i?

(The Lean statement is `∃ i, a i = b i` with the branch condition `b n ≤ a n`; the a=b case is the halting event, so conventions agree.)

**Equivalences, all [PROVED]:**

- **TM ⟺ recurrence.** Lean (rwst `machine.lean`, 1509 lines): blank tape reaches A(1,2) in 10 steps (`init_to_A12`, by `decide`); macro rules `stm_rule_gt/lt/eq` proved with explicit step counts; `stm_simulates_math`; `tm_sa_halts_iff`; `tm_halts_iff`; `math_halts_iff_pair_eq`. The A(a,b) configuration is `0^∞ (10)^{a−1} 0 1^b E> 0^∞` (dyuan01's normalization of Shawn Ligocki's E(a,b,c) = `0^∞ (10)^a 0 (10)^b 1^c E> 0^∞`). Earlier equivalent forms: @-d's f(a,b) (halt on f(a,a+2)), Ligocki's E(a,0,c+1) rules `(a,c)→(a−c−1,4c+5)/(2a+2,c−a−1)/Halt`, savask's symmetric form.
- **Recurrence ⟺ matrix corner-zero** (§3.4 below, [VERIFIED HERE] including the sign lemma the write-up left as "can be checked").
- **Forward simulations.** @-d and Andrew Ducharme: no halt in 10⁸ macro iterations [HEURISTIC]; @-d's run reached a,b > 2^1000000. Ligocki's spread run to 3×10⁶ macro steps: |a−c| monotone through ranges [10^6557, 10^196733] [HEURISTIC].

Machine facts: 6 states, halt only from D on 0; transition table in `machine.lean` header. Possible Cryptid (not classified — no hardness argument for this specific instance).

---

## 2. A. Prior-results ledger

| # | Result | Who / where | Status |
|---|--------|--------------|--------|
| A1 | Discovery + two-counter recurrence (original f-coordinates), simulation to 2^1000000 | @-d (Jason Yuen), Discord 25 Jun 2024 | recurrence [PROVED in Lean 2026]; non-halting [HEURISTIC] |
| A2 | Base & high-level macro rules E(a,b,c); Halt(b+4) from E(0,b,1); step structure | Shawn Ligocki, Discord 25 Jun 2024 | [PROVED in Lean] (as macro lemmas) |
| A3 | Symmetric form (a,c)→(a−c−1,4c+5) etc. | savask, 26 Jun 2024 | [PROVED in Lean] |
| A4 | Coordinate shift to canonical A(a,b) form | dyuan01, 26 Jun 2024 | [PROVED in Lean] |
| A5 | Spread observation: |a−c| ranges march upward without overlap, 100k–3M steps | Ligocki 25–26 Jun 2024 | [HEURISTIC] |
| A6 | Unstable cycle at x≈1.76 via path "rll": (xc,c)→(xyc,yc) as c→∞ | Ligocki 26 Jun 2024 | [HEURISTIC]; exact x\*=(3+√57)/6, y\*=7−3x\* derived here [VERIFIED HERE] |
| A7 | Simplified model (drop +2/+1): (a,b)→(a−b,4b)/(2a,b−a) from (3,17); trivially non-halting: after 2 steps trapped in (a,b)≡(0,4),(4,0) (mod 8) | savask 26 Jun 2024 | [PROVED] (re-verified here) |
| A8 | Simplified-model drift: E[Δ ln a] = (−π²/12 + (3/2)ln²2 + Li₂(1/4))/ln3 ≈ 0.15097694, via invariant density f(r)=2/(ln3·(r+1)(r+3)), r=b/a | savask; density by LegionMammal978 & Sil (Math.SE 4939082, 28 Jun 2024) | density is an exact solution of the Frobenius–Perron equation [VERIFIED HERE]; ergodicity (that f *is* the invariant density / a.e. statement) unproven in public sources — now supplied at the a.e. level here (§4.3, min slope 4/3 ⇒ Lasota–Yorke) |
| A9 | Backward (m,b) slope-intercept method; halting ⟺ generated point on line m+b=2 | Racheline, Andrew Ducharme, Jun–Jul 2024 | algebra [PROVED] (audit + re-derived here) |
| A10 | Location 1: family (<^n,>) closed form ((2^{n+1}−1)/(2^{n+1}+3), (2^{n+1}−n−4)/(2^{n+1}+3)) → (1,1), never on line in finite time; invariant m>b | Andrew Ducharme; Racheline | closed form [PROVED] [VERIFIED HERE, n≤12 exact]; m+b−2 = (−n−11)/(2^{n+1}+3) < 0 ∀n [VERIFIED HERE] |
| A11 | Location 2: family (>^n,<,²,>,<) closed form ((13·4^{n+1}+23)/(7·4^{n+1}+5), (4^{n+2}+6n+65)/(21·4^{n+1}+15)) → (13/7,4/21); suffix lemma: any (m,b) ending in (<,<,>,<) has m+b > 43/21 > 2 | Ducharme; Racheline | closed form [PROVED] [VERIFIED HERE, n≤10 exact]; m+b−2 = (4^{n+1}+6n+104)/(3(7·4^{n+1}+5)) > 0 ∀n [VERIFIED HERE — this makes the whole family provably safe]; suffix lemma [PROVED] (audit calls it "a genuine lemma"); "all nearby points have this suffix" [HEURISTIC] |
| A12 | Location 3: fractal near m≈1.76; closest approach 2/347027 (point 611281/347027 at depth 17); points with 1.724<m<1.8556 arise from suffix `<<<><><` with (m_f,b_f) = ((104m+119)/(56m+69),(23m+b+12)/(56m+69)) | Ducharme, 25 iterations | suffix Möbius form [VERIFIED HERE — the wiki's exponent form "(<^4,…)" is a typo for <³]; fractal structure / no hit [HEURISTIC, unresolved] |
| A13 | Homogenization paper: (x,y,z) with x+y+z=1, start (1/4,1/2,1/4); 1D limit map f(x) = (2x−1)/(3−2x) for x>1/2, 2x for x<1/2; preimages of 1/2 dense in (0,1); odd-denominator lemma; shadow point α ≈ 0.3621250257705563; conjecture: α irrational ⟹ BMO1 loops | "Bard" (bbchallenge Discord), PDF on wiki | all algebra [PROVED/verified]; z_n→0 [CLAIMED, repaired here]; halt-case [CLAIMED, repair sketched by audit]; density of preimages [PROVED]; α value [VERIFIED HERE to 13+ digits]; α irrationality [OPEN, no technique] |
| A14 | Turing-completeness of 2-variable LIATA/PAFs (BMO1-type problems): a = x+y+1, b = x+k·a encodes 2-counter Minsky machines; mortality undecidable for 2-dim PAFs (Blondel–Bournez–Koiran–Tsitsiklis 2001) and 2-region PAFs; open for 2-region 2-dim | Bard, mxdys, star, savask; forum thread Oct–Nov 2025 | class-level results [PROVED]; implication for BMO1 itself: none (hardness of the class ≠ hardness of the instance) |
| A15 | Matrix reformulation: A=[[1,−1,0],[0,4,2],[0,0,1]], B=[[2,0,1],[−1,1,0],[0,0,1]], v=(1,2,1)ᵀ, r=(−1,1,0); BMO1 halts ⟺ ∃ word w: r·P_w·v = 0 ⟺ ∃w: (P′_w)₁₁ = 0 for A′=[[11,4,2],[−12,−4,−2],[−10,−4,−1]], B′=[[−2,−2,−1],[5,4,2],[3,2,2]] | wiki File:BMO1_Matrix_Problem.pdf (uncredited; wiki machine page) | reduction [PROVED] [VERIFIED HERE incl. corner entries rAv=11=A′₁₁, rBv=−2=B′₁₁, conjugation consistency on 200 random words, and the wrong-branch sign lemma]; decidability of 2-generator 3×3 corner-zero: OPEN (best bounds: undecidable Z(5,3×3), Z(3,5×5), Z(2,9×9) — Cassaigne–Halava–Harju–Nicolas) |
| A16 | April 2026 audit: backward algebra ✓; Loc-1 ✓ but only one approach path excluded; Loc-2 suffix lemma ✓ but "all nearby points from suffix" unproved; Loc-3 "the real open door"; Bard: homogenization ✓, z→0 needs short argument (audit supplies one via decreasing-z + branch recurrence), density ✓, odd-denominator ✓, matching halt-case glossed (fixable via nested intervals), "reduction to irrationality of α_∞ correct but no route to prove it"; recommendation: "an ergodic/entropy argument on the 1D map, not more enumeration" | rwst repo `previous-work/critique.md` (= wiki "Review 2026-Apr-19 by Opus 4.7") | [PROVED-style audit; all spot-checks confirmed by this report] |
| A17 | Lean: TM⟺recurrence complete; BusyLean scaffolding (pass_shift lemma `SE(a+1,b,c+2) (4(b+c)+13) = SE(a,b+2,c+1)` grid-verified on 6³ cases; phase formulas A=7+3c+2b, C=6+2b; head-locality saturating at a=2; zebra-cycle search for b-induction) | rwst, github.com/rwst/bbchallenge | reduction [PROVED]; pass_shift scaffolding [PROVED for base cases / in progress] |
| A18 | DeepMind formal conjectures statement of BMO1 (and problems 2–11; solved: 3,4,7,9) | google-deepmind/formal-conjectures `BeaverMathOlympiad.lean` | statement only, `sorry`-ed, category research open |

Related-work context (no BMO1-specific content): Braverman CAV 2006 (termination of deterministic linear loops decidable over ℚ/homogeneous-ℤ; point-termination from a given x₀ explicitly open, needs CF of log β); Ben-Amram STACS 2013 / Computability 2015 (mortality of iterated PAFs over ℤ: Π⁰₂-complete for dim ≥ 2; PTIME for purely affine; PSPACE-complete for PAFs in dim 1; undecidability via Collatz variants); Guilmant–Lefaucheux–Ouaknine–Worrell ICALP 2024 (2-dim linear constraint loops over ℝ decidable); Carelli ICALP 2026 (1-variable constraint loops ⟺ generalized Collatz conjectures); Cassaigne–Halava–Harju–Nicolas (arXiv:1404.0644) matrix mortality/corner bounds; Romik / Dajani–Kraaikamp on subtractive ("lazy") Euclidean dynamics and N-continued fractions (σ-finite invariant measures, no analogue of our exact finite invariant density known in that literature). No prior work connects the exact map (a−b,4b+2)/(2a+1,b−a) to a named system [searched; none found].

---

## 3. B. The precise frontier, route by route

### 3.1 Backward (m,b) fractal route — Racheline / Ducharme

Setup [PROVED]: lines y = mx+b mapped backwards by
```
(m,b) ↦ (m/(m+4), (b−2)/(m+4))   [inverse of the a>b branch]
(m,b) ↦ (2m+1, b+m)              [inverse of the a<b branch]
```
seed (m,b) = (1,0) (the line y=x). The TM halts iff some iterated image lies on **m + b = 2** (the set of lines through (1,2)).

What is proved: Locations 1 and 2 are safe *for the exhibited families* (A10, A11 — including the all-n sign checks derived here). Racheline's suffix lemma (A11) is a genuine lemma valid for **any** generated point whose last four operations are (<,<,>,<).

What is missing, precisely:
1. **(Location 1, partial)** the m>b invariant excludes only m=b=1; other words could in principle land on m+b=2 with m>1>b. (Audit: "the wiki does not quite prove Location 1 is safe for all approach paths.")
2. **(Location 2)** prove that every generated point in a neighborhood of (13/7, 4/21) has suffix (<,<,>,<) — currently empirical.
3. **(Location 3, the whole problem)** prove that **no word w ∈ {<,>}^\* maps (1,0) onto the segment of m+b=2 with m ≈ 1.724–1.8556**, where the generated set is a fractal accumulating on the line from both sides (closest approach so far: distance 2/347027 at depth 17). Equivalent missing lemma: for every word w, m(w)+b(w) ≠ 2. The set of "dangerous" words is expected to be describable by finitely many suffix patterns (Ducharme found one: `<<<><>` + `>`+`<`… i.e. `<<<><><`); a finite classification (a sofic-shift/covering statement) plus per-family closed forms would finish. No such classification exists.

Useable lemmas/constants: the two Möbius backward branches above; family closed forms (A10, A11) with exact signs; suffix map (m,b) ↦ ((104m+119)/(56m+69), (23m+b+12)/(56m+69)); band 1.724 < m < 1.8556; danger points 13/7 (above), 119/69 ≈ 1.7246 (below), 223/125, 669/401, 1145/651 ≈ 1.75883, 611281/347027 ≈ 1.76173 (above, 2/347027 from the line), 208917121/118603171, 3338675841/1895381411; limit points (1,1) on the line, (13/7, 4/21) above by 1/21.

Connection found here: the band is centered on the forward simplified map's repelling 3-cycle: path "rll" sends ratio x to 4(x−1)/(7−3x) (in Ligocki's (a,c) coordinates), fixed point **x\* = (3+√57)/6 ≈ 1.758306**, multiplier **y\* = 7−3x\* ≈ 1.725083** — and the band's lower edge 1.724 is within 0.0012 of y\*. The fractal pile-up at m ≈ x\* is the backward image of this repelling cycle. Making this duality a theorem (the backward limit set near the band = the cycle's stable set, with quantitative scaling y\* per level) is the concrete first lemma for this route.

### 3.2 Homogenization / α route — Bard

Setup [PROVED, re-derived here]: homogenize (a,b) ↦ (a,b,1), normalize to x+y+z=1 from (x₀,y₀,z₀) = (1/4,1/2,1/4):
```
x>y: (x,y,z) ↦ (x−y, 4y+2z, z)/(1+2y+2z)      [denominator = 3−2x]
x<y: (x,y,z) ↦ (2x+z, y−x, z)/(1+z)
```
As z→0 (y→1−x) the slice dynamics is the 1D map
```
f(x) = (2x−1)/(3−2x)  if x > 1/2;      f(x) = 2x  if x < 1/2,
```
"halt" = hitting 1/2. Inverse branches g₁(y) = (3y+1)/(2y+2) (slope 1/(1+y)² < 1), g₂(y) = y/2 (slope 1/2).

Results in the PDF, with status:
- Preimages of 1/2 dense in (0,1): [PROVED] (expanding branches; L_{n+2} ≥ 2L_n case check confirmed by audit and here). Consequence: no open set separates the start from halting points in the 1D limit — the "density hope" is dead, correctly.
- Rational point test: iterate (u,v) ↦ (2u−v, −2u+3v) if 2u>v else (2u,v); reduced odd v stays odd forever [PROVED — "elegant and correct" per audit; 3000 random trials verified here]; halting needs v even; so odd denominator ⟹ never reaches 1/2. Cycle caveat: a rational orbit with even v could in principle loop forever without halting (none found for v < 5000) — tangential.
- Shadow/matching lemma: for any start (x,y) there is α ∈ (0,1) whose f-itinerary equals the true orbit's branch sequence (nested intervals; both branches are increasing bijections onto (0,1)). Branch-matching half fine; **halt half glossed** (audit).
- Stern–Brocot/mediant search converges to α_∞ ≈ 0.3621250257705563; no rational with denominator ≤ 10^50 matches; conjecture: α irrational ⟹ BMO1 loops.

The two audit-flagged defects, repaired here:

**(i) z_n → 0.** Exact identity [VERIFIED HERE, 500 steps exact rationals]: **z_n = 1/(a_n + b_n + 1)** (the un-normalized triple stays (a_n, b_n, 1)). Hence 1/z_{n+1} − 1/z_n = 1 (x<y branch: a+b increases by 1) or = 2b_n + 2 ≥ 4 (x>y branch). In particular 1/z_n ≥ n + 4, so **z_n ≤ 1/(n+4) → 0** unconditionally (whether or not the machine halts, up to the halt). This is shorter than the audit's repair and makes Bard's asserted lemma a two-liner. (Side product: a_n+b_n ≥ n+3 always grows; growth per step is 1 or 2b_n+2.)

**(ii) Halt case.** Define s = s₁s₂… = the true orbit's branch sequence (finite, ending at halt time N, or infinite). The nested intervals I_n = g_{s₁}∘g_{s₂}∘⋯∘g_{s_n}((0,1)) [note the composition order: newest branch innermost-applied-outermost — see Appendix bug note] satisfy I_{n+1} ⊊ I_n. If the orbit never halts, α := unique point of ⋂I_n exists and its itinerary is s forever; then fⁿ(α) ≠ 1/2 for all n (else α ∉ I_{n+1}). If the orbit halts at time N, set α := g_{s₁}∘⋯∘g_{s_{N−1}}(1/2) ∈ ℚ (the unique 1D point that follows the prefix and then "halts"); the mediant bounds converge to it. In both cases: **machine halts ⟹ α ∈ ℚ and f-orbit of α reaches 1/2; machine halts at N ⟺ α = g_{s₁…s_{N−1}}(1/2).** Contrapositive: α irrational ⟹ machine never halts. This is the audit's "fixable via nested intervals", written out. Uniqueness of α [PROVED here]: g₂ contracts lengths by exactly 1/2, g₁ by 1/(1+y)² < 1; both branches occur infinitely often in s (a>b forever impossible: a strictly decreases by ≥1 while b grows; a<b forever impossible: b strictly decreases), so |I_n| ≤ 2^(−#2s in s₁..s_n) → 0. Measured: |I_n| ≈ 10^{−0.27n} (3×10⁻⁵⁴ at n = 200).

What remains missing in this route — **the only remaining item**: a proof that α ∉ {g_w(1/2) : w ∈ {1,2}\*} (irrationality is the natural sufficient condition; see §5).

### 3.3 Ergodic route — savask / LegionMammal978 / Sil (+ this report)

All public statements concern the **simplified** model (constants removed), which is *provably non-halting* (mod-8 trap, A7) — the ergodic facts live in a toy model that cannot halt. Public status: density = exact FP solution; drift = computed from the density as if ergodic [HEURISTIC]. This report upgrades the foundations (§4) but the final gap is unchanged:

1. **No invariant-measure theorem was public.** Repaired here: the simplified ratio map is conjugate to a uniformly expanding, Lebesgue-preserving map (§4.3) ⇒ unique acim, exactness, exponential mixing (Lasota–Yorke; numerics: lag-1 autocorr 0.400, geometric decay ≈ 0.4^lag). Drift = 0.150976944502… becomes a Birkhoff-a.e. statement [now essentially PROVED for the simplified model, modulo writing up the standard theorem].
2. **Transfer to the exact model.** The +1/+2 perturbation is not uniformly small: it dominates exactly where halting lives (|a−b| small). No coupling, spectral, or induced-map argument exists. MC drift of the exact map (this report): 0.15106 over 1.2M steps (vs 0.150977 simplified) — consistent, unproven.
3. **From typicality to a specific orbit.** Even a complete ergodic theorem for the exact model only says the halting set has invariant-measure 0; BMO1 needs one specific orbit to avoid a specific countable set forever. This is the same wall as the α route (α's itinerary equidistribulating would still not exclude countably many exact hits). The ergodic route can at best prove statements of the form "for acim-a.e. starting pair, no halt after time N₀(C) with room C" — a rigorous version of "probviously", not a proof for (1,2).

Concrete extracted constants (see §4 for derivations): invariant density f(r) = 2/(ln3·(r+1)(r+3)) on r = b/a ∈ (0,∞); P(r<1) = ln(3/2)/ln3 ≈ 0.369070; P(r>1) = ln2/ln3 ≈ 0.630930; E[Δ ln a] = (−π²/12 + (3/2)ln²2 + Li₂(1/4))/ln3 = 0.1509769445024…; growth factor e^{0.150977} ≈ 1.16297 per macro step; 15.2512 macro steps per decimal digit of a; repelling 3-cycle (x\*, y\*) = ((3+√57)/6, 7−3(3+√57)/6) ≈ (1.758306, 1.725083); conjugacy s = log₃(3(r+1)/(r+3)).

### 3.4 Matrix route — wiki write-up (+ this report's verification)

Statement [PROVED, verified here]: with A, B as in A15 and v = (1,2,1)ᵀ, r = (−1,1,0):
- The TM halts iff some finite product P_w satisfies r·P_w·v = 0. "Wrong-branch" products never do: the first wrong step from a positive state yields opposite-sign coordinates ((a−b,4b+2) with a<b gives a′<0<b′; (2a+1,b−a) with a>b gives 0<a′, b′<0), and **opposite integer signs are preserved by both A and B** (if a ≤ −1 then 2a+1 ≤ −1 and a−b < 0; if b ≤ −1 then 4b+2 ≤ −2 and b−a < 0; symmetric on the other side) — hence a′ = b′ is impossible. [Proof supplied here; the PDF said "it can be checked".]
- Conjugation: for any integer L with first row r and L·v = e₁ (e.g. L = [[−1,1,0],[1,0,−1],[0,1,−2]]; the choice is non-unique), the corner identity **e₁ᵀ(L P_w L⁻¹)e₁ = r·P_w·v for every word w** holds. The write-up's concrete pair A′, B′ (from its own choice of L) satisfies it — **verified symbolically on 200 random words**. So: **BMO1 halts ⟺ some product of the two 3×3 integer matrices A′, B′ has a zero in the upper-left corner.**
- Structure extracted here: **A and B are upper triangular; det A = 4, det B = 2; eigenvalues A = {1,1,4}, B = {1,1,2}** (same for A′, B′; every product has determinant 4^{#A}2^{#B}).

Decidability context: zero-in-left-upper-corner is undecidable for five 3×3 matrices, three 5×5, two 9×9 (Cassaigne–Halava–Harju–Nicolas, arXiv:1404.0644); **open for two 3×3 generators** — exactly BMO1's case. Mortality of iterated PAFs over ℤ: Π⁰₂-complete in dim ≥ 2 (Ben-Amram); point-termination of even *deterministic* 2D linear loops is open (Braverman, who reduces a toy instance to CF of log β). BMO1 = point-termination of a 2-region 2-dim PAF over ℤ — the smallest case in every known open class.

Missing: everything instance-specific. Modular filter tested here: a=b ⇒ a ≡ b (mod M) for all M; exact simulation of 30 000 steps shows the diagonal residue class a_n ≡ b_n (mod M) is hit for *every* tested M (density ≈ 2/M, residues equidistributed; e.g. T₈ = {7, 11, 24, 44, 55, …}); so no single-modulus invariant-set proof exists. (Caveat recorded: the branch test a>b is *not* residue-determined, so there is no well-defined dynamics on ℤ²_M and residue sequences need not be eventually periodic — a subtlety that invalidates naive "mod-M automaton" attacks.)

---

## 4. C. Independent recomputation (density, drift, conjugacy)

### 4.1 Ratio map and the Frobenius–Perron equation

Simplified model, r = b/a ∈ (0,∞):
- a > b (r<1): (a,b) ↦ (a−b, 4b) ⟹ r ↦ **4r/(1−r)**.
- a < b (r>1): (a,b) ↦ (2a, b−a) ⟹ r ↦ **(r−1)/2**.

(With the opposite convention q = a/b the map is q ↦ 2q/(1−q) for q<1, (q−1)/4 for q>1 — the task's two candidate conventions are both correct, for r = b/a and a/b respectively.) In x = ln(a/b) this is the wiki's chaotic map F(x) = ln((eˣ−1)/4) for x>0, ln(2/(e^{−x}−1)) for x<0 [wiki source correct; some rendered summaries drop the parentheses — erratum E4].

Preimages of x: from branch 1: 4r/(1−r) = x ⟹ r = x/(x+4) with dr/dx = 4/(x+4)²; from branch 2: r = 2x+1 with dr/dx = 2. Frobenius–Perron:
```
f(x) = 4/(x+4)² · f(x/(x+4)) + 2·f(2x+1)          — matches Math.SE 4939082 exactly
```
Sil's solution family f(x) = c/((x+1)(x+3)) — **algebra re-verified here term by term**: term1 + term2 = c/(2(x+2)(x+3)) + c/(2(x+1)(x+2)) = c(2x+4)/(2(x+1)(x+2)(x+3)) = c/((x+1)(x+3)). ✓

**Normalization (resolving the task's query).** ∫₀^∞ dr/((r+1)(r+3)) = [½ln((r+1)/(r+3))]₀^∞ = ½ ln 3. Hence the probability density on r ∈ (0,∞) is
```
f(r) = 2 / ( ln 3 · (r+1)(r+3) ),        ∫₀^∞ f = 1.   ✓ (numeric 0.9960 on (0,300) + tail)
```
The variant "2ln3/((r+1)(r+3))" would integrate to (ln3)² ≈ 1.2069 ≠ 1 — that form (which appeared in at least one rendered summary of the wiki) is a mis-normalization; the wiki's raw source and savask's original statement carry the correct 2/(ln3(r+1)(r+3)). LegionMammal978's empirical scaling 2.0207 ≈ 2/ln3 ✓ consistent.

### 4.2 Expected log-drift per macro step

For the simplified map, Δ ln a = ln(1−r) on branch r<1 and ln 2 on branch r>1.
```
P(r>1) = ∫₁^∞ f = ln2/ln3 = 0.630929753571…
P(r<1) = ln(3/2)/ln3     = 0.369070246429…
```
Key integrals (substitute u = 1−r; use ∫₀¹ uⁿ ln u du = −1/(n+1)²):
```
∫₀¹ ln(1−r)/(r+1) dr = ∫₀¹ ln u/(2−u) du = −Li₂(1/2) = −π²/12 + ½ln²2
∫₀¹ ln(1−r)/(r+3) dr = ∫₀¹ ln u/(4−u) du = −Li₂(1/4)
⟹ ∫₀¹ ln(1−r)·2/((r+1)(r+3)) dr = −Li₂(1/2) + Li₂(1/4) = −π²/12 + ½ln²2 + Li₂(1/4)
```
Therefore
```
E[Δ ln a] = [−π²/12 + ½ln²2 + Li₂(1/4)]/ln3 + ln2·(ln2/ln3)
          = ( −π²/12 + (3/2)ln²2 + Li₂(1/4) ) / ln 3
          = ( −0.8224670334 + 0.7206795209 + 0.2676526391 ) / 1.0986122887
          = 0.1658651265 / 1.0986122887 = 0.15097694450242…
```
Numerics: midpoint quadrature of the density integral gives 0.15097704 (agreement 1e-7); Monte Carlo on the simplified map from (3,17), 1.2M steps: 0.151013 (slow convergence, correlated); **exact map from (1,2), 1.2M steps: 0.151065** — the exact model's drift is empirically slightly above the simplified one, as expected from the +1/+2 constants. Histogram of ln r over 600k simplified steps matches the pushed-forward density f(eᵗ)eᵗ to max error 0.0017 (60 bins).

### 4.3 New: conjugacy to a uniformly expanding Lebesgue-preserving map

The invariant CDF is F(r) = log₃(3(r+1)/(r+3)) (since F′ = f). In the coordinate s = F(r) ∈ (0,1), the measure is Lebesgue and the map S = F∘T∘F⁻¹ has two full increasing analytic branches, cut at s = log₃(3/2) ≈ 0.369070 (r = 1). Slopes in closed form [derived and finite-difference-verified here]:
```
r < 1 branch:  S′ = 4(r+1)/(3r+1)   ∈ (2, 4]
r > 1 branch:  S′ = 2(r+3)/(r+5)   ∈ [4/3, 2)
```
So **S is uniformly expanding with min slope 4/3** (at the branch point), piecewise-real-analytic, full branches, Lebesgue-invariant (verified: 20-bin histogram flat to 0.5%, mean 0.4986, var 0.0832 ≈ 1/12). Consequences (standard Lasota–Yorke / Liverani-type theory, ~1 page to write up): unique acim = Lebesgue (hence f *is* the unique invariant density of the simplified ratio map), exactness (Bernoulli), exponential decay of correlations (observed rate ≈ 0.4/step: autocorr 0.400, 0.152, 0.061, 0.009, −0.0004 at lags 1,2,3,5,10). This upgrades A8 from folklore to a provable theorem and supplies the missing "why is the drift real" for the simplified model. Note: Bard's 1D map f (§3.2) is a *different* map (the z→0 limit of the exact model, not the simplified model): its invariant density is not the same closed form (checked: the FP equation of f rejects 2/(ln3(x+1)(x+3))), and f is *not* uniformly expanding (f′ = 4/(3−2x)² → 1 as x→½⁺) — although f and S are topologically conjugate as full-branch increasing maps, the conjugacy is not a priori absolutely continuous. Proving an acim for f and identifying α's typicality w.r.t. it is an open, well-posed, likely tractable lemma.

---

## 5. D. The constant α ≈ 0.3621250257705563

**Exact definition (reconstructed from Bard's PDF, made precise).** Let s₁s₂… be the branch itinerary of the true BMO1 orbit from (1,2) (sₙ = 1 if a_n > b_n, 2 if a_n < b_n; a finite word ending at the halt time if the machine halts). Let g₁(y) = (3y+1)/(2y+2), g₂(y) = y/2 be the inverse branches of f (§3.2), and I_n = g_{s₁}∘g_{s₂}∘⋯∘g_{s_n}((0,1)). Then
```
α := the unique point of ⋂ₙ I_n        (unique because g₂ halves lengths and s contains infinitely many 2s)
```
α is *the* 1D point whose f-itinerary is exactly the BMO1 branch itinerary. Equivalently α is the limit of Bard's Stern–Brocot/mediant search; the PDF gives no closed form and no series — α is defined only through the itinerary. **Reproduced here independently with exact rational interval arithmetic:** after n itinerary steps |I_n| shrinks as ≈10^{−0.27n} (endpoints at depth 200 have 136-digit denominators; |I₂₀₀| ≈ 3×10⁻⁵⁴), and

```
α = 0.3621250257705563…   (matches Bard to all 16 quoted digits; 63-step itinerary match in double precision)
```

Continued fraction (computed here from the depth-400 exact bounds): α = [0; 2, 1, 3, 5, 5, 8, 1, 5, 1, 5, 4, 5, 13, 1, 15, 6, 4, 2, 1, 83, 116, 5, 26, 1, 168, 2, 5, 1, 4, 40, 1, 1, 7, 1, 1, 3, 14, 1, 1, …] — **no periodicity** in 60 terms (so α is not a quadratic irrational, subject to the correctness of the leading ~40 terms; large partial quotients 83, 116, 168 with no repeat structure).

**Would irrationality of α suffice?** Yes, modulo the two repairs, both now supplied:
1. *Well-definedness/uniqueness of α* — proved above (infinitely many branch-2 steps).
2. *Halt-case correspondence* — machine halts at N ⟹ α = g_{s₁…s_{N−1}}(1/2) ∈ ℚ; contrapositive gives the implication. (This is the audit's "fixable via nested intervals", made explicit.)
3. *z_n → 0 is NOT actually needed* for this implication — the itinerary matching is purely symbolic (nested intervals on (0,1)); z→0 was motivational. (It becomes needed only if one wants to say the 2D orbit *geometrically* shadows the 1D slice; and it is in any case true by the identity z_n = 1/(a_n+b_n+1).)

So: **α ∉ ℚ ⟹ BMO1 never halts.** Even better, the exact equivalence is: the machine halts ⟺ α ∈ {g_w(1/2) : w ∈ {1,2}\*} (a specific countable set of rationals), and sufficient conditions include α ∉ ℚ or α = u/v with v odd. Caveats: Bard's own rational-with-even-denominator case is genuinely delicate (e.g. 3/8 ↦ 3/4 ↦ 1/3 reaches an odd denominator and then never halts — even denominators do not imply halting), and the no-cycle conjecture for rational orbits (v < 5000 tested) is unproved but tangential.

**Honest assessment.** The reduction is correct and complete, but the target is of a type with no known method of attack: α is a computable, dynamically defined constant with no algebraic structure (CF visibly non-periodic, no self-similar itinerary evident, no series representation). Proving irrationality of such constants is comparable to Braverman's explicitly-open problem (does z(i) = Re(λⁱ(ξ+1−2^{−i})) ever fall below 0 — "requires analysis of the continued fraction expansion of log β"), and to long-open irrationality questions for conjugacy values of piecewise-linear maps. The information content of "α irrational" is essentially the non-halting of BMO1 itself (the itinerary of α *is* the machine computation), so the reduction, while logically clean, relocates rather than reduces the difficulty. This matches the audit's bottom line ("correct reduction, but α_∞ is defined only implicitly … no visible structural reason … to expect the irrationality proof to be tractable") and its recommendation to pursue structural/ergodic arguments instead.

---

## 6. E. Ranked proof strategies (non-halting), with first lemmas

**Strategy 1 — Hybrid ergodic: prove the simplified model exactly, then couple.** (Most new mathematics per unit effort; first lemmas provable now.)
- Lemma 1.1 [essentially done here, §4.3; write-up needed]: S is C¹-piecewise-analytic, full-branch, uniformly expanding (min slope 4/3), Lebesgue-invariant ⟹ (Lasota–Yorke) unique acim = Lebesgue; S is exact with exponential decay of correlations. Conclude: for Lebesgue-a.e. start, the simplified orbit has Δ ln a-average → 0.1509770 (Birkhoff) — the first *proved* statement behind the drift constant.
- Lemma 1.2 (coupling): quantitatively compare exact-map ratio r_{n+1}^{exact} vs T(r_n) — |difference| ≤ C/size whenever |r−1| ≥ C′/size. First sub-lemma: exact-vs-simplified drift difference is O(E[1/b]) with the stationary density — show finiteness via the (now rigorous) acim.
- Lemma 1.3 (large deviations): using exponential mixing, bound P(ever |ln r| < ε at a "resonant" time) for the *simplified* process started in the stationary ensemble; convert into: for a.e. large starting pair, no halt within horizon exp(c·size). This is the rigorous "probviously" theorem. Then confront the honest wall (specific orbit), possibly combined with Strategy 2 to cover the exceptional set.
- Why ranked first: every step is a standard technique; the acim/mixing half is already implied by computations here; and even partial products (a proved drift theorem for the toy model, a coupling bound) are publishable infrastructure for BMO1.

**Strategy 2 — Backward route: finite suffix classification + per-family sign proofs.** (The community's classical route; gap is sharply defined.)
- Lemma 2.1 [done here for two families]: for each *template family* the value m+b−2 has a closed form with fixed sign. Exhibited: (<^n,>): (−n−11)/(2^{n+1}+3) < 0 ∀n; (>^n,<,²,>,<): (4^{n+1}+6n+104)/(3(7·4^{n+1}+5)) > 0 ∀n (limit 1/21). Next: enumerate and close all template families with limits on the line's neighborhoods, especially around Location 3's band.
- Lemma 2.2 (the real lemma): *every* word whose image lies within δ of m+b=2 with m ∈ [y\*, 13/7] (y\* = 7−3x\*, x\* = (3+√57)/6) must end in one of a finite, explicitly computable set of suffixes. Testable by exhaustive depth-25–30 computation (Ducharme's data is the depth-17 prefix); the proof would be an induction using the contraction of the suffix Möbius maps. This is precisely the audit's "structural lemma or covering argument".
- Lemma 2.3 (duality): make precise that the Location-3 fractal is the backward image of the repelling "rll" 3-cycle (x\*, y\*) — the band edges ≈ (y\*, 13/7) and the pile-up at m ≈ x\* (1145/651 ≈ 1.75883, 611281/347027 ≈ 1.76173) suggest the cluster set is the cycle's stable object with scaling y\* per level. A renormalization/self-similarity statement here would collapse the infinite family enumeration to a finite one.
- Why ranked second: lemmas 2.1/2.3 are concrete and partially done, but lemma 2.2 is a genuine open combinatorial-dynamics statement with exponential branching; failure risk high.

**Strategy 3 — α-route: formalize the equivalence, then hunt structure.** (Logically complete reduction already; what's missing is number theory.)
- Lemma 3.1 [routine, ~2 pages]: write the full equivalence — machine halts at N ⟺ α = g_{s₁…s_{N−1}}(1/2) — via nested intervals (this closes the audit's halt-case gap permanently, and would make a clean Lean/Rocq target; pairs well with the already-formalized reduction).
- Lemma 3.2 (acim for Bard's map f): f is full-branch increasing with slopes in (1,4] and {2} — not uniformly expanding (slope → 1 at ½), but the slow points are exactly the preimages of ½; prove f still admits a unique acim (via inducing on a subinterval away from ½, or via the topological conjugacy to S plus a Gibbs argument) and *identify the density in closed form* (the FP functional equation of f is explicitly solvable? — the solution space of f(x) = ρ((3x+1)/(2x+2))/(1+x)² + ρ(x/2)/2 deserves a dedicated attempt; numerically easy). This would for the first time give the *exact* model's 1D slice an ergodic theorem, and quantify how "typical" α's itinerary is.
- Lemma 3.3 (structure hunt): compute α to 10³–10⁴ digits; PSLQ/integer-relation search against algebraic constants and against ∫ρ; CF statistics vs the acim's Gauss–Kuzmin-type limit (if α is f-typical, its CF/pattern statistics converge to computable limits — measurable but not obviously provable for this specific point). Realistic outcome: confirmation that α is structureless, i.e., negative knowledge — but it also guards against the one miracle (α algebraic/periodic-itinerary) that would crack the problem.
- Why ranked third: the reduction is done; everything further is either routine formalization (3.1, worth doing for the record) or a long-shot search.

Anti-strategies (documented dead ends): open-set separation in the 1D limit (killed by Bard's density theorem); single-modulus modular invariant (killed here: diagonal residues hit for all M ≤ 200 tested, density ≈ 2/M; also ℤ²_M carries no well-defined dynamics); "spread is monotone" as a bare conjecture (3M steps of support, no mechanism); simulation beyond 10⁸ (exponentially uninformative).

---

## 7. Errata and clarifications found (for the wiki / authors)

1. **Wiki machine page, matrix section:** A′ is transcribed with first row "(1 1 4)", second "(2 −1 2)", third "(−4 −2 −1)". The PDF's matrices are A′ = [[11,4,2],[−12,−4,−2],[−10,−4,−1]], B′ = [[−2,−2,−1],[5,4,2],[3,2,2]], and the PDF's corner entries are the correct ones: r·A·v = 11 = A′₁₁, r·B·v = −2 = B′₁₁, and e₁ᵀP′e₁ = rPv holds identically (verified on 200 random words). The wiki's A′ appears garbled (B′ matches).
2. **Wiki machine page, Location 3:** the suffix generating the band 1.724<m<1.8556 is written "(<,<,<,>,<,>,<) = (<^4,(>,<)²) = (<^4,>,<,>,<)" — internally inconsistent (7 vs 8 operations). The correct word (verified by exhaustive word-search to reproduce the quoted Möbius form exactly) is the 7-operation sequence (<,<,<,>,<,>,<), i.e. **`<<<><><`**; the exponent form should read (<³,(>,<)²).
3. **Density normalization:** any source quoting "f(r) = 2 ln 3/((r+1)(r+3))" is off; the normalized density on r=b/a ∈ (0,∞) is f(r) = 2/(ln3·(r+1)(r+3)) (∫ = 1). The wiki's raw LaTeX is correct; rendered summaries have been garbled.
4. **Chaotic-map formula:** the raw wiki source F(x) = ln((eˣ−1)/4) (x>0), ln(2/(e^{−x}−1)) (x<0) is correct for x = ln(a/b) ignoring constants; summaries that drop the parentheses ("ln(e^x − 1/4)") are wrong. In the other convention (r = b/a) the branches swap: r ↦ 4r/(1−r) (r<1), (r−1)/2 (r>1).
5. **Bard PDF, mediant search description:** the bound-update rule as literally stated ("mediant takes the second path while our starting point takes the first ⟹ mediant too big") has flipped/inconsistent labeling relative to the x-coordinate; the algorithm's *limit* is unaffected (α reproduced exactly here). Also the one-paragraph matching-lemma proof covers only branch-matching (audit's halt-case point).
6. **Compositional pitfall (for anyone re-implementing α):** the itinerary interval is I_n = g_{s₁}(g_{s₂}(⋯g_{s_n}((0,1))⋯)) — in this nesting the newest branch g_{s_n} is applied *innermost* (the running interval is re-embedded by prepending older branches); updating a running interval by applying the newest g *outermost*-style (innermost update) converges to a wrong number (it passes 0.3136… at depth 130, matching only 3 symbols). This report's first attempt made exactly this error; recorded so it is not repeated. [Cross-validation note 2026-09-25: the formula above is correct; an earlier draft of this erratum mislabeled the order. The value 0.3136877116290085 was independently reproduced.]

---

## 8. F. Sources

**Primary (BMO1-specific)**
- Machine wiki page: https://wiki.bbchallenge.org/wiki/1RB1RE_1LC0RA_0RD1LB_---1RC_1LF1RE_0LB0LE (raw wikitext fetched; includes backward analysis, simplified model, spread data, Bard section)
- BMO page: https://wiki.bbchallenge.org/wiki/BMO (problems 1–11, statuses)
- Bard PDF: https://wiki.bbchallenge.org/w/images/9/94/BMO1-Bard.pdf (text extracted in full)
- Matrix write-up: https://wiki.bbchallenge.org/wiki/File:BMO1_Matrix_Problem.pdf → actual file https://wiki.bbchallenge.org/w/images/7/71/BMO1_Matrix_Proof.pdf (text extracted in full)
- April 2026 audit: https://raw.githubusercontent.com/rwst/bbchallenge/main/1RB1RE_1LC0RA_0RD1LB_---1RC_1LF1RE_0LB0LE/previous-work/critique.md (= wiki "Review 2026-Apr-19 by Opus 4.7")
- Lean (reduction, complete): https://github.com/rwst/bbchallenge — `1RB1RE_1LC0RA_0RD1LB_---1RC_1LF1RE_0LB0LE/machine.lean`; artifacts `pass_shift_findings.txt`, `zebra_cycle_findings.txt`, `previous-work/machine.wiki`
- Lean (statement): https://github.com/google-deepmind/formal-conjectures — `FormalConjectures/Other/BeaverMathOlympiad.lean`
- Math.SE: https://math.stackexchange.com/questions/4939082 (question + Sil's answer, fetched in full)
- Turing-completeness thread: https://discuss.bbchallenge.org/t/bmo1-type-problems-are-turing-complete/305 (star, sligocki; LIATA construction)
- PAF wiki page: https://wiki.bbchallenge.org/wiki/Piecewise_Affine_Function
- bbchallenge entry: https://bbchallenge.org/1RB1RE_1LC0RA_0RD1LB_---1RC_1LF1RE_0LB0LE
- Discord logs (quoted on wiki; not directly fetchable): @-d 25 Jun 2024; Ligocki 25–26 Jun 2024; savask 26 Jun 2024; dyuan01 26 Jun 2024; Ducharme 27 Jul 2024.

**Academic**
- J. Cassaigne, V. Halava, T. Harju, F. Nicolas, "Tighter Undecidability Bounds for Matrix Mortality, Zero-in-the-Corner Problems, and More", arXiv:1404.0644 (Z(5,3×3), Z(3,5×5), Z(2,9×9) undecidable; two 3×3 generators open)
- A. M. Ben-Amram, "Mortality of iterated piecewise affine functions over the integers: decidability and complexity", STACS 2013, LIPIcs 20, 514–525; Computability 4(1):19–56 (2015), doi:10.3233/COM-150032 (Π⁰₂-complete dim ≥ 2; PSPACE-complete dim 1 PAF; PTIME affine)
- V. Blondel, O. Bournez, P. Koiran, J. Tsitsiklis, "Deciding stability and mortality of piecewise affine dynamical systems" (2001) — dim-2 undecidability ancestor
- M. Braverman, "Termination of Integer Linear Programs", CAV 2006, LNCS 4144 (PDF mbraverm.princeton.edu/files/terminationCAV.pdf): dim-2 linear-loop decidability; point-termination open; CF-of-log-β example
- Q. Guilmant, E. Lefaucheux, J. Ouaknine, J. Worrell, "The 2-dimensional constraint loop problem is decidable", ICALP 2024 (over ℝ)
- M. Carelli, "Loop Termination and Generalized Collatz Sequences", ICALP 2026, LIPIcs 374 (1-variable loops ⟺ GCS conjectures)
- D. Romik, "The dynamics of Pythagorean triples" (subtractive Euclid, σ-finite invariant measure); K. Dajani, "Ergodicity of N-continued fraction expansions" (greedy vs lazy N-expansions); arXiv:2605.21098 ("strange" CF associated with the Romik map) — nearest known relatives; none has our exact finite invariant density or map.
- BB(5) paper (mentions BMO1 as open reformulation): "Determination of the fifth Busy Beaver value" (bbchallenge collaboration).

---

## Appendix. Computations performed for this report (all scripts in `temp/`)

`verify.py`/`verify2.py` (branch sequence 5000 steps; α nested-interval construction; 1D map preimages; odd-denominator lemma 3000 trials; density histogram 600k steps; drift quadrature + MC simplified/exact 1.2M steps; loc1/loc2 closed forms exact n≤12; matrix corner + conjugation + sign lemma; rll cycle; first-10-pairs), `alpha_diag.py`/`alpha2.py` (α convention diagnosis and exact reproduction, |I_n| shrinkage), `fix.py` (z_n = 1/(a_n+b_n+1) identity, 500 exact steps; Location-3 word search over all words ≤ 9: unique match `<<<><><`), `strategy_probes.py`/`strategy_probes2.py` (mod-M analysis: naive version invalid — no residue dynamics; corrected 30 000-step exact simulation: diagonal residues hit for all M, densities ≈ 2/M; α CF 60 terms), `conjugacy.py`/`mixing.py`/`expanding.py`/`slopes.py` (conjugacy exploration, Lebesgue preservation, autocorrelations, analytic slopes with finite-difference cross-check — including the detection and correction of a factor-3/2 bug in a first derivative routine).

Environment: LibreOffice Python 3.13 (no external packages); exact rational arithmetic via `fractions.Fraction` for all α, z, closed-form, and matrix computations. Key reproducible numbers: α = 0.3621250257705563 (matches Bard), |I₆₃| ≈ 3.2×10⁻¹⁷, drift closed form 0.15097694450241966, MC exact-map drift 0.151065, z_500 = 6.8×10⁻³⁶ = 1/(a₅₀₀+b₅₀₀+1), x\* = (3+√57)/6 = 1.7583057392, S-slopes 4(r+1)/(3r+1), 2(r+3)/(r+5), min 4/3.
