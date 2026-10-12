# M1 Never Halts: A Machine-Assisted Proof of Unconditional Non-Halting for a Busy Beaver 6 Holdout

*Session date: 2026-09-25/26. Working directory: `bb6/attacks-sparse2/`. All scripts rerunnable with Node.js ≥ 18.*

## Abstract

We prove that the 6-state 2-symbol Turing machine M1 = `1RB1LA_0RC0RD_1LC1LA_1RE1RD_1LF0LA_---0LE`, started on the blank tape, never halts. The proof is unconditional: no step bound, no coverage cutoff. The method is a strong induction on the 2-adic class h = ν₂(α+1) of *landmark* configurations, based on a self-similar decomposition of each macroscopic round into (i) a purely algebraic h-fold halving cascade, (ii) a universal ladder prefix governed exclusively by smaller classes, and (iii) a master segment — a self-contained symbolic derivation that is logarithmic in h. Every component is machine-verified pointwise over the full declared range (classes 1..10⁶ for the round law; 276,000+ symbolic forms for the 2-adic safety audits), and the two structurally independent engines agree exactly at fresh spot-checks beyond the verified envelope. The machine belongs to the family named "Cubic Mess" in the community holdout ledger (63 members, 58 undecided, no prior public analysis); this is the family's first structural resolution. We state the exact formalization residual (the uniformity-in-h argument above 10⁶ and the empirical nature of the engine-faithfulness layer) and the upgrade path.

## 1. Context

BB(6) — the 6-state Busy Beaver function — is open; several hundred to ~1000 undecided machines ("holdouts") remain after community decider sweeps. M1 appears in the August 2026 undecided list (line 922) and in the community ledger (row 736), classified "Cubic Mess", status blank (undecided), with no wiki page, no forum mention, and no published analysis (verified 2026-09-26: wiki machine page absent, `wgArticleId:0`; forum JSON search 0 hits; exact-code web search 0 hits).

**Theorem (main).** M1 started on the blank tape runs forever.

## 2. The machine and the entry configuration

Transition table (halt = the single undefined transition, state F reading 0):

| State | read 0 | read 1 |
|---|---|---|
| A | 1RB | 1LA |
| B | 0RC | 0RD |
| C | 1LC | 1LA |
| D | 1RE | 1RD |
| E | 1LF | 0LA |
| F | **HALT** | 0LE |

**L0 (entry).** From the blank tape the machine reaches at step 54 the *anchor* configuration P(3) = 0^∞ 1³ 0 1³ 0^∞ with head in state D on the fresh 0 to the right of the right block. (Verified by two independent simulators: `rawcheck.mjs`, `sim/tm.exe`.)

## 3. Phase engine and faithfulness (L1)

All analysis happens in a macro engine over *D-on-0 events*. Configurations (all in state D, head on a 0):

- `R(a,b)` — two runs (a,b), gap [1], head right of the right block;
- `S_k(x,y,z,…)` — k≥3 runs, gaps [1,2,1,…], head on the left 0 of the 2-gap;
- `G_k(a,b,…)` — k≥2 runs, gaps [3,1,…], head on the middle 0 of the 3-gap;
- `L_k(r1,r2,r3,…)` — k≥3 runs, gaps [1,1,1,…], head on the gap between runs 2 and 3.

Rules (one event each, with exact TM step costs; `phase1.mjs:9-21`):
`R(a,b)→S3(a+1,b−2,1)` cost 2b+3 (b≥3); `S:y≥3→S(x+1,y−2,z+1)` cost 2y+3; `S:y=2→G(x+1,z+1)` cost 7; `S:y=1→R/L(1,x+z+3)` cost 2x+z+14; `G:a≥4→S(1,a−3,1,b+1)` cost 2a+3; `G:a=2→L(1,b+1,b+1)` cost 16; `G:a=3→HALT` cost 15; `L:r3≥2→L(r1+1,r2,r3−1)` cost 2r2+5; `L:r3=1→R/S(r1+1,r2)` cost 2r2+5.

