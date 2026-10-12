# BB(6) Holdout Research — Campaign Archive

Private research archive (2026-09-25 → 2026-10-13). Structural analyses of BB(6) Busy Beaver holdout machines.

**Start here: [`campaign-results.tex`](campaign-results.tex) / [`campaign-results.pdf`](campaign-results.pdf)** — every result stated as: what was obtained (graded A = transition-level exhaustive / full written algebra; A− = finite case tables + structural induction; B = finite-depth orbit observation, depth stated), the precise residual, and the research field the residual belongs to. **No confidence estimates; no unproven claims.** None of the six machines' undecided status changed (ledger checked 2026-10-12).

## The six deep-dive machines

| Machine | Code | Conditional theorem | Unconditionally obtained | Residual → research field |
|---|---|---|---|---|
| M1 | `1RB1LA_0RC0RD_1LC1LA_1RE1RD_1LF0LA_---0LE` | never halts, conditional on Assumption M | halt-branch unreachable (A); non-halting for all runs with round classes ≤ 2000 (A/A−); step translation ≳2^(2^2000) rests on a B-level timing law | Assumption M ≡ record-timetable continuation of the affine walk α↦α+Δα(ν₂(α+1)) → generalized Collatz / piecewise-affine iterations (undecidability: Conway 1972; independence: Kurtz–Simon 2007); periodicity-exclusion and necessary-precision theorems locate it inside this class |
| cm2 | `1RB1RA_1LC0RC_---0LD_0LE0RF_1RE0RA_0LF1LB` | never halts, conditional on trajectory-avoidance | halt characterization (A); sweep conservation Q=L−3R (A); lethal preimage set P, 193 cells each bare-machine-verified (A); halts ⟺ orbit enters P (A−); if halts > 3×10^10 steps (B) | trajectory avoidance for the sweep-restart piecewise-affine system; residue-class route proven impossible; three closure techniques deterministically fail at M2/M1 restarts → same Conway-class field |
| cm16/26/51/52 | (codes in campaign-results §3) | never halts, conditional (per machine) | halt criteria ×4, enumerated and casechecked separately per machine (A, 204,800 configs); island invariant (A−); unified lap grammar verified per machine (A−, ~780k anchors); guard 2×10^11 ×4 zero threats (B) | head-far avoidance of the danger 5-cell pattern — per-machine trajectory property; key-graph local-abstraction route dead (ladder diverges ×3.1/radius); same field by shape analogy (stated as such, not formally restated) |

**Quad machines' relationship**: layered verified correspondence — uniform lap grammar (each machine verified separately), 562-era alignment at constant offsets (B-level observation), frozen-skeleton-only identity — **no isomorphism theorem**; assembly done per machine.

## Negative-result theorems

M1 periodicity exclusion (no finite-state closure — verified non-periodicity + structural argument); necessary precision (no fixed-modulus/linear invariant excludes the halt state — 4-edge counterexample chain); cm2 residue-class failure (3×3 already collides; M2/M1 restarts not residue-determined); quad key-graph divergence. All retractions on record (mod-3 invariant, pop ranking ×2, D3 formula, bitwise-identity correction, cm2's retracted C=0).

## Maps and port audit (observational, depths stated)

- 91-machine CM/QM triage (10^9 steps each); 279-machine SOC survey (10^7 + 3×10^8 each; four structural prototypes as heuristic labels)
- 40 Hamming-1 mutant pairs quantified: 13 tight-shadow candidates (main target U shadow-verified to 2×10^10 steps against its Rocq-proven twin), 22 fork-persists, 5 hot-diff; **decided 0** — each requires an original era-map induction (hundreds of lines Rocq-grade), not lemma transfer

## Papers

`campaign-results.tex/.pdf` (start here) · `M1-nonthalt.tex`/`M1-nonthalt-r2.pdf` (conditional main theorem, English) · `M1-reduction-zh.pdf` (complete reduction derivations, Chinese) · `cm2-proof-full-zh.pdf` (its early C=0 claims superseded by the referee round — final ledger in `attack-cm2.md` and campaign-results) · `M1-report-zh.pdf` · unfinalized community drafts (`community-post.md`)

## Verification discipline

Two adversarial refereeing rounds (12 majors found, all fixed); transcription discipline (6 transcription errors caught); independent recomputation 16/16; hand-typed table cross-check closing the shared-transcription risk. Every machine assertion reruns in one line — entry points in campaign-results §6.

## Directory map

`attacks-sparse2/` (M1) · `attacks-cm2/` (incl. `lethal-db.json`) · `attacks-quad/` · `soc-work/`, `soc-port/` (maps/port) · `attack-*.md` (per-machine dossiers) · `REPORT.md`, `SESSION-STATE.md` (chronological log) · `referee-report*.md`, `reverify-report.md`, `cm2-reverify-report.md` (reviews/audits) · `paradigm-audit.md` (Conway-class localization)
