# 1RB1LA_0RC0RD_1LC1LA_1RE1RD_1LF0LA---0LE (wiki page draft, to be pasted at wiki.bbchallenge.org under the machine code title)

**Status**: undecided (per holdout ledger). Family: "Cubic Mess" (ledger classification).

**Summary of known analysis** (2026-09-26, complete structural study; see forum post in *Individual machines* for the announcement and artifacts):

- Blank tape → `P(3)` at step 54; dynamics between D-on-0 events governed by a 9-rule phase calculus (R/S/G/L grammars).
- Anchor family `P(n)` (n ≡ 3 mod 6 on-orbit); prologue = exact halving chain of length ν₂(n+3) into Φ(w,m) = G(w−1,w−1,2w,4w,…,2^m w−1).
- Landmark theory: trajectories visit L(α,t;s), α ≡ 1 mod 6, class h = ν₂(α+1); round law Δα(h) ≡ 0 mod 6, 2 ≤ Δt(h) ≤ 40 (observed ≤ 9), proven by strong induction on h (halving cascade + universal ladder + master segment) for all h ≤ 2000 exhaustively, sampled to 1.2×10⁷.
- **Non-halting, unconditional core**: the halting configuration G(3,·) is structurally unreachable (head form a+1 = 2^j·odd≥3; dominance inequality positive for h ≥ 82, perturbation-robust; 2980/2980 counterfactual single/sparse flips safe; adversarial profiles 2-adically unrealizable).
- **Unconditional envelope**: non-halting for all runs with classes ≤ 2000 (doubly-exponential horizon).
- **Conditional theorem**: never halts, assuming master closure for all classes (Assumption M).
- **Obstruction theorem**: Assumption M ≡ the ν₂-chaos of the autonomous walk's record timetable (records climb ×4 per level; no cycle exists — Brent over 1.25×10⁹ steps, 2.4M pairwise-distinct ladder residues). No finite closure within this architecture.

**Cross-references**: Cubic Mess family (58 undecided siblings); methodology transfers to siblings where record events don't carry load. Related obstructions: BMO1-type irrationality gaps; Antihydra-type chaotic-behavior hardness.

**Artifacts**: 9-page paper (LaTeX/PDF), narrative `attack-sparse2.md` (lemma–proof–machine triples), all engines and verifiers (Node.js, laptop-scale).