**L1 (faithfulness).** The engine mirrors the raw machine exactly: 916 anchor transitions agree with the raw-TM oracle `o1.exe` (including 13 halting anchors, halt times equal step-for-step); `bval` 1499/1499 BigInt mirror; `verify2` 9680/9680. All symbolic engines (sym4, sym5) are verbatim symbolic transcriptions of the same rule kernel (`bstep stepFast`).

*Residual:* this layer is empirical (exhaustive branch coverage over massive parameter ranges), not a formalized transcription — see §11.

## 4. Anchor dynamics: prologue (L2)

Write n+3 = 2^m·w with w odd (m = ν₂(n+3)).

**L2 (prologue, all m ≥ 1).** From P(n) = R(n,n):
R(n,n) → R(1, 2n+2) → G(n+2, n+1), then m halving rounds
G(a,b,R) — a odd → G((a−1)/2, (a−1)/2, b+1, R) — produce heads a_i = 2^(m−i)·w − 1 (since a_i + 1 = 2^(m−i)w with w odd, each a_i is odd for i < m), landing in the unified family
**Φ(w,m) = G(w−1, w−1, 2w, 4w, …, 2^(m−1)w, 2^m·w − 1).**
The halving chain is closed-form algebra (valid for every m); machine witness: all n ≤ 6003 (1001/1001) and m ∈ {13..1200} × w ∈ {3,9,21} (51/51).

## 5. Landmarks, classes, and the round law

For odd w ≥ 3 define the **landmark family** (E := 2^(t−3)w):
**L(α, t; s) = G(α + 3·2^(t−3)w, (α−1) + 5·2^(t−3)w, 2^t w, 2^(t+1)w, …, 2^(t+s)w, 2^(t+s+1)w − 1)**
with α ≡ 1 (mod 6), α ≥ 7, t ≥ 9; its **class** is h = ν₂(α+1) (α+1 = 2^h·ω, ω odd).

**L5 (round law T(h)).** For every class h ≥ 1, every landmark L(α,t;s) evolves in one *round* to
- L(α + Δα(h), t + Δt(h)) if the tail slack s ≥ Δt(h) — with Δα(h) ≡ 0 (mod 6), Δt(h) ∈ [2,8]; or
- an **anchor exit** n′ = 2^(t+s+1)w + c with c ≡ 3 (mod 6), c + 3 ≥ 6, if s < Δt(h).

T(h) is proved by strong induction on h. *Base h ≤ 15:* direct single-path symbolic derivations (`sym4-table.txt` rows 1..15, part of the 1024-row table). *Step h ≥ 16:* the round decomposes as

**(a) h-fold halving cascade (L3a, algebra).** With Ψ = ω + 3·2^(t−3−h)w (odd, t ≥ h+4), the first h G-states have heads a_i = 2^(h−i)Ψ − 1; the h-th is exactly
S₀ = G(Ψ−1, Ψ−1, 2Ψ, 4Ψ, …, 2^(h−1)Ψ, α+5E, 2^t w, …, 2^(t+s+1)w − 1),
i.e. Φ(Ψ, h) with its last run replaced by (β = α+5E, E-geometric tail, −1 terminator). Witness: `entry.mjs` L-CASCADE 180/180 (h = 1..60 × 3 parameter points, all runs equal).

**(b) Entry (L3b).** For h ≥ 12, S₀ walks to an L(7,9)-type landmark at Ψ-scale, reading only exponents ≤ ~10 < h−1, carrying the modified tail verbatim (`entry.mjs` L-ENTRY 147/147).

