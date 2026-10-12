# BB(6) Holdout Research — Campaign Archive

Private research archive (2026-09-25 → 2026-10-12). Structural analyses of BB(6) Busy Beaver holdout machines.

**Start here: [`campaign-results.tex`](campaign-results.tex) / [`campaign-results.pdf`](campaign-results.pdf)** — the complete compiled results of the campaign (Chinese, theorem-proof form, full graded ledger).

## What's in here

Six deep-dive holdout machines, all with complete structural theories and **conditional** non-halting certificates (none lifted the undecided status; all six remain in mxdys's ledger as of 2026-10-12):

| Machine | Code | Verdict | Hard unconditional part | Wall (proven hard) |
|---|---|---|---|---|
| M1 | `1RB1LA_0RC0RD_1LC1LA_1RE1RD_1LF0LA_---0LE` | never halts (conditional, ~98%) | halt-branch unreachable (dominance lemma); classes ≤2000 ⟹ ≥ ~2^(2^2000) steps | Assumption M ≡ ν₂ record-timetable (periodicity-excluded) |
| cm2 | `1RB1RA_1LC0RC_---0LD_0LE0RF_1RE0RA_0LF1LB` | never halts (conditional, ~90%) | halt characterization; sweeping theorem; lethal-set map; >3×10^10 steps if halts | M2/M1-restart avoidance (Conway-class) |
| cm16/26/51/52 | (see campaign-results §1) | never halts (conditional) | halt criteria ×4 (204,800-config casecheck); island invariant; >2×10^11 steps | five-cell head-far avoidance (key-graph ladder diverges) |

Negative-result theorems: M1 periodicity exclusion, necessary precision (invariant synthesis impossible), cm2 residue-class failure (L6-grade), quad key-graph divergence. Family-level conclusion (triply confirmed): the deep Cubic Mess holdout cores sit uniformly in the **Conway-type piecewise-affine trajectory class** (paradigm audit: changing language does not alter solvability).

Maps: 91-machine Cubic/Quadratic Mess triage (`attack-next.md`), 279-machine Shift-overflow counter survey (`soc-map.md`), 40 Hamming-1 mutant pairs quantified (`soc-port/`) — 13 robust candidates incl. the U-machine shadow (verified to 2×10^10 steps) remain the highest-value continuation targets.

## Papers

- `campaign-results.tex/.pdf` — everything, compiled (start here)
- `M1-nonthalt.tex` / `M1-nonthalt-r2.pdf` — M1 conditional main theorem + envelope + exclusion theorem (English)
- `M1-reduction-zh.pdf` — M1 reduction chain, complete derivations (Chinese)
- `cm2-proof-full-zh.pdf` — cm2 complete proof edition (Chinese; referee-downgraded to conditional in final rounds, see ledger)
- `M1-report-zh.pdf`, `cm2-nonthalt-zh.pdf` — reports
- `community-post.md`, `community-wiki-page.md` — unfinalized community drafts (M1 only)

## Verification discipline

Every claim is graded A (transition-level exhaustive / full written algebra) / A− (finite case tables + structural induction) / B (finite-depth orbits) / C (assumption-dependent). Two adversarial refereeing rounds caught 12 majors (all fixed); transcription discipline caught 6 transcription errors; independent recomputation passed 16/16; hand-typed table cross-check closed the shared-transcription risk. Retractions on record: mod-3 invariant (11,232 counterexamples), pop ranking (twice), D3 formula. All machine assertions rerun in one line — entry points in `campaign-results.pdf` §8.

## Directory map

- `attacks-sparse2/` — M1 engines, tables (`sym4-table.txt`, `ladder.json`), blind-test recipe
- `attacks-cm2/` — cm2 engines, census/dispatch/closure/lethal-db
- `attacks-quad/` — quad engines, casecheck-halt/island, kclosure
- `soc-work/`, `soc-port/` — family surveys and port audit
- `attack-*.md` — per-machine dossiers (lemma–proof–machine triples)
- `REPORT.md`, `SESSION-STATE.md` — chronological campaign log and resumption hub
- `referee-report*.md`, `reverify-report.md`, `cm2-reverify-report.md` — adversarial reviews and audits
- `paradigm-audit.md` — Conway-class formal localization
