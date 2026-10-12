# Techniques for deciding non-halting of small Turing machines, with focus on BB(6) counter-simulating holdouts

Research notes compiled 2026-09-25. Sources: wiki.bbchallenge.org, discuss.bbchallenge.org, arXiv, sligocki.com, scottaaronson.blog, bbchallenge.org, github.com. Every claim is tagged with its source URL. "Rigorous" = complete mathematical/formal proof; "Heuristic" = probabilistic or empirical argument only.

---

## 0. Context: the BB(6) frontier as of Sept 2026

- BB(5) = 47,176,870, proven in Coq/Rocq (announced July 2, 2024). Paper: "Determination of the fifth Busy Beaver value", arXiv:2509.12337 (v1 Sep 2025, v2 Mar 2026; also STOC'26: https://compilercrim.es/pubs/bb5-stoc26.pdf). Repository: https://github.com/ccz181078/Coq-BB5.
- BB(6) current champion (mxdys, June 2025) `1RB1RA_1RC1RZ_1LD0RF_1RA0LE_0LD1RC_1RA0RE` with S(6) > Σ(6) > 2↑↑2↑↑2↑↑10 (pentational); runner-up > 10↑↑11,010,000; previous Kropitz machine > 10↑↑15. Source: https://wiki.bbchallenge.org/wiki/BB(6), https://scottaaronson.blog/?p=8972.
- BB(6) holdouts: 855 machines up to equivalence (1,802 raw) as of Sep 16, 2026, down from ~1.46M in May 2023. All simulated ≥ 10^13 steps. Progress ledger: https://wiki.bbchallenge.org/wiki/Holdouts_lists.
- The ~855 holdouts include ~19 "Cryptids" (machines whose behavior is completely described by a simple mathematical rule that constitutes an open math problem, mostly Collatz-like or random-walk-like). Cryptid list: https://wiki.bbchallenge.org/wiki/Cryptids.
- Key structural fact: a 2-symbol n-state machine that simulates a 2-counter (Minsky) computation is exactly the "hardest" kind of holdout: its halting question is an open number-theory question. For BB(6) specifically, Antihydra (Collatz-like 1-counter with parity statistic) and the Beaver Math Olympiad machines (2-sequence recurrences ≈ 2-counter behavior) are the flagship examples.

---

## 1. Taxonomy of non-halting proof techniques

Canonical references: the decider survey "Turing machines deciders, part I" (arXiv:2504.20563, https://arxiv.org/abs/2504.20563), the BB(5) paper (arXiv:2509.12337, https://arxiv.org/html/2509.12337v2), the wiki deciders index (https://wiki.bbchallenge.org/wiki/Deciders) and method page (https://bbchallenge.org/method#deciders).

### 1.1 Cyclers (direct periodicity) — RIGOROUS, decidable in practice
- Behavior: a full configuration (state, head, tape) repeats exactly.
- Method: store visited configurations in a hash set; on repeat, the machine loops forever. Theorem 2.1 of arXiv:2504.20563. Decided ~11.2M machines (12.7%) of the bbchallenge seed database. In the Coq pipeline the "Loops" decider catches Cyclers and Translated Cyclers together (~96.75% of all 5-state machines) using only sequences of (state, read symbol, head position) triples, with step limits L = 130 / 4,100 / 1,050,000 (arXiv:2509.12337 §4).
- Example resolved: Skelet #1 was long believed chaotic but is a translated cycler with a "preposterously long period" (>8 billion, after >5.41×10^51 chaotic steps); Coq proof Skelet1.v in busycoq. Sources: https://discuss.bbchallenge.org/t/skelet-1-is-a-translated-cycler-coq-agrees/166, https://discuss.bbchallenge.org/t/the-30-to-34-ctl-holdouts-from-bb-5/141, https://github.com/meithecatte/busycoq.

### 1.2 Translated cyclers (finite-automaton periodicity up to translation) — RIGOROUS
- Behavior: a bounded tape pattern repeats forever while being translated through space; the sequence of "record-breaking" configurations (head reaching a never-visited cell) is eventually periodic.
- Method: track record configurations on each side; if two records on the same side in the same state have matching local tape content within distance L, the behavior reproduces translated forever (Lemma 3.1, arXiv:2504.20563). Decided ~73.9M machines (~83.3%) of BB(5) (https://bbchallenge.org/method).
- "Translated cyclers mod k": for Collatz-like machines the macro-step behavior often only closes up modulo the parameter (e.g., the macro rule applies when a counter is 2 mod 3); one then proves the residue class recurs forever. This is how the accelerated "Collatz Level 2 inductive rules (mod-3 remainders via Euler's totient)" behave for the BB(6) tetrational champions (mentioned on https://wiki.bbchallenge.org/wiki/BB(6)). Rigorous once the induction is written down.

### 1.3 Bouncers / linear machines ("Christmas trees") — RIGOROUS
- Behavior: head sweeps between two tape ends, growing the visited region linearly; tape filled with "repeaters" (repeated blocks) separated by fixed "walls". Brady's Christmas trees for BB(4); generalized bouncers formalized in §7 of arXiv:2504.20563 (directional TMs, wall-repeater "formula tapes", linear-quadratic growth laws).
- Method: the Bouncer decider matches the tape against wall-repeater formulas and proves by induction each sweep appends a repeater. Coq implementation in busycoq (beaver/ Rust decider + verify/ Coq checker): https://github.com/meithecatte/busycoq. Decided ~1.4M BB(5) machines.
- 4 of the 34 final BB(5) CTL holdouts were bouncers (Skelet #20, #21, #28, #39): https://discuss.bbchallenge.org/t/the-30-to-34-ctl-holdouts-from-bb-5/141.

### 1.4 Counters (place-value / geometric-growth machines) — RIGOROUS via inductive macro rules; the crux of BB(5)'s hard tail
- Definition: a non-halting TM whose tape grows logarithmically with time and passes through a place-value numbering system (binary, ternary, Fibonacci...). Wiki: https://wiki.bbchallenge.org/wiki/Counter.
- HOW resolved — exact method, exemplified by the 2-state binary counter `1RB1LA_0LA0RB`:
  - Coarse-grained macro rules: define R₀ = B0 and Rₙ = B1 Rₙ₋₁ A0 Rₙ₋₁ A1; prove by induction Rₙ : B>(1ⁿ)0 → A<(1ⁿ)0, so the machine survives forever; step counts obey |Rₙ| = 2|Rₙ₋₁| + 3, i.e. |Rₙ| = 2^{n+2} − 3.
  - Detailed digit-level rules: B bin(n) >0 → B bin(n+1) >0 in 2^{v₂(n+1)} + 2 steps, via the lemma B 0(1ᵏ)>0 → B 1(0ᵏ)>0 in 2k+2 steps.
  - This is exactly the wiki's "Inductive Proof" framework (https://wiki.bbchallenge.org/wiki/Inductive_Proof): generalized transition rules with parameters, each proved by induction with steps of type (A) single TM transition, (B) inductive hypothesis, (C) previously proven rule; rule levels L0 (shift rules), L1, L2, L3... with tape compression (macro machines, nested repeaters, arithmetic-sequence repeaters, structural counters).
- **Double counters**: both half-tapes are counters that must stay synchronized.
  - Skelet #10 (`1RB0RA_0LC1RA_1RE1LD_1LC0LD_---0RB`, bbchallenge 3,810,716), the "base-Fibonacci double counter". Full method in https://www.sligocki.com/2023/03/14/skelet-10.html: counters count in Zeckendorf (Fibonacci) representation; increment rules `A> 0 (10)^k 0 → <D 0^{2k} 10` and `B> 10 (10)^k 0 → <D 0^{2k+1} 10` implement Z(n) → Z(n+1) on the right while the left side uses a different encoding T(0w)=T(w)00, T(10w)=T(w)1010. Non-halting theorem: D(n) = L(n) <D Z(n+1) satisfies D(n) → D(n+1) by 3-case analysis on the low bits of Z(n); the crux is "Z(n+1) starts with 1 iff Z(n) starts with 00", i.e. the sides stay synchronized. Original proof by Dan Briggs: https://github.com/danbriggs/Turing2010/blob/master/proofs/10/comments%20on%2010th.rtf. Formalized as Skelet10.v in busycoq (arXiv:2509.12337).
  - **Shift Overflow Counters (SOC)** — Skelet #15, #26, #33, #34, #35: digits as fixed-length blocks; a basic double counter runs until one side overflows, shifting block offsets and invalidating the encoding; a Reset Phase reparses. Overflow rules like `G(2n, 2^k−1) → D(n, 2^k)` halve one counter and double the other, producing exponential growth; non-halting follows from the "Reset Invariant" b(m) > 2n (for sk26: b(m) > 2^{v₂(n)}). Method post: https://www.sligocki.com/2023/02/05/shift-overflow.html; per-machine post https://www.sligocki.com/2023/02/02/skelet-34.html; wiki stub https://wiki.bbchallenge.org/wiki/Shift_overflow_counter. WARNING on rigor: meithecatte noted the original manual "proofs" for #26/#33 were sketches with "gaping hole" reset-invariant inequalities; the gaps were closed by Jason Yuen (int-y1) and Maja Kądziołka (meithecatte) with full Coq proofs (threads #165, #180, #183 on discuss.bbchallenge.org, linked from the wiki page).
  - These SOC machines are the direct 5-state ancestors of the BB(6) tetrational champions, whose "Shift Overflow Counters" iterate the overflow loop one more level (Aaronson's post: https://scottaaronson.blog/?p=8972, explanation by Ligocki therein).
- "Counter-balanced", "counter-inverted", "cubic-helix", "cubic-finned" families (12+2+3+5 of the 34 final BB(5) CTL holdouts): all are counter variants; resolved by Iijil's MITMWFAR weighted-automata decider and by individual Coq proofs. The cubic-finned machines "effectively operate on a pair of unary numbers", and Iijil PROVED the first naturally-occurring machine (10,756,090) has reachable/halting configuration sets that no regular language separates (i.e., genuinely irregular): https://discuss.bbchallenge.org/t/10756090-is-irregular/137. Master thread with full zoology: https://discuss.bbchallenge.org/t/the-30-to-34-ctl-holdouts-from-bb-5/141.
- Marxen–Buntrock (1990) invented tape compression + accelerated simulation for exactly these families; Brady coined "counters" and "Christmas trees". History: https://github.com/danbriggs/Turing README; Michel's historical survey arXiv:0906.3749; Michel's behavior catalog https://bbchallenge.org/~pascal.michel/ha (section tm62).

### 1.5 Closed-set abstractions: CTL / CPS / FAR / WFAR — RIGOROUS (finite-state abstractions)
- **Closed Tape Language (CTL)** (Marxen–Buntrock; S. Ligocki): find a set C of configurations containing the initial one, closed under the transition relation, containing no halting configuration. Regular CTL uses two DFAs (left/right tape) + accepting quadruples (l, r, q, s); built lazily from a DFA-generator. Explainer: https://www.sligocki.com/2022/06/10/ctl.html; wiki: https://wiki.bbchallenge.org/wiki/Closed_Tape_Language.
- **Closed Position Set (CPS)** and **n-gram CPS**: CTL where the DFA states are local n-grams of tape plus state/middle symbol (Skelet's 2003 bbfind technique; ~6,000 lines Pascal); augmented with fixed-length histories and LRU caches. NGramCPS decided 6,005,142 non-loop BB(5) machines (99.89% of non-loop non-halting). Source: arXiv:2509.12337 §4.
- **Finite Automata Reduction (FAR)** (Justin Blanchard, Oct 2022): the dual — find a regular language containing ALL eventually-halting configurations (finite-support encodings); if the blank configuration is rejected, the machine never halts. NFA/matrix formulation with 8 closure conditions (Theorem 6.1 of arXiv:2504.20563); unique minimal fixpoint solution exists (Lemma 6.1); Section 6.5: FAR ≡ regular CTL proofs via a quotient machine and Myhill–Nerode. History + code links: https://wiki.bbchallenge.org/wiki/Finite_Automata_Reduction; discussion thread https://discuss.bbchallenge.org/t/decider-finite-automata-reduction/123. FAR decided the final 23 regular BB(5) holdouts (40 hardcoded certificates, only the verifier formalized in Coq) — arXiv:2509.12337.
- **Weighted FAR (WFAR) / MITMWFAR**: weighted finite automata over semirings other than Booleans — captures some non-regular (counting) structure; decided the last 17 irregular BB(5) machines; Iijil's meet-in-the-middle SAT-based implementation (MITMWFAR) decided the counter-balanced/counter-inverted/cubic-helix families of the CTL holdouts. Sources: arXiv:2509.12337 §4; https://wiki.bbchallenge.org/wiki/Closed_Tape_Language (MITMWFAR section); https://discuss.bbchallenge.org/t/the-30-to-34-ctl-holdouts-from-bb-5/141.
- **SAT/SMT encodings**: Deka's SAT-based FAR (Oct 2022), github.com/colette-b/bbchallenge; meet-in-the-middle FAR as a SAT problem over closure conditions (arXiv:2504.20563 §6).
- Code locations: https://github.com/bbchallenge/bbchallenge-deciders (official deciders incl. FAR + reproduction), https://github.com/UncombedCoconut/bbchallenge-deciders (Blanchard original FAR), https://github.com/TonyGuil/bbchallenge (Guilfoyle reproduction), https://github.com/meithecatte/busycoq (Rust deciders + Coq verifiers for Cyclers/TC/Backwards/Bouncers).
- Limit theorem (important for strategy): CTL-with-regular-languages sufficed for S(4) and S(2,4); BB(5) needed irregular methods (WFAR + sporadic proofs); counter machines are provably beyond regular CTL in several cases (Iijil's irregularity proof above). So for BB(6) counter holdouts, pure finite-automata methods are known-insufficient in general.

### 1.6 Backward reasoning / halting-segment — RIGOROUS
- Backward Reasoning (from Marxen–Buntrock): build the tree of predecessors of halting configurations; if it contradicts written symbols or exceeds depth D without covering the initial configuration, combined with D steps of forward non-halting simulation, the machine never halts (Theorem 4.1, arXiv:2504.20563). Decided ~2.0M BB(5) machines.
- Halting Segment (Newcomb Greenleaf): simulate on a finite segment; the Halting Segment graph must cover all head positions with halting nodes for the machine to halt through that transition; used on the Marxen–Buntrock chaotic machine (§5, arXiv:2504.20563).
- Repeated Word List (RepWL/RepWL_ES) and RWLAcc: accelerated simulators based on repeated tape words; decided the 6,577 BB(5) machines between NGramCPS and FAR (arXiv:2509.12337 §4).

### 1.7 Accelerated simulation & inductive proof systems (the main tool for counter/Collatz machines) — RIGOROUS when rules are proven
- Quick_Sim (Ligocki & Ligocki, since 2005): Python inductive proof system with fixed-block macro machines, tape compression, shift rules, an inductive rule prover, and a nested-exponential integer datatype; reaches tetrational runtimes via L3 inductive rules. Code: https://github.com/sligocki/busy-beaver (Quick_Sim.py). C++ port begun 2025: https://github.com/int-y1/busy-beaver-cpp. Wiki: https://wiki.bbchallenge.org/wiki/Accelerated_Simulator, https://wiki.bbchallenge.org/wiki/Inductive_Proof.
- Hashlife-style simulator fasttm.py (Mateon1, 2022), hierarchical cached macro machine: gist linked from the wiki page above.
- The Ligockis' `enumerate.py` with extreme parameters was run by XnoobSpeakable on the final 2,728 BB(6) holdouts (11 solved); Iijil's MITMWFAR judged too weak/slow on 2,650 of them; mxdys's new FAR variant decided 113 of 1,534 holdouts (code: https://github.com/ccz181078/TM). Source: https://wiki.bbchallenge.org/wiki/BB(6).
- Rigor caveat: accelerated simulators are only witnesses until their macro rules are proven (by hand or machine); the Coq pipeline requires proven rules or verified certificates.

### 1.8 ML-based deciders — essentially none public
- No published ML decider exists in the bbchallenge ecosystem (searches surfaced nothing; the deciders index lists only classical ones). Closest data points: (a) Aaronson's assessment that shallow ML won't crack BB machines but ML + simulation + proof assistants "could be formidable" (https://scottaaronson.blog/?p=8972); (b) Antihydra is formalized in Lean in a DeepMind open-problems/conjectures repository explicitly as an AI target (same post); (c) an LLM (Claude Opus 4.6) produced non-halting proofs for the 140 remaining Fractran busy-beaver size-21 instances (noted in https://wiki.bbchallenge.org/wiki/Holdouts_lists).

### 1.9 Collatz-like / 3x+1 simulating machines — what can be proven vs what is hard
- What CAN be proven (all rigorous):
  1. Closed-form/residue-class invariants: BMO problem 4 (`1RB3RB---1LB0LA_2LA4RA3LA4RB1LB`): iterates satisfy aₙ = (3/5)·2ⁿ + period-4 error term, hence aₙ ≡ 0 or 2 (mod 3) always, so the halting residue 1 (mod 3) never occurs. Solved; source: https://wiki.bbchallenge.org/wiki/Beaver_Math_Olympiad.
  2. Mod-k accelerated Collatz rules: "Collatz Level 2 inductive rules" branching on mod-3 remainders with periods derived from Euler's totient function — needed and PROVEN for the BB(6) tetrational champions (https://wiki.bbchallenge.org/wiki/BB(6); Ligocki's explanation in https://scottaaronson.blog/?p=8972).
  3. Rule-closure proofs with 2-adic structure: BMO problem 3 (aₙ = aₙ₋₁ + 2^{v₂(aₙ₋₁)+2} − 1, halts iff some aₙ = 4ᵏ) proven non-halting via Lean + Rocq translation + rule-closure (BMO wiki).
  4. Michel's catalog: many champion machines' Collatz-like iterates admit closed-form macro descriptions (with step laws s ≈ c·Σ²); these are rigorous analyses of the machine's structure, but halting/non-halting of the underlying number-theoretic claim is often left open (arXiv:1311.1029; https://bbchallenge.org/~pascal.michel/ha).
- What is HARD/OPEN:
  - Antihydra: halting iff the iterates of f(n)=n+⌊n/2⌋ from 8 (8→12→18→27→40→…) ever have (#odd) > 2·(#even). Equivalent formulations: iterating H(x) = 3x/2 (even) / (3x−1)/2 (odd) from 8; D(n)=⌊K·(3/2)^n⌋ for the Odlyzko–Wilf constant K; OEIS A385902/A386792. Proving non-halting would follow from equidistribution of {ξ(3/2)^n} (Mahler's Z-number territory) — wide open. Rigorous partial result: the parity word is NOT Sturmian (Dubičas 2009, cited on the wiki). Sources: https://wiki.bbchallenge.org/wiki/Antihydra, https://bbchallenge.org/antihydra, https://www.sligocki.com/2024/07/06/bb-6-2-is-hard.html.
  - Hydra (BB(2,5), from 3) and Antihydra (BB(6), from 8) differ only in start value and direction of the inequality; Bigfoot (BB(3,3)) is another; all "probviously non-halting". Cryptid concept coined by S. Ligocki Oct 2023: https://sligocki.com/2023/10/16/bb-3-3-is-hard.html; list: https://wiki.bbchallenge.org/wiki/Cryptids.
  - Conway (2013, "On Unsettleable Arithmetical Problems", Amer. Math. Monthly 120(3)) coined "probvious" exactly for such Collatz-like iterations and argued they may be unsettleable; FRACTRAN (Conway 1972) and Kurtz–Simon (2007, undecidability of the generalized Collatz problem; mentioned in Aaronson's survey) show the general class is undecidable.
  - Lucy's Moonlight (`1RB0RD_0RC1RE_1RD0LA_1LE1LC_1RF0LD_---0RA`, Mar 2025, Racheline): "probviously HALTING" (independent random trials each with fixed halting probability) but proving it "needs breakthroughs in accelerating Collatz-like iterations" (Ligocki, in https://scottaaronson.blog/?p=8972). Shows both directions are open.
  - Rigor warning from the BB(5) paper: bad probabilistic models have wrongly predicted halting for machines later proven non-halting (arXiv:2509.12337).

### 1.10 Probabilistic / random-walk drift heuristics (as used for Antihydra) — HEURISTIC, quantified
- Method: extract the macro iteration; model the halting-relevant statistic as a random walk; compute drift and hitting probabilities analytically; compare with simulation.
- Antihydra specifics (https://wiki.bbchallenge.org/wiki/Antihydra):
  - Abstraction A(a,b): even step → a += 2 (counter b up 2), odd step → a −= 1; parities behave like fair coin flips.
  - Hitting probability P(n) = ½P(n−1) + ½P(n+2) with solutions c₀φ⁻²ⁿ + c₁ + c₂φⁿ (φ = golden ratio); P(n) = φ^{−2(n+1)}-type decay. From the simulated state (a > 2³⁷, 2³⁸ rule-steps), the remaining halting probability is < ~2.884×10^{−287,230,425}; the BB(5) paper quotes a cumulative estimate ≈ 4.84×10^{−2,243,943}.
  - Empirics: mxdys simulated 2³¹ steps, b = 1,073,720,884 vs random-walk prediction within 20,940 (https://www.sligocki.com/2024/07/06/bb-6-2-is-hard.html).
  - Rigor level: NONE as a proof — it is exactly Conway's "probvious" (term origin: https://wiki.bbchallenge.org/wiki/Probviously). The wiki keeps a live simulation status; Kuperberg wrote a near-linear-time Hydra simulator (gmpy2) posted on the wiki; a community trophy is offered for a real proof.
- Space Needle (`1RB1LA_1LC0RE_1LF1LD_0RB0LA_1RC1RE_---0LD`, mxdys Jan 2025): iteration b → b + v(b) + (3/2)(b/2^{v(b)} − 1) halting iff some iterate is a power of 2 (v = 2-adic valuation). 100,000,000 iterates computed (Seiji, Sept 2026; two independent implementations, 400/400 checkpoints; max observed 2-adic valuation 25; last term has 94,125,050 bits). Heuristic growth: log-factor 0.652355 per step ≈ 1.92006^b "plus or minus a random walk on the log scale" (LegionMammal978). Why hard: proving no iterate is a power of 2 needs deep control of 2-adic valuations under addition. Sources: https://wiki.bbchallenge.org/wiki/Space_Needle, artifacts https://github.com/oohzaim1-afk/space-needle-100M (includes L0–L4 macro-transition step-count laws with formal proofs for L1/L3).

---

## 2. 2-counter (Minsky) machines: techniques and hardness

### 2.1 Hardness (established)
- Minsky (1961/1967): 2-counter machines (increment; test-and-decrement; halt) are Turing-complete; their halting problem (even from fixed/blank start) is undecidable. Standard reference; recapped in the BB survey context: https://scottaaronson.blog/?p=4916 (Frontier post: "Conway proved Collatz-like questions are undecidable in general", via FRACTRAN-style encodings).
- The bbchallenge-relevant formalization is the Piecewise Affine Function (PAF) literature:
  - Ben-Amram 2015, "Mortality of iterated piecewise affine functions over the integers: decidability and complexity", Computability 4(1):19–56, doi:10.3233/COM-150032 — mortality undecidable for 2-dimensional PAFs (many regions) and for 2-region PAFs (any dimension); decidable (PSPACE-hard) in 1 dimension; the 2-region × 2-dimension integer case (exactly BMO1's setting) is OPEN.
  - Ben-Amram, Genaim, Masud 2012, "On the Termination of Integer Loops", ACM TOPLAS 34(4), doi:10.1148/2400676.2400679 (correct id 10.1145/2400676.2400679) — termination of loops with two linear pieces; ranking-function methods and their limits.
  - Braverman 2006, "Termination of Integer Linear Programs", CAV (https://mbraverm.princeton.edu/files/terminationCAV.pdf).
  - Summary with all links: https://wiki.bbchallenge.org/wiki/Piecewise_Affine_Function.
- Direct bbchallenge reduction (2026): thread "BMO1 Type problems are Turing Complete" (https://discuss.bbchallenge.org/t/bmo1-type-problems-are-turing-complete/305): any 2-counter Minsky machine embeds into a dimension-2 LIATA/PAF via the encoding a = x+y+1, b = x+k·a (k = current instruction); increments/decrements/jumps are affine tweaks; zero-tests are exact equalities b = k·a and b = (k+1)a − 1. Hence the halting problem for these 2-recurrence systems is undecidable in general — while any single instance (like BMO1 itself) may still be decidable by ad hoc means. The thread's authors' assessment: "known methods likely don't suffice to resolve BMO1 without some new idea."

### 2.2 Techniques for proving non-halting of specific small counter programs (all rigorous when completed)
1. Inductive invariants / closed sets over parameterized configurations — the universal method (Skelet #10 synchronization invariant D(n) → D(n+1); SOC Reset Invariants b(m) > 2n; §1.4 above).
2. Monovariants (drift): exhibit a quantity (counter difference, weighted sum) that changes monotonically away from the halting region; used implicitly in bouncer/counter analyses (wall-repeater formula tapes grow; e.g. the bouncer L2 rule 0∞1^a A> → 0∞1^{2a+6} A> of https://wiki.bbchallenge.org/wiki/Inductive_Proof).
3. Closed forms + residue-class invariants: solve the recurrence exactly (BMO4: (3/5)·2ⁿ + periodic error ⇒ permanent mod-3 exclusion; BMO3 rule-closure with 2-adic structure). Works when the piecewise dynamics collapse to linear recurrences on arithmetic progressions.
4. Backward reachability from halting configurations (bbchallenge "Backward Reasoning" decider; Marxen–Buntrock lineage): if the backward tree from all halting configs is finite/inconsistent and excludes the start, non-halting follows. Decidable in practice for shallow halting sets; hopeless once the halting set is a nontrivial arithmetic surface (e.g. "b = f(a) − 1" in BMO5).
5. Semi-linear / Presburger reasoning: single-counter and difference-bound behaviors have semi-linear reachable sets (classical: Karp–Miller for VAS coverability; Presburger definability of VAS reachability sets, Hauschildt–Jantzen 1990s) — but 2-counter machines are strictly beyond: their reachability is undecidable, so no Presburger certificate exists in general. Practical corollary used by bbchallenge: weighted automata (WFAR) capture some counting (non-regular, semiring) structure and decided the 17 hardest BB(5) irregular machines (arXiv:2509.12337 §4).
6. Certificate + verified checker: untrusted search (Rust/SAT) emits a certificate (CTL/DFA weights, inductive rule set); Coq-verified checker validates (busycoq architecture). This is the industrial-strength pattern for all of the above.

### 2.3 What this means for a BB(6) Minsky-like holdout
- Expect the machine to sit in the "2-region × 2-dimension PAF / synchronized double counter" zone: provably beyond regular CTL (Iijil's irregularity result is the template: https://discuss.bbchallenge.org/t/10756090-is-irregular/137), possibly beyond WFAR; the realistic path is the BMO/individual-machine route: derive the LIATA/PAF abstraction, prove macro rules by induction, seek closed forms or residue-class invariants; if the abstraction is genuinely Collatz-random (parity/equidistribution-dependent), no current technique is expected to work — that is the documented community position (BMO1 thread conclusion; BB(6) wiki "we must solve a Collatz-like problem in order to solve BB(6)").

---

## 3. Architecture of the Coq BB(5) proof and reusability for a single BB(6) machine

Source: arXiv:2509.12337 (esp. §4 and Appendix D), repository https://github.com/ccz181078/Coq-BB5 (mxdys; Coq 8.20.1; 27,274 lines + 638 lemmas, plus busycoq 10,553 lines / 319 lemmas; Zenodo DOI 10.5281/zenodo.17061968), https://github.com/meithecatte/busycoq, https://discuss.bbchallenge.org/t/proving-bb-5-in-coq/225.

### 3.1 Pipeline (in Coq, machines NOT pre-simulated; TNF enumeration itself formalized)
1. Loops (Cyclers + Translated Cyclers) — transcript-sequence repetition; Theorem 4.2 / lemma loop1_decider_WF; ~96.75% of machines.
2. NGramCPS — n-gram closed position set (Skelet's CPS reborn), with alphabet augmentation (tape-stored histories); 6,005,142 machines.
3. RepWL — repeated word list with block simulation and regex branching; 6,577 machines.
4. FAR — finite automata reduction; verifier formalized, 40 hardcoded certificates; 23 machines.
5. WFAR — weighted FAR over non-Boolean semirings; 17 machines (suspected genuinely irregular).
6. Long halters — simulated to 47,176,870 steps (183 machines).
7. Sporadic machines — 13 individual proofs: Skelet #1 (chaotic 5.41×10^51 steps then period >8×10^9 loop), #10 (Fibonacci double counter), #17 (obfuscated Gray code; ~7,000-line standalone Coq proof), the SOCs, cubic-finned, etc. (busycoq SkeletN.v files).
8. 1RB-reduction — 24 machines reduced to machines starting 1RB, reusing prior proofs.

### 3.2 Verification philosophy ("skeptics")
- Statement isolated in a 121-line file BB5_Statement.v readable without Coq expertise; single widely-accepted axiom (functional_extensionality_dep); proof-by-reflection with OCaml extraction (four-color-theorem style); compile time cut from ~13h to ~45min via native_compute + parallel TNF-tree split. Definitions were externally reviewed (Yannick Forster, Théo Zimmermann — per Ligocki in https://scottaaronson.blog/?p=8088). mxdys on logical strength: the decider proofs "can be translated into PA"; "I believe BB(5) is in RCA₀" (same thread). Community skepticism about Skelet's earlier hand analyses (43→harder sets) is exactly what the certificates+formalization culture is designed to kill (https://scottaaronson.blog/?p=8088; https://discuss.bbchallenge.org/t/the-30-to-34-ctl-holdouts-from-bb-5/141).

### 3.3 Reusable for one BB(6) machine
- Directly reusable: busycoq verified deciders (Cyclers/TC/Backwards/Bouncers) as quick filters; Coq-BB5's CTL/FAR/WFAR verifier framework + certificate format; the sporadic-machine workflow (informal analysis → macro rules → Coq induction); Quick_Sim/int-y1 C++ accelerated simulator to generate candidate rules; space-needle-100M's L0–L4 macro-rule formalization pattern.
- Already started: ccz181078/busycoq has a BB6 branch with a partial Rocq proof (per https://wiki.bbchallenge.org/wiki/BB(6)); mxdys's decider code for BB(6) holdouts at https://github.com/ccz181078/TM.
- What does NOT carry over: no reason to expect regular-CTL certificates for counter holdouts (irregularity precedent); the pipeline's power ends exactly where Collatz-like randomness begins.

---

## 4. Documented attempts (2024–2026) on BB(6) counter/Minsky-like holdouts

- Antihydra (discovered mxdys 2024-06-28; cryptid shown by racheline):
  - Simulated to 2³⁸ rule steps (a > 2³⁷); random-walk hitting analysis (§1.10); equivalence with Hydra up to +4 shift proven by induction; Odlyzko–Wilf closed form D(n)=⌊K(3/2)^n⌋; Lean formalization of the D-sequence equivalence and K constant (https://github.com/rwst/Antihydra-Basics: Antihydra.lean, Basics.lean, Constant.lean); Sturmian-exclusion result (Dubičas 2009); Mahler Z-number connection flagged by cosmo. Threads: https://discuss.bbchallenge.org/t/242 (simulation status), /t/315 (more analysis → wiki "More_Analysis" section), /t/316 (Antihydra copycat pair). Trophy offered. HEURISTIC only; no proof.
- Hydra family / random-walk cryptids: machines `1RB1RC_1LC1LE_1RA1RD_0RF0RE_1LA0LB_---1RA`, `1RB1LD_1RC1RE_0LA1LB_0LD1LC_1RF0RA_---0RC`, `1RB0LD_1RC1RF_1LA0RA_0LA0LE_1LD1LA_0RB---`, `1RB0LB_1LC0RE_1LA1LD_0LC---_0RB0RF_1RE1RB` — all "similar random walk mechanism to Hydra/Antihydra", probviously non-halting (https://wiki.bbchallenge.org/wiki/Cryptids).
- Space Needle (mxdys, Jan 2025; BMO problem 6): low-level rules (mxdys); higher-level single-sequence reduction (Katelyn Doucette, July 2025); 100M-term computation with verified checkpoints (Seiji); random-walk-on-log growth heuristic (LegionMammal978); artifacts https://github.com/oohzaim1-afk/space-needle-100M. Related cryptid `1RB0RB_1LC1RE_1LF0LD_1RA1LD_1RC1RB_---1LC` (mxdys, cryptid proof DrDisentangle) and an Apr 2026 one (sheep, proof Daniel Yuan). HEURISTIC.
- BMO1 (`1RB1RE_1LC0RA_0RD1LB_---1RC_1LF1RE_0LB0LE`): 2-sequence recurrence (a,b) from (1,2): a≥b → (a−b, 4b+2), a<b → (2a+1, b−a), halt iff a=b. Shown to encode 2-counter Minsky machines (LIATA/PAF reduction, thread 305); tied to undecidable PAF mortality results (Ben-Amram); 2-region×2-dim case open; no technique known. First 10 pairs computed. RIGOROUS hardness context, instance OPEN.
- BMO5 (`1RB0LD_1LC0RA_1RA1LB_1LA1LE_1RF0LC_---0RE`): b vs f(a)=10·2^a−1 dynamics; halt iff b = f(a)−1; OPEN. BMO8 (`1RB0LD_0RC1RB_0RD0RA_1LE0RD_1LF---_0LA1LA`): two-counter recurrence with floor(b/2) coupling; OPEN. BMO10/BMO11: word-rewriting systems (#0→1, #100→000#, #1010→1010##, ...) — a different (semi-Thue) face of counter behavior; OPEN. All from https://wiki.bbchallenge.org/wiki/Beaver_Math_Olympiad (problems formalized in Lean in DeepMind's formal-conjectures database).
- Solved BMO counter problems (proofs of concept for what works): BMO3, BMO4, BMO7, BMO9 — via Lean/Rocq rule-closure, closed forms, and mod-residue invariants (same page). These are the templates a BB(6) attack should imitate.
- "Probviously halting" cryptids (Lucy's Moonlight + ~16 related machines; `1RB1RA_0RC1RC_1LD0LF_0LE1LE_1RA0LB_---0LC` family; several Racheline machines) — believed to halt at unboundedly computable times but unproven: proving them requires accelerated Collatz iteration breakthroughs (Ligocki in https://scottaaronson.blog/?p=8972).
- Decider-side attempts on the BB(6) holdout pool: Ligockis' enumerate.py (XnoobSpeakable, 11 of final 2,728); Iijil's MITMWFAR (too weak/slow on 2,650); mxdys's new FAR (113 of 1,534); accelerated simulation with Collatz-Level-2 rules for tetrational machines (all from https://wiki.bbchallenge.org/wiki/BB(6)). Annotated holdout spreadsheet with Discord links maintained by Rovenszky (linked from https://wiki.bbchallenge.org/wiki/Holdouts_lists).
- Failed/insufficient approaches to note honestly: finite automata (regular CTL) provably insufficient for counter machines (irregularity proofs); plain backward reasoning insufficient (halting surfaces are arithmetic); probabilistic models can misfire (BB(5) paper warning); manual macro-rule "proofs" historically had holes (Skelet #26/#33) until formalized.

---

## 5. Master source list

Papers:
- Blanchard et al. (bbchallenge collaboration incl. mxdys, Stérin), "Determination of the fifth Busy Beaver value", arXiv:2509.12337 — https://arxiv.org/abs/2509.12337 (HTML: https://arxiv.org/html/2509.12337v2; STOC'26 PDF: https://compilercrim.es/pubs/bb5-stoc26.pdf)
- bbchallenge collaboration, "Turing machines deciders, part I", arXiv:2504.20563 — https://arxiv.org/abs/2504.20563
- P. Michel, "Problems in number theory from busy beaver competition", LMCS 11(4:10) 2015 — https://arxiv.org/abs/1311.1029 (PDF https://arxiv.org/pdf/1311.1029; https://lmcs.episciences.org/1611)
- P. Michel, "The Busy Beaver Competition: a historical survey" — arXiv:0906.3749 (per search results)
- S. Aaronson, "The Busy Beaver Frontier", SIGACT News 51(3) 2020 — https://scottaaronson.com/papers/bb.pdf ; announcement+discussion: https://scottaaronson.blog/?p=4916
- S. Aaronson blog: BB(5) settled — https://scottaaronson.blog/?p=8088 ; BB(6) really quite large — https://scottaaronson.blog/?p=8972
- Ben-Amram 2015, Computability 4(1) — doi:10.3233/COM-150032 ; Ben-Amram–Genaim–Masud 2012, TOPLAS 34(4) — doi:10.1145/2400676.2400679 ; Braverman 2006 CAV — https://mbraverm.princeton.edu/files/terminationCAV.pdf
- Conway, "On Unsettleable Arithmetical Problems", AMM 120(3) 2013 (origin of "probvious"; cited on https://wiki.bbchallenge.org/wiki/Probviously)
- Quanta popularizations: https://www.quantamagazine.org (Aug 22, 2025 "Busy Beaver Hunters Reach Numbers That Overwhelm"); Ben Brubaker, "Why Busy Beaver Hunters Fear the Antihydra" (Oct 25, 2025) — https://benbrubaker.com

Wiki (wiki.bbchallenge.org): /wiki/BB(6), /wiki/Cryptids, /wiki/Antihydra, /wiki/Probviously, /wiki/Counter, /wiki/Shift_overflow_counter, /wiki/Closed_Tape_Language, /wiki/Finite_Automata_Reduction, /wiki/Deciders, /wiki/Holdouts_lists, /wiki/Inductive_Proof, /wiki/Accelerated_Simulator, /wiki/Piecewise_Affine_Function, /wiki/Beaver_Math_Olympiad, /wiki/Space_Needle, /wiki/Analysis_Tools_and_Techniques

Blog (sligocki.com): /2024/07/06/bb-6-2-is-hard.html ; /2023/03/14/skelet-10.html ; /2023/02/05/shift-overflow.html ; /2023/02/02/skelet-34.html ; /2022/06/10/ctl.html ; /2023/10/16/bb-3-3-is-hard.html (Bigfoot/cryptid coinage)

Discourse (discuss.bbchallenge.org): /t/the-30-to-34-ctl-holdouts-from-bb-5/141 ; /t/bmo1-type-problems-are-turing-complete/305 ; /t/10756090-is-irregular/137 ; /t/skelet-26-and-15-do-not-halt-coq-proof/183 ; /t/skelet-1-is-a-translated-cycler-coq-agrees/166 ; /t/proving-bb-5-in-coq/225 ; /t/237 (BB(5) announcement) ; /t/242, /t/315, /t/316 (Antihydra) ; /t/decider-finite-automata-reduction/123

Code: https://github.com/ccz181078/Coq-BB5 ; https://github.com/ccz181078/busycoq (BB6 branch) ; https://github.com/meithecatte/busycoq ; https://github.com/bbchallenge/bbchallenge-deciders ; https://github.com/UncombedCoconut/bbchallenge-deciders ; https://github.com/colette-b/bbchallenge (SAT FAR) ; https://github.com/TonyGuil/bbchallenge ; https://github.com/danbriggs/Turing ; https://github.com/danbriggs/Turing2010 ; https://github.com/sligocki/busy-beaver (Quick_Sim) ; https://github.com/int-y1/busy-beaver-cpp ; https://github.com/ccz181078/TM (mxdys BB(6) FAR) ; https://github.com/oohzaim1-afk/space-needle-100M ; https://github.com/rwst/Antihydra-Basics (Lean) ; https://bbchallenge.org/method (seed DB + deciders)

Michel behavior pages: https://bbchallenge.org/~pascal.michel/ha (tm62 section)

Honesty ledger (rigorous vs heuristic):
- RIGOROUS: all decider-based proofs with verified certificates (BB(5) pipeline); sporadic Coq proofs; BMO 3/4/7/9 solutions; irregularity proofs; PAF undecidability results; accelerated rules once proven.
- HEURISTIC ("probvious"): Antihydra/Hydra family non-halting (random walk + hitting probability estimates); Space Needle non-halting; all "probviously halting" cryptids; predictions that specific BB(6) machines halt within given ranges. Simulation evidence (10^13–10^15 steps; 100M Space Needle iterates) is empirical evidence, not proof.
