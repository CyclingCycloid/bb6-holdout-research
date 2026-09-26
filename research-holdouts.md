# BB(6) Holdouts Research — State of the Art as of 2026-09-25

Research date: 2026-09-25. Sources: wiki.bbchallenge.org, discuss.bbchallenge.org, bbchallenge.org, arXiv:2509.12337, sligocki.com, Discord links as cited on the wiki pages.

---

## 0. Executive summary (TL;DR)

- **BB(6) is still open.** As of the latest list (**September 16, 2026, shared by @mxdys**) there are **855 undecided holdout machines** (up to equivalence; **1,802** counting all equivalent machines) — down from ~1.46M in May 2023.
  - https://wiki.bbchallenge.org/wiki/Holdouts_lists
  - https://wiki.bbchallenge.org/wiki/BB(6)
- **No BB(6) holdout family is literally named "double counters"** on the wiki or forum (searches for "double counter" / "dual counter" return zero hits). "Double Counters" **is** an official *zoological family name*, but for **BB(5)** — from the paper "Determination of the fifth Busy Beaver value" (arXiv:2509.12337, Sept 15, 2025), where Skelet #10 is the "**Double Fibonacci Counter**". That 5-state double counter is **resolved** (non-halting, Coq proof).
- **The BB(6) analogue of the "double counter" family is the set of two-counter / piecewise-affine (Minsky-style) holdouts, canonically the "Beaver Math Olympiad" (BMO) machines: BMO 1, BMO 5, BMO 8** — each a 6-state machine whose blank-tape behavior reduces to iterating an affine map on **two integer counters (a, b)**. All three are **still open**.
- **The community proved the general class is Turing complete**: "BMO1-type problems" = 2-dimensional Piecewise Affine Functions (PAF) / "LIATA" (Linear Inequality Affine Transition Automata) can encode Minsky 2-counter machines (Bard → mxdys → write-up by "star", Oct 2, 2025). So general deciders for this family cannot exist; each instance needs individual math.
- **Recommended canonical representative: BMO 1**, machine `1RB1RE_1LC0RA_0RD1LB_---1RC_1LF1RE_0LB0LE` (full details in §3).
- Famous siblings for context: **Antihydra** (`1RB1RA_0LC1LE_1LD1LC_1LA0LB_1LF1RE_---0RA`, Collatz-like ⌊3n/2⌋ parity random walk, "probviously" non-halting, open), **Hydra** (BB(2,5), open), **Space Needle** (open), **Lucy's Moonlight** (probviously *halting*, open).
- Current champion lower bound (mxdys, June 2025; restated in base 10 on Sept 23, 2026): **S(6) > Σ(6) > 10↑↑10↑↑10↑↑8** (= "2↑↑↑5" notation) from `1RB1RA_1RC1RZ_1LD0RF_1RA0LE_0LD1RC_1RA0RE`, Coq-verified halting.

---

## 1. Current state of BB(6) (as of September 2026)

### 1.1 What is settled

