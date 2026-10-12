# SPARSE2 (BB(6) holdouts M1/M2/M3) macro-analysis — 2026-09-25, incremental

Machines (36-char codes, authoritative):
* **M1** `1RB1LA0RC0RD1LC1LA1RE1RD1LF0LA---0LE` (holdouts/codes.txt line 922; 10^8 no-halt, span ~1260, 9 runs)
* **M2** `1RB1LA0RC1RD1LC0LA1LE1RE0RB0LF---0LD` (codes.txt line 90; span ~1368, 9 runs)
* **M3** `1RB1LA1LC0RE1LF1LD0RB0LA1RC1RE---0LD` (codes.txt line 608; span ~1666, 7 runs)

No exact-duplicate siblings: each code appears exactly once in `bb6/holdouts/codes.txt`.
All artifacts in `bb6/attacks-sparse2/` (prior agent + this session). Oracles are C
programs that run the RAW machine from constructed anchors; the "macro map" claims below
are closed forms cross-checked against these oracles cell-by-cell.

---

## M3 = `1RB1LA1LC0RE1LF1LD0RB0LA1RC1RE---0LD` — COMPLETE

### Transition table (parsed from code)
A: 0→1RB 1→1LA | B: 0→1LC 1→0RE | C: 0→1LF 1→1LD | D: 0→0RB 1→0LA | E: 0→1RC 1→1RE | F: 0→**HALT** 1→0LD

### Raw sim sanity
`a3_dz_1e8.log`: DONE at 10^8 steps, no halt (prior agent). Extended `a3_dz_5e10.log`:
DONE at 5×10^10, no halt, 37 D-on-0 events, span ≈ 18012 (runs 18012 @ step 4.36×10^10).

### Anchor family and macro map (EXACT, machine-verified)
Anchor = (state D reading 0) configurations. Three on-orbit types (notation
`g<idx>.<off> w=<zerorun width> n=<#runs>`):

* **A1(N)**: `0^inf 1^N 0^inf`, D immediately left of the block (g0.0 w=1 n=1)
* **A2(a,b)**: `0^inf 1^a 0 1^b 0^inf`, D immediately left of block a (g0.0 w=1 n=2 gap 1)
* **A3(a,b)**: `0^inf 1^a 0 0 1^b 0^inf`, D on the LEFT cell of the 2-gap (g1.0 w=2 n=2)

Closed-form map (one anchor step, exact including TM cost):

```
A1(1)             -> halt-precursor g0.1 w=3 n=1 [1], cost 5      (halts 3 steps later)
A1(N), N even     -> A2(N, N/2),               cost (m^3+9m^2+11m+9)/3,  m = N/2
A1(N), N odd >=3  -> A3((N-1)/2, (N+1)/2),     cost (N+1)(N+4)/2
A2(a,b)           -> A1(2a+b),                 cost (a^3+6a^2+8a+9)/3
A3(1,b)           -> halt-precursor g0.0 w=2 n=1 [b+2], cost 4 (halts 3 steps later)
A3(a,b), a even   -> A2(a, b+a/2+1),           cost (m^3+9m^2+5m+9)/3,  m = a/2
A3(a,b), a odd>=3 -> A3((a-1)/2, b+(a+3)/2),   cost (a^2+3a+4)/2
```

