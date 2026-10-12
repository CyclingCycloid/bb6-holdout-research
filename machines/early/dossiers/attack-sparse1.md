# SPARSE1 (BB(6) holdout) macro-analysis report — 2026-09-25

Machine: `1RB0RB1LB0LC1RD1LC1RE0RA0RF1RA---1LB`
(holdouts list `bb6/holdouts/BB6_holdouts_1003.txt` line 521; bbchallenge URL
`https://bbchallenge.org/1RB0RB_1LB0LC_1RD1LC_1RE0RA_0RF1RA_---1LB`).

## 0. Machine identity — CRITICAL transcription note

The 36-char code parses (standard order A0 A1 B0 B1 … F0 F1) to:

| state | read 0 | read 1 |
|---|---|---|
| A | 1RB | 0RB |
| B | 1LB | 0LC |
| C | 1RD | 1LC |
| D | **1RE** | **0RA** |
| E | **0RF** | 1RA |
| F | **--- (HALT)** | **1LB** |

This **disagrees with the prose table in the tasking** (`D: 0→0RA,1→0RF; E: 0→0RD; F: 0→1LB,1→HALT`),
which corresponds to a *different* code `1RB0RB1LB0LC1RD1LC0RA0RF0RD1RA1LB---`. The 36-char code
(given twice in the tasking, and matching the holdouts file) is authoritative; note **halt is F
reading 0, not 1**. Evidence: my simulator, parsing only the 36-char string, reproduces the user's
`bb6/sim/sparse1.log` (3,080,240 BLK lines, 2×10^7 steps) **byte-for-byte** — so that log was made
from the true machine, while the checkpoint numbers quoted in the tasking ((3420,747) at 10^7 etc.)
were **not** (they belong to the mis-transcribed table; e.g. at 10^7 the true tape is
`1^916 0 1^981 0 11`). All analysis below is for the true code. [EXACT-COMPUTE]

**Live status (bbchallenge):** the page at a code-form URL is a client-rendered SvelteKit app; its
route code (`nodes/6.cd412996.js`) shows that for code-form URLs the status badge *defaults to
UNDECIDED* (`P.UNDECIDED`) and the machine is simulated client-side — no database record is fetched.
The public REST API (`api.bbchallenge.org/machine/<id>`) is numeric-ID only (e.g. machine 1 →
"decided"), so no by-code DB status exists; the machine stands in the local Aug-30-2026 undecided
holdout list. WebFetch/web-reader return only the SPA shell; browser rendering is unavailable in
this agent (checked).

## 1. Tooling (all in `bb6/attacks-sparse1/`)

* `sim.c` — validated simulator (modes: `blk` = blockscan replica, `dumpwin`, `cfills`, `anchors`).
  The `blk` mode reproduces `sparse1.log` exactly for the full 2×10^7 steps (diff clean).
