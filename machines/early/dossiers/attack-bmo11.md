# Attack report: BMO 11 — the five-rule rewrite game of machine `1RB0LD_0LC0RE_1LA0RD_0RB0LC_1RC1RF_0LD---`

Date: 2026-09-25. Working directory: `bb6/attacks-bmo11/`. This report merges two attack sessions on BMO 11 in that directory (the main session and a continuation session whose C engines extended the numbers; all overlapping claims were cross-validated and agree exactly — see §7). Methodology adapted from `bb6/attack-bmo10.md`.

**Verdict: OPEN, with strong NO evidence, a completely decoded TM↔game correspondence (including the previously unresolved "regime change"), and a sharply identified proof obstruction of the same class as BMO 10's.**

- **Game**: no winning sequence exists within **127 rewrites over all strategies** (≈1.1×10^8 distinct canonical states, exhaustive BFS, C engine cross-validated against two independent JS engines through depth 100); **`#10111` — the exact local shape of a win — never occurs in any visited state, nor in 3M random-order rewrites, nor in 3M rightmost-`#` rewrites** (0 occurrences in >10^8 words sampled cumulatively). But `111` and raw `10111` ARE reachable mid-word, so the tempting "forbid `111`" proof is false; the invariant target is exactly `#10111` + its supporting context family.
- **Machine**: does not halt in **10^9 steps**. The TM↔game correspondence is **fully decoded** (§6): the machine implements the **rightmost-`#` strategy** at a constant **10.400 TM steps per rewrite** (verified at 14 exact checkpoints spanning TM step 115 ↔ g 6 to TM step 286,801 ↔ g 27,560); the tape equals the `#`-deleted word `del(W)` at checkpoints; during the long del-silent `R3` cascades the machine uses the left part of its del-window as scratch (this, not an encoding change, is why naive `tape == del(W)` matching stops matching — the earlier probe's open puzzle, resolved); and the **halting condition is literally the game's win test**: the state chain `C1 → D0 → B1 → E1 → F1` reads the tape cells `1,0,1,1,1` — `10111` — symbol by symbol, halting in `F` iff all five match.
- **Proof obstruction**: local forbidden-substring invariants around `#10111` do not close. Two independent refinement runs (seeded `{#10111, 1#01}` and the win-prestate family) both march into ever-longer `#`-chain × 0-run contexts (`010#00`, `00#00`, `##10#00`, `00##10#10#`, `010#10#10#00`, `00100#10`, …) — the reachable language is not k-local: **`#`-runs grow unboundedly under general strategies (max `#`-run 4 at BFS depth 30 → 14 at depth 123) while 0-runs stay ≤ 4**, so a NO proof must reason about counters, exactly as in BMO 10.

---

## 1. The game and the exact goal condition (machine-checked)

Alphabet Σ = {0,1,#}; initial word `w0 = ⋯(10#)^∞ · 0^∞`. Rules (any occurrence, any order):

```
R1: #0     → 1         (destroys a #)
R2: #100   → 010#      (moves a # right by 3, keeps it behind a 0)
R3: #1010  → 1010##    (duplicates: one # in, two #s out, shifted right by 4; del-silent)
R4: #10110 → 10101     (destroys a #)
R5: #11    → 10        (destroys a #)
```

A `#` is *active* iff the word at it starts with an LHS (the five LHS are pairwise prefix-incompatible, so a move = choosing an active `#`). Question (BMO 11, wiki formulation by Mxdys 2026-08-03): does a finite rewrite sequence exist after which the **rightmost `#` is inactive**?

**Lemma 1 (dichotomy; mechanically re-derived twice, `verify11.mjs::dichotomy`, brute force over all 32 five-bit tails):** the rightmost `#` is inactive **iff its tail starts `10111`**. (Tail `0…`→R1, `11…`→R5, `100…`→R2, `1010…`→R3, `10110…`→R4; only `10111…` matches nothing.)

**Win-prestate analysis** (continuation session, gap/tail enumeration; one correction from the main session): a *final* winning state must contain `#10111`. One move before a win the word has one of the shapes: `#100·10111…` (R2), `#1010·10111…` (R3), or a rightmost-gap `g` with `g = 1011` exactly (R1/R4/R5 — the new tail then starts `1011·1…`), **or `g` starting `10111`** (the new tail starts with `g`; this case is missing from the continuation session's table but is subsumed for invariant purposes by forbidding `111`-free... it is *not* subsumed — see §5: only `#10111`-forbidding is both necessary and sufficient for a NO proof, since the final state itself must contain it).

## 2. Engine infrastructure (all machine-verified)

- `game11.mjs` — canonical engine. State = `ctx6(psi) + deviation`: deviation starts at the leftmost symbol differing from the periodic continuation; `psi ∈ {0,1,2}` is the pattern phase there; `ctx6(psi)` materializes 6 pattern symbols (`10#10#` / `0#10#1` / `#10#10`). Only the pattern-`#` *nearest* the deviation can ever be active (the other is followed by `10#`) — asserted as a canary. Canonicalization is **phase-aware** and must continue stripping **into the implicit right-infinite zeros** when the pattern expects `0` there (the leftmost deviation may live inside them). Two real bugs (phase loss; phase-rotating re-materialization) were caught by the built-in differential selftest (`node game11.mjs selftest`): 600 steps of rightmost-`#` play plus 4,000 random-order steps replayed move-for-move on an independent materialized-word engine, compared after every step.
- `bfs11.mjs` (JS BFS) and `bfs11.c`/`bfs11c.exe` (continuation session; 128-bit-hash dedup, exact canon port) — **cross-validated: identical per-depth state counts through depth 100**.
- `deterministic11.mjs`, `rmscan11.mjs` — rightmost-`#` play with two-sided padding (≥36 pattern symbols left, ≥24 zeros right; no boundary artifacts).
- `tm11.mjs` (own TM sim), `tm11c.c` (C port; identical state/head/span at 200,000 steps), `sim/tm.exe` (pre-existing; used for the 10^8 run).
- `verify11.mjs` — dichotomy + **two independent closure checkers** (brute-force context enumeration `checkClosure`; F-free-context backtracking `checkClosureFast`) cross-validated to identical violation sets; oracle-guided refinement with memoized corpus presence.
- `closure11.mjs` (continuation session) — factorized closure checker, same theorem.

**Closure theorem** (the proof vehicle): if (i) no `f ∈ F` occurs in `w0` and (ii) for every rule `L→R` and context `u·L·v` (|u|,|v| ≥ max|F|−1), whenever some `f ∈ F` occurs in `u·R·v` overlapping the rewritten part then some `f' ∈ F` occurs in `u·L·v`, then no reachable word contains any member of F. With `#10111 ∈ F`, Lemma 1 gives NO. Oracle use (corpus membership) is heuristic only; certificates are exact rule mechanics.

## 3. YES-hunt (exhaustive over all strategies)

| depth | states | max |S| | goal | `111` | `10111` | `1#01` |
|---|---|---|---|---|---|---|---|
| 44 (probe) | 37,429 | ~184 | no | 0 | 0 | 0 |
| 62 | 314,629 | 252 | no | 0 | 0 | 0 |
| 84 | 2,812,251 | 340 | no | 0 | 0 | 0 |
| 100 (JS) | 12,426,451 | 404 | no | 0 | 0 | 0 |
| 123 (C, `bfs128.log`) | 94,895,946 | ~500 | no | 0 | 0 | 0 |
| 127 (C, final) | ≈1.1×10^8 | ~510 | **no** | **0** | **0** | **0** |

(The C run's frontier buffer capped at depth 128.) Frontier grows ≈ 9%/level (BMO 11 is combinatorially far tamer than BMO 10). **No winning sequence of ≤ 127 rewrites exists.**

Deep play:
- **Random order**, 6 seeds × 500k rewrites (length-capped at 4,000 for trajectory diversity): **no goal; `#10111` 0; `1#01` 0**; but **`111` occurs 19,466×** (first ≈ step 1100, context `####1010#01011101`, i.e. born inside `#`-highway regions — mechanically: R1 creates `111` in contexts `#011` and `11#0`, both reachable, not only `1#01`) and raw **`10111` in 86 sampled states**, always mid-word, never after a `#`. 22 rightmost-tail-heads observed (`11101` and `11100` among them — still active via R5) — never `10111`.
- **Rightmost-`#` play** (`rmscan11.mjs`, 2M rewrites; `deterministic11.mjs`, 3M): **no goal; `#10111` 0; `1#01` 0; `1011#` 0**; `111` 53× and `10111` 37×, **all within the first ~600k rewrites, zero after** (transient chaos, then a clean regime). Region stabilizes ≈ 216 symbols; rule mix R1:R2:R3:R4:R5 = 1:1:2:0:1 exactly (R4 fired only 15 times, all early). Gaps between the two rightmost `#`s never contain `1011` interiorly; no exact state cycle in 3M rewrites. Stronger (continuation session, `det11-census.json`): **no distinct gap out of 1,019 (max length 127) contains `11` at all** — gaps are `11`-free `1010`-alternation words with occasional `00` (e.g. `101001010`, `0100101010`); and all 37 `10111` occurrences on the orbit (g ∈ [439, 442,674]) sit inside `·1011101·` — followed by `01`, never preceded by `#100`/`#1010`.
- **Backward search** (`backward11.mjs`): from 175 minimal winning configurations, inverse-rule BFS pruned by grep-verified absent patterns: initial word not reached within backward depth 10 (9.0M states, frontier ×2.1/level). Continuation session's variant: 9,477 goal states, meet-in-middle against the 721k depth-70 forward corpus: **no meet** (branching ×7/level, capped 3M at depth 3).

## 4. Structural findings (spacing invariants; all grep-verified in ≥2 independent corpora)

Never occur — in the depth-70 BFS corpus (721k states), the 3M-random-play corpus, and the 3M-deterministic corpus:
`1#0` (a `#` never has `1` before and `0` after), `11#`, `0#0#`, `001#`, `#0011`, `00001` (every `1` is preceded by ≤ 3 zeros), `11100`, `010#00`, `00#00`, `##000`, `110#00`, `#01#`, `11000`, `10000`, `#01000`, `1011#`.
Do occur: `1#1` (86,795 hits in BFS-70), `#11`, `1011`, `111` (random play only), `10111` (mid-word).

Dynamics: a **conveyor with a slow counter**. `R3` fires at `#1010`, doubling `#`s and marching them right through the `1010`-material (`#1010#1010#…` highways; random play builds them fast — one trajectory passed 136,000 symbols at 200k rewrites); at the right zero-margin `R1`/`R5` destroy `#`s and write `1`s; eventually all `#`s are pushed back into the left periodic zone — a **checkpoint** — and the cycle repeats with a longer period (checkpoint `g`-values 6, 12, 22, 38, 124, 190, 266, 419, 701, 1236, 2623, 5536, 13026, 27560, … roughly doubling). Continuation session, full 3M-rewrite scan: **22 checkpoints total**, adding **g = 52,299 (dev len 141), 102,175 (152), 195,577 (163), 442,614 (174), 808,131 (188)** — every one with deviation head exactly `10101010` and `nActive = 1` (exactly one legal move in the whole word) — but **none between 808,131 and 3,000,000**: the inter-checkpoint period outgrows doubling at depth (ratios 1.90, 1.95, 1.91, 2.26, then > 3.7), consistent with the slow counter's super-doubling tail and the absence of any exact state cycle.

## 5. NO-hunt — the invariant ladder and its precise failure

Seeds and trajectories (logs `refine4.log`, `refine-winpre.log`, `refine-P.log`):

1. `F0 = {#10111, 1#01}` (the `111`-creator blocker): rounds 0–30 add `1#0, 0#0#, 001#, #0011, #0#0, #00#, 11000, 10000, 010#00, #01000, 00#00, ##000, 110#00, 00#10#00, 010#10#00, #01100, #10#011, 11#, #01#, 00101#, ##10#00, 00110#10#, 00001, 00010100#, 11100, …` — correctly rediscovering §4's spacing invariants — then diverges into protecting `10000` from R1 across ever-longer `#`-chain contexts (`010#10#10#00`, `00100#10`, `00##10#10#`, …).
2. Win-prestate seed `{#10111, #10010111, #101010111, 1011#}` with a 3-corpus oracle: same signature; rounds 24–40+ entirely consumed by `10000`-protection in `X#…#00·0…` contexts.
3. A "property" seed (`10111` only preceded by `#0`/`#1`) is *violated on the deterministic orbit itself* (g ≈ 52,349) — only the weaker "`10111` never preceded by `#100`/`#1010`" survives.

**The obstruction, precisely.** Every added blocker is verified absent from `w0` and from all corpora; the refinement does not get stuck on a single phantom context early (as BMO 10 did at round 252) but marches: to block the creation of `#10111`/`10000`-family patterns by R1, one must forbid ever-longer contexts of the form `(0|#)-run · #-chain · 0-run`, because **`#`-runs grow unboundedly under general strategies** (max `#`-run: 4 at BFS depth 30, 8 at 60, 14 at 123) while 0-runs stay ≤ 4. The reachable language is not k-local for any feasible k; a NO proof needs an invariant with counting components (e.g. a regular language with counters over `#`-runs, or a dominance argument reducing to the deterministic orbit). This is the same obstruction class as BMO 10 (there the fatal axis was also #-run counters), now confirmed for BMO 11 with the offending axis identified. Candidate routes that remain: (i) regular-model-checking with counter abstraction over the `#`-run histogram; (ii) a quasi-order/dominance argument showing the rightmost-`#` orbit subsumes all strategies (the TM-side evidence in §6 makes this attractive: the deterministic orbit's census is dramatically cleaner than the general reachable set — `111`/`10111` occur only in a transient); (iii) human-readable structural induction over the gap/highway decomposition (gaps never contain `1011` interiorly — machine-verified on 3M deterministic rewrites).

## 6. Decoding the BMO 11 machine (fully resolved)

1. **Strategy: rightmost-`#`.** Dense anchor verification (`anchor11.mjs`, every TM step vs every game state, exact `tape == del(W)` truncated-window matching, monotone `g`): **14 checkpoints**, each a burst of 4 consecutive TM steps in states `D,B,C,A` with the head at `lo−2, lo−1, lo−2, lo−3` and tape length +2 on the fourth step:

   | TM step ↔ game g | | TM step ↔ game g | |
   |---|---|---|---|
   | 115 ↔ 6 | 2.33 st/rw (warm-up) | 7,379 ↔ 701 | 10.38 |
   | 129 ↔ 12 | 11.90 | 12,977 ↔ 1,236 | 10.46 |
   | 251 ↔ 22 | 11.90 | 27,419 ↔ 2,623 | 10.41 |
   | 415 ↔ 38 | 10.06 | 57,707 ↔ 5,536 | 10.40 |
   | ~1,385 ↔ 124 | ~10.3 | 135,617 ↔ 13,026 | 10.40 |
   | 2,071 ↔ 190 | 10.35 | 286,801 ↔ 27,560 | 10.40 |
   | 2,861 ↔ 266 | 10.36 | 4,449 ↔ 419 | 10.36 |

   Rate **constant at 10.400 ± 0.005 TM steps per rewrite across four orders of magnitude**, with exact word coincidence at every checkpoint. Machine-checked checkpoint structure (`anchor11.mjs` + census script): at every checkpoint from g = 12 on, the deviation is `#`-free (all `#`s in the left periodic zone), its head is exactly `10101010`, exactly one move is legal — `R3` at the boundary `#` — so *every* strategy, the machine's included, fires it; the two deterministic trajectories are the same trajectory. (The very first anchor, g = 6, is a warm-up: its deviation still holds two `#`s, harmless because `del` is `#`-insensitive.)
2. **Encoding and the "regime change" (resolved).** The tape is a suffix window of `del(W)` (word with `#`s deleted); `#` positions are carried by head position/state, as in BMO 10. Between checkpoints the machine **uses the left part of its del-window as scratch**: micro-trace at step 27,419 (`micro11.mjs`) shows the checkpoint macro `D0→B0→C0→A0` writing `11` at the left edge (the two new `#`s of `R3: #1010→1010##`), then a rightward `D,B,E,C` sweep whose `B1`-erases and `E0`-sets shift `1`s right one cell per pass — the `R3` duplication cascade in del-space, ending in the familiar spacing-4 `100010001…` pattern (one marker per `1010` unit). During these cascades (which are *del-silent*) the tape is temporarily **not** equal to `del` of the current word — mid-period, the word's del is ≈ 226 symbols while the tape's nonzero span is ≈ 105, the difference being exactly the erased-as-scratch left cells (re-materialized by the next checkpoint). **This — not a change of encoding — is why the earlier probe's naive `tape == del(W)` matcher stopped matching beyond ≈ 7×10³ TM steps.**
3. **Halting = the win test.** From the checkpoint configuration the chain `C1(0,R,D) → D0(0,R,B) → B1(0,R,E) → E1(1,R,F) → F1 = HALT` consumes exactly the five tape cells `1,0,1,1,1` — the machine tests the tail `10111` symbol-by-symbol (mechanical realization of Lemma 1; any mismatch diverts via `C0(1,L,A)`, `D1(0,L,C)`, `B0(0,L,C)`, `E0(1,R,C)`, `F0(0,L,D)`).
4. **Long runs.** `sim/tm.exe`: no halt in **10^8** (`tm-1e8.log`); `tm11c.exe`: no halt in **10^9** (final state D, span [−48,175]); a 5×10^8-step window dump (`tm11-window500M.log`) confirms the slow-counter profile with no repetition. **Deep probe result (continuation session)**: every TM step in [499,950,000, 500,050,000] matched against del(S_g) for every g ∈ [48.04M, 48.10M] (lean rightmost-# replay, `del-48M.tsv`): best match TM 500,012,279 ↔ g 48,078,081 with **exact agreement on the right 155 of 218 tape chars** (entire managed region incl. the messy tail `…01101101101001`); implied rate (500012279−286802)/(48078081−27560) = **10.4003**. The 63 mismatching chars are the tape's left scratch/frozen region (cf. item 2) — consistent with the scratch explanation, and pinning the correspondence across three decades (TM 2.7×10^4 … 5×10^8, g ≈ 2.6×10^3 … 4.8×10^7).
5. **Consistency with the game's NO-evidence.** A spurious halt needs `10111` on the tape at a `C`-test position; the tape (a del-window) shows `10111` only if the word contains `10111` or a `#`-interleaving of it whose spacing-invariant violations (`1#0`, `11#`, `1#01` absent) rule out all but `#111`-type contexts — and `#10111` itself never occurs in any sampled reachable word. No halt in 10^9 steps matches the game evidence.

**What is and is not proved.** The decoding is empirical but exact at every inspected point (14 exact checkpoint equalities, step-level micro-decode of the checkpoint macro, the cascade sweep, and the halt chain). We did not construct a formal simulation proof (busycoq-style) that every TM macro-step equals a rightmost-`#` rewrite. Under the wiki's asserted equivalence, a NO answer to the game would prove the machine a non-halter; conversely the machine's play is a legal rewrite sequence, so any halt exhibits a YES witness — the two sides are consistent with all data.

## 7. Cross-validation between the two sessions

Independently produced and exactly agreeing: dichotomy `10111`; anchor triples 27,419/57,707/135,617 with identical `g` and tape lengths; rate ≈ 10.40; rightmost-play census (`111` 53×, `10111` 37×, all transient; rule mix 1:1:2:0:1; `#10111`/`1#01`/`1011#` = 0); refinement divergence signature. The continuation session additionally produced: C BFS to depth 123 (≈1.1×10^8 states), the 10^9-step non-halt run, the win-prestate table (with the gap-start correction noted in §1), the deterministic 3M census files (`det11-census.json`, `det11-absent5.json`), and the meet-in-middle backward search.

## 8. Honesty ledger

- Every lemma in this report was machine-checked; the hand-lemmas that failed machine checks are reported as failed (two engine bugs caught by differential testing; the false hand-claim "R1 creates `111` only via `1#01`" — refuted by random play and by exact context enumeration; the continuation session's win-prestate table's missing gap-start case).
- BFS claims are exact for canonical states (string dedup in JS; the C engine's 128-bit-hash dedup is probabilistic with collision odds ≈ 10^-21 over 10^8 states, and agrees with JS through depth 100).
- `111`-reachability refutes any invariant family containing `111`; all reported absent patterns were grepped in at least two independent corpora.
- The TM decoding (§6) is empirical: exact at all inspected points, no formal macro-step simulation proof constructed.
- The refinement ladders had not closed at report time (both >40 rounds, pattern lengths ~10–13 and growing); their divergence — not a stuck phantom — is the identified obstruction.

## 9. Artifacts

`game11.mjs` (engine+selftest), `verify11.mjs` (dichotomy, two closure checkers, refinement), `refine11.mjs` + `refine*.log`, `bfs11.mjs` + `bfs84.log` + `corpus70.txt`, `bfs11.c`/`bfs11c.exe` + `bfs127.log`/`bfs128.log`, `random11.mjs` + `corpus-rand.txt`, `rmscan11.mjs` + `rmscan.log`, `deterministic11.mjs` + `det11-*.json`, `backward11.mjs`, `tm11.mjs`, `tm11c.c`/`tm11c.exe`, `micro11.mjs`, `align11.mjs`, `anchor11.mjs` + `anchor-check.log`, `enc11.mjs`/`diff11.mjs` (encoding-family search), `fuzz11.mjs` (closure fuzz), `closure11.mjs`, `tm-1e8.log`, `tm11-1e9.log`, `tm11-window500M.log`, `del-48M.tsv` (del-window dumps).
