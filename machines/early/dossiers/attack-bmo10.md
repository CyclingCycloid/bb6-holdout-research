# Attack report: BMO 10 (with a lighter pass on BMO 11) — the Beaver Math Olympiad rewrite games

Date: 2026-09-25. Working directory: `machines/early/engines/attacks-bmo10/` (all scripts and logs referenced below live there).
Cross-references: `bmo-5-8-10-11.md` (same directory) (dossier confirming BMO 10/11 have zero published analysis), `tools/sim/tm.exe` (pre-existing C TM simulator, cross-validated).

**Verdict up front.**

- **BMO 10 (game as posed): OPEN, with strong computational evidence for NO.**
  Exhaustive search over *all* rewrite strategies to depth 80 (1.57M distinct configurations, disturbed region up to ~320 symbols) finds **no** configuration in which the rightmost `#` is inactive; in fact **no reachable configuration contains the substrings `111` or `1011` anywhere**. The BMO 10 machine does not halt in 10^8 steps, and its trajectory is decoded (empirically, see §4) as the game's *rightmost-# strategy* on the #-deleted word. Three families of machine-checkable NO-proof attempts (factorial substring invariants, run-length n-gram invariants with a differentially-tested rule engine, variable-length forbidden-pattern refinement) all fail for one *identifiable structural reason* (§6.4): the reachable language is not k-local for any k we could test — there are "phantom contexts" all of whose short windows occur in reachable words while the full context never does. This is the precise obstruction; a proof of NO (which would, via the wiki's asserted equivalence, also prove the machine a non-halter — resolving a BB(6) holdout) needs an invariant of a genuinely non-local kind (e.g. a regular language with counters, or a dominance/confluence argument for the rightmost-# strategy).
- **BMO 11 (game as posed): OPEN, same flavor, weaker evidence.** No winning sequence to depth 44 (37,429 states); `111` never occurs anywhere reachable; rightmost-# play runs 5·10^5 rewrites with slow-growing region (~200 symbols) and no cycle; the machine doesn't halt in 3·10^6 steps. The TM↔game correspondence is only partially decoded (initial segment matches the same #-deletion encoding; beyond ~10^4 steps the plain #-deletion signature stops matching — encoding differs from BMO 10 in a way we did not fully crack).

---

## 1. Formalization of the game (BMO 10)

Alphabet Σ = {0,1,#}; two-sided infinite words. Start word `w0 = ⋯10#10#10#10#0000⋯` (left-infinite periodic `10#`, right-infinite 0s). Rules applicable at any occurrence, any order:

```
R1: #0    → 1
R2: #100  → 000#
R3: #110  → 000#
R4: #1010 → 1010##
```

A `#` is *active* iff the word at it starts `#0`, `#100`, `#110` or `#1010`. Question: is there a finite rewrite sequence after which the *rightmost* `#` is not active?

**Representation.** Every word we ever need is `⋯10#10# · S · 0000⋯` with finite `S` over {0,1,#}: the left periodic part is never exhausted (rules consume at most one `10#` unit per boundary firing and the part is infinite), and the right of the disturbed region stays all-0s. Canonical form of `S`: (i) absorb leading `10#` units into the periodic part; (ii) strip trailing `0`s (they merge into the 0∞-fill). Matching uses the virtual window `V = "10#10#" + S + 0^12` (boundary `#` at index 5; the #s at V-indices 2 and 5 are the only periodic-part #s that can ever be active, and only V[5] — the one adjacent to S). Implementation: `game.mjs` (`windowOf`, `activePositions`, `applyAt`, `canon`); at any given `#` at most one rule matches (the four LHS are pairwise prefix-incompatible), so a game *move* is fully specified by *which* active `#` to fire — this matches the BMO statement's "any occurrence, any order".

**Lemma 1 (goal dichotomy).** In any word, let `t` be the (binary, infinite) word after the rightmost `#`. The rightmost `#` is inactive **iff** `t` starts with `111` or `1011`.
*Proof.* `t` contains no `#`. If `t` starts `0` → active (R1). If `t` starts `1`: second symbol `1` → active iff third symbol `0` (R3), else `t` starts `111` (inactive). Second symbol `0`: third symbol `0` → active (R2); third symbol `1` → active iff fourth symbol `0` (R4), else `t` starts `1011` (inactive). ∎

So the game is won iff a reachable word has tail starting `111`/`1011`; a fortiori if no reachable word contains `111` or `1011` *anywhere*, the answer is NO. (For BMO 11 the analogous dichotomy — same case analysis against its five LHS — gives: inactive iff `t` starts `10111`.)

**Lemma 2 (only rightmost-site moves change the tail).** Let `p` be the rightmost `#`. A rule fired at any `# q < p` leaves the suffix from `p` unchanged.
*Proof.* A rule fired at `q` rewrites symbols in `[q, q+5)`. A `#` at `p > q` cannot lie in the consumed pattern (patterns contain no `#`), and the new `#` created by R2/R3/R4 lands at position ≤ q+4 < p (there is at least one symbol in `[q, p)` since adjacent `##` makes the left one inactive). The suffix at `p` is untouched. The tail therefore changes only when a rule fires *at* the rightmost `#` — where R1 deletes it (the previous `#` becomes rightmost, with tail = previous block + `1` + old tail) or R2/R3/R4 pop 3–4 symbols off the tail head. ∎

## 2. Simulators and cross-validation

- `game.mjs` — game engine (BMO 10 and BMO 11 rule sets), BFS, replay, stats. Hand-verified against a ~30-step pencil-and-paper trace of the rightmost-# play (states `101 → 101010## → 101010#1 → 101010000# → 1010100001 → 101010##100001 → …`).
- `bfs.c` / `bfs.exe` — C engine for deep search: 128-bit-key open-addressing hash dedup (probabilistic at 2^-128 per pair — negligible), goal check, per-depth run-length maxima, distinct tail-head table. Frontier ≤ 1.2M/level.
- `tmsim2.mjs` — TM simulator emitting byte-identical RLE checkpoints to the pre-existing `sim/tm.exe`; **diff-verified identical through 100,000 steps** for BMO 10's code (and the same engine used for the alignment runs).
- `rleinv.mjs` — abstract run-length rule engine **differential-tested against the string-level simulator on all 1,048,621 transitions of the depth-60 reachable set (0 mismatches)** before being trusted in closure checks.

## 3. YES-hunt (exhaustive search over all strategies)

BFS from `S = ""` (word `w0`), all active-# choices, canonical dedup:

| depth | states visited | max |S| | goal found? |
|---|---|---|---|
| 40 | 19,810 | 160 | no |
| 60 | 212,714 | 240 | no |
| 80 | 1,569,295 | ~320 | no (final; log `deep-bfs.log`) |

No dead ends exist (every non-goal word has its rightmost `#` active, hence a move), so BFS is exhaustive per depth. **No winning sequence exists with ≤ 80 rewrites.** Stronger: in all 1.57M visited configurations, the substrings `111` and `1011` **never occur anywhere** (not only at the tail head), and the run-length bounds hold throughout: 0-runs ≤ 7 (stable since depth 15), 1-runs ≤ 2, #-runs unbounded (8 by depth 60, 16 by depth 79 — they grow, see §6.3).

## 4. Decoding the BMO 10 machine (TM `1RB0LB_0RC0LD_1LD1RE_0LA0RF_0RD1RF_0RC---`)

**Empirical decoding (not a formal proof, but exact and reproducible):**

1. **Encoding.** At each "checkpoint" configuration, the TM's tape (nonzero span) equals **the game word with all `#`s deleted**, right-aligned: `tape = (suffix of the infinite alternating 1010… periodic part) + del(S)` where `del(S) = S with # removed`. Example (validated C sim): TM step 27 tape = `101010000001` = del(`101010#000#001`) = game step 6 of the rightmost-# play; TM step 41 tape = `101010100001` = del(`101010##100001`) = game step 5→6 boundary; TM step 111 tape = `10101010100000001` = del(`1010101010##0000001`) = game step 15. The `#`s are *not stored on the tape*; they are carried by the head position/state (the head sits at # boundaries at checkpoints, e.g. in state D immediately left of a `#`-position), and rule R4 — which moves two `#`s without changing the deleted word — is tape-silent except for the `10` the periodic part donates.
2. **Strategy.** The TM implements the **rightmost-# strategy**: always rewrite at the rightmost `#` (which is always active unless the configuration is a win). The ordered checkpoint matching (`verify-align.mjs`, `align2.mjs`) threads game states g = 1, 2, 3, 4(→6), 5, 6, 8, 9, 10, 15, 16, 18, …, 212 strictly in time order through TM steps 3…1675 (exact tape = del(S_g), monotone g, no out-of-order matches), with ~8 TM steps per rewrite growing with word length. A windowed matcher stays consistent (in-order, no contradictions) out to **g ≈ 25,000 rewrites at TM step ≈ 202,000**.
3. **Halting.** F is entered from D/1 or E/1; the machine halts in F on a 1. Under the decoding, this is exactly the game's win test at the right end (the tail is `#`-free, so the deleted word *is* the tail there): halting corresponds to tail `111…/1011…`. The machine does **not** halt in **10^8 steps** (run: `bmo10-tm-1e8.log`, DONE at 10^8 in state D, head −6, span 219) — i.e. the rightmost-# play runs ≥ ~10^6 rewrites without winning.

**Relationship to the wiki's asserted equivalence.** The wiki (Mxdys) asserts TM-halting ⟺ the game's ∃-question. The direction *TM halts ⇒ game win* is immediate given (1)+(2) (the TM's trajectory is a legal rewrite sequence). The direction *game win ⇒ TM halts* requires that the rightmost-# strategy dominates all strategies; our data supports but does not prove it: the rightmost-# play alone produces ≥ 115 distinct tail-head types in 10^5 rewrites, a superset of the 33 types reachable by *all* strategies within depth 60. Note this also means: any YES witness we might have found would have implied (under the wiki claim) that the holdout machine halts — which makes the depth-79 NO-evidence coherent with the machine's holdout status.

## 5. Structural findings (BMO 10)

- **The word is a conveyor.** Depth-60 configurations look like `⋯10#10#10# | 1010 10## 10## … 10## … | <active right end> ~20–40 symbols | 0∞`: the periodic `10#` region is progressively converted into a **`10##` highway** (R4 at the gateway `#`), with *nested* denser highways `10####` (and `10###`) arising when R4 fires at `#1010#…`/`#1010##…`; #-run lengths inside highways grow with depth (8 by depth 60, 16 by depth 79) — the highways are unbounded counters.
- **Hyper-constrained `#`-contexts** (all 1.43M+ states, with periodic/zero fills): the complete inventory of 4-grams `ab#c` has only 19 shapes. Never occur: `11#`, `1#01`, `0#01`, `1#0#`, `#1#0#`, `#0#01`, `#011`, `#0011`, `#1110`, `#1111`, `#10110`, `#10111`, `111`, `1011`. In particular: a block ending in `1` is never followed by a `#`+`0` (`1#0z` absent), and blocks never end in `11`. These are exactly the contexts in which R1 could create `111` (`1#01`, `#011`, `11#0`) or `1011` (`10#01`); their absence is *why* the game resists winning. (`1#0` does occur — always as `#1#0`, i.e. the block before is exactly `1`.)
- **Rightmost-# play data:** tail heads reach `11…` shapes (`1101`, `1100000000`, `1101000010`) and `101…` shapes but never `111…`/`1011…`; the `11`s are born at R1 seams (`#1101` etc.) and immediately eaten by R3.

## 6. NO-proof attempts and the precise obstruction

### 6.1 Factorial (forbidden-substring) invariants, fixed k
Language L = words avoiding all length-k strings absent from reachable data. Closure under the 4 rules tested by exhaustive context enumeration (`invlib.mjs`, contexts {0,1,#}^m each side). **Fails for k = 4…8**: e.g. at k=8 the allowed context `0000000#0000001` (all its 8-windows occur in reachable words) rewrites by R1 to `…10000001…` whose window `10000001` never occurs. Refinement by forbidding additional (init-absent) windows diverges or breaks the initial word.

### 6.2 Run-length n-gram invariants (RLE tokens o1,o2 / z1…z7 / h1…h8,h9p / R=∞)
The abstract rule engine was validated by differential test on all 1,048,621 depth-≤60 transitions (this caught and fixed a real modeling bug: R2/R3/R4 keep the remaining h_{k−1} when firing at the last # of a run). Closure of the data-derived n-gram language **fails for n = 5, 6, 7, 8** (11,140 violations at n=7; 4,788 at n=8), e.g. context `h8 o1 z1 h6 o1 z2 h1 z2 h3 z3 h1 z2` (all 8-grams data-present) rewrites by R2 to a configuration containing the never-seen 8-gram `h8 o1 z1 h5 z3 h2 z2 h3`. Iterative refinement converges 16,262 → 2 violations but the last violation *is the initial configuration's own first move* — i.e. the refinement is forced to forbid n-grams that the start word's rewrites require; no sublanguage of the data language closes (all data n-grams are provably reachable, hence unavoidable).

### 6.3 Variable-length forbidden patterns, data-guided
Start from the natural blocker set F = {111, 1011, 11#, 1#01, 0#01, 1#0#, #011, #0011} (each member data-absent; danger analysis: R1 creating `111` needs `1#01` or `#011` or `11#0`; creating `1011` needs `10#01` ⊂ `0#01`; creating `11#` needs `1#0#`; R2/R3/R4 are seam-safe; pops can only expose pre-existing `111/1011`). Closure refinement (add shortest data-absent, init-absent substring of a violating pre-context; exact depth-60 presence oracle) ran 252 rounds, grew F to 259 patterns, then **stuck on `R1: W1 = 00##10#000##00 → W2 = 00##10100##00`** where *every* substring of W1 occurs somewhere in the reachable data. Same wall, raw-string flavor.

### 6.4 The obstruction, stated precisely
For every local invariant class we could machine-check (raw k-grams to k=8; RLE n-grams to n=8; variable-length patterns to length ~14), there exist **phantom contexts**: sequences whose every window of the tested size occurs in genuinely reachable words, but which never occur themselves, and whose rewrite produces a pattern that never occurs. Any k-local (or n-run-local) over-approximation of the reachable set therefore cannot be closed. The unreachable-ness of `111/1011` is a genuinely **non-local** property — consistent with the system being a tag-system-like machine with unbounded counters (the growing #-run highways), which is exactly why the source machines are BB(6) holdouts. Candidate proof routes that remain: (i) a regular-invariant with auxiliary counters (regular model checking with abstraction refinement); (ii) a quasi-order/dominance argument showing the rightmost-# strategy subsumes all strategies, reducing the question to the (still open) non-halting of the deterministic play; (iii) a human-readable structural induction over the block/highway decomposition.

## 7. BMO 11 (lighter pass)

Rules `#0→1; #100→010#; #1010→1010##; #10110→10101; #11→10`; by the same case analysis the rightmost `#` is inactive iff the tail starts `10111`.

- BFS over all strategies to depth 44: **37,429 states, no goal**; substrings `10111`, `1111`, `1110`, `0111` (hence any `111`) **never occur** in any visited state. (BMO 11 is "more destructive" — `#11→10` kills 11s after #s — but its goal needs three consecutive 1s after `10`, which appears even harder than BMO 10's.)
- Rightmost-# play: 5·10^5 rewrites, disturbed region grows very slowly (|S| = 184 at 2·10^5, max 211 at 5·10^5 — a slow counter, no exact state cycle found in 5·10^5 rewrites).
- Machine `1RB0LD_0LC0RE_1LA0RD_0RB0LC_1RC1RF_0LD---`: **no halt in 3·10^6 steps**. TM↔game decoding is *partial*: the initial segment matches the same #-deletion encoding with the rightmost-# strategy (ordered matches g = 1,3,5,6,12,13,22,23,38,…,420 at TM steps 9…4452), but beyond ~7·10^3 TM steps the plain #-deletion signature stops matching entirely (suffix scan over 3·10^6 steps: zero hits for game states g>600) — the deeper encoding differs (plausibly because `#100→010#` keeps a 1, changing what the tape must store); **left unresolved**.

## 8. Honesty ledger

- The depth-79 no-goal/no-`111`/no-`1011` claims are exhaustive for *canonical* states up to that depth (C engine dedup is 128-bit-hash probabilistic; collision probability across 1.4M states ≈ 10^-27, and the JS engine independently confirms depth 60).
- "Machine-checked invariant closure" claims in §6 are evidence about invariant *classes*, not about the game; each failure is a theorem about the class (backed by explicit counterexample contexts printed by the scripts).
- The TM decoding (§4) is empirical: exact matches at hundreds of checkpoints, ordered and consistent, but we did not construct the formal simulation proof (à la busycoq) that every TM macro-step equals the rightmost-# rewrite.
- A NO answer to the *game* would not by itself need the TM; but under the wiki's asserted equivalence it would resolve the holdout's halting status. Conversely, a YES would have to be a very long sequence (> 79 rewrites, likely astronomically long given the TM correspondence).

## 9. Artifacts

`game.mjs` (engine+CLI), `bfs.c`/`bfs.exe` + `deep-bfs.log` (depth-79+ run), `tmsim2.mjs` (TM sim, diff-validated vs `sim/tm.exe`), `verify-align.mjs`, `align2.mjs`, `align.mjs` (TM↔game decoding), `analyze.mjs`, `struct.mjs`, `rle.mjs` (structure), `invlib.mjs`, `invlib2.mjs`, `rleinv.mjs`, `rleloop.mjs`, `fset.mjs` (invariant machinery incl. differential test), `bmo10-tm-1e8.log` (10^8-step machine run), `flips.mjs`, `tmsim.mjs` (superseded).

---

# Phase 2 (2026-09-25 14:40, attacks-bmo10/): parameterized macro-rule system for the DETERMINISTIC rightmost-# play

New tooling: `attacks-bmo10/p_lib.mjs` — deterministic rightmost-# simulator with two-sided padding (8 `10#` units left, 40 zeros right; canonical repad after every step). Cross-validated: 4000 steps byte-identical cores AND rule choices vs `game.mjs` rightmost play.

## Structural facts established empirically (500K-step run, every step or 1/37 sampling)

(S1) **#-runs**: every #-run has length 1 or 2 at every step (census over every step, 500K: 1→..., 2→...). The length-2 run, when it exists, is always the *rightmost* (active) one: R4 at the rightmost `#` deposits `##`, R2/R3 deposit `#`; all *buried* runs are single `#`s (a run shrinks only while it is rightmost; when a length-2 run fires it leaves a single `#` separator behind).

(S2) **Materials** (inter-# strings): 199,723 sampled, 0 end in `1`, 0 contain `11`, all 1-runs have length 1. Materials decompose as runs of `000` and `1010` blocks (deposits of R2/R3 and R4); the *fill-adjacent* material can carry the fill's donated `10` prefix (so `10`, `101010` = `10·1010` occur). Hypothesis: every material ∈ `10`?·(`000`|`1010`)*.

(S3) **Death cascades** (consecutive R1-firings that pop the stack): depth 1: 32,582×; depth 2: 26,997×; depth 3: 71×; depth ≥4: never in 500K steps. So one macro-step's *read* window reaches at most 3 materials deep.

(S4) **Tail start tokens**: `1` (8,989), `0`-run (4,522), `11` (2 — transient R1 seams), EMPTY+0∞ (1). Tails never start `111`/`1011` (else the game would be won).

## The macro picture (derived, to be proven)

Word = `⋯(10#)^∞ · # M_k # ⋯ # M_1 #^r τ` with r∈{1,2}, materials M_i frozen once buried, the top material M_1 growing by appends, tail τ scanned head-first. One deterministic step fires at the rightmost `#`:
- R1 (τ starts `0`): `#0→1`: the active run loses one `#`; if it empties, the run dies and τ := M_1·1·τ' (top material flushes into the tail; the scan continues at the next # left).
- R2/R3 (τ starts `100`/`110`): deposit `000` + new active run `#`; if the old run was length 1 the deposit appends to M_1, else it starts a new material.
- R4 (τ starts `1010`): deposit `1010` + new active run `##`, same append/new-material rule.

Next: abstract-state exploration (RLE-token suffixes, parameter classes) to obtain the finite deterministic macro system.

## Phase 2 build log (14:35–16:10): the macro-rule system and three closure engines

**Macro system (level 1 & 2, both differentially verified).**
- `attacks-bmo10/p_token.mjs` (level-1 RLE tokens: H1/H2, a=`1`, b=`11`, Z_m exact) and `attacks-bmo10/p_token2.mjs` (level-2 chain-collapsed: `CH(k,c)` = maximal run of c atoms `1·0^k`, `CHinf` word-end variant, Z_m, b, u). The macro step (`tokenStep`/`tokenStep2`) is implemented by expand→string-rewrite→retokenize (exact by construction) and **differentially verified against the padded string simulator on random cores: 29,515 + 485 inactive (level 1) and 29,594 + 406 inactive (level 2) samples, 0 mismatches** (incl. cores with #, ##, fill fragments, chains, long runs).
- Structural facts (500K steps, every step): #−runs always length 1–2 with the 2-run always rightmost; death cascades depth ≤ 3 (32,582/26,997/71); every inter-# material ends in `0`, contains no `11`, all 1-runs are single; materials are concatenations of blocks `000` and `1010` plus the fill-donated `10` prefix — the **deposit grammar** MAT = `10`?·(`1010`|`000`)*, closed by construction under the step (deposits are exactly these blocks; merges only extend 0-runs by +3 or chains by +1/+2).

**Closure engine 1 (raw k-grams, `p_closure.mjs`).** Sound backward method: F = absent k-grams of the orbit; every one-step preimage of every f ∈ F must itself contain an F-gram (preimages enumerated exactly: rule × alignment × span; legality = firing # is the word's rightmost; realizability = left extension to the periodic fill, right extension binary-then-0^∞, all windows in P). Result: **fails at k = 8,10,11,12** with phantom contexts of the form `#1 0^m 11` — long-0-run invisibility (the window cannot see both ends of a run longer than k). This is a clean proof of the wall §6.1 hit for the all-strategy game, now sharpened to the deterministic play.

**Closure engine 2 (level-1/2 token windows, `p_forward.mjs`, `p_forward2.mjs`).** Sound forward method: enumerate every P-clean context around the active # (de Bruijn DFS over the census window language, fill-anchored left, 0^∞-realizable right, active run H1/H2 at index T, truncated tails guarded), step it exactly, require all result windows ∈ P. Geometry fixed so all step-modified windows are interior (context = T left + 1 + T+6 right tokens; artifact windows at the cut skipped — they are checked in deeper contexts). Result: level-1 fails at T=8,9,10 (phantom compositions of `a Z_1`-chains); level-2 fails at T=9 (6,638 genuine violations after artifact fixes): phantom contexts `CH_1_13 H1 CH_1_2 CH_2_1 …` whose R4-merge yields `CH_1_15 H2 …` — never observed compositions.

**Closure engine 3 (parameter classes, `p_engine3.mjs`).** Parameters classified exact ≤ 11 and "+" = ≥12 (instantiated {12,13,14,40}; arithmetic m±1,2,3 / c±1,2 class-determined; equality-sensitive merges covered by the cartesian instantiation). Census N=10^6, T=9: 262,994 class windows; P-clean at start; no forbidden pattern in P. Result: **fails with 147,917 violations** — e.g. context `CH_1_+ CH_4_1 CH_+_1 CH_1_3` at the boundary #: the class language admits chain-count/atom-length mixes that never co-occur, and the residue arithmetic (c−2 landing on exact 11) produces unobserved exact windows.

**The obstruction, final form.** All three engines fail for the same root cause, now proven precisely: the deterministic orbit's reachable set is *relational* in its parameters — material chain-lengths, atom lengths and run lengths co-vary (they are the nested counters of the highway), and any invariant built from windows over independently-classified parameters admits **cross-composition phantoms** (locally clean, globally unreachable states whose step results are locally new). A complete NO-proof by this route needs a *relational* parameterized invariant (a counter-machine certificate in the Skelet-10 style: finite skeleton + counter vector with linear relations), not a window language. The cooked/pristine decomposition of tails (`p_meas` above) shows the "cooked" (non-block) tail prefix is **unbounded** (139 chars at 400K steps), so the residue zone is not finite-state either: the counters are genuinely nested to unbounded depth *within the tail*.

---

# Phase 3 (2026-09-25 19:00, attacks-bmo10/ q_* files): exact stack machine, complete lethal-event algebra, danger-distance dynamics, 10^8-rewrite evidence

## 3.1 Exact stack machines (two, both differentially verified)

**`q_stack.mjs`** — the deterministic rightmost-# play re-encoded exactly as a stack machine:
state = (mats[0..k-1] materials with mats[0]=top, active run r∈{1,2}, region τ = tail after the rightmost #, virtual 0^∞ on the right). Word = ⋯(10#)^∞·M_k#⋯#M_1·#^r·τ·0^∞. Macro step (exact algebra):
- head `0` (R1): r=2 → r=1, τ := `1`+τ[1:]; r=1 → **flush**: pop M (fill supplies `10`), τ := M+`1`+τ[1:].
- head `100` (R2) / `110` (R3): τ := τ[3:]; deposit `000`: r=1 → append to M_1; r=2 → push new material, r:=1.
- head `1010` (R4): τ := τ[4:]; deposit `1010`: r=1 → append, r:=2; r=2 → push, r stays 2.
- else: INACTIVE (game won) ⟺ head starts `111` or `1011`.
Verified: **500,000 steps byte-identical (canonical word) and rule-for-rule vs the padded string simulator `p_lib.mjs`**. 3M-step orbit: never inactive; **all materials ∈ ^(10)?(000|1010)*$ at every step** (the deposit grammar, now confirmed by direct construction: every material is a concatenation of deposited blocks plus the fill's donated `10`).

**`q_parse.mjs`** — same dynamics with the region's BLOCK PARSE maintained explicitly: units over {A=`1010`, Z=`000`, T=`10`, s=seam`1`, pseudos z/zz/x} + head offset; flush prepends [M.blocks, `s`]; consumption advances the offset; R1@r2 re-parses a 12-symbol window (the only non-pure op). Verified 500,000 steps byte-identical. This is the object a run-length abstraction must act on.

## 3.2 The complete lethal-event algebra (hand proof, machine-confirmed)

Since materials are block-concatenations they never contain `11` (and end in `0`); the region changes only by: consume 1/3/4 head symbols, prepend `1` (R1@r2), prepend M·`1` (flush). Therefore **`111`/`1011` can only ever be CREATED at R1 seams**, and inactivity (head `111…/1011…`) can only arise from:
- (P1) R1@r2 with τ[1:3]=`11` (→`111` at head) or τ[1:4]=`011` (→`1011` at head);
- (P2) flush with τ[1:3]=`11` or τ[1:4]=`011` (seam+τ[1:]) or (M ends `10` ∧ τ[1]=`1`) (M-end+seam+τ[1] = `1011`).
Equivalently: define a **danger position** of τ as an index i with τ[i..] starting `011` or `0011` (the R1-lethal heads) — the play is safe forever iff **the head (position 0) is never a danger position at an R1 step and `111`/`1011` never occur**. All other steps are trivially safe (R2/R3/R4 consume clean suffixes; deposits are block-clean).

## 3.3 Danger-distance dynamics on the orbit (2M–10^8 steps, `q_meas2.mjs`, `q_stack_1e8.log`)

Let d = min danger position (0 = lethal). Measured:
- **d = 0 NEVER occurs** — 2·10^6 steps full census (`lethal: 0`), and **10^8 rewrites** with min d = **1** (rules fired: R1 33,333,455; R2 33,332,834; R3 290; R4 33,333,421; max region 245 symbols; max stack depth 25). The deterministic play never goes inactive in 10^8 rewrites.
- The near-field distances that occur are exactly {1,4,5,7,8} (never 2,3,6,9); d decreases by 3 (R2/R3), 4 (R4), 1 (R1@r2/flush), and jumps by +|M| at flushes, which also create NEW dangers at |M|−1/|M|−2 (seam creations: exactly when τ[1]=1 at flush — 66 events/10^6, all later resolved safely).
- Resolution shapes at d=1: `0011`@1 with r=2 → R1 (`10011`) → R2 eats `100` → head `11`+0 → **R3 eats the `11`** (this is the only `11` death; R3 fired 144–290 times per 10^6–10^8). `011`@1 with r=1 → flush (safe); `011`@1 with r=2 would be lethal (`1011`) and never occurs.
- The region contains at most ONE `11` at a time (189,118 steps with `11`, ~190K census entries); region never contains `111`/`1011` (10^6-step asserts = 0).

## 3.4 The queue structure and locality bounds (5·10^6 steps)

The region = the FIFO queue of flushed-but-not-yet-rescanned materials (separated by `s` seams); the stack is the not-yet-flushed deposits. Measured maxima:
- **≤ 167 symbols consumed between consecutive flushes** (≤ 54 steps) — the head never traverses more than 167 symbols without a flush re-prepending material;
- **≤ 7 consecutive pops (flushes) without a push**;
- **≤ 16 seam-chunks in the region** (histogram mode 8–9), region ≤ 208 symbols, stack ≤ 20 materials;
- top-material shapes: only ~200 distinct (A^a Z^b A^c … with small runs); region chunk patterns likewise small (`s zz A Z`, `s zz A Z3`, …).

## 3.5 Quasi-periodicity (the nested-counter signature)

Projection of the orbit onto (r, offset, first-8 region runs, top-5 material patterns, depth) repeats with gap families **717·2^k and 2033·2^k** (717, 1434, 2868, 5742, 11478…; 2033, 4067, 8135, 16280, 32561, 130260…) — the macro-state is **quasi-periodic with period doubling**, i.e. the orbit is a counter machine whose counters double-scale (the highway's nested `1010`-chains). A plain finite-state certificate therefore cannot close (619,147 distinct projections in 2·10^6 steps; region parses essentially injective in time: 1,995,881 distinct in 2M steps even with run counts capped at 8).

## 3.6 The obstruction, sharpened to its final form

The NO-proof is reduced to a single question: **why does the scan head never land on a danger position** (`011`/`0011` suffix) at an R1 step. All creation/destruction of the relevant patterns is local (§3.2); the distance counter d evolves by −3/−4/−1/+|M| with material lengths |M| drawn from the deposit algebra; the orbit keeps d ∈ {1,4,5,7,8,…} ∪ {far}, never {0,2,3,6,9}. The protection is an **alignment property between the chunk-arithmetic (consume 1/3/4) and the material lengths (2 + 3a + 4b)** — a relational mod-3/mod-4 invariant between the scan phase and the flush-queue contents that no window language and no independently-classified parameter abstraction can express (engines 1–3 of Phase 2 fail exactly there). What remains for a complete certificate: a **coinductive traversal analysis** — for each reachable material-pattern P (finite family, ~200 shapes + widened counts), the traversal of P is a transducer on (r, entry-alignment); the certificate must show every composition of reachable transducers preserves the safe-entry invariant — or equivalently a Skelet-10-style counter certificate over the quasi-periodic macro-loop (717/2033 doubling). Both are concrete, machine-checkable programs; not completed this session.

## 3.7 TM ⟷ rightmost-# correspondence (strengthened run)

`q_tmalign.mjs` (fixes p_tmalign's matcher: the del's trailing zeros are unwritten tape, so the nonzero span matches the del only up to its last `1`; monotone scan-ahead): **92 game states matched strictly in order** against exact TM tape states (window 48, alternating-left check) before the plain suffix-check stalls at g=93 (the checkpoint instants require head/state alignment the suffix test doesn't model; the predecessor's ordered matcher reached g=212 exact / g≈25,000 windowed). Combined with §4: the TM runs the rightmost-# strategy; halting ⟺ inactivity; **no halt in 10^8 TM steps** (prior) and **no inactivity in 10^8 rewrites** (new).

## 3.8 Files (attacks-bmo10/, q_ prefix)

`q_stack.mjs` (stack machine + diff), `q_region.mjs` (block machine + diff), `q_parse.mjs` (region-parse machine + diff + census), `q_meas.mjs`/`q_meas2.mjs` (danger measurements), `q_stack_1e8.log` (10^8-rewrite run), `q_tmalign.mjs` (fixed TM alignment), `q_meas_N1000000.json`, `q_meas2_N2000000.json`.

## 3.9 Addendum (19:40): the near-field danger automaton — closed, and the exact shape of the missing lemma

Extracted the complete near-field (d ≤ 14) danger automaton over 3·10^6 steps (`0011` = danger suffix shape; F = no danger within 14): states = **{F,1,4,5,7,8,10,11,12} × {1,2} with shape ALWAYS `0011`** (the `011` shape never appears in the near field — `011` would be lethal at d=1 with r=2, and indeed never occurs). All 42 observed transitions have their target among the observed sources (internal closure). The distance funnel:
- creation/entry: F --R1(flush)--> 8|0011 (|M|=9 materials), F --R2/R4--> {10,11,12} (far dangers sliding in);
- {10,11,12} --R2/R4--> {7,8}; {7,8} --R2/R4--> {4,5}; {4,5} --R2/R4--> 1; **1|0011 --R1@r2--> 1|0011 (r=1) --R2--> F** (the `11` surfaces at the head and dies by R3), 1|0011 --R1@r1(flush)--> F.
- Hand check of the traps: d=2 at an R2-time and d=3 at an R2-time are provably lethal within 2 steps (R2 from d=2 lands head `011`; R2 from d=3 lands head `0011`; R4 from d=6 lands d=2); d=2/3 at R1-time step to 1 (safe). **The orbit avoids {2,3,6,9} not by mod-3 exclusion (entries 10,11,12 cover all residues) but because the block-structured content between head and danger dictates R2-vs-R4 choices that funnel strictly through {7,8}→{4,5}→{1}.**

**The missing lemma, final statement.** For every material M ∈ MAT = `10?(000|1010)*` produced by the deposit algebra, and every reachable entry state (r, entry-offset) into M-as-region-prefix, the deterministic traversal of M (with the flush recursion: a mid-M flush prepends M' ∈ MAT and returns to the same offset with possibly changed r) lands only on positions whose distance to the seam-`11` following M lies in {1,4,5,7,8,10,11,12,…}\{0,2,3,6,9-trap-configurations}. Since material-internal block-runs are bounded (A^a with a ≤ 6, Z^b with b ≤ 4 observed; |M| ≤ ~40), this is a FINITE memoized check over (r, offset, block-run-summary) × (following-context classes) — plus a closure check that the deposit-algebra's material family is preserved. That is the complete program for the NO-proof; everything up to it is now verified.

## 3.10 Final measurements (20:20)

- Near-field entry census (10^7 steps): entries ONLY at d ∈ {5,8,10,11,12}, always shape `0011` (sliding entries from the far field at 10–12 via R2/R4; flush-creations at 8 (21×, |M|=9) and 5 (1×, |M|=6) via R1). **d = 0 events: 0.** State census: exactly {1,4,5,7,8,10,11,12}×{1,2} ∪ {F}, no other near-field state ever.
- TM alignment (lookahead 60, 2·10^7 TM steps): **330 game states matched strictly in order**, max 433 TM steps between matches, no out-of-order events, machine alive in state B. (Beyond g=331 the plain tape-suffix checkpoints thin out; full correspondence rests on §4's ordered matcher: 212 exact, ~25,000 windowed.)
- Overall verdict for Phase 3: the NO-proof is reduced to (i) the closed near-field automaton (§3.9, empirically exact) plus (ii) a finite coinductive material-traversal check (§3.9 final statement) plus (iii) the far-field counter certificate over the 717·2^k/2033·2^k quasi-period. (i) is measured; (ii) is specified and finite but not executed; (iii) is identified but not constructed. Empirically the claim now stands at **10^8 rewrites with no inactivity and danger-distance ≥ 1 throughout**.