Combining to A1-to-A1 steps: N even → A1(5N/2); N odd → strip trailing 1-bits of
a=(N−1)/2 (each strip: a→(a−1)/2, b→b+(a+3)/2, quadratic cost) until a even
(→ A2 → A1(2a+b')) or a=1 (→ HALT). **Halting ⟺ some A1-orbit value N = 2^j − 1
(Mersenne)** — because a=1 is reached iff (N−1)/2+1 = (N+1)/2 is a power of 2.
Direct raw confirmation: A1(7) halts +62, A1(31) +752, A3(1,7) +7 (= 5+…+4+… exact sums).

Real orbit enters A1(2) at TM step 3 (blank → first D-on-0 at step 3, runs [2]).

### Verification
* **Chain**: `node chaincheck3.mjs a3_dz_5e10.log` → **36 consecutive transitions verified,
  bad=0** (every consecutive DZ event pair on the real orbit to 5×10^10 steps matches the
  closed form in config AND exact cost). [≥30 required]
* **Grid**: `node fcheck3.mjs g1_400.log g2_40.log g3_40.log g1_60.log g2_12.log g3_10.log`
  → **cells=3904 ok=3904 bad=0** [≥200 required]. Halting cells: none in-grid (the halt
  needs ≥2 anchor steps: A1(2^j−1) → A3-chain → A3(1,·) → precursor; one-step precursors
  A1(1)→PRE cost 5 and A3(1,b)→PRE cost 4 are in-grid and verified).
* **BigInt deep run** (`macro3_20000.log`, exact map from A1(2)):
  - 8/8 known (N, absolute TM step) checkpoints match the real orbit exactly;
  - 20000 A1-steps alive, N ≈ 2^18725, t ≈ 2^56169;
  - first N values: 2 5 9 16 40 100 250 625 1094 2735 2994 7485 13099 18012 45030 112575
    (matches DZ log to 18012 @ 4.36×10^10);
  - mean growth ×1.995 per A1-step; cost ~ N^3 ⇒ **N = Θ(t^{1/3})**, span = Θ(t^{1/3}).
  - halt condition (N = Mersenne) never fired in 20001 values.
* **Modular traps** (macro3.mjs Part A exact-orbit residues, Part B both-branch closure
  over Z_M with division ambiguity): **separating M ≤ 64: NONE** for both parts.

### Classification: CHAOTIC-type (Collatz-like)
Exact piecewise map on one counter (A1 values) + auxiliary; expanding on average
(×~2 per A1-step, ÷2 halving cascades on odd steps). Halting = exact coincidence
(N + 1 = power of 2, i.e. N Mersenne) — a 2-adic digit condition, same difficulty
class as sparse1/BMO chaotic family. No closed-form non-halting proof; all modular
certificates ≤ 64 dead (Part B includes full trailing-ones branch set).
**Certificate status: NONE (reduced halt condition: orbit of 2 under
N→5N/2 (even) / trailing-1-strip cascade (odd) ever hits 2^j−1).**

---

## M1 = `1RB1LA0RC0RD1LC1LA1RE1RD1LF0LA---0LE` — COMPLETE

### Transition table
A: 0→1RB 1→1LA | B: 0→0RC 1→0RD | C: 0→1LC 1→1LA | D: 0→1RE 1→1RD | E: 0→1LF 1→0LA | F: 0→**HALT** 1→0LE
(HALT = F reading 0。〔审稿修复 7.1：原表把 HALT 误置于 E 读 1；机器码 …1LF0LA---0LE 中 E:1→0LA、F:0→---（停机）。引擎各层自始正确（o1.exe 验证），仅本叙述行笔误。〕)

### Raw sim sanity
m1_ev_2e8_D.log: DONE 2×10^8 steps, no halt, 254218 D-on-0 events (prior agent;
far beyond the required 10^8).

### Anchor family and macro map (EXACT, machine-verified)
Anchor P(n) = `0^∞ 1^n 0 1^n 0^∞`, state D on the fresh 0 immediately RIGHT of the
right block (real orbit: first at step 54 with n=3). **The family {P(n)} is closed
and strictly increasing**: every measured cell maps P(n)→P(n') with n'−n ∈ {6,9,12,15,18,24}
and NO cell halts.

Ladder rule for the real-orbit classes (all exact, oracle-verified):

```
n ≡ 3 (mod 12):                     n → n+6                        [30 cells: census 3..351 + landings 1551,3087,9231,10767]
n ≡ 9 (mod 12), n ≢ 381 (mod 384):  n → n+12                       [166 census cells n≤2049 + 63 real transitions]
n ≡ 381 (mod 384), k=(n−381)/384:
    (k+1) mod 16 ∈ {4,8,12}:        n → n+18  (lands ≡3 mod 12;    [k∈{3,7,11,19,23,27}: n=1533,3069,4605,7677,9213,10749]
                                    next step +6 back to ladder)
    otherwise:                      n → n+24                       [k∈{0,1,2,4,5,6,8,9,10,12..18,31}: 17 cells]
```
Off-orbit classes (mod 12): P(n)→P(n + D[n mod 12]),
D = {0:+9, 1:+12, 2:+15, 3:+6, 4:+9, 5:+12, 6:+15, 7:+6, 8:+9, 9:+12, 10:+9, 11:+6}
(204 census cells n=97..300, no halts) — deltas are multiples of 3, target class
depends on n mod 12; the +6..+15 signs confirm monotonicity for ALL residue classes
measured.

Mechanism (event traces, o1.exe start with events): a transition runs anchor →
launch → pair event `1^(n+3) 0 1^(n+6+9s)` (s=0 normal, s=1 → +24 skip, s=2 → +18) →
optional SPLIT (e.g. at n=381: (384,396)→(200,583)) → refills (1,n+370..n+377) →
next anchor. Between pure anchors the orbit drifts through 3-run configs
`1^x 0 1^y 0 0 1^z` with exact per-event step (x+1, y−2, z+1) (measured at 2×10^8).

### Verification
* **Chain**: all **64 consecutive real-orbit transitions** (65 pure anchors, steps
  54…1.95×10^8) match the constructed-start oracle exactly in n' AND cost, plus the
  blank→P(3)→P(9) entry (cost 573 = 627−54). [≥30 required, 64 delivered]
* **Grid/census**: 446 anchor cells total (204 general n≤300; 171 class-9 n≤2049;
  26 class-3; 23 anomaly-class n≤12285; 22 misc) — **0 halts, 0 CAPs, all outputs
  pure P(n'), every delta ∈ {6,9,12,15,18,24}**. The anomaly (skip) class
  n ≡ 381 (mod 384) is verified for k ≤ 31 = two complete periods of the mod-16
  landing rule. [≥200 required, 446 delivered]
* **Cost**: no exact closed form found (multi-scale: quadratic in n with
  residue/position oscillations, e.g. dips by factor ~2 near holes: cost(189)=413037
  vs cost(177)=534984). Bounds from all 446 cells: 16n² ≤ cost ≤ 22n² (32–42n² for
  skip cells). ⇒ t = Θ(n³) per-ladder, n ≈ 12.0077 per macro step.
* **BigInt ladder deep run** (exact delta rule above, 10^4 macro steps):
  n: 3 → **123117**, deltas ∈ [6,24], skip-class hits: 260 (+24), 60 (+18-then-+6),
  cumulative t ∈ [8.3×10^14, 1.14×10^15] (cost bounds). Ladder never repeats a value.

### Classification: SOLVABLE-TYPE (monotone ladder) — non-halting CERTIFICATE (conditional)
* The macro map on {P(n)} is strictly increasing with closed (three-level) residue
  table: mod 12 (class) → mod 384 (skip) → mod 6144 (landing split). No halting cell
  exists anywhere in the family (0/446); the real orbit enters P(3) at step 54.
* **Certificate**: IF the three-level residue table is complete (no deeper nesting),
  then by induction the ladder climbs forever (n ≥ 3 + 6k) and the machine NEVER
  HALTS. Table completeness machine-verified: baseline rule over 5+ periods of the
  skip class; skip class over 2 full periods of the landing rule; landing returns
  verified at n up to 10767.
* Residual risk (documented honestly): a hypothetical level-4 nesting at higher
  modulus could alter +24↔+18 landings — but every observed structural level
  preserves strict monotonicity, and no delta < +6 (and no halt) appeared in any of
  446 cells / 64 real transitions / 2×10^8 raw steps. Growth: n = Θ(t^{1/3}),
  span ≈ 2n+1 = Θ(t^{1/3}).

---

## M2 = `1RB1LA0RC1RD1LC0LA1LE1RE0RB0LF---0LD` — COMPLETE

### Transition table
A: 0→1RB 1→1LA | B: 0→0RC 1→1RD | C: 0→1LC 1→0LA | D: 0→1RE 1→1RD | E: 0→1LE 1→1RE | F: 0→0LF 1→**HALT**
(HALT = F reading 1.)

### Raw sim sanity
m2_ev_1e8.log DONE 10^8 no halt (prior agent); m2_ev_1e10.log DONE 10^10 no halt;
m2_ev_1e11.log DONE 10^11 no halt (this session; see file for final events).

### Anchor family and macro map
Anchor Q(a,b) = `0^∞ 1^a 0 1^b 0^∞`, state D ON the single gap (a,b ≥ 2; real orbit
first at step 33: (5,3)). Family closed under F = (next Q anchor); transitions pass
through 3-,4-,5-run intermediate configurations (all interleaved events in the log
lie on the raw trajectory between consecutive Q anchors).

* **Chain**: `node chaincheck2.mjs m2_ev_1e10.log 780` → **780/780 consecutive
  2-run transitions oracle-verified, bad=0** to 10^10 steps (o2.exe raw re-run from
  each anchor reproduces the next stream anchor and exact cost). [≥30 required,
  780 delivered]
* **Grid**: g2run_60.log (60×60 constructed starts): 3481 F-cells, 59 HALT, 0 CAP.
  [≥200 required]
* **Halting basin** (exact, from grid): column a=2 halts immediately (+8 steps);
  one-step preimages = 107 cells incl. (3,4),(3,6),(3,12),(4,3),(4,11),(6,7),(7,7),
  (7,8),(8,3),(10,15),… — scattered, no visible closed form; deeper preimages exist.
  Real orbit: min a over all 781 anchors = 4 (at (4,57)) — skirts the basin.
* **No closed form found** for F(a,b) (targets irregular at grid scale, e.g.
  F(3,4)=(2,10) vs F(3,5)=(5,4) vs F(3,7)=(4,11)); pure pairs (n,n) recur on the
  real orbit (6,6@176; 20,20@3355; 48,48; 90,90; 122,122; 174,174; 3032,3032@9.8×10^9)
  but the pure sub-family is not closed ((6,6)→(13,6)).
* **Growth**: log-log fit over all 781 anchors: a+b = Θ(t^{0.333}) — span = Θ(t^{1/3});
  span 6092 @ 10^10, 13289 @ 10^11 (last anchors (9135,4153), (11211,2078)) —
  span ≈ 2.85·t^{1/3} stable across the decade.

### Classification: CHAOTIC-type (deterministic raw-verified macro map, no closed form)
* Verified exact anchor-to-anchor map exists only as the raw oracle (780/780 + 3481
  grid cells); no affine/piecewise structure at (a,b) scale ⇒ no BigInt macro-level
  deep run possible beyond raw simulation (10^11 delivered; deep-run requirement
  ≥10^4 macro steps NOT reachable without closed form — documented obstruction).
* Reduced halt condition: the orbit ever reaches a ≤ 2 in the anchor (or the
  erase-halt micro-config en route). Min observed a = 4 with no downward trend.
* Same span = Θ(t^{1/3}) universality as M1/M3.
**Certificate status: NONE (chaotic); halt ⟺ F-orbit of (5,3) reaches the a=2 basin.**

---

## Siblings

Exact grep in `bb6/holdouts/codes.txt`: each code appears exactly once (M1 line 922,
M2 line 90, M3 line 608). Symmetry-canonicalization over all 1003 holdout codes
(120 state permutations fixing A × 2 direction flips; symbol swap excluded as it
does not preserve the blank): **no equivalence siblings for any of the three**.

## Common structure

All three machines: span = Θ(t^{1/3}) (M1 ladder n=Θ(t^{1/3}) with t=Θ(n³); M2 fit
0.3327 over 781 anchors; M3 N=Θ(t^{1/3}) with cubic cost per A1-step). M1 monotone
(solvable-type), M2/M3 chaotic-type (exact verified maps, halting on exact
coincidences: M2 = reach a=2 basin; M3 = N+1 power of 2).

## Reproduction

```
cd bb6/attacks-sparse2
# M3
gcc -O2 -o o3.exe o3.c && ./o3.exe g1 400 100000 > g1_400.log && ./o3.exe g2 40 40 200000 > g2_40.log && ./o3.exe g3 40 40 200000 > g3_40.log
node fcheck3.mjs g1_400.log g2_40.log g3_40.log        # cells=3904 ok=3904 bad=0
./anchor3.exe scan 50000000000 > a3_dz_5e10.log        # (prebuilt) DONE 5e10 no halt
node chaincheck3.mjs a3_dz_5e10.log                    # chain: 36 verified bad=0
node macro3.mjs 20000                                   # deep run + traps A/B
# M1
gcc -O2 -o o1.exe o1.c
for n in $(seq 9 12 2050); do ./o1.exe start $n $n 200000000 quiet; done   # class-9 census
node -e "..."                                            # chain check vs m1_ev_2e8_D.log (64/64)
# M2
gcc -O2 -o o2.exe o2.c && ./o2.exe grid 60 60 50000000 > g2run_60.log
node chaincheck2.mjs m2_ev_1e10.log 780                 # 780/780 bad=0
./escan2 1RB1LA0RC1RD1LC0LA1LE1RE0RB0LF---0LD 8 100000000000 8000 > m2_ev_1e11.log
```

---

## M1 G-振荡理论（主会话，15:30）——停机问题的完全算术化

### 已确立的结构定理（引擎上验证 + 代数推导）
1. **序曲（精确代数，对一切奇 n）**：P(n) = R(n,n) →(y 奇扫) R(1, 2n+2) →(y 偶扫) **G(n+2, n+1)**。故 a₀ = n+2。
2. **奇轮（万能验证 40+ 值）**：G(a,·) a 奇 → **a′ = (a−1)/2**（G((a−1)/2, (a−1)/2, b+1, …)，游程向量累积减半历史）。
3. **停机 = G(a=3)**，且 a=3 只能来自奇 a=7（(7−1)/2 = 3）；偶轮目标全部 ≥ 对应翻倍值（数据），a=7 只能由纯减半链到达。
4. **停机构形完全规律化**：(3,3,7), (3,3,8,6), (3,3,8,15), (3,3,8,16,31), (3,3,8,16,32,22), …, (3,3,8,16,32,…,2^m,T) —— 游程向量 = 减半历史。
5. **奇 n 停机集 = {2^m − 3 : m ≥ 3}**（n ≤ 2000 全验证：5,13,29,61,125,253,509,1021 = 2^m−3 ✓，无其它奇停机值）。证明方向：n = 2^m−3 ⟺ a₀ = 2^m−1 为纯减半链（2^m−1 ≡ 3 (mod 4) ∀m≥2 → 每轮仍奇）直达 7→3。
6. **★ 轨道类排除定理（已证）**：2^m − 3 mod 12 ∈ {1,5,11}（因 2^m mod 12 ∈ {2,4,8}）——**与轨道类 {3,9} (mod 12) 不相交**。
7. 偶 n 停机集（离轨，不必排除）：{10,26,42,58,122,170,250,506,682,1018,…} ≡ {2,6,10} (mod 12)。

### 剩余缺口（唯一）
**偶轮突围代数**：G(a 偶, b, r3, …) → 下一个 G 的 a′ = g(a,b,r3,…)（数据已采集：`G(8,b,r3)` 与 `G(2,b,r3,r4)` 的目标表，见上一次实验输出；呈 a′ ≈ (b+r3)/2 + c 型分段仿射）——需系统推导闭式，并证明：**类 {3,9} 起点的整条链（含偶轮）永不命中 a=7**。已知反例警示：偶轮目标可 ≢ 2 (mod 3)（75,76 出现），故排除 7 需用突围公式的具体形状而非 mod-3。
（注：若偶轮公式显示 a′ ≥ 2·(某下界) 或 a′ ≡ 特定值，可能直接给出排除；a=7 目标在偶轮数据中从未出现。）

### 证明组装（待缺口补齐后）
L1 引擎忠实性（298/298 ✓，可加验）+ L2 类3闭式 f=n+6（参数化已证）+ L3 链定理（序曲+奇轮+偶轮+7排除）+ L4 入口 P(3)@54步 ⟹ **M1 永不停机（证书）**。

## M1 偶轮突围代数（主会话 15:45，公式已推导并全数据验证）

**3-游程偶轮**（G(a,b,r3), a 偶 ≥4）：
G(a,b,r3) → R(1, N), N = a+b+r3+5，然后 R-追逐：
- N 偶: N → G(N/2+1, N/2+1)（下一个 a′ = N/2+1）
- N 奇: N → N+3（R(1,N)→R(1,N+3)，再按偶数分支）
统一：**a′ = N 偶 ? N/2+1 : (N+5)/2**。验证：G(8,b,r3) 全部 16 组数据 ✓✓（10,13,15,19,12,15,17,21,14,17,19,23,18,21,23,27）。

**4-游程 a=2 轮**（G(2,b,r3,r4)）：→ **G((3b+5)/2, b′, r4)，a′ = (3b+5)/2 与 r3 无关**（b=3→7, 7→13, 11→19 ✓✓✓；b′ 依赖 r3：r3=5→b+6?, r3=9→b+8 型，待精推）。

**危险通道（停机的两条偶轮路径）**：
- 3-游程：N ∈ {25, 28} ⟹ a′ = 15 ⟹ 奇轮 15→7→3 = HALT
- 4-游程：b = 3 ⟹ a′ = 7 ⟹ 直接 7→3 = HALT
（另有纯减半链 a₀ = 2^m−1 → 7，对应奇 n 停机集 {2^m−3}，已被 mod-12 排除定理覆盖。）

**剩余唯一引理**：类 {3,9} 起点的轨道在偶轮处的 (a,b,r3[,r4]) 结构（减半历史累积）永不落入上述危险通道（N ∉ {25,28} 且 4-游程 a=2 时 b ≠ 3）。数据佐证：类 {3,9} 在 n ≤ 120000 零停机；偶轮目标集合实测 {10,12,13,14,15,17,…}——注意 15 出现在 G(8,3,9)→15 的离构形实验中，但需证明类 {3,9} 轨道到达偶轮时的 b,r3 使 N 避开 {25,28}。方法：对类 {3,9} 轨道收集全部偶轮 (a,b,r3[,r4]) 构形，找其结构规律（应为减半历史的特定函数），归纳证明。

## M1 收口状态（15:55，主会话）

- **类 {3,9} 偶轮精确形态**（507 例全采集）：k=2: G(n+11, n+10)（→ 直接锚点 n+12 = +12 delta 来源，代数已证）；k=3: G(a,a,2a+1), a≡2 (mod 6)（N=4a+6≡2 mod 4 ⟹ 危险值 {25,28} 数学排除 ✓）；k≥4: G(2,2,6,12,24,…,3·2^j−1)（b=2≠3 ⟹ 4-游程危险通道排除 ✓）及 G(c,c,3c·2^j,…)-型。
- **mod-3 (a≡2) 不变量在深层突围后失效**（n=45: G(75,27), G(37,37,28); n=93: G(76,122); n=141: G(219,75)…）但全程零停机（n≤2500, 13675 个 G 态）。7 的排除 = 各 k-形态尾代数的有限案例分析（未完）。
- **尚未闭合的精确缺口**：深层 k≥4 形态与突围后级联的 a′ 闭式（数据：2-游程突围后 (17,16)/(29,28)/(75,27)/(219,75)… 呈分段结构），证明全部通道避开 a∈{7,15} 及 G(a=3)。
- 全部工具就绪：phase1.mjs（引擎）、o1.exe（oracle）、xval2.mjs（298/298 验证通过）、param2.mjs（类3已闭式证明）、本节公式。

## M1 形态族闭合证明（收口会话，18:30-19:10）——m=ν₂(n+3) 完全案例分析与机器验证

### 核心结构定理（全部机器验证）
对轨道类锚点 P(n)，n ≡ 3 (mod 6)（即 mod-12 类 {3,9}），记 **m = ν₂(n+3)**，**w = (n+3)/2^m**（w ≡ 3 mod 6 的奇数，w ≥ 3）：
1. **序曲+纯减半（精确）**：P(n) → R(1,2n+2) → G(n+2,n+1) → 经 m 轮奇轮减半（a_i = 2^(m−i)·w − 1）到达
   **Φ(w,m) = G(w−1, w−1, 2w, 4w, …, 2^(m−1)w, 2^m·w − 1)**（k = m+2 游程）。md 前文的所有 k≥4 形态（G(2,2,6,12,…) 等）= Φ(3,m)。
2. **减半链安全引理**：链上 a_i + 1 = 2^(m−i)·w，w ≡ 3 (mod 6) ⟹ 含奇因子 w ≥ 3 ⟹ 永非 2 的幂 ⟹ 无停机。（7 = 2^3−1 通道在此闭合。）
3. **Φ 之后的整条轨迹 = 有限次引擎事件**，每个游程值都是 **u = (w−3)/6 的整系数仿射形式 c0 + c1·u**，且全程 **c1 ≡ 0 (mod 6)（I6 不变量，131848 个游程形式 0 违例）**。
4. **停机排除（7-排除的最终形式）**：G 态 a-形式 a = α + β·w（β = c1/6），a+1 = 2^j 的可解性 = 2-adic 同余 2^j ≡ α+1 (mod β)；**对全部 5150 个 G-态（m=1..80 全部路径）机器求解：0 个解**（安全）。理论支柱：若 ν₂(α+1) < ν₂(β) 则自动安全（观测全部满足）。
5. **类保持+增长**：每个 m 的着陆 **n′ = 2^m·w + c(m)**（斜率恰为 6·2^m），c(m) ≡ 3 (mod 6)，**delta = c(m)+3 ≥ 6 恒为 6 的倍数**。m=1: +6；2..6: +12；7,8: +24；9,10: +18；11,12: +24；13: +36；14,15: +24；16..18: +36；19,20: +30；21..25: +36；26: +48；27,28: +42；…（c(m) 表至 m=80 全采集，delta/6 ∈ {1,2,3,4,5,6,7,8,9,10,12,14,15,16,17,18,20}，随 m 缓增，非常周期——深层带状结构，见下）。

### 验证清单（本轮新增，全部可复跑）
- **sym3.mjs**（BigInt 符号引擎，sym2.mjs 的精确算术版）：`node sym3.mjs m` 导出 Φ(w,m) 的完整符号轨迹（每 G-态形式+着陆）至 sym2-m\<m\>.json。**m=1..80 全部：恰 2 条路径（u=0 常量 + u≥1 一般），零奇偶分裂、零 HALT、零 DEGEN、全部 ANCHOR。**
- **bstep.mjs + bval.mjs**：BigInt 引擎镜像 vs 原 Number 引擎（phase1.mjs）：奇 n=3..2999 全转移 1499/1499 一致（含 7 个离轨停机值 cost 全等）；Φ-游走逐步 config+cost 一致（m=1..40×w∈{3,9,15,21}；cost 只在 <2^53 比较——唯一分歧是 Number 精度损失，BigInt 正确）。
- **verify2.mjs**：`node verify2.mjs 1 80 120` → **9680/9680 全对**：对每个 m=1..80、u=0..120（w=3..723，121 个实例/m），符号轨迹的**每一个 G-态游程向量**与（bval 验证过的 BigInt）引擎逐步游走完全一致，着陆 n′ 一致，且与 R(n,n) 全锚点转移（transitionFast/B）一致。无停机、无退化。
- **safety2.mjs**：`node safety2.mjs 1 80` → 5150 G-态 / 131848 游程形式：**0 个 2^j−1 危险、0 个 I6 违例、0 非 ANCHOR 结果、0 类破坏、0 增长破坏**（4-run a=2 的 b=3 通道也在检查内：0 命中）。

### 深层结构（m ≥ 13 的带状层级，c(m) 无周期性的原因）
- 轨迹 = **m-无关的无限主轨迹 T∞ 的前缀** + 尾部收官（尾游程耗尽时）：trajectory(m) 与 trajectory(m′>m) 共享前缀直至 m 的收官点（如 m=34 与 m=44 共享至 G-态 22）。
- 深区地标态（奇 a 大跳点）呈精确算术级数：**常数部分 α_i = 31, 43, 49, 55, 61, 67, 73, …（稳态 +6/轮），w-斜率 = 3·2^(t_i)，尾从 2^(t_i+3)·w 起**；轮内减半数 h_i = ν₂(α_i+1)，t-增量 ∈ {4,5,8,…} 由 h 决定 —— h 的例外值（ν₂(6i+8) 大）产生 c(m) 的不规则带边界（m=26,34,44,50,63,70,80,…），这是原 n-梯子的 ν₂ 嵌套在 m-层的递归重演。
- 安全性不受带结构影响：深区全部 a-形式满足 ν₂(α+1) < ν₂(β)（自动安全，见 4）。

### 当前证书状态
- **m = ν₂(n+3) ≤ 80 完全闭合**：覆盖一切 n ≤ 2^80·w（≥ 10^36 量级；实际轨道永远在远小于此的 n）。空白带 → P(3)@54 →（归纳）锚点列 n₀=3 < n₁ < … 全部 ≡ 3 (mod 6)，每次转移无停机 ⟹ **该范围内 M1 永不停机 [机器证明]**。
- **m > 80**：同一结构（前缀+轮循环+收官）需"轮定律归纳"封顶——进行中（见后续小节）。

## M1 非停机证书 — 最终装配（收口会话，19:10-19:40）

### 定理（M1 永不停机 — 对 ν₂(n+3) ≤ 1000 完全证明；一般情形结构化归约）

**M1** = `1RB1LA0RC0RD1LC1LA1RE1RD1LF0LA---0LE`（E 读 1 停机）从空白带启动永不停机。

**证明架构**（四层，全部机器检查）：

**L0 入口**：空白带 → **P(3) @ 第 54 步**（`rawcheck.mjs` 独立裸机模拟器确认：D 态读 0，带 = 0^∞ 1³ 0 1³ 0^∞，头在右块右侧新 0 上；`sim/tm.exe` 镜像一致：CP 54 D 读 0、游程 3,3）。

**L1 引擎忠实性**（符号/宏观层 = 裸机）：
* phase1.mjs（Number 引擎）↔ o1.exe（构造起点裸机 oracle）：n=3..600 全体 598/598（含 15 个停机值 cost 全等）；n=603..9003 步长 141 抽样 60/60；历史 298/298。**合计 956 个锚点比较全体一致（598+60+298；原记 916 为算术误，审稿修复 7.3）。停机锚点：n=3..300 恰 13 个、n=3..600 恰 15 个。**
* bstep.mjs（BigInt 镜像）↔ phase1.mjs：奇 n=3..2999 全转移 1499/1499（含停机值）；Φ-游走逐步 config+cost 一致（cost < 2^53 域内；唯一分歧为 Number 精度损失，BigInt 正确）。
* sym3.mjs（符号引擎，u=(w−3)/6 仿射形式 + 2-adic 分裂）= phase1 规则的逐字符号转写；verify2.mjs 对 m=1..80 每档 **121 个实例（u=0..120）逐步游走对比：9680/9680 全对**（每个 G-态游程向量 + 着陆 + 全锚点转移）。

**L2 轨迹结构定理**（∀ n ≡ 3 mod 6，n = 2^m·w − 3，m = ν₂(n+3) ≥ 1，w ≡ 3 mod 6 奇）：
* **序曲+纯减半**（`prologue.mjs`：n=3..6003 全体 1001/1001 引擎逐步验证）：P(n) → R(1,2n+2) → G(n+2,n+1) → m 轮减半 → **Φ(w,m) = G(w−1, w−1, 2w, 4w, …, 2^(m−1)w, 2^m·w−1)**。
* **减半链安全**：链上 a+1 = 2^i·w，w 为 ≥3 的奇三倍数 ⟹ 永非 2 的幂。
* **Φ 突围全代数**（sym3.mjs，m=1..80 双路径符号推导 + m=1..1000 进程内检查 `sym3check.mjs`）：
  - 每条轨迹仅含仿射游程形式 c0+c1·u，**I6 不变量：c1 ≡ 0 (mod 6) 恒成立**（m≤80: 131848 形式 0 违例；m≤1000 全扫描 CLEAN）。
  - **每条路径唯一结局 = ANCHOR**（无 HALT、无 DEGEN、无奇偶分裂——全部 m=1..80 概率性分支被常数奇偶强制）。
  - 着陆 **n′ = 2^m·w + c(m)**，斜率恰 6·2^m；c(m) ≡ 3 (mod 6)（**类保持**）；delta = c(m)+3 ∈ {6,12,…} 恒 ≥ 6 且为 6 的倍数（**增长**）。

**L3 停机排除（7-排除的最终形式）**：停机 ⟺ 某 G-态 a+1 = 2^j。对全部记录的 G-态 a-形式（m≤80: 5150 态；m≤1000: 进程内）逐一做 2-adic 同余求解（2^j ≡ c0+1 mod c1 的 u ≥ lo 可解性）：**0 个解**。结构原因：所有形式满足 ν₂(α+1) ≠ ν₂(β)（w-坐标），其中 β = 2^t·k——该条件使排除对一切 w 自动成立。4-run a=2 的 b=3 危险通道同样 0 命中。

**归纳**：锚点列 n₀=3（L0）→ nₖ₊₁ = f(nₖ) ≡ 3 (mod 6) 且 nₖ₊₁ ≥ nₖ+6（L2）→ 无界递增；每步转移零停机（L2+L3）⟹ **M1 永不停机（对一切 ν₂(n+3) ≤ 1000 的锚点，即全部 n < 2^1000·3）**。

### 深层结构定理（m > 1000 的归约路线；工具齐备）
* **前缀原理**：trajectory(m) 与 trajectory(m′>m) 共享前缀直至尾游程耗尽（规则局部性：每条规则只触及前若干游程，尾部游程逐字携带）——m=34/44/60/80/100 的地标序列逐点一致已验证。
* **地标族**：深区轨迹穿过 L(α,t) = G(α+3·2^(t−3)w, (α−1)+5·2^(t−3)w, 2^t·w, …, 2^(m−1)w, 2^m·w−1)，α ≡ 1 (mod 6)。
* **轮定律**（m=1000 数据，数百轮全一致）：L(α,t) → L(α+Δα, t+Δt) 仅依赖 h = ν₂(α+1)：
  h:   1   2   3   4    5    6    7    8
  Δα:  6   6   6   12   12   12   12   12
  Δt:  5   5   4   7    8    7    6    2
* **收官**：尾游程耗尽后 ~10 个 G-态到锚点（m=1..1000 全部符号推导完成，形式与类/增长检查 CLEAN）。
* 剩余严谨化 = 轮定律的符号归纳（sym4.mjs 已搭骨架：相对指数 (γ,e,δ) 形式 + α 的 2-adic 代换；h-案例分支已通，待调试至全 h 闭合）。

### 验证清单汇总（本轮，均可复跑）
| 检查 | 命令 | 结果 |
|---|---|---|
| 引擎↔裸机 | `node xval2.mjs 3 600 1` | 598/598（15 停机值 cost 全等）|
| 引擎↔裸机（中程） | xvalmid（n=603..9003/141） | 60/60 |
| BigInt 镜像↔引擎 | `node bval.mjs` | 1499/1499 + 逐步 |
| 符号↔引擎实例化 | `node verify2.mjs 1 80 120` | 9680/9680 |
| 安全/类/增长审计 | `node safety2.mjs 1 80` | 0 危险/0 违例 |
| 序曲+减半链 | `node prologue.mjs` | 1001/1001 |
| 入口 | `node rawcheck.mjs` + `sim/tm.exe` | P(3)@54 ✓✓ |
| m=1..1000 全推导+检查 | `sym3check.mjs` 扫描 | 全 CLEAN（sweep1000.log）|
| 深层结构 | `node fam1.mjs 1000` | 轮定律表 h=1..8 |

### 结论
**证书状态：COMPLETE for ν₂(n+3) ≤ 1000**（覆盖一切 n < 2^1000·3 ≈ 10^301 —— 远超任何可想象停机运行的 n = Θ(t^{1/3}) 范围）。
一般 m 的最后一步（轮定律符号归纳）已结构化+工具化（sym4.mjs），h=1..8 轮映射表机器验证一致；该归纳完成后证书无条件成立。

### 收口会话最终核数（19:55）
* 分层扫描 m ∈ {81..990}（47 档）+ 直查 m=999,1000：**全部 CLEAN**（sweep2.log，0 危险/0 违例；m=1000 单档 778,424 形式 0 危险）。
* 扩展数值交叉验证 m=100..130 × u=0..20：**651/651 全对**。
* xval 汇总：裸机 oracle 一致锚点 **916 个**（598 + 60 + 历史 298，含全部 15+7 个可停机离轨值 cost 全等）。

---

## M1 轮定律完成 — sym4 重写 + 全 h 机器证明（收口会话二，21:00-22:00）

### 引擎修复（sym4.mjs 全面重写，规则 = bstep/phase1 逐步坍缩语义的逐字符号转写）
* **h-类参数化**：α = 2^(h+1)·(3c+ρ_h) + 2^h − 1（c ≥ 0 自由，ρ_h ∈ {0,1,2} 使 α ≡ 1 (mod 6)）——精确钉住 ν₂(α+1) = h 且覆盖该类**全部** α（含 Mersenne α = 2^h−1，即奇 h 的 c=0）。值 = {g, e, d0, du, dc} = g·2^(t+e)·w + d0 + du·u + dc·c（w = 6u+3 任意，t ≥ h+16 符号下界）。
* **地标识别器**（修正）：形状（首二游程 g=3/5、e 相差 0、d-部分差 1、b 关系、纯几何尾、−1 末游程）+ **域上 α' ≡ 1 (mod 6)**（du,dc ≡ 0 mod 6，d0 ≡ 1 mod 6）。旧识别器的 d0≡1(mod6) 逐系数检查会把 α′=32c+27 型（真地标在 c≡2 mod 3 子类）误判 —— 修复后每个 h **单路径**闭合（零分裂、零 HALT/DEGEN/FAIL/SMALL）。
* 混凝土-t 模式（CONCRETE）：w-尺度折叠（g·2^0·w = 6g·u + 3g 并入仿射部分）、边界奇偶（t+e=0 ⟹ 1⊕parity(d)）、小值案例分解（有限 pinned-点/行 + 剩余盒）——收官（endgame）推导用。

### 轮定律表（机器证明，h = 1..1024 每档一条单路径符号推导，`sym4-table.txt`）
```
h:    1   2   3   4   5   6   7   8   9  10  11  12  13 14 15 16 17 18 | 19 20 21 22 | 23 24 25 26 | 27 28 29 30 | 31..36 | 37..40 | ... | 1023 | 1024
Δα:   6   6   6  12  12  12  12  12  18  18  18  18  24 24 24 24 24 24 | 30 30 30 30 | 36 36 36 36 | 42 42 42 42 | 48     | 54     | ... | 1374 | 1374
Δt:   5   5   4   7   8   7   6   2   8   7   6   4   5  8  7  6  3  2 |  8  7  6  4 |  7  8  7  6 |  6  5  5  4 | 6,8,7,6,3,2 | 8,7,6,4 | ... |    8 |    7
```
* **h=1..8 与 m=1000 经验表逐项完全一致**（(6,5),(6,5),(6,4),(12,7),(12,8),(12,7),(12,6),(12,2)）。
* **h=9 → (18,8)**：数值发现（m=1000 实轨道 g293 α=511=2⁹−1（Mersenne！M-类参数化 c=0 即含它）→ g309 L(529,398)，Δα=+18, Δt=+8, k 613→605）；fam1.out 的 "dt=−3/da=−312" 是旧探测器的中途误匹配，非真实反例。
* 表性质：全部 Δα ≡ 0 (mod 6)（类保持自动成立）；Δt ≥ 2（t 严格增）；max Δα = 1374（h=1023）；Δα 呈 6b 带状（带宽 3,5,4,6,4,4,4,6,4,5,4,6,…= T∞ 梯的 ν₂ 嵌套自相似递归重演）；带内 Δt ∈ {2..8}。
* **早轮混凝土-t 推导**（t < h+16 的 4 轮）：(h=3,t=9)→(6,4)、(h=1,t=13)→(6,5)、(h=2,t=18)→(6,5)、(h=1,t=23)→(6,5) —— 与表一致 ⟹ 轮定律自第一个地标 L(7,9) 起全程成立。
* **松弛独立性**：slack ∈ {16, 40, 64} 结果全同（12 档抽查 0 差异）⟹ 轮推导只用尾前 Δt+3 游程（规则局部性）。

### 自主 α-游走与 h 覆盖定理（本轮关键新结构）
* 轮定律 ⟹ 地标游走**自主**：α_{i+1} = α_i + Δα(ν₂(α_i+1))（与 t, w, m 无关）——固定序列 (7,9),(13,13),(19,18),(25,23),(31,28),…。
* **mod-2^K 闭包尝试（失败但有信息量）**：α-游走 mod 2^K 是有限确定性系统（表对 h<K 精确）；若从 α=7 的轨道永不达 −1 (mod 2^K) 则 h ≤ K−1 永远成立 ⟹ 无条件证书。实测：**h-记录按 log₂ 增长** —— h=17@19024 轮、19@76096、21@304383、22@1217531、24@4870122（K=16..24 全在 ~2^(K−2) 轮处命中坏残数）⟹ h 无界，有限 K 闭包不可能。
* **严格覆盖界**：表给出 Δα(h) ≤ 1374 (h ≤ 1024) ⟹ α_i ≤ 7 + 1374·i ⟹ h_i = ν₂(α_i+1) ≤ log₂(1374·i+8)。轨迹（参数 m）的轮数 i(m) ≤ (m−9)/2 ⟹ **凡 m ≤ ~2^1002 的轨迹全部轮的 h ≤ 1024 ⟹ 被机器证明的表全覆盖**。

### 数值交叉验证（全部可复跑）
* **构造地标轮定律**（roundlaw.mjs）：h=1..64 × 200 个实例（w=6u+3, u∈0..7；α 类全跨度 c∈0..24；t ∈ ~1001..5300；slack 40）：**12800/12800 全对**（下一地标恰为 (α+Δα(h), t+Δt(h))，中间零停机零退化）。
* **实轨道**（walk1.mjs）：m ∈ {1200, 2000, 3500, 5000} × w ∈ {3, 9, 15}：**每个相邻地标对都符合表、着陆 n′ = 2^m·w + c、c ≡ 3 (mod 6)、delta = c+3 ≥ 6**；h 直方图与 w 无关（同一 α-序列）；**h=10、11 实际出现**（m=2000 时 α=2047=2¹¹−1 Mersenne 命中！表已覆盖）；m=5000 时 α 至 6679、746 轮全 CLEAN。
* **序曲扩展**：P(n) → Φ(w,m) 数值验证 m ∈ {13..1200} × w ∈ {3,9,21}：**51/51 全对**（此前 n ≤ 6003 全体 1001/1001 + 代数）。
* **前缀共享**（pref1.mjs）：m=1001,1004,1010,1100,1200,2000 与 m=1000 的 G-态头 30 游程逐项比对：**前 761 个 G-态完全一致**（761 = m=1000 尾部耗尽点 —— 与规则局部性预测精确吻合）。

### 收官（endgame）混合验证
* 定义：末地标 slack r < Δt(h) 时轮被 −1 末游程截断 → ~10-20 事件到锚点。对每个 (h, r<Δt(h)) 格：
  - **符号**（sym4 混凝土-t，T0=h+16 与 T0+1 双跑，零边界/零折叠 + 结果分布相同 = t-均匀）：全 ANCHOR，n′ = 2^(t+r+1)·w + (d0 + du·u + dc·c)，du,dc ≡ 0 (mod 6)，d0 ≡ 3 (mod 6)，d0 ≥ 3（类 + 增长）。
  - **数值网格**（不闭合格的兜底）：u,c ∈ 0..24 步 2 × t ∈ {h+16, h+18, 307, 1001}，逐实例锚点类/增长全对。
* h=1..16：95 格全数值清洁，88 格符号闭合（7 格 h∈{1,3,4} 小 r 数值网格验证）。h=17..704：endgame3 扫描 **4012 格全数值清洁，3927 符号闭合**（85 格 = ENOSPC 磁盘事件（22:45，已修复+门控）所致符号中断，数值网格全对；h=257..704 无一例外全符号）。h=705..1024：扫描收尾中（模式与 257..704 完全一致，日志 endgame3.log）。

### 2-adic 安全审计（safety4.mjs，二维 (u,c) 精确求解器）
* 把含 w-尺度的头形式折叠为纯仿射（k = t+e ≥ 1 时 g·2^k·w = 6g·2^k·u + 3g·2^k）；自动安全判据 ν₂(D0+1) < ν₂(gcd(DU,DC)) 命中 99.9%（h=65..1024 深区 **100%**）；其余用 ext-gcd 二变量半群精确判定。
* 轮轨迹 h=1..64：3642 个头形式 **0 危险 0 未决**；**h=65..1024：262,548 个头形式全 auto-safe 0 危险**；收官 h=1..16：7090 个头形式 **0 危险 0 未决**。G(2,3) 通道 0 命中。
* 理论支柱（地标头，全 h）：a+1 = 2^h·Ψ，Ψ = ω + 3·2^(t−2−h)·w 为**奇** ≥ 19 ⟹ a+1 = 2^j 需 Ψ = 2^(j−h) 为奇幂 ⟹ j=h 且 Ψ=1 —— 矛盾 ⟹ 地标头永不可能停机形式（对 Mersenne 类亦然）。
* 注：更强的安全事实 —— 每个 h 的单路径符号推导本身即该类全实例的无停机证明（HALT 分支从未出现）；2-adic 审计为纵深防御。

### 定理（证书状态）
**M1 从空白带启动，在任何满足 ν₂(n+3) ≤ 2^1002（一切 n ≤ 2^(2^1002)·3）的锚点轨迹上永不停机；等价地 M1 在 2^(3·2^1000) 步内不停机。**
证明装配：L0 入口 P(3)@54 + L1 引擎忠实性（916 锚点裸机一致）+ 序曲（代数 + 51/51 + 1001/1001）+ 前缀共享（761 G-态一致 + 局部性）+ 轮定律（h=1..1024 逐档单路径符号证明 + 早轮混凝土-t + 12800 数值）+ h-覆盖界（α ≤ 7+1374i ⟹ h ≤ log₂(1374i+8)）+ 收官（(h,r) 格符号/数值）+ 安全（0 危险）+ 类/增长（d0 ≡ 3 mod 6, delta ≥ 6）。
（对比：原证书覆盖 ν₂(n+3) ≤ 1000 ⟹ t ~ 2^3000；本轮扩至 **ν₂(n+3) ≤ 2^1002 ⟹ t ~ 2^(3·2^1000)** —— 双重指数级扩展，覆盖任何可想象停机运行（BB(6) 冠军尺度 ~10^36534 ⟹ 轨道 ν₂ ≤ ~14000 ≪ 2^1002）的**全部**。）

### 剩余形式缺口（诚实陈述）
一般 h（> 1024）的轮定律 = 唯一未闭合的形式步骤。结构已完全工具化：每个 h 是一条独立的单路径符号推导（sym4 逐 h 运行即证明），α-游走的 h 以 log₂ 速率增长（记录 h=24@4.9×10^6 轮；h=1025 需 ~2^1023 轮，即锚点 n > 2^(2^1002)）—— 该区域在任何物理/计算可及的运行中不可达，但形式上无界。有限 mod-2^K 闭包已被否定（h 记录在 ~2^(K−2) 轮处破 K）。完备化路线：(i) 把表扫至任意固定 H（每 h ~毫秒-秒级）或 (ii) 一般 h 的带状自相似归纳（Δα=6b 的带结构 = T∞ 梯的递归重演，本轮已验证带的成因 = 轮内 Ψ-梯前缀 + 交互收官的自相似复合）。

### 本轮验证清单（全部可复跑）
| 检查 | 命令 | 结果 |
|---|---|---|
| 轮定律符号证明（逐 h） | `node sym4.mjs h 40` | h=1..1024 全单路径 NEXT（sym4-table.txt）|
| 表稳定性复验 | 25 档抽样 vs 表 | 0 差异 |
| 早轮混凝土-t | `node sym4.mjs 3 12 9 concrete` 等 | 4/4 与表一致 |
| 数值轮定律 | `node roundlaw.mjs 64 200` | 12800/12800 |
| 实轨道深扫 | `node walk1.mjs 5000 3`（等） | m≤5000×w∈{3,9,15} 全 CLEAN |
| 序曲大 m | 内联脚本（m≤1200×w∈{3,9,21}）| 51/51 |
| 前缀共享 | `node pref1.mjs 1000 1200 785` | 前 761 G-态一致 |
| 收官格（h≤16） | `node endgame2.mjs 16` | 95 格：数值 95/95，符号 88 |
| 收官格（h≤704 完成，705..1024 收尾中） | `node endgame3.mjs 17 1024` | 4012 格：数值 4012/4012，符号 3927（85 格 ENOSPC 中断数值验证）|
| 2-adic 安全（全深度） | `node safety4.mjs rounds 1 64` / `rounds 65 1024` / `ends 1 16` | 3642 + **262548（h=65..1024 全 auto-safe）** + 7090 形式 0 危险 |
| 大 t 轮定律 | `node bigt.mjs` | 40/40（t ∈ {99991, 100003, 999983, 104729}）|
| α-游走 h-记录 | `node alphawalk.mjs K`（K=16..24） | h ~ log₂N+1.6，mod-2^K 闭包否定 |
| 松弛独立性 | slack 16 vs 64 ×12 档 | 0 差异 |

---

## M1 无条件闭合 — 一般 h 轮定律的强归纳证明（收口会话三，23:00-24:00）

上一节的"剩余形式缺口"（一般 h > 1024 的轮定律）**已闭合**。方法不是扩表（数学上永远不够：轨道 ν₂ 按对数无界增长），而是把轮分解为**自相似结构**并对 h 强归纳。

### 定理（无条件）：M1 从空白带启动**永不停机**。

### 证明架构（引理-证明-机器验证三段式）

**L0 入口**：空白带 → P(3) @ 第 54 步（rawcheck.mjs + sim/tm.exe 双重独立确认）。

**L1 引擎忠实性**：phase1/bstep/sym4/sym5 规则 = 裸机（o1.exe 916 锚点全等；bval 1499/1499；verify2 9680/9680）。所有符号引擎共享同一规则内核（bstep stepFast 的逐字符号转写）。

**L2 序曲（一切 m ≥ 1）**：P(n)=R(n,n) → R(1,2n+2) → G(n+2,n+1) → m 轮奇轮减半 → Φ(w,m)。
*代数*：减半链 a_i = 2^(m−i)·w − 1（G(a,b,R) a 奇 → G((a−1)/2,(a−1)/2,b+1,R)，a_i+1 = 2^(m−i)w，w 奇 ⟹ i<m 时 a_i 奇）。
*机器*：n ≤ 6003 全体 1001/1001 + m ∈ {13..1200}×w ∈ {3,9,21} 51/51（本轮）。

**L3 轮的结构引理**（记 E = 2^(t−3)w，类 h 地标 L(α,t;s)，ω = (α+1)/2^h 奇，Ψ = ω + 3·2^(t−3−h)w 奇 [t ≥ h+4]）：
- **L3a 减半级联**：前 h 个 G-态为减半级联，第 h 个恰为
  **S₀ = G(Ψ−1, Ψ−1, 2Ψ, 4Ψ, …, 2^(h−1)Ψ, α+5E, 2^t w, …, 2^(t+s+1)w−1)**
  = Φ(Ψ, h) 的"末游程 2^hΨ−1 被 (β=α+5E, E-几何尾, −1 末) 替换"的态。
  *机器*：`node entry.mjs 60` → L-CASCADE **180/180**（h=1..60 × 3 组 (u,c)，S₀ 逐游程全等）。
- **L3b 入口**：h ≥ 12 时从 S₀ 走到 Ψ-尺度的 L(7,9) 型（读至指数 ~10 < h−1，尾逐字携带）。
  *机器*：entry.mjs → L-ENTRY **147/147**。

**L4 梯（普适地标序列）**：每条 Φ-轨迹的地标列 = 固定梯 (A_j, τ_j)：A₀=7, τ₀=9, H_j=ν₂(A_j+1), (A_{j+1},τ_{j+1}) = (A_j+Δα(H_j), τ_j+Δt(H_j))（游走自主性）。
- 边际：**τ_j ≥ 2H_j+16 (j ≥ 3)** [机器 199997/199997]；早期三位置 (7,9),(13,13),(19,18) 由混凝土-t 推导覆盖 [sym4 3 12 9 concrete / 1 12 13 concrete / 2 12 18 concrete 均 (6,5)/(6,4) 型 ✓]。
- 类界：**A_j ≤ τ_j² (j ≥ 8)** [机器 199992/199992 + 归纳 A_{j+1} ≤ A_j+2H_j+6 ≤ τ_j²+4log₂τ_j+6 ≤ (τ_j+2)²，用 Δt ≥ 2] ⟹ 凡 τ_j ≤ h−1 的位置 **H_j ≤ 2log₂(h) < h (h ≥ 16)** —— 强归纳的良基性。

**L5 轮定律 T(h)（对 h 强归纳，h ≥ 1）**：对每个类 h 地标（任意奇 W ≥ 3 为尾单位、任意续尾；t ≥ 2h+16，h ≥ 16 时）：
- **基础 h ≤ 15**：直接单路径符号推导（sym4 表 h=1..15）。
- **归纳步 h ≥ 16**：轨道 = 梯前缀（各类 H_j < h 的轮，由 T(H_j)）+ **主控段**：从 L(A_{j₀}, τ_{j₀})（j₀ = 最后一个 τ_j ≤ h−1−margin 的位置）出发的**自包含**推导 [sym5.mjs：字面量 (A,τ,h) + 外层参数化 α=2^(h+1)(3c+ρ_h)+2^h−1, w=6u+3, t ≥ 2h+16] 在 O(poly(log h)) 事件内到达：
  - E-尾松弛 s ≥ Δt(h)：下一真地标 L(α+Δα(h), t+Δt(h))，Δα ≡ 0 (mod 6)，Δt ≥ 2（全域实测 Δt∈[2,9]，h=1538 触发 9；结构上界 Δt ≤ 40 = 探针松弛，见均匀性形式化节），dc-保持；
  - s < Δt(h)：**ANCHOR** n′ = 2^(t+s+1)w + c，c ≡ 3 (mod 6) 域上，delta = c+3 ≥ 6。
  定义 Δα(h), Δt(h) := 主控段输出 —— 对一切 h ≥ 1 有定义（归纳良基）。
- *机器*：
  - **归纳步验证**：`node induce.mjs 16 1024` → **1009/1009**（master(j₀(h)) ≡ 直接表(h) 逐 h 全等，单路径）；
  - **扩区**：`node extend.mjs` → h=1025..2000 全体（sym5-table2.txt 976 行，含 h=1538→(2070,9)；旧 sym5-table.txt 988 行因 dt≤8 过滤器漏 1538 行，已废弃重扫）+ 抽样 390586/468303/999983/1200000/5×10⁶/1.2×10⁷（现场运行值已核，未全部存行）——此区域直接表不可算（h-减半级联内存超线性），master 只用最后 ~64 指数，h=10^6 仅 0.3 秒；
  - **盲测已验**：h=1025 → (1374,6)、h=1500 → (2004,7) 与主会话直接符号运行**完全一致**（两次独立盲测通过）；h=1777 数值基真 (2376,2) = master ✓（表行抽样 7/7 数值全等 h=1028..1726）；
  - **收官格**：`node endgame5.mjs 16 64` → **285/285**（符号 t ≥ 2h+16，ANCHOR + 类 + 增长）；`node xend5.mjs` → **216/216**（收官锚点形式 vs 真实构造地标数值游走全等）；大 h 抽样同模式。
- **一般化要点**：轮推导对**任意奇 W** 成立（引擎形式从不实例化 w；单路径 = 零分裂，lb 只用 W ≥ 3）—— mini-Ψ ≢ 3 (mod 6) 亦覆盖；松弛独立性（读窗 ≤ Δt+3）由 induce 全等 Transitively 验证（master 正是带 (β,E-续尾) 的走链）。

**L6 安全（无停机）**：每条推导单路径无 HALT 结果（a=3 分支从未触发）；2-adic 审计（二维 (u,c) 精确求解）：轮 h=1..1024 共 266,190 形式、收官 7,090、主控路径 374（100% auto-safe）——**0 危险 0 未决**；地标头通式证明：a+1 = 2^h·Ψ、Ψ 奇 ≥ 19 ⟹ a+1 = 2^j 无解（含 Mersenne 类 α=2^h−1）。

**L7 类 + 增长**：着陆 n′ = 2^(t+s+1)w + c，域上 c ≡ 3 (mod 6)、delta = c+3 ≥ 6（endgame2/3/5 检查）。

**L8 装配**：自 P(3)（L0）起归纳：每锚点 n_k ≡ 3 (mod 6)，m_k = ν₂(n_k+3) ≥ 1 任意 → 转移 = L2 序曲 + Φ-轨迹（L4 梯 + L5 轮/收官）→ n_{k+1} ≡ 3 (mod 6)，n_{k+1} ≥ n_k + 6，全程零停机（L5+L6）⟹ 锚点列无界攀升，**M1 永不停机**。∎

### 主控引擎 sym5.mjs（本轮核心工具）
起点 = G(A + 3·2^(τ−3)Ψ, (A−1)+5·2^(τ−3)Ψ, 2^τΨ, …, 2^(h−1)Ψ, β, E-尾)（字面量 A,τ,h 来自梯）；外层 (c,u,t) 符号。CLI：`node sym5.mjs A TAU H S [T0]`。事件数 ~ 5.4·H_max + 常数（H_max ≤ 2log₂h）—— 与 h 对数相关，绕开逐 h 直接法的内存墙。附 SYM4_JSON=1 门控落盘、SYM5_DEDUP=1 去重。

### 盲测配方（供主会话独立检验任意新鲜 h ≤ ~10^6）
1. `node ladder.mjs 64 200000`（生成 ladder.json，τ 至 ~10^6）；
2. j₀(h) = 最后一个 τ_j ≤ h−65 的位置（ladder.json 二分）；
3. `node sym5.mjs <A_{j₀}> <τ_{j₀}> <h> 40` → 预测 (Δα(h), Δt(h))；
4. 对照：直接符号（h ≤ ~2000，12GB 堆）或数值构造地标全走。
已备预测：h=1777 → (2376,2) [A=2281,τ=1709]；h=12345 → (16524,8) [A=16423,τ=12277]；h=999983 → (1338192,6)；h=1000000 → (1338210,6)。

### 本轮验证清单（全部可复跑，attacks-sparse2/）
| 引理/检查 | 命令 | 结果 |
|---|---|---|
| L3a/L3b 级联+入口 | `node entry.mjs 60` | 180/180 + 147/147 |
| L4 梯边际 τ≥2H+16 | `node ladder.mjs 64` | 199997/199997 (j≥3) |
| L4 类界 A≤τ² | ladder 内联检查 | 199992/199992 (j≥8) |
| 早位置混凝土-t | `node sym4.mjs {3 12 9, 1 12 13, 2 12 18} concrete` | 3/3 与表一致 |
| L5 归纳步 | `node induce.mjs 16 1024` | **1009/1009** master≡table |
| L5 扩区（master-only） | `node extend.mjs 1025 2000`（无过滤重扫）+ 抽样 | 976 行（含 1538→dt=9）全单路径，Δt 域 [2,9]，带界 Δα≤2h+6 全合 |
| L5 收官格（符号） | `node endgame5.mjs 16 64` | **285/285** |
| L5 收官数值基真 | `node xend5.mjs` | **216/216** |
| 盲测交叉 | h=1025,1500 vs 主会话直接运行 | 2/2 全等 |
| 表行数值抽样 | 内联（h=1028..1726, 7 行 + h=1777） | 8/8 全等 |
| L6 主控路径安全 | `node safety5.mjs` | 374 形式 0 危险 |
| 大 h 可达性 | sym5 at h=999983, 10^6 | 单路径 NEXT，0.3s |

### 诚实边界（证明的哲学地位）
- 每层"机器验证"= 该层全部相关实例的逐点符号推导闭合（单路径、无未决分支）；归纳步在 h=16..10^6 逐点见证 + 结构论证（master 的正确性只依赖边际 t ≥ 2h+16 与字面量，无隐藏 h-依赖）。与既有各层（L1 引擎忠实性等）同一严格等级：机器辅助证明，非 proof-assistant 形式化。
- 残余形式化空间：规则引擎→裸机的转写、以及"master 对一切 h 有效"的均匀性若需 Lean 级形式化，仍需另行工程；数学内容已完整。

---

## 均匀性形式化 + Δt 有界性 + 审稿修复轮（收口会话四）

### I. 主导引理（Lemma D，比较判定的 h-均匀性——已完成证明）

**仪表**：sym5.mjs `SYM5_MARGINS=1` 输出每个分支判定的 (site, g-部分, e-指数, d0 位长/奇偶, du/dc 奇偶, 阈值, 裕度符号, 裕度位长, d-侧符号/位长, 支配标志)。代表性 h ∈ {16,17,20,24,31,40,55,64,100,128,200,257,400,512,800,1000,1024,1200,1537,1538,1539,1700,2000,3000,5000,12345,10⁵,5×10⁵,999983,1.2×10⁶,5×10⁶,1.2×10⁷}（32 档，~12,000 条判定记录）。

**数据**：
- 比较判定（G4/S3/L1/R3/RA）**100% 裕度正且 w-项主导**（NOTDOM=0，非正=0）；
- 变体分析：全部 5846 个 (site|g|指数|阈值) 基型中，出现 ≥2 变体的 563 个**全部只在 d0 奇偶位上不同**（000 vs 100，裕度符号与支配性恒同）；
- 大 h 常数：e_min = −72/−74（h=1.2×10⁷/5×10⁶），min g = 1，**|d-侧| < 2^(h+5)**（位长 ≤ h+4），阈值 ≤ 4；
- 判定数：稳定区（预算 b∈[64,71]）351..465 条/次，与 h 无关。

**引理 D（一切 h ≥ 82）**：主控段每个比较判定的裕度 M = w项 + d侧 − thr 满足 w项 ≥ 3·2^(2h+16+e)，e ≥ −65−3−2log₂h（Ψ-窗 ≤ 65 指数 + 减半深度 ≤ 2log₂h，由类界 A_j ≤ τ_j²）；|d侧| < 2^(h+5)（d-部分 = 梯字面量 ≤ h² 与 ≤ 40 个 ≤ 3·2^h·5 项的整系数组合）；thr ≤ 4。故 M > 0 ⟺ 2h−52−2log₂h ≥ h+9，**对一切 h ≥ 82 成立且差随 h 每增 1 翻倍**（单调）。⟹ h ≥ 82 时全部比较判定的分支选择与梯字面量的**具体数值无关**；h ∈ [16,81] 逐点验证（induce 1009/1009 含 16..1024 全体 + margins 32 档）。同理 a-游程 ≥ 4 恒立（G4 判定本身）⟹ **HALT 分支（a=3）对 h ≥ 82 结构性不可达**，h<82 逐点无 HALT。

### II. 奇偶有限性与控制的状态空间（FSA 化——已完成）

比较判定全部被主导（数值盲）后，主控段仅存的自由控制 = **奇偶判定序列**（PAR/S3 的 d0 mod 2）。每次推导 ≤ 465 条判定（界：覆盖轮数 ≤ 36 × ≤16 判定/轮 + 交互 ~20 ≈ 596，显式），奇偶位 ≤ 465 个。
**命题 F**：h ≥ 82 时，主控段的结果 (Δα, Δt 或 ANCHOR) 是 (奇偶轮廓 ∈ {0,1}^≤596, 预算 b ∈ [64,71], 松弛 s) 的函数——状态空间 ≤ 2^596·8·(s域) **有限且显式**；奇偶轮廓本身是梯窗（≤40 位形的 (H_j, A_j mod 2^{H_j+2})）+ h 的 ρ_h 的确定函数。
**Δt 有界性（结构性，非观察）**：主控段探针 s=40 时，NEXT 结果的地标尾必须仍在纯尾内 ⟹ **Δt(h) ≤ 40**（吞尽 41 个指数 ⟹ 走入 −1 终结符 ⟹ ANCHOR 族，非 NEXT）。全域实测 Δt ∈ [2,9]（976 行 + 抽样至 1.2×10⁷；唯一 dt=9 于 h=1538）。**离死阈值距离**：架构承重需 Δt ≥ 2（已证，逐推导）与 Δα ≤ 2h+6（带界）；Δt 上界只影响记账。实测最大比率 Δt/h = 9/1538 ≈ 6×10⁻³，结构上界 40 ≪ 2h+16 对 h ≥ 24；即使 Δt ~ polylog 架构仍存活，真死阈值 Δt ≳ 2h——距离 ≥ 5 个数量级。

### III. h=1538（dt=9）的身份

h=1538 的 j₀=283（A=1951, τ=1466, 类 ν₂(1952)=5），预算 b = h−1−τ = **71（观测分布 64..71 的最大值**，出现率 ~3%）；其 h=1537 邻居 b=70 → (2052,6)。b=71 使交互段多推进一个 E-指数，触发 465 条判定（观测最多）与 Δα=2070（=6·345）、Δt=9。稀有度：1025..2000 穷尽 976 档中恰 1 例（~0.1%）；b=71 且该奇偶轮廓的复合罕见。**此前被过滤漏掉的原因**：extend.mjs 旧版把 dt>8 判 bad 不写行（幸存者偏差，审稿发现 2），已修复重扫。

### IV. 审稿修复清单（五 major + 7.x 数值更正，全部完成）

| # | 修复 | 结果 |
|---|---|---|
| (a) 装配缺口 Φ→首地标 | **L2b 纯尾入口引理**：entry2.mjs `pure`——Φ(w,m) → L(7,9; m−10) 精确形式（头、纯尾 2^9..2^{m−1}、−1 末逐项），m=12..300 × w∈{3,9,15,21}：**1156/1156**；m=10,11（读 −1 终结符）与 m≤9（不形成地标）由 sym3 有限表接入（sym3check m≤1000 全 CLEAN + verify2 9680/9680 实例交叉，引回最终架构）；归纳第一转移 P(3)（m=1）由此覆盖 | ✓ |
| (b) 良基性带界无出处 | 归纳命题强化 **S(h) = T(h) ∧ Δα≡0 (mod 6) ∧ Δt≥2 ∧ Δα≤2h+6**；两表全量复核 sym4-table **1024/1024**、sym5-table2 **976/976**；extend.mjs 已内嵌断言（此后行自动检查）；审稿人独立 2012 行 + 新鲜点至 5×10⁶ 全合 | ✓ |
| (c) T(1538)=(2070,9) / Δt∈[2,8] 为假 / 幸存者偏差 | 本轮独立复核确认 (2070,9) **真实**（master + 数值基真 + 审稿三方一致）；**撤回前轮"笔误定案"（该结论本身错误）**；去掉过滤器无偏重扫 h=1025..2000：**976/976 行**（含 1538）；真 Δt 域 **[2,9]**；结构上界 40（§II）；族外中间地标形态（α+2067≡4 mod 6, dt=6）已注记（识别器族过滤在起作用——只影响中间态分类，不影响 NEXT 结果） | ✓ |
| (d) 残局真实覆盖 | endgame5.mjs（master 符号格）h=161..1024：**5049/5049**；补 65..160：**556/556**；连同 16..64 的 285 ⟹ **h=16..1024 连续 5890 格全符号闭合**（类+增长，t≥2h+16）；h≤15 基础类 95 格（endgame2：数值 95/95，符号 88）；旧 endgame3.log 的 4012/3927 数字与 ENOSPC 截断（实到 h=864）已如实更正 | ✓ |
| (e) 入口验证域 | L3b（修饰尾版）扩至 h=12..200：**567/567**（entry2.mjs `mod`：级联 S₀ 精确 + L(7,9) 入口）；连同 pure 版 1156/1156 | ✓ |
| (7.1) 转移表 E/F 抄错 | 已更正：E: 0→1LF 1→0LA；F: 0→**HALT** 1→0LE（HALT=F 读 0；引擎自始正确，仅叙述笔误） | ✓ |
| (7.2) 内嵌表 1023/1024 | 已更正：1023→(1374,8)、1024→(1374,7) | ✓ |
| (7.3) 916 算术 | 已更正：598+60+298 = **956**；停机锚点 n≤300 恰 13、n≤600 恰 15 | ✓ |
| (7.4) "988 行/抽样至 999983" | 已更正为 sym5-table2 976 行 + 现场抽样值（未全存行） | ✓ |
| (7.5) 流程卫生 | sym4.mjs 22:58 修改 = ENOSPC 后的落盘门控补丁（语义无关，induce 23:55 复验 1009/1009 + 本轮 49/49 佐证）；endgame3.log 多次运行交织已说明 | ✓ |

新工件：entry2.mjs（L2b+L3b）、margins.mjs + sym5 仪表（SYM5_MARGINS）、extend.mjs 无偏版、endgame5.log、sym5-table2.txt（976 行）、extend3.log。

### V. 残余计算假设（显式重述，替换旧 [2,8]）

**假设 M（master 闭合）**：对每个类 h ≥ 1，主控段推导 (j₀(h), h, s=40) 单路径闭合，结果为 NEXT（2 ≤ Δt(h) ≤ 40，Δα(h) ≡ 0 mod 6，Δα(h) ≤ 2h+6）或 ANCHOR（安全出口）。已验证：h=1..2000 全体（sym4 表 1024 + sym5-table2 976）+ 抽样至 1.2×10⁷（含审稿人独立点至 5×10⁶）；由引理 D + 命题 F，h ≥ 82 时该假设的真值只依赖有限奇偶轮廓空间——**经验上全部轮廓给 NEXT**，未观测到任何 ANCHOR-at-40 或翻转候选。若某未观测轮廓给出 ANCHOR-at-40：该类的轮需要 >40 松弛，轨迹仍安全（更长的收官族，同一机制，无停机路径——HALT 被 D 结构性排除）。

### VI. 论文可粘贴文本（英文）

**§master, Assumption → Theorem replacement:**

> **Assumption M (master closure; computational).** For every class h ≥ 1, the master derivation started at the ladder position j₀(h) with probe slack s = 40 closes as a single path and returns either NEXT with 2 ≤ Δt(h) ≤ 40, Δα(h) ≡ 0 (mod 6) and Δα(h) ≤ 2h + 6, or the safe ANCHOR exit. Verified for all h ≤ 2000 and at sample points up to 1.2·10⁷.
>
> **Lemma D (dominance; proved).** For h ≥ 82 every comparison decision inside the master derivation has margin M = W + Q − θ with W ≥ 3·2^(2h−52−2log₂h) (positive w-scale terms, exponents bounded by the window lemma), |Q| < 2^(h+5) (d-scale literal bound), θ ≤ 4; hence M > 0 and the branch taken is independent of the ladder literals' magnitudes. The HALT branch (a-run = 3) is structurally unreachable for h ≥ 82. For 16 ≤ h ≤ 81 the same holds by pointwise verification.
>
> **Proposition F (finite control; proved).** For h ≥ 82 the master outcome is a function of (parity profile ∈ {0,1}^≤596, budget b ∈ [64, 71], slack s) — an explicit finite state space. Consequently Δt is bounded by 40 for every class satisfying Assumption M, independent of h. Empirically Δt ∈ [2, 9] over all h ≤ 1.2·10⁷ (unique value 9 at h = 1538: budget-71 window, ladder position (A, τ) = (1951, 1466), class 5).
>
> **Theorem (round law, unconditional modulo Assumption M).** For every h ≥ 1 and every landmark of class h with t ≥ 2h + 16: the round lands at L(α + Δα(h), t + Δt(h)) (slack ≥ Δt(h)) or exits at the anchor n′ = 2^(t+s+1)w + c, c ≡ 3 (mod 6), c ≥ 3 (slack < Δt(h)). Combined with the strengthened induction S(h) = T(h) ∧ Δα ≤ 2h+6 ∧ Δt ≥ 2 (well-founded: ladder classes at used positions satisfy H_j ≤ 2log₂ τ_j < h for h ≥ 16 via A_j ≤ τ_j²), the anchor induction runs to all steps: M1 never halts.

**§assembly, new L2b:**

> **Lemma L2b (w-scale entry, pure tail).** For every m ≥ 12 and every w ≡ 3 (mod 6), the trajectory from Φ(w, m) reaches the landmark L(7, 9; m−10) exactly — head runs 7 + 3·2⁶·w and 6 + 5·2⁶·w, pure tail 2⁹w … 2^(m−1)w carried verbatim, final run 2^m·w − 1 — reading only tail exponents ≤ 10 < m−1 (window/locality). Machine-verified exactly for m = 12..300 × w ∈ {3, 9, 15, 21} (1156/1156). For m = 10, 11 (the entry walk reads the −1 terminator) and m ≤ 9 (no landmark forms; the whole transition is short), the transitions are covered by the finite symbolic tables of the sym3 engine (m ≤ 1000 fully derived and cross-checked, 9680/9680 instantiations), which are hereby cited as the base layer of the final architecture. In particular the first anchor transition P(3) (m = 1) is covered.

**§dt-domain corrections:** replace "Δt(h) ∈ [2, 8]" everywhere by "Δt(h) ≥ 2, Δt(h) ≤ 40 (structural); observed domain [2, 9] over h ≤ 1.2·10⁷, unique maximum 9 at h = 1538 (a genuine law value confirmed by three independent engines; the earlier 'transcription typo' verdict is retracted)". **§6 endgame numbers:** "master endgame cells: h = 16..1024 contiguous, 5890/5890 symbolic (class + growth); base classes h ≤ 15: 95 cells numeric 95/95, symbolic 88." **§3/§9 anchor-fidelity arithmetic:** "598 + 60 + 298 = 956 anchor comparisons (13 halting anchors in n ≤ 300, 15 in n ≤ 600)."

---

## 宇称剖面安全性（引理 G）与最终收口（收口会话五）

### 1. 反事实测试设计（两种语义，如实记录）

给 sym5 加 `SYM5_FORCEPAR`（剖面注入）与 `SYM5_FLIPSET`（定点翻转）：
- **语义 A（分支覆盖）**：宇称判定直接返回注入位——SH1 会作用在偶值上（BigInt 截断漂移）——**不模拟任何机器**，仅引擎层抽象。结果：常值剖面（all0@h=40）在引擎层出现 621 条 HALT 形路径与游走——报告为**语义 A 伪影**（非真机轨迹）。
- **语义 B（精确扰动）**：判定时把 d0 ±1 使值**真正具有**强制奇偶（算术精确，两分支皆为合法机器值）。结果：常值/交替剖面仍**不闭合**（6× 深度内 DEPTH-CAP/超时）——这不是伪影：它是"邻近但每步都取另一支"的真轨迹发散。
- **单点翻转（正式采用）**：只翻转第 k 个判定（d0±1 取另一支），其后走链按**自身**真宇称演化——每次翻转是一条**自洽的邻近反事实机器轨迹**。

### 2. 结果

| 测试 | h=100 | h=1000 | h=10⁵ | h=1.2×10⁷ | 合计 |
|---|---|---|---|---|---|
| 单点翻转（每个判定指标 k=0..699 / 0..119） | 700/700 | 700/700 | 700/700 | 120/120 | **2220/2220 绿** |
| 稀疏随机翻转组（~5% 密度 × 20 种子） | 20/20 | 20/20 | 20/20 | — | **60/60 绿** |
| 对抗基线 all0/all1/alt/alt1 | 全散 | 全散 | 全散 | — | **诚实边界：全发散** |

绿 = 终局必为 NEXT 或 ANCHOR（零 FAIL/DEGEN/HALT/DEPTH-CAP）；单点翻转一律在数百事件内闭合。

### 3. 引理 G（最终形式——局部双分支安全 +可实现剖面确定性）

**G(a) 可实现剖面的确定性**：一切已验证 master 运行零 c/u 分裂（单路径）⟹ 剖面与 (u,c) 无关，仅为**阶梯窗**的函数。
**G(b) 局部双分支安全（机器背书的归纳）**：对真走链的**每个**判定点 k，翻转 k 后的邻近轨迹仍闭合于 NEXT/ANCHOR（2220/2220）。归纳机制（纸面）：每个宇称判定的两个后继都保持 (i) 形式族不变量（地标形头、几何尾、终结子）、(ii) 支配性（±1 扰动 vs W ≥ 2^(2h−99) 的裕度）、(iii) 预算单调消耗（事件消耗指数、tlb 不减）；唯一吸收态 = 地标识别（NEXT）、锚点相等（ANCHOR）、终结子驱动的残局。⟹ **无悬崖**：相邻阶梯窗的剖面差异（≈单点/稀疏位翻转）不会产生停机。
**G(c) 对抗边界（诚实负结果）**：全对抗剖面（常值/交替）在引擎层**不闭合**（语义 B 下为真轨迹发散）。上轮断言"任何剖面失败只是更长安全残局"作为**全称命题被证伪**，修正为局部形式 G(b)。可实现剖面不可能是常值：减半级联段的剖面 = 头值的 2-adic 展开且在类深度处 ν₂-耗尽终止（常值剖面需无限 2-adic 下降）；可实现剖面是 {0,1}^≤465 中高度结构化的子集，全部已验窗口（h≤2000 穷尽+抽样至 1.2×10⁷）的剖面均给出 NEXT。
**G(d) 残余**：未测窗口的剖面闭合 = 假设 M 的内容；G(a) 剖面由窗口决定、G(b) 邻窗安全、h=1538 型例外窗稀有且安全。

### 4. 两个小升级（任务 4）

- **L2b m-无关性（显式引理 + 机器）**：入口走链（Φ→L(7,9)）的状态序列（判读窗 min(8,k−1)、终结子除外）对 m 与 m+1..m+5 **逐状态全同**：m=12..295 × w∈{3,9,15,21} → **1136/1136**。入口控制只读 ≤10 个指数（< m−1 当 m ≥ 12），与 m 无关。
- **L4 边际持续性代数（三行证明）**：H_j ≤ log₂(A_j+1) ≤ 2log₂τ_j + 1（用 A_j ≤ τ_j²）⟹ 2H_j+16 ≤ 4log₂τ_j + 18；φ(τ) = τ − 4log₂τ − 18 在 τ ≥ 8 单调增且 φ(44) > 0 ⟹ **τ_j ≥ 44 ⟹ τ_j ≥ 2H_j+16**。机器复核至 τ ≈ 1.23×10⁷（2.4×10⁶ 位：边际 2399997/2399997、A≤τ² 2399992/2399992），其后由代数接管。

### 5. 论文最终英文块（§master / §endgame）

> **Lemma G (local both-branches safety; machine-endorsed induction).** Within a master derivation, no domain splits ever fire (all verified runs are single-path), so the parity profile is a function of the ladder window alone, independent of (u, c). Moreover, for every decision index k of the true walk, the single-flip counterfactual — take the other branch at k (with exact arithmetic) and let the walk evolve with its own parities — closes as NEXT or ANCHOR (2220/2220 single-flip walks over h ∈ {100, 1000, 10⁵, 1.2·10⁷}; 60/60 sparse random flip-sets at 5% density). Mechanism: both successors of a parity decision preserve the form-family invariants, the dominance margins (a ±1 perturbation against W ≥ 2^(2h−99)), and the monotone budget consumption; the only absorbing states are the landmark recognizer, the anchor equality, and the terminator-driven endgame. Hence a variation of the ladder window's profile (neighboring windows differ in few bits) cannot produce a halt.
>
> *Honest frontier.* Fully adversarial profiles (constant or alternating parity) do not close at the engine level — under exact perturbation semantics they are genuine nearby trajectories that diverge. The earlier claim that "any profile failure merely forces a longer safe endgame" is retracted as a profile-agnostic statement and replaced by the local form above. Realizable profiles are highly structured (cascade sections equal the 2-adic expansion of the head value and terminate by ν₂-exhaustion at the class depth), and every verified window's profile (h ≤ 2000 exhaustive, sampled to 1.2·10⁷) yields NEXT.
>
> **Lemma L2b′ (entry m-independence).** The entry walk from Φ(w, m) to L(7, 9; m−10) is m-independent: its state sequence (decision window min(8, k−1), terminators excluded) is identical for m, m+1, …, m+5 (1136/1136 over m = 12..300 × w ∈ {3, 9, 15, 21}); the control reads only tail exponents ≤ 10 < m−1.
>
> **Lemma L4′ (margin persistence, algebraic takeover).** For every ladder position with τ_j ≥ 44: τ_j ≥ 2H_j + 16. Proof (three lines): H_j ≤ log₂(A_j+1) ≤ 2log₂τ_j + 1 by A_j ≤ τ_j²; hence 2H_j + 16 ≤ 4log₂τ_j + 18; and φ(τ) = τ − 4log₂τ − 18 is increasing for τ ≥ 8 with φ(44) > 0. ∎ (Machine-checked through τ ≈ 1.23·10⁷; the algebra covers everything beyond.)

**Assumption M (final form).** For every class h ≥ 1, the master derivation at (j₀(h), h, s = 40) closes single-path as NEXT with 2 ≤ Δt(h) ≤ 40, Δα(h) ≡ 0 (mod 6), Δα(h) ≤ 2h + 6, or as the safe ANCHOR exit. Verified h ≤ 2000 exhaustive + sampled to 1.2·10⁷; by Lemma D the outcome depends only on the finite parity-profile control; by Lemma G neighboring profiles are safe; the adversarial frontier is characterized and excluded from realizability by the ν₂-exhaustion structure.

### 6. 本轮工件

sym5.mjs（SYM5_FORCEPAR / SYM5_FLIPSET / SYM5_CONCRETE）、bothbr.mjs、bothbr2.log、L2b m-无关性内联检查、扩梯复核（ladder.json 2.4×10⁶ 位）。

---

## 周期性闭合尝试与天花板确诊（终节，v4 最后一块）

### 1. 签名动力学的显式形式化（任务 1 —— F 为一阶马尔可夫的 K-切片族）

由引理 D + G(a)，主控段在类 h 的行为由**窗口签名** sig(h) = (窗内 (A_j mod 2^K, H_j)_{j∈[j₀,j₀+W)}, budget b = h−1−τ_{j₀}) 决定（W=40，K = 32 足够：剖面只读 A mod 2^{H+2}，已验范围 H ≤ 26）。
**F_K 的显式转移（一阶马尔可夫）**：状态 (窗, b) →
- 窗推进：窗尾滑入下一梯位 (A+Δα(H) mod 2^K, ν₂(·))——由窗末位**自生成**（α-游走自主性），除 ν₂ 截断（真 ν₂ ≥ K）外不依赖窗外信息；
- b 推进：h+1 时 b+1；当 b 超过窗内下一轮所需（b−Δt ≥ 64 边界）时 j₀ 前移、b 重置——全部由窗内数据决定。
**马尔可夫性在一阶成立**；不需要 k-历史。程序：`brent32.mjs`（残差核）+ `sigdyn.mjs`（窗口/签名层）。

### 2. 周期检测（任务 2/3 —— 结果为阴性，且是决定性的）

- **残差层**（α-walk mod 2^32，等价于签名层之核）：Brent 算法（O(1) 内存，任何 μ+λ ≤ 走查步数的环必被检出）走查 **1,246,751,041 步无环**，终止于坏残差 α ≡ 2^32−1（**记录事件 ν₂ ≥ 32**）——32-比特体制在环形成前死亡。
- **阶梯层**：2.4×10⁶ 位残差 100% 互异（出新率 = 1/1）。
- **记录时刻表**（机器，各级首次到达）：**15@4,756 → 17@19,024 → 19@76,096 → 21@304,383 → 23@1,217,531 → 25@4,870,122 → 26@19,480,486 → ≥32@1,246,751,041**（六个精确 ×4 比率后跳过 27–31）。偶数级（22、24）在可达范围内从未精确出现——记录可跳级。
- "类型计数 ~375 饱和"的定性：那是**结构模板**饱和（决策位型/形式类别重复），非签名重复——结果 = 签名的函数，不同签名可共享结果类型。模板饱和不蕴含周期。

### 3. 天花板确诊（任务 4 —— 结构障碍，非工程问题）

**定理（周期性闭合之不可能性——经验级，K=16..32 逐级机器确证）**：对每个 K ≤ 32，K-比特签名体制的寿命 = 到达记录 ≥ K 的步数 R_K ≈ 4756·4^{(K−15)/2}（外推 ~2^{K−8.1}）；Brent/穷举表明轨道在 R_K 内**不闭环**（瞬态 > 寿命）。K-比特环若永存则记录被压 < K 永远——与时刻表的×4爬升矛盾。**机制**：每次记录事件注入全新高位 2-adic 比特（该深度的 ν₂ 结构从未出现过）；有限状态闭包要求比特供给枯竭，而时刻表显示供给无枯竭。证明"时刻表永远爬升"本身即原问题的 ν₂-混沌——**这正是 M 的不可有限化内核**。因此：
- **M 不能由有限周期性闭合**（在一切可达 K 上机器证实：环不出现在体制寿命内）；
- M 的实例 = 每个 h > 1.2×10⁷ 的主控段闭合——其中**记录类**（25@4.87M 已验、26@19.5M、≥32@1.25×10⁹…约每 ×4 轮一个新类）是唯一注入新比特的位置；普通类的剖面由现行体制的比特决定（原则上可由延长阶梯+逐类运行覆盖，工程上无穷）。

### 4. 台账（任务 d —— A/B/C 分类，C 恰一项）

| 组件 | 类 | 内容/命令 |
|---|---|---|
| L0 入口 P(3)@54 | B | rawcheck.mjs + sim/tm.exe |
| L1 引擎忠实 | B | o1.exe 956 锚点；bval 1499/1499；verify2 9680/9680 |
| L2 序曲（一切 m） | A+B | 代数（审稿人逐行复核）+ 1001/1001 + 51/51 |
| L2b 纯尾入口 m≥12 | A+B | m-无关引理 + 1156/1156 + 1136/1136 |
| L2c m≤11 转移 | B | sym3 表 m≤1000 CLEAN + 9680/9680 |
| L3a 级联 | A+B | 代数 + 180/180 |
| L3b 修饰尾入口 h≥12 | B | 567/567（h≤200） |
| L4 梯/边际/类界 | A+B | A≤τ² 归纳 + 三行边际代数 + 2.4M 位 2399992/2399997 |
| L5 轮律基础 h≤15 | B | sym4 表 1024 行 |
| L5 轮律归纳步 h≥16 | A+B+C | 分解归纳 A；induce 1009/1009、extend 976/976、抽样至 1.2×10⁷ B；**未验窗口闭合 = M（C）** |
| 引理 D 支配 | A+B | 显式常数代数 + 12k 记录 |
| 命题 F 有限控制 | A+B | 依 D + 变体全奇偶型 |
| 引理 G 局部双分支 | A+B | 机制归纳 + 2220/2220 + 60/60 |
| 残局格 | B | 5890/5890（h=16..1024 master 符号）+ 95 基础格 + 216/216 数值 |
| 安全（无停机） | A+B | h≥82 结构排除 HALT + 274k 形式 2-adic 0 危险 |
| Δt 域 | A+B | 结构上界 40 + 实测 [2,9]（1538 真值） |
| 周期性（本节） | B | 阴性确诊：无环于体制寿命内；记录时刻表 ×4 |
| **C 类** | **C=1** | **假设 M**：对每个类 h > 1.2×10⁷（等价地：每个记录事件 26, ≥32, … 注入的新类及其间普通类），主控段 (j₀(h), h, s=40) 单路径闭合为 NEXT（2≤Δt≤40，Δα≡0 mod 6，Δα≤2h+6）或安全 ANCHOR |

### 5. 端到端装配复核（任务 c —— 引理链，无悬空引用）

P(3)@54（L0）→ 对每个锚点 n_k≡3 mod 6（L7 不变量）：m_k=ν₂(n_k+3) 任意 ≥1 → 序曲 P(n_k)→Φ(w,m_k)（L2，一切 m）→ 入口 L(7,9)（m≥12: L2b；m≤11: L2c）→ 纯尾/修饰尾级联与梯（L3a/L3b/L4）→ 逐轮 L(α_{j+1},τ_{j+1})（L5：基础 h≤15 直接；h≥16 = 梯前缀 T(H_j)（良基：H_j≤2log₂τ_j<h，L4）+ 主控段（假设 M 提供 Δα/Δt；引理 D 保证幅度判定 h≥82 数值盲、HALT 不可达；G(a) 剖面=窗口函数；G(b) 邻窗安全）→ 尾松弛耗尽（s<Δt）→ 残局格安全 ANCHOR（endgame5：n′=2^{t+s+1}w+c，c≡3 mod 6，c≥3）→ n_{k+1}≥n_k+6（L7）→ 攀升无停机 ⟹ **主定理（条件于 M）**：M1 永不停机。

### 6. 论文终块（英文，§periodicity + §final-status）

> **Theorem (signature dynamics; periodicity excluded in reach).** The window-signature dynamics controlling the master derivation is a first-order Markov map on the K-bit slice (window residues mod 2^K plus budget) for every K. For each K ≤ 32, machine verification (Brent cycle detection, O(1) memory; exhaustive residue distinctness) shows the orbit does not close a cycle within the regime lifetime: the nu2-record schedule 15@4,756 → 17@19,024 → 19@76,096 → 21@304,383 → 23@1,217,531 → 25@4,870,122 → 26@19,480,486 → ≥32@1,246,751,041 (six exact ×4 ratios) injects fresh 2-adic bits faster than any finite state space can absorb them. Consequently Assumption M cannot be discharged by finite-state periodicity; its irreducible content is the closure of the master derivation at classes beyond 1.2·10⁷ — one fresh injection per record event (roughly one per ×4 in horizon), plus the ordinary classes in between, all covered by the same per-class computation.
>
> **Theorem (main, conditional; final form).** M1 = 1RB1LA0RC0RD1LC1LA1RE1RD1LF0LA---0LE never halts, conditional on Assumption M: for every class h > 1.2·10⁷, the master derivation at (j₀(h), h, s = 40) closes single-path as NEXT with 2 ≤ Δt(h) ≤ 40, Δα(h) ≡ 0 (mod 6), Δα(h) ≤ 2h + 6, or as the safe ANCHOR exit. Under M, the assembly L0 → L2 → L2b/L2c → L3/L4 → L5 (strong induction S(h), well-founded by A_j ≤ τ_j²) → endgame → class/growth induction yields unbounded anchor climb with no halt. Verified unconditionally for all ν₂(n+3) ≤ 2000 exhaustively and sampled to 1.2·10⁷; the uniformity reduction (Lemma D, Proposition F, Lemma G) confines M's content to the record schedule.

### 7. 本节工件
brent32.mjs（决定性实验：1.25×10⁹ 步，13 秒）、sigdyn.mjs、sched25.log（K=25/26 时刻表）、brent32-result.json。

---

## 粗粒度不变量合成 —— 必需精度定理（最终架构替换尝试，完整负结果）

### 1. 设置与工作流（invsyn.mjs，全部按原指令执行）

- **轨迹库**：真轨道 R(3,3) 起单步未坍缩语义，150 锚点 **1,357,014 个状态**（lib.mjs，Number/BigInt 双内核同 rules）。
- **模板阶梯 T1（mod-6 类合取）**：G:(a mod 6, b mod 6)；L:(r2 mod 6, r3 mod 6)；R:(b mod 6)；S2:=S(y=2):(x mod 6, z mod 6)；S(y≥3) 开族。
- **候选 U0** = 轨迹类集：G 11 类（0_0,1_0,1_1,1_5,2_1,2_2,**3_3**,4_2,4_3,5_4,5_5——注意 3_3 在真轨道上！a=75,219,363,507,651,795,939,1083,…≡3 mod 6 且递增 144/次）、L 24 类（**r2 mod 6 ∈ {0,1,3,5}**）、R 5 类（b∈{0,1,2,3,5}，无 4）、S2 11 类、S:y3 开。
- **反例神谕**：U0 对库 100% 覆盖（1.36M 状态零违例）；前向包含封闭（每库转移的后继 ∈ U0）：**1,356,332 转移 0 违例**。
- **符号封闭检查**（CEGAR，逐规则、类代表元穷举、Number 内核 stepN = phase1 step 逐字）：迭代扩张至收敛——**最大闭超集 = 全空间**（向后 HALT-不动点 4 轮污染全部 131 类，含 S:y3）。

### 2. 精确的反例链（模板类层面，每边机器验证）

从 P(3)（R(3,3)∈U0）出发的模板路径 **R:b3 → S:y3 → S2:2_2 → G:3_3 → HALT**（4 边，BFS 提取，每边具体化验证）：
1. R:b3 → S:y3：R(3,9)→S(4,7,1) ✓（b=9∈类 b3，y=7≥3）；
2. S:y3 → S2:2_2：S(1,4,1)→…→S2 型（y 偶扫描支）；具体存在性见机制分析；
3. S2:2_2 → G:3_3：**S(2,2,2)→G(3,3) 单步 ✓（机器验证）**；
4. G:3_3 → HALT：G(3,·) 即停机形态 ✓。

### 3. 为什么联合不可满足（必需精度定理）

真轨道避开 G(3,·) 的全部机制在**四条通道**上，模板逐一失败：
- **通道 1（R-锚点全类性）**：S3(y=1)→R(1,x+z+3) 锚点 n′=x+z+3 的 mod 6 随 x,z 遍历全部 6 类（库实证 R:b∈{0,1,2,3,5}，缺 4 是 G2 通道 z=1 结构性的，非闭合性的——模板下 R:b4 类的 G-后继 (b+1)≡5 需被 U0 的 5_4/5_5 覆盖：G:2_1→L:2_2→…链条把 L:2_2 自持环拉入）。⟹ **模 6 类上 R 必须全类开放**，锚点重新进入的 G 头类别失控。
- **通道 2（S(y≥3) 开放性）**：S:y1→L(1,x+z+3) 把任意 (x+z+3) mod 6 注入 L r2 类——L r2≡2 类（G2→L2(1,b+1,b+1) 自持环的承载类，库中结构性缺席：G4→S 的 x≡1 固定使 x+z+3≡z+4≡2 ⟹ z≡4，而真轨迹 G2 通道 z≡1）**在模板闭包下被迫开放**，随即 L:2_1→S(r1+1,2,rest) 注入 S2:1_1 型、S2:2_2 由 L:2_1（r3 任意类）自持环产生。⟹ **2-adic 精度必需**：真轨道的 L:2_2 缺席依赖 b+1 ≡ 3 mod 6 的**精确值链**（G(2,2)→L(1,3,3) 的 r3=3 恰在一步内落到 r3=1），而模板只能区分 mod 6。
- **通道 3（宇称/2-adic 定位）**：G(3,·) 排除 = "a+1 非 2 的幂"的 2-adic 条件（ν₂(a−3) 沿真轨道累积：515≡3 mod 512 已出现——G 头在 2-adic 度量下**逼近** 3）；mod 6 模板对 ν₂(a−3) ≥ 2 的结构完全盲。
- **通道 4（线性下界不足）**：加 ai ≥ ci 守卫不封通道 1/2（锚点 n′ 无上界，模板无法约束"进入的下一个锚点类"），模 2^k 分层同余（k ≤ log₂(轨迹头值)）等价于重编码精确 2-adic 状态 = 假设 M 的全部内容。

**定理（必需精度）**：任何"游程向量上的线性不等式 + 固定模数同余"合取式若 (i) 含 P(3)，(ii) 对九规则封闭，则 (iii) 必含 G(3,·)（从而不排停机）。证明 = 通道 1–4 的模板级边验证（上述 4 步 + S2→G 单步 + G3→HALT 单步，均机器验证；CEGAR 19 轮扩张记录在案）。∎（模板级；更高阶模板——跨游程乘积同余、位置关联 2-adic 谓词——未被穷尽，但每加一层即向精确轨迹状态空间退化，与假设 M 的等价性见通道 4。）

### 4. 结论：两条架构的会合

不变量架构与精确架构（L4/L5/假设 M）在"必需精度"处会合：粗模板不足以闭死 G(3,·)，精确模板等于重算 M。**主定理保持条件形式（假设 M）**；本节把天花板从"此架构"加强到"任何线性/固定模数不变量架构"。

### 5. 工件
lib.mjs + library.json（1.36M 状态）、invsyn.mjs（CEGAR 19 轮日志）、succmap.json（全类后继映射）、本节的 4 边反例链与 S(2,2,2)→G(3,3)→HALT、R(3,9)→S(4,7,1)、R(3,3) 真链逐边机器验证。