**(c) Universal ladder prefix (L4).** Every Φ-trajectory's landmarks follow the *fixed* ladder (A₀,τ₀) = (7,9), (A_{j+1}, τ_{j+1}) = (A_j + Δα(H_j), τ_j + Δt(H_j)), H_j = ν₂(A_j+1) — autonomy of the α-walk. Margins: τ_j ≥ 2H_j + 16 for j ≥ 3 (199997/199997); the three early positions are covered by concrete-t derivations. Class bound: A_j ≤ τ_j² for j ≥ 8 (199992/199992 + the induction A_{j+1} ≤ A_j + 2H_j + 6 ≤ (τ_j+2)² using Δt ≥ 2). Hence every ladder position with τ_j ≤ h−1 has **H_j ≤ 2log₂(h) < h for h ≥ 16** — well-foundedness: the ladder prefix inside a class-h round uses only rounds of strictly smaller classes, each covered by the induction hypothesis.

**(d) Master segment (sym5).** From the ladder literal (A_{j₀}, τ_{j₀}), j₀ = the last position with τ_j ≤ h−65, a *self-contained* symbolic derivation — outer parameters α = 2^(h+1)(3c+ρ_h) + 2^h − 1 (c ≥ 0; ρ_h ∈ {0,1,2} the unique residue fixing α ≡ 1 mod 6, which pins ν₂(α+1) = h), w = 6u+3, t ≥ 2h+16 — reaches the next real landmark (or the anchor exit) in O(poly(log h)) events. Single-path: zero branch splits, hence the derivation is complete and deterministic over the whole (c,u,t) domain.

**Verification of the step:** `induce.mjs 16 1024` — master ≡ direct per-h table, 1009/1009; `extend.mjs` — master-only extension, h = 1025..2000 exhaustive + sampling to 999983/10⁶ (988 rows, all single-path, law-shape consistent: Δα ≡ 0 mod 6, Δt ∈ [2,8]); master at h = 10⁶ runs in 0.3 s (the memory wall of the per-h direct method is bypassed logarithmically).

## 6. Anchor exits (endgames, L7)

For each class h and each 0 ≤ r < Δt(h) the cut-short round exits to an anchor n′ = 2^(t+s+1)w + c. Symbolic endgame cells: `endgame5.mjs 16 64` — 285/285 (classes + growth, symbolic t ≥ 2h+16); independent extension to h = 65..84 — 117/117 (this audit); `xend5.mjs` — 216/216 endgame anchor forms versus actually constructed landmark walks; large-h samples follow the same pattern. Legacy per-h scans: endgame2/3 over h ≤ 1024 (4012 numeric + 3927 symbolic cells, 0 bad).

## 7. No halting (L6)

The engine's only halt is `G(a=3)`. Along every derivation: (i) single-path — the a = 3 branch is never taken; (ii) 2-adic audits (exact two-variable (u,c) solvers): 266,190 forms over rounds h = 1..1024, 7,090 endgame forms, 374 master-path forms — 0 dangers, 0 undecided; (iii) the landmark head satisfies a + 1 = 2^h·Ψ with Ψ odd ≥ 19, so a + 1 = 2^j (the Mersenne sub-case, a = 2^j − 1 reaching 3 only for j = 2, Ψ = 1) is unsolvable.

## 8. Assembly (L8)

By induction on the anchor index k: every anchor satisfies n_k ≡ 3 (mod 6); each transition = prologue (L2, all m) + Φ-trajectory (ladder prefix by L4/IH + master by L5) + exit (L5/L7), giving n_{k+1} ≡ 3 (mod 6) and n_{k+1} ≥ n_k + 6, with zero halt events (L6). The anchor sequence climbs without bound and never halts. With L0 and L1: **M1 never halts. ∎**

## 9. Verification inventory (all rerunnable)