- **BB(5) = 47,176,870** was proved July 2, 2024 (Coq proof by "mxdys"/ccz181078; human-readable paper arXiv:2509.12337 "Determination of the fifth Busy Beaver value", Sept 15, 2025). All BB(5) sporadic machines — including the 5-state **Double Fibonacci Counter (Skelet #10)** — were proved non-halting.
  - https://bbchallenge.org
  - https://arxiv.org/abs/2509.12337
- **BB(6) lower bound**: champion found by mxdys (June 2025):
  `1RB1RA_1RC1RZ_1LD0RF_1RA0LE_0LD1RC_1RA0RE` with **S(6) > Σ(6) > 10↑↑10↑↑10↑↑8** (wiki restatement Sept 23, 2026; earlier notation "2↑↑↑5"; halting itself Coq-verified in busycoq `SOBCv5.v`).
  Runner-up: `1RB1LC_1LA1RE_0RD0LA_1RZ1LB_1LD0RF_0RD1RB` with > 10↑↑11,010,000.
  - https://wiki.bbchallenge.org/wiki/BB(6)
- All remaining BB(6) machines have been simulated to **10^13 steps**; ~150 machines remain to be simulated to 10^14 and ~230 to 10^15 (they have not yet run that long without halting).
  - https://wiki.bbchallenge.org/wiki/BB(6)

### 1.2 Holdout counts (timeline from the wiki "Holdouts lists" page)

Key milestones (all by @mxdys unless noted; full table at https://wiki.bbchallenge.org/wiki/Holdouts_lists):

| Date | # holdouts | Notes |
|---|---|---|
| May 10, 2023 | 1,458,704 | @sligocki, forum era |
| May 27, 2023 | 181,851 | @sligocki |
| May 13, 2024 | 35,788 | C++ ports of Coq-BB5 deciders |
| Jun 28, 2024 | 9,366 | |
| Nov 8, 2024 | 4,408 | |
| Mar 1, 2025 | 3,571 | |
| Jul 29, 2025 | 2,728 | mxdys announcement (TMBR: July 2025) |
| Aug 30, 2025 | 2,592 | ~2,600 figure quoted in arXiv:2509.12337 |
| Oct 20, 2025 | 1,618 | the "~1,618 holdouts" figure in press coverage |
| Nov 28, 2025 | 1,416 | |
| Apr 25 / Apr 29, 2026 | 1,119 / 1,104 | "Reduction by equivalences, one halting TM" |
| Jul 28, 2026 | 1,064 | |
| Aug 30 / 31, 2026 | 1,003 / 999 | |
| Sep 8, 2026 | 964 | |
| **Sep 16, 2026** | **855** | latest; "Most holdouts solved between holdout lists since November 28, 2025" |

BB(6) wiki page gloss on the latest list: **855 up to equivalence, 1,802 without equivalence** (an informal count of 1,101 is also cited on the page).

Notable technique credits on the wiki BB(6) page: XnoobSpeakable solved 11 of the final 2,728 holdouts (Ligockis' `Enumerate.py`); mxdys's FAR method decided 113 of 1,534; Iijil's MITMWFAR was too slow; reductions by equivalences in April 2026.

### 1.3 Holdout families and status

The wiki organizes the interesting holdouts as **"Cryptids"** — machines whose blank-tape behavior has a simple complete mathematical description that is an open problem (term coined by Shawn Ligocki, Oct 2023; https://wiki.bbchallenge.org/wiki/Cryptids). Status as of the Sept 2026 wiki edits — **every family below is still open except where noted**:

**Probviously NON-halting cryptids** (heuristic/probabilistic argument for non-halting; proof would need hard number theory):
- **Antihydra** `1RB1RA_0LC1LE_1LD1LC_1LA0LB_1LF1RE_---0RA` (mxdys, June 2024) + **4 Antihydra-like variants** — OPEN.
- **Hydra-variant** `1RB1RC_1LC1LE_1RA1RD_0RF0RE_1LA0LB_---1RA` — OPEN.
- **Space Needle** `1RB1LA_1LC0RE_1LF1LD_0RB0LA_1RC1RE_---0LD` (mxdys, Jan 2025) + 3 Space-Needle-like machines — OPEN.
- (BMO 1 is listed "probviously nonhalting" in the arXiv:2509.12337 cryptid table — OPEN.)

**Probviously HALTING cryptids** (heuristic says they halt eventually; no proof, and the halting time may be astronomically large):
- **Lucy's Moonlight** `1RB0RD_0RC1RE_1RD0LA_1LE1LC_1RF0LD_---0RA` (Racheline, Mar 2025) — OPEN.
- A family of 16 machines `1RB1RA_0RC1RC_1LD0LF_0LE1LE_1RA0LB_---0LC` — OPEN.
- Seven other listed machines — OPEN.

**Edge case:** `1RB1LE_0LC0LB_1RD1LC_1RD1RA_1RF0LA_---1RE` — estimated 3/5 chance of becoming a translated cycler, 2/5 chance of halting — OPEN.

**"Potential Cryptids"** (chaotic, no known Collatz-like/open-problem link): 7 machines, including **BMO 8** `1RB0LD_0RC1RB_0RD0RA_1LE0RD_1LF---_0LA1LA` and a BMO8-like machine — OPEN.

**Beaver Math Olympiad (BMO) problems** (https://wiki.bbchallenge.org/wiki/BMO — page last edited Sept 24, 2026; problems also formalized in Lean in google-deepmind/formal-conjectures):
- BMO 1 — two-counter PAF machine — **OPEN** (see §3).
- BMO 2 — Hydra (BB(2,5)) + Antihydra (BB(6)): parity random walk of aₙ₊₁ = aₙ + ⌊aₙ/2⌋ — **OPEN**.
- BMO 5 — two-counter machine `1RB0LD_1LC0RA_1RA1LB_1LA1LE_1RF0LC_---0RE` — **OPEN** (see §4).
- BMO 6 — Space Needle: f(b) = b + k + 3a where b = (2a+1)·2^k; iterating from 6, does some iterate hit a power of 2? — **OPEN**.
- BMO 8 — three/two-counter machine `1RB0LD_0RC1RB_0RD0RA_1LE0RD_1LF---_0LA1LA` — **OPEN** (see §4).
- BMO 10 `1RB0LB_0RC0LD_1LD1RE_0LA0RF_0RD1RF_0RC---`, BMO 11 `1RB0LD_0LC0RE_1LA0RD_0RB0LC_1RC1RF_0LD---` — word-rewriting systems (not counters) — **OPEN**.
- BMO 3 — **SOLVED, non-halting** (v₂ recurrence aₙ = aₙ₋₁ + 2^(v₂(aₙ₋₁)+2) − 1; formal Lean proof + LLM-translated Rocq proof).
- BMO 4 — **SOLVED, non-halting** (closed form aₙ = (3/5)·2ⁿ + period-4 correction, induction).
- BMO 7 — **SOLVED, non-halting** (f(n) = n+1+(v₂(n+1) mod 2) iteration).
- BMO 9 — **SOLVED** (per the wiki's "solved" section; 4-rule rewrite system on ℕ^ω).

The remaining bulk of the ~855 holdouts are machines with chaotic/"spaghetti" behavior not (yet) matched to any named family; most are expected to fall to simulation limits (10^14–10^15 steps) or to FAR-style deciders, but each cryptid above needs actual mathematics.

---

## 2. Where the term "double counter" actually lives (BB(5) zoology) and the BB(6) closest match

- **"Double Counters" is an official family in the BB(5) paper's "Zoology" section** (arXiv:2509.12337, Section 7): "Double Counters implement two independent counters"; the section's Figure 16 example is `1RB1LE_1LC0RB_1RD0LC_1LA1RB_1LB---` (base-2 counter on the left of the tape, base-3 counter on the right), and **Skelet #10 is the "Double Fibonacci Counter"** (two coupled counters in Zeckendorf/base-Fibonacci representation). All resolved during the BB(5) proof — Skelet #10 non-halting via Coq (`Skelet10.v` in busycoq).
- **In BB(6), no family is named "double counter"/"dual counter"** — wiki full-text search and forum search for those phrases return zero hits (checked 2026-09-25). The **closest match, and the de-facto BB(6) double-counter family, is the two-counter Collatz-like / piecewise-affine holdouts BMO 1, BMO 5, BMO 8** (§3–4). These are machines whose macro behavior is governed by **two integer counters** updated by affine branch rules depending on which counter is bigger — exactly a Minsky-2-counter-shaped problem — and the community explicitly proved this class Turing complete:
  - Forum thread "BMO1 Type problems are Turing Complete" (star, Oct 2, 2025): https://discuss.bbchallenge.org/t/bmo1-type-problems-are-turing-complete/305
    - Bard (Discord) reduced Minsky counter machines to 3-variable BMO-type problems; mxdys reduced to 2 variables; "star" wrote it up and coined **LIATA** (Linear Inequality Affine Transition Automata); savask identified the class as the known **Piecewise Affine Functions (PAF)**; sligocki made the wiki page https://wiki.bbchallenge.org/wiki/Piecewise_Affine_Function.
    - Encoding: a = x+y+1, b = x + k·a (k = instruction counter); instruction selection via k·a ≤ b < (k+1)·a; increments/decrements as affine updates; jumps via b → b + (k−j)a.
    - Known literature cited there: mortality of 2D PAFs with arbitrary regions is undecidable; undecidable for 2 regions in arbitrary dimension; 1D decidable but PSPACE-hard; the specific **2-region 2D integer case is open** (Ben-Amram, "Mortality of Iterated Piecewise Affine Functions over the Integers", https://d-nb.info/1365366227/34; Braverman, "Termination of Integer Linear Programs", https://mbraverm.princeton.edu/files/terminationCAV.pdf; also arXiv:1404.0644 for matrix form).
  - Caveat stressed in the thread: hardness of the general class does not prove the specific instances (BMO1/5/8) are hard.

---

## 3. THE KEY DELIVERABLE — the double-counter machines of BB(6)

### 3.1 BMO 1 (recommended canonical representative)

- **Name/ID**: "BMO 1" = Beaver Math Olympiad Problem 1. Standard identifier = the one-line code `1RB1RE_1LC0RA_0RD1LB_---1RC_1LF1RE_0LB0LE` (bbchallenge uses the code itself as the machine URL; no numeric seed ID is cited on the wiki).
  - bbchallenge: https://bbchallenge.org/1RB1RE_1LC0RA_0RD1LB_---1RC_1LF1RE_0LB0LE&status=undecided
  - wiki: https://wiki.bbchallenge.org/wiki/1RB1RE_1LC0RA_0RD1LB_---1RC_1LF1RE_0LB0LE
  - Also the flagship example problem in arXiv:2509.12337 §1.2 ("Probviously nonhalting").
- **Status**: OPEN holdout / potential cryptid. Halting status unknown; forward-simulated to counter values beyond 2^1,000,000 without halting.
- **Conventions**: standard bbchallenge — all-0 tape, head at origin, start state A. `---` = undefined transition (halting transition is **D on symbol 0**).

**One-line format**: `1RB1RE_1LC0RA_0RD1LB_---1RC_1LF1RE_0LB0LE`

**Full transition table** (state, symbol read → symbol written, move, next state):

| State | read 0 | read 1 |
|---|---|---|
| A | 1, R, B | 1, R, E |
| B | 1, L, C | 0, R, A |
| C | 0, R, D | 1, L, B |
| D | **— (HALT)** | 1, R, C |
| E | 1, L, F | 1, R, E |
| F | 0, L, B | 0, L, E |

**Macro-level (counter) semantics** — normalized form due to dyuan01 (wiki page; same recurrence in the BMO page and arXiv paper):

- Parametrized configuration: `A(a,b) := 0^inf 1 0^(a-1) 0 1^b E> 0^inf` (a ≥ 1 is an invariant); the blank-tape start reaches the macro state **(a,b) = (1,2)**.
- Update rules applied per macro step:
  - if **a > b**: `(a,b) → (a − b, 4b + 2)`
  - if **a < b**: `(a,b) → (2a + 1, b − a)`
  - if **a = b**: **HALT** (fires the undefined D/0 transition).
- Equivalent symmetric matrix form (Shawn Ligocki): configuration E(a, 0, c+1) with rules → (a−c−1, 4c+5) / (2a+2, c−a−1).
- First orbit pairs: (1,2), (3,1), (2,6), (5,4), (1,18), (3,17), (7,14), (15,7), (8,30), (17,22), …

**Everything tried/proved so far** (all links on the wiki machine page):
- **@-d (June 25, 2024)**: derived the f(a,b) rules; ran to a,b > 2^1,000,000.
- **Shawn Ligocki (June 25–26, 2024)**: confirmed rules; tracked "spread" |a−c| for 3M macro steps — grows almost monotonically → halting suspected impossible or astronomically unlikely; unstable cycle near ratio x ≈ 1.76.
- **savask (June 26, 2024)**: simplified constant-free model; it *trivially* can't halt due to a mod-8 trapping (constant terms are what make BMO1 itself hard).
- **dyuan01**: the symmetric coordinate change above.
- **LegionMammal978 & Math.SE user "Sil"**: invariant density f(r) = 2 ln 3 / ((r+1)(r+3)) for the ratio r = b/a; average growth of ln a ≈ 0.15097694 per macro step (heuristic for non-halting: the orbit drifts away from the diagonal). Math.SE: https://math.stackexchange.com/questions/4939082 (answer 4939136).
- **Racheline & Andrew Ducharme (July 2024, Discord)**: backward reasoning in (slope, intercept) space; Location 1 → limit (1,1) never reached; Location 2 → limit (13/7, 4/21) strictly above the halt line; Location 3 → fractal accumulation near m ≈ 1.76 with points (e.g. 611281/347027) approaching the halt line arbitrarily closely without hitting it.
- **Bard (paper)**: homogenization / 1D-limit analysis; reduces the problem to irrationality of α ≈ 0.3621250257705563; does not close the proof. PDF: https://wiki.bbchallenge.org/w/images/9/94/BMO1-Bard.pdf
- **"Opus 4.7" review (April 19, 2026)**: verified the backward-reasoning algebra; found gaps in Bard's proof (z_n → 0 unproven; halt case glossed over); concluded "neither work proves BMO1"; progress likely needs an ergodic/entropy argument.
- **Matrix reformulation**: equivalent to a "zero-in-the-left-upper-corner" product problem for two 3×3 matrices A′, B′ (write-up: https://wiki.bbchallenge.org/wiki/File:BMO1_Matrix_Proof.pdf); mortality undecidable for 5 matrices, open for 2 (arXiv:1404.0644).
- **Formalization**: transition rules and recurrence derivation formalized in Lean by rwst: https://github.com/rwst/bbchallenge/tree/main/1RB1RE_1LC0RA_0RD1LB_---1RC_1LF1RE_0LB0LE/machine.lean ; BMO 1 is in DeepMind's formal-conjectures (github.com/google-deepmind/formal-conjectures, Other/BeaverMathOlympiad.lean).
- **Class hardness**: "BMO1-type problems are Turing complete" (§2) — general LIATA/PAF halting is undecidable.

### 3.2 BMO 5 — second two-counter holdout

- **One-line**: `1RB0LD_1LC0RA_1RA1LB_1LA1LE_1RF0LC_---0RE`
- wiki: https://wiki.bbchallenge.org/wiki/1RB0LD_1LC0RA_1RA1LB_1LA1LE_1RF0LC_---0RE ; bbchallenge: https://bbchallenge.org/1RB0LD_1LC0RA_1RA1LB_1LA1LE_1RF0LC_---0RE
- **Transition table**:

| State | read 0 | read 1 |
|---|---|---|
| A | 1, R, B | 0, L, D |
| B | 1, L, C | 0, R, A |
| C | 1, R, A | 1, L, B |
| D | 1, L, A | 1, L, E |
| E | 1, R, F | 0, L, C |
| F | **— (HALT)** | 0, R, E |

- **Counter semantics** (found by @mxdys, Discord, Aug 7, 2024): configuration `(a,b) := 0^inf 01^a 110 A> 1^(2b+1) 0^inf`, start **(2,3)**:
  - `(a, b+a+2) → (2a+3, b)`
  - `(a+b+1, b) → (2, a+4b+5)`
  - `(a, a) → halt` (appears unused)
  - `(a, a+1) → (2, 2a+4)` (used only once, at the start)
  - dyuan01's cleanup: `<i,b>` with a(i) = 10·2^i − 1, start `<0,5>`: `b ≥ a(i) → <i+1, b−a(i)>`; `b ≤ a(i)−2 → <i, 3b+i+5>`; `b = a(i)−1 → halt` (unused). BMO statement: sequences from (a₁,b₁) = (0,5) with f(x) = 10·2^x − 1; halts iff some bᵢ = f(aᵢ) − 1.
- **Status**: OPEN. Forward-simulated **33,342,087,612,867 steps** (~3.3×10^13) by Andrew Ducharme without halting; counter values reached ~10^(2×10^6). Transition rules formally verified in Rocq: https://github.com/ccz181078/busycoq/blob/BB6/verify/1RB0LD_1LC0RA_1RA1LB_1LA1LE_1RF0LC_---0RE.v (rules only, not the halting question).
- **Equivalence siblings** (same behavior, different start state): `1RB1LC_1RC0LD_1LA0RB_1LB1LE_1RF0LA_---0RE` (start tuple (2,1)) and `1RB1RE_1LC0RA_1RD0LB_1LB1RC_1LF0RD_---0LE` (start tuple (2,0)).

### 3.3 BMO 8 — three-counter (reducible to two-counter) holdout

- **One-line**: `1RB0LD_0RC1RB_0RD0RA_1LE0RD_1LF---_0LA1LA`
  (equivalent variant: B/1 → 0RF instead of 1RB, i.e. `1RB0LD_0RC0RF_...`)
- wiki: https://wiki.bbchallenge.org/wiki/1RB0LD_0RC1RB_0RD0RA_1LE0RD_1LF---_0LA1LA ; bbchallenge: https://bbchallenge.org/1RB0LD_0RC1RB_0RD0RA_1LE0RD_1LF---_0LA1LA
- **Transition table**:

| State | read 0 | read 1 |
|---|---|---|
| A | 1, R, B | 0, L, D |
| B | 0, R, C | 1, R, B (variant: 0, R, F) |
| C | 0, R, D | 0, R, A |
| D | 1, L, E | 0, R, D |
| E | 1, L, F | **— (HALT)** |
| F | 0, L, A | 1, L, A |

- **Counter semantics**:
  - mxdys (Discord, ~April 2026), 3-counter model on the variant, start (10, 0, 12):
    - (n+a, b, 2n+c) → (a, n+b, c)
    - (0, b, c) → (5+3b, 0, c)
    - (1, 10+b, 0) → halt; (1, 10+b, 1) → halt
    - (2, b, 0) → (2, 0, 8+3b); (2, b, 1) → (2, 0, 11+3b)
    - (3+a, b, 0) → (a, 0, 6+3b); (3+a, b, 1) → (a, 0, 9+3b)
    - Not halted within 8.9×10^12 macro steps; log(c/a) appears well-distributed ("no quick fixpoint").
    - Discord: https://discord.com/channels/960643023006490684/1239205785913790465/1402211374565953609
  - dyuan (Discord): config A(a,b,c) = 1⁴ 0^a ⟨A⟩ 1^(3b) 0 1^c 0 1², start A(4, 0, 11), with halting at A(1, b+5, 0) or A(1, b+4, 1); **reduced 2-counter form** B(a,b) = A(a, 0, b), start B(4, 11):
    - B(a+b+2, 2b+1) → B(a, 3b+8); B(b+1, 2b+1) → halt
    - B(a+b+2, 2b) → B(a, 3b+5); B(b+1, 2b) → halt
    - B(a, 2a+b) → B(3a+3, b+2)
    - BMO statement: sequences from (10,12); halts iff some aₙ = ⌊bₙ/2⌋ + 1.
    - Discord: https://discord.com/channels/960643023006490684/1468065303278911613
- **Status**: OPEN (listed under "Potential Cryptids" on the BB(6) page — chaotic, no Collatz-like model yet beyond the counter recurrences).

---

## 4. Context: the famous siblings

### 4.1 Antihydra (BMO 2) — the Collatz-like flagship

- **One-line**: `1RB1RA_0LC1LE_1LD1LC_1LA0LB_1LF1RE_---0RA`; wiki: https://wiki.bbchallenge.org/wiki/Antihydra
- Found by **mxdys (Discord, June 28, 2024)**; high-level rules by **Racheline**; announced in Shawn Ligocki's blog post "BB(6, 2) is Hard (Antihydra)" (July 6, 2024): https://www.sligocki.com/2024/07/06/bb-6-2-is-hard.html — the post that established "BB(6) is hard" via a Cryptid.
- Semantics: reaches config A(0,4) after 11 steps; iterate **f(n) = ⌊3n/2⌋ + 2** (equivalently Hydra function H(n) = ⌊3n/2⌋ with Hⁱ(8) = fⁱ(4)+4); an auxiliary counter does +2 on even, −1 on odd; **halts iff the counter ever hits −1** (i.e., more than twice as many odds as evens). BMO 2 statement: aₙ₊₁ = aₙ + ⌊aₙ/2⌋; for a₀=8 do the evens/odds ever fall behind 2:1?
- Status: **OPEN** ("probviously" non-halting: random-walk hitting probability from current a is φ^(−a) ≈ 10^(−2.9×10^10); simulated to 2^38 rule steps). Parity question connects to Mahler's 3/2 problem / Odlyzko–Wilf; not Sturmian (Dubickas 2009). Lean basics: https://github.com/rwst/Antihydra-Basics ; OEIS A386792, A385902. Plus 4 Antihydra-like variants, all open.
- Hydra itself is BB(2,5) `1RB3RB---3LA1RA_2LA3RA4LB0LB0LA` (Daniel Yuan, May 2024) — open; compiled to BB(9) by Iijil1.

### 4.2 Space Needle (BMO 6)

- `1RB1LA_1LC0RE_1LF1LD_0RB0LA_1RC1RE_---0LD` (mxdys, Jan 2025). f(b) = b + k + 3a where b = (2a+1)·2^k; iterate from 6; halts iff some iterate is a power of 2. Probviously non-halting; **OPEN**. + 3 Space-Needle-like machines (open).

### 4.3 Lucy's Moonlight

- `1RB0RD_0RC1RE_1RD0LA_1LE1LC_1RF0LD_---0RA` (Racheline, Mar 2025). Probviously **halting** (the mirror-image difficulty: proving it halts may be as hard as the others). **OPEN**.

### 4.4 Collatz/3x+1 note

No BB(6) holdout is literally the 3x+1 map; the Collatz-like holdouts use ⌊3n/2⌋-type branches (Antihydra family), v₂-based recurrences (solved BMO 3/4/7), or two-counter PAFs (BMO 1/5/8). Pascal Michel's historical survey of such small-machine Collatz-like behavior is cited as arXiv:0906.3749 ("The Busy Beaver Competition: a historical survey") in arXiv:2509.12337.

---

## 5. Recommendation: canonical double-counter representative

**Use BMO 1 = `1RB1RE_1LC0RA_0RD1LB_---1RC_1LF1RE_0LB0LE`.**

Justification:
1. **It is the named flagship of the family**: Problem #1 of the Beaver Math Olympiad (the community's own curation of "the cleanest open problems"), and the example cryptid featured in the arXiv BB(5) paper (§1.2) — the most-discussed two-counter machine in the literature.
2. **Cleanest semantics**: a pure 2D piecewise-affine map with constant coefficients — `(a,b) → (a−b, 4b+2)` / `(2a+1, b−a)`, halt iff a=b, start (1,2). BMO 5 needs the auxiliary sequence a(i) = 10·2^i−1; BMO 8 is naturally 3-counter with a messier 2-counter reduction.
3. **Richest prior art to build on**: rules derived and confirmed (@-d, Ligocki, June 2024), constant-free variant with mod-8 trapping (savask), symmetric coordinates (dyuan01), invariant density and drift rate (LegionMammal978/Sil), full backward-reachability analysis with fractal structure (Ducharme, July 2024), a partial homogenization proof reducing to irrationality of α ≈ 0.362125… (Bard), an independent audit finding the gaps (Apr 2026), Lean-formalized rules (rwst), and a matrix-form reformulation.
4. **It anchors the undecidability result**: "BMO1-type problems are Turing complete" — the general class provably simulates Minsky 2-counter machines, so BMO 1 is the literal BB(6) representative of "the Minsky double-counter frontier".
5. **All its halt-adjacent branches appear unreachable** (the a=b and a=a+1 rules are unused / limit points miss the halt line), making it the most tractable target for an ergodic-theory or irrationality attack.

**Quick-reference card for BMO 1:**

```
One-line: 1RB1RE_1LC0RA_0RD1LB_---1RC_1LF1RE_0LB0LE

A: 0 -> 1 R B     1 -> 1 R E
B: 0 -> 1 L C     1 -> 0 R A
C: 0 -> 0 R D     1 -> 1 L B
D: 0 -> HALT      1 -> 1 R C
E: 0 -> 1 L F     1 -> 1 R E
F: 0 -> 0 L B     1 -> 0 L E

Start: blank tape, state A, head at origin.
Macro config: 0^inf 1 0^(a-1) 0 1^b (head in E at right edge), start (a,b)=(1,2).
  a > b : (a,b) -> (a-b, 4b+2)
  a < b : (a,b) -> (2a+1, b-a)
  a = b : HALT
Status (2026-09): open; simulated to a,b > 2^1,000,000; probviously non-halting.
```

---

## 6. Source index

- Wiki: https://wiki.bbchallenge.org/wiki/BB(6) ; /wiki/Holdouts_lists ; /wiki/Cryptids ; /wiki/Antihydra ; /wiki/BMO ; /wiki/1RB1RE_1LC0RA_0RD1LB_---1RC_1LF1RE_0LB0LE ; /wiki/1RB0LD_1LC0RA_1RA1LB_1LA1LE_1RF0LC_---0RE ; /wiki/1RB0LD_0RC1RB_0RD0RA_1LE0RD_1LF---_0LA1LA ; /wiki/Piecewise_Affine_Function
- Forum: https://discuss.bbchallenge.org/t/bmo1-type-problems-are-turing-complete/305 ; https://discuss.bbchallenge.org/t/july-2nd-2024-we-have-proved-bb-5-47-176-870/237 ; "Shawn's BB(6) Holdouts" (Mar 2023, historical)
- Main site: https://bbchallenge.org (BB(5) story, deciders, champion list)
- Paper: Blanchard et al., "Determination of the fifth Busy Beaver value", arXiv:2509.12337 (Sept 15, 2025) — zoology incl. Double Counters/Skelet #10; BMO 1 as example cryptid; S(6) > 2↑↑↑5 appendix.
- Blog: S. Ligocki, "BB(6, 2) is Hard (Antihydra)" https://www.sligocki.com/2024/07/06/bb-6-2-is-hard.html ; S. Aaronson, "BusyBeaver(6) is really quite large" (June 2025); B. Brubaker, "Why Busy Beaver Hunters Fear the Antihydra" (Oct 25, 2025).
- Code/formal: https://github.com/ccz181078/Coq-BB5 ; https://github.com/ccz181078/busycoq (BB6 branch) ; https://github.com/rwst/bbchallenge (BMO1 Lean) ; https://github.com/rwst/Antihydra-Basics ; https://github.com/google-deepmind/formal-conjectures (BeaverMathOlympiad.lean)
- Math background: Ben-Amram, Mortality of Iterated PAFs (https://d-nb.info/1365366227/34); Braverman, Termination of ILPs (https://mbraverm.princeton.edu/files/terminationCAV.pdf); matrix mortality arXiv:1404.0644; Math.SE 4939082; Bard's BMO1 homogenization PDF (wiki images); Michel's survey arXiv:0906.3749.