* `astart.c` — **anchor-map oracle**: builds the constructed anchor tape `1 0 1^m [0^d 1^k]` with
  head on the gap in state C, runs the *raw* machine until the next anchor, returns
  `F(m,d,k) = (m',d',k')` + exact TM-step cost (+ `maxr` = max #1-runs seen).
* `trap.mjs` — modular trap tests (exact-orbit residues + both-branch closure), BigInt macro-orbit.
* `fcheck.mjs` — closed-form vs oracle cross-checker.
* Logs: `blk_2e5.log`, `blk_2e7_full.log`, `icyc_2e7.log` (12,436 internal cycles + 26 anchors),
  `anchors_2.6e8.log` (33 anchors), `anchors_5e9.log` (42), `grid_m30_k4.log`, `grid_m40_k64.log`,
  `grid_m120_k64.log` (halting census), `verify_chain.sh`.

## 2. Macro structure (invariant family + phases)

Tape at "anchor" times (detector: state C, head on a 0 whose neighbors are 1, clean structure):

```
ANCHOR(m,k):   0^∞ 1 0 1^m [0 1^k] 0^∞      head on the single 0, state C
```

(left block is a *single* 1; the deco `0 1^k` is optional, k ∈ {0,1,2,3} on the real orbit;
mid-phase the family widens to `1^x 0 1^m 0 1^k`, at most 4 one-runs ever — `maxr=4` on-orbit).

**Phases of one anchor-to-anchor transition** (from `icyc_2e7.log` and RLE dumps):
1. *Gap-shift launch*: C fills the parked gap → D erases one cell of the block → the parked gap
   has moved +1 into the block (left block grows to 1^x).
2. *March* (~4m/3 micro-cycles): the 5-state sweep E→A→B→C→D advances 3 cells / 5 steps through the
   block, preserving it; at the right edge A/B write 1s (+1..2 cells), B bounces, C sweeps back left
   at speed 1, refills the parked gap; per micro-cycle: x→x+1, m −= ¾ on average, k cycles
   (d,k) ≈ (1,1)→(1,2)→(1,1)→(2,0). Micro-cycle cost ≈ (8/3)·m + O(k).
3. *Collapse*: when the marching gap meets the deco gap, a short dance (e.g. 179 steps at m=31)
   rebuilds `1 0 1^{m'} [0 1^{k'}]` one cell further LEFT (anchor head position decreases by 1
   each anchor: h = −1, −2, −3, …, −42 …).

## 3. The macro recurrence (EXACT, machine-verified)

On the reachable family the deco gap is always width 1 (`k'≥1 ⇒ d'=1`: 4080/4080 grid outputs;
on the real orbit d=2 appears only as the no-deco representation when k=0). With (m,k):

**G — growth** (m ≡ 1 (mod 3)):
```
m' = (4m+2)/3 + j[m mod 9][k mod 3] + 3*floor(k/3)
k' = kk[m mod 9][k mod 3]
     j  : {1:[0,2,5], 4:[1,4,2], 7:[3,1,3]}      (index by m mod 9 ∈ {1,4,7}, k mod 3)
     kk : {1:[3,2,0], 4:[2,0,3], 7:[0,3,2]}
```
**S — split** (m ≡ 2 (mod 3), m ≥ 11, deco-gap-1 or no deco):
```
m' = (m+1)/3  if m≡2 (mod 9);   (m−5)/3  if m≡8 (mod 9);   (m−8)/3  if m≡5 (mod 9)
k' = m + k − m' + 1                       (mass into the deco counter)
```
Verification:
* **Chain**: all 32 consecutive real transitions to 2.57×10^8 steps match the oracle F exactly in
  (m,k) *and* cost; extended to **41/41 transitions through 3.82×10^9 steps** (`verify_chain.sh` on
  `anchors_5e9.log`: ok=41 bad=0), incl. the late split cascades 18644→6212→2071→19340 and
  6445→21496, which also match the closed forms by hand.
* **Grid**: 8655 oracle cells (m≤120, k≤64): 5488 G/S-value predictions + 1430 halt predictions,
  **0 mismatches** (`fcheck.mjs`); the 3145 excluded cells are the off-orbit chaotic zone
  (m ∈ {1,2,5}, m ≡ 0 (mod 3) with d=1,k≥1, and (m≡2, d=2, k≥1) rows that follow a different,
  off-orbit table).
* **Large-k spot checks** (k = 200…2000, m = 23..98): all exact, incl. the trap approach
  F(23,1,500) = (5,1,519).

## 4. Growth and ratio dynamics [EXACT-COMPUTE]

From the 42-anchor orbit (`anchors_5e9.log`):
* growth steps: m-ratio → **4/3** (1.3340…1.3335), t-ratio → **16/9 = 1.778** (1.68→1.768);
* split steps: m-ratio ≈ **1/3** (0.3332…0.3334), k absorbs m+k−m/3+1;
* remerge steps (large k): m' ≈ m+k (formula: m' = (4m+2)/3 + j + 3⌊k/3⌋ ≈ k);
* overall **m = Θ(√t)**, m/√t → ≈ 0.65 (dips to 0.07–0.20 during split cascades);
  span = m + O(1) ⇒ span ≈ 0.65·√t. (True spans: 2788 @ 2×10^7, ≈3590 @ 4×10^7,
  ≈6139 @ 10^8, ≈38253 @ 3.8×10^9.)
* t ≈ (4/3)·m² per anchor ⇒ anchor times grow geometrically ×16/9 — anchor 42 at 3.82×10^9,
  run continued to 10^11 (see §7).

## 5. Halting census and the exact halting condition [EXACT-COMPUTE]

Halting cells of the anchor map (oracle census m ≤ 120 k ≤ 64 = 1578 halting cells, plus targeted
probes; "halting" = the raw machine halts *before reaching the next anchor*):
```
H  = { (m,d,k) : m ≡ 0 (mod 3) and (d=2 or k=0) }         (E steps into the wide gap → F reads 0)
   ∪ { (m,d=2, k ≡ 2 (mod 3)) : m = 1 or S-chain of m reaches 1 or 2 }
                                                           (observed: m ∈ {1,2,8,14,32,50,104,158,…})
   ∪ { (5,d=1, k) : k ≡ 1 (mod 3) halts at once; k ≡ 0 → (5,1,k+4) halts next; k ≡ 2 escapes }
```
where the *S-chain* of m is m → (m+c)/3 while ≡ 2 (mod 3) (the split cascade). Confirmed members
by direct oracle: m = 1,2,8,14,32,50 (≤ 1 transition), 104 (halts at TM-step 6200), 158 (13678);
non-members 68 (→(76,1,2)) and 446 (→(467,1,3)) whose chains terminate at 7 and 49.
Multi-step basin: e.g. (16,1,1) → (23,1,3) → (5,1,22) → HALT: ordinary states are 3 anchor-steps
from halting. 5 is the unique exceptional anchor where S fails.

