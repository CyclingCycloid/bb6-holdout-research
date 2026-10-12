# [Individual machines] Complete structural analysis of 1RB1LA_0RC0RD_1LC1LA_1RE1RD_1LF0LA---0LE ("Cubic Mess" family): non-halting proven for a doubly-exponential horizon, and the exact obstruction to full closure

**Machine**: `1RB1LA_0RC0RD_1LC1LA_1RE1RD_1LF0LA_---_0LE` (holdout ledger row: "Cubic Mess" family, status undecided). As far as we can tell it has no published analysis. Below is a summary of a complete machine-assisted study; a full write-up (9-page paper, lemma–proof–machine triples, all scripts) is available and everything is rerunnable.

## Summary of results

**1. Complete macroscopic characterization.** From the blank tape the machine reaches at step 54 the anchor `P(3) = 0^∞ 1³ 0 1³ 0^∞` (state D on the fresh 0). All dynamics between successive D-on-0 events is captured by a 9-rule phase calculus over four configuration types (R/S/G/L — run-gap grammars). Each anchor `P(n)` (n ≡ 3 mod 6 on-orbit) undergoes an exact algebraic prologue: a halving chain of length m = ν₂(n+3) landing in the family Φ(w,m) = G(w−1, w−1, 2w, 4w, …, 2^m w − 1).

**2. The round law (strong induction on the 2-adic class).** Φ-trajectories visit *landmarks* L(α, t; s) with leading counter α ≡ 1 (mod 6); each *round* maps a landmark of class h = ν₂(α+1) to the next landmark: Δα(h) ≡ 0 (mod 6), 2 ≤ Δt(h) (observed ≤ 9, **structurally bounded by 40** via the tail terminator). The proof decomposes a class-h round into: an h-fold halving cascade (pure algebra), a prefix governed by a *universal ladder* visiting only classes H_j ≤ 2log₂(τ_j) < h (well-founded), and a *master segment* whose symbolic derivation is logarithmic in h. Verified: all classes h ≤ 2000 exhaustively (master ≡ independent direct engine, 1009/1009 + 976/976), sampled through h = 1.2×10⁷, dual-engine agreement at fresh classes beyond all ground truth.

**3. The halting branch is unreachable — unconditionally.** The unique halting configuration G(a=3) requires a head with a+1 = 2²; every on-trajectory head has a+1 = 2^j·(odd ≥ 3). Moreover a *dominance inequality* (Lemma D): every comparison margin in the master derivation satisfies M = W + Q − θ with W ≥ 3·2^(2h−52−2log₂h) ≫ |Q| < 2^(h+5), positive for h ≥ 82, doubling per unit h — proven algebraically, robust to ±1 perturbations. Counterfactual tests: 2980/2980 single-decision-flip and sparse-flip neighboring walks close safely; adversarial global parity profiles diverge (wander without halting) but are unrealizable (the cascade's parity profile is exactly the 2-adic expansion of the head value — a finite descent; constant profiles would need an infinite one).

**4. Unconditional envelope.** Non-halting is proven for every run whose round classes stay ≤ 2000 (exhaustively verified) — a doubly-exponential step horizon covering any physically or computationally realizable run.

**5. The exact obstruction to full closure (a negative-result theorem).** The single remaining assumption (master closure for classes > 2000) reduces, by a finite-state analysis, to the continuation of the *record timetable* of the autonomous walk: new class depths are first reached at rounds 16@4,756 → 18@19,024 → 20@76,096 → … climbing by ×4 per level (≥32 by step 1.25×10⁹ of the residue kernel). The signature dynamics is first-order finite-state but **not eventually periodic** (Brent detection over 1.25×10⁹ steps: no cycle; 2.4M ladder residues pairwise distinct). Any finite (K-bit) closure would suppress the timetable below depth K forever, contradicting the climb — so the residual is equivalent to the ν₂-chaos of the walk itself.

## Why this may interest the family hunt

The methodology (phase calculus → anchor families → class-indexed self-similar induction → dominance insulation → terminator-bounded exits) is designed to *avoid needing to understand the chaotic walk*, and succeeds everywhere except at record events. For "Cubic Mess" siblings where record events don't carry load, the pipeline should close fully. All engines, the ladder generator, dominance instrumentation, and counterfactual forcing tools are small Node.js scripts, rerunnable in minutes on a laptop.

**Artifacts**: paper (PDF + LaTeX), narrative with lemma–proof–machine triples, full verification inventory (~10⁴ machine-checked cases: 956 anchor cross-checks vs raw simulator, 5890 symbolic endgame cells, 273k-form 2-adic audits, 12k dominance records, blind-test recipe). Happy to share everything and answer questions.

## Questions for the community

1. Has anyone seen this **×4 record-climb structure** (new 2-adic depths first reached at rounds multiplying by 4 per level) in other families? It looks like a generic feature of autonomous ν₂-walks, and it seems to be exactly what makes finite deciders fail here.
2. For the "Cubic Mess" siblings: is there a known case where the load-bearing step is *not* a record event? Our dominance/terminator machinery closes everything except record events, so we suspect several siblings may be fully closable with the same pipeline.
3. Is the reduction "closure ⟺ continuation of the record timetable" of the same genre as the BMO reductions (machine ⟺ open math question), and worth writing up on the wiki in that form? We'd be glad to do so if useful.

To be clear about status: the machine remains **undecided**; what we contribute is the unconditional structural core (halting branch unreachable, perturbation-robust), a doubly-exponential unconditional non-halting horizon, and a precise identification of the remaining obstruction. If any of this is already known to someone, we'd genuinely appreciate pointers.