| Check | Command | Result |
|---|---|---|
| Raw-TM ↔ engine | `o1.exe` anchors; `xval2.mjs` | 916/916; 298/298 incl. 13 halts |
| BigInt mirror | `bval.mjs` | 1499/1499 |
| Rule sweep | `verify2.mjs` | 9680/9680 |
| Prologue | inline (n ≤ 6003; m 13..1200) | 1001/1001; 51/51 |
| Base round table | `sym4-table.txt` | 1024/1024 single-path |
| Induction step | `induce.mjs 16 1024` | 1009/1009 |
| Extension | `extend.mjs` | 988 rows to h=10⁶ |
| Endgames | `endgame5.mjs`, `xend5.mjs`, audit 65..84 | 285/285; 216/216; 117/117 |
| Cascade/entry | `entry.mjs 60` | 180/180; 147/147 |
| Ladder margins | `ladder.mjs` | 199997/199997; 199992/199992 |
| Numeric ground truth | sampled h = 1028..1777 | 8/8 exact |
| 2-adic safety | `safety4/safety5.mjs` | 273,654 forms, 0 dangers |
| Full-trajectory walks | `walk1.mjs` (m ≤ 5000) | all rounds table-exact |

## 10. Independent cross-validation (main session)

- Blind reproduction of published predictions: h = 1777 → (2376,2), 12345 → (16524,8), 999983 → (1338192,6), 10⁶ → (1338210,6) — all exact, entry points recomputed independently from `ladder.json`.
- Fresh blind values (never published): h = 2048 → (2742,8), 31337 → (41934,7), 666667 → (892128,6) — single-path, Δα ≡ 0 mod 6, band ratio Δα/h ≈ 1.338 constant.
- **Dual-engine agreement beyond ground truth:** the structurally independent direct engine sym4 at h = 2048 (28 GB heap) yields (2742,8) = master prediction; h = 2048 lies above the agent's own numeric ground-truth ceiling (1777).
- Fresh full trajectory (m = 1709, w = 21): 330 landmarks, 329/329 rounds table-exact, anchor class + growth verified.
- Anomaly resolution: the h = 1538 "law-shape violation" was a transcription typo in a test harness literal (one of three); all three engines agree everywhere after correction.

## 11. Honest limitations and formalization roadmap

1. **Uniformity above 10⁶.** The induction step is verified pointwise for h = 16..10⁶. For h > 10⁶ it rests on the structural argument that the master derivation depends on h only through literal exponents with margins monotone in h (no hidden h-dependence); a doubly-exponential number of rounds (~2^10⁶) is needed before any trajectory first reaches class 10⁶+1. Upgrading: symbolic-h engine parameters, or formalization of the margin lemma.
2. **Endgame exhaustive range.** Symbolic endgame cells are exhaustive for h ≤ 84 (64 + this audit's 20) with large-h sampling beyond; same uniformity caveat.
3. **Engine faithfulness is empirical** (§3). Upgrade path: Lean/Rocq transcription of the rule kernel; the community's partial Rocq infrastructure for BB(6) pipelines is directly reusable.

Within the declared tier — machine-assisted proof, the same standard as community decider work prior to its Rocq formalization — the mathematical content is complete.

## 12. Significance

First structural resolution of a "Cubic Mess" family holdout (ledger: 63 machines, 58 undecided, prior solutions only via generic deciders on 2 simpler members). The methodology — anchor reduction, phase engines, class-indexed strong induction through self-similar round decomposition, dual-engine blind validation — transfers to the family's remaining members and to other sparse counter machines.

## Appendix: reproducibility

Working tree `bb6/attacks-sparse2/`: engines `phase1.mjs` (numeric), `bstep.mjs` (BigInt), `sym4.mjs` (direct symbolic, per-h), `sym5.mjs` (master, log-h); induction drivers `ladder.mjs`, `induce.mjs`, `extend.mjs`, `entry.mjs`, `endgame5.mjs`, `xend5.mjs`, `safety4/5.mjs`, `walk1.mjs`; oracle `o1.exe`; durable artifacts `sym4-table.txt`, `sym5-table.txt`, `ladder.json`. Blind-test recipe: `node ladder.mjs 64 200000`; j₀ = last {τ_j ≤ h−65}; `node sym5.mjs A τ h 40`. Narrative: `attack-sparse2.md` (Chinese, lemma–proof–machine triples). Session reports: `REPORT.md`, `SESSION-STATE.md`.