**Two exact partial invariants of the true orbit** (machine-checked):
1. *m ≢ 0 (mod 3) forever* — PROVED from the formulas: G outputs m' ≡ 4a+2+j with
   a=(m−1)/3: r=1: m'≡2+j∈{2,1,1}; r=4: m'≡j∈{1,1,2}; r=7: m'≡1+j∈{1,2,1} (mod 3), never 0;
   S outputs (m+c)/3 ≡ 1 or 2 (mod 3); start m=1. Hence the entire first line of H1 is unreachable.
2. *A deco never sits behind a 2-gap* (k ≥ 1 ⇒ d = 1): 4080/4080 grid outputs + all 41 real
   transitions. Hence the second line of H1 (all d=2 cells) is structurally off the reachable family.

**Consequence**: with (1)+(2), the machine halts iff the G/S-orbit of (m,k) = (1,2) ever reaches
**m = 5** with k ≢ 2 (mod 3) (k≡2 escapes via (10,1,2)); m=5 is reached exactly when an anchor m
lies on the backward tree B₅ of the split map (5 ← 23 ← {68,74,…} ← …). A Collatz-flavored
exact-coincidence condition. (Mini-states m ∈ {1,2} cycle back to growth; verified their G-formula
outputs also never produce m ≡ 0 (mod 3).)

## 6. Modular traps: DEFINITIVE NEGATIVE for m ≤ 64 (`trap.mjs`)

*Part A (exact-orbit residues, deterministic map)*: BigInt orbit of the exact G/S map from (1,2),
20,000 anchor steps (**≈ 10^40000 TM steps of macro-level non-halting**) — for **every**
M = 2..64 the orbit's (m,k) residues mod M intersect the halt-class residues mod M. No residue
invariant mod M ≤ 64 separates the orbit from the halting set.

*Part B (both-branch over-approximation closure, division-by-3 ambiguity + regime ambiguity)*:
for every M ≤ 64 with 3 | M (the only moduli where "m ≡ 0 (mod 3)" is residue-expressible) the
closure from (1,2) meets the halt residues — no separating modular over-approximation exists.
(M not divisible by 3 cannot express the halt classes at all — vacuous.)

Same outcome as BMO 1/5/8: the constants (+2, j-table, /3-splits) destroy every congruence
certificate; the only surviving congruence is the mod-3 class m ≢ 0, which does not cover the m=5
trap.

## 7. Verdict

**Type (ii) — chaotic (piecewise-affine expanding macro-map with halting on exact coincidences)**,
with a *proved partial invariant*:

* Macro dynamics: exact two-counter map G (×4/3 growth) / S (÷3 split, mass to k) — verified
  anchor-by-anchor (32/32 ≥ the required 30 consecutive transitions, at 2.57×10^8 ≥ 2×10^8 steps;
  41 transitions by 3.8×10^9; raw simulation continued to 10^11 — no halt) and by constructed-start
  grid induction (8655 cells, 0 mismatches).
* Non-halting is *not provable* by residues mod ≤ 64, by monotone quantities (m oscillates ×4/3 vs
  ÷3 vs k-absorption), or by closed forms (Collatz-type).
* Non-halting **reduces exactly** to: the G/S-orbit of (1,2) never hits the backward tree B₅
  (bad k mod 3) — plus the two machine-checked invariants of §5. This is the precise obstruction:
  proving it is of the same difficulty class as the open BMO chaotic family (equivalent to a
  3-adic digit-coincidence problem for a ×4/3-÷3 piecewise affine orbit).

**Bottom line: no halt found (10^11 raw steps; 2×10^4 macro steps ≈ 10^40000 TM steps at map level);
non-halting not proved; exact reduction of the halting problem to the m=5 backward-tree condition
under G/S; all modular proofs ≤ 64 dead.**

## 8. Reproduction

```
cd bb6/attacks-sparse1
gcc -O2 -o sim.exe sim.c        && ./sim.exe blk 20000000 | diff - <(grep -v DONE ../sim/sparse1.log)   # empty
gcc -O2 -o astart.exe astart.c  && ./astart.exe grid 120 64 3000000 > grid_m120_k64.log
node fcheck.mjs grid_m120_k64.log     # cells=8655 … bad=0
bash verify_chain.sh                  # VERIFIED ok=41 bad=0 (on anchors_5e9.log)
node trap.mjs 20000
./sim.exe anchors 5000000000 | grep ^ANCH
```

## 9. Late addendum — 10^11-step anchor run

`sim.exe anchors 100000000000` (`anchors_1e11.log`): **47 anchors, no halt** (DONE at 10^11).
Late anchors: m=50965 @ 6.41×10^9, m=67957 @ 1.10×10^10, m=90613 @ 1.92×10^10,
m=120823 @ 3.38×10^10, m=161101 @ 5.98×10^10 — pure growth phase, m-ratios 1.3334…1.3333 (= 4/3),
step ratios 1.68…1.76 (→ 16/9), m/√t ≈ 0.659–0.6593. Consistent with §5: the orbit has not hit
the m=5 backward tree B₅ as of 10^11 steps (≈ 47 macro steps; the exact BigInt macro-orbit extends
this to 20,000 anchor steps ≈ 10^40000 TM steps with no halt and no m ≡ 0 (mod 3)).

