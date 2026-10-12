# soc-map.md — BB(6) Shift-overflow counter 家族（279 台未决）侦察制图

日期：2026-09-26。性质：**侦察，不攻坚**。一切分类除特别注明外均为**启发式**（基于模拟特征，
非机器验证）。
工具：`sim/triage.c` → `triage_new.exe`（batch/DETAIL/EVENT 三模式；FNV64 平移循环检测、
log-log 增长拟合、转移用量、D0 事件计数）。台账：`led_now.csv`（mxdys）。

## 0. 执行摘要

- 279 台在 CAP=10^7 与 3×10^8 两轮全扫中：**0 停机、0 UNDEF、0 平移循环、0 爆带**。
  全家族极慢且极紧凑：3×10^8 步时 span 中位 182、最大 751；pop 中位 85、最大 374。
- **无 M1 型混沌迹象**（无超线性 span 增长，最大 α_span=0.36 < 0.9；无 2^27 格爆带）。
  也无 cm2 型"冻结左锚 + 仿射右缘"的教科书加法结构——而是**四种计数器原型**（§3）。
- 171/279（61%）有**干净整数驱动节奏** k=D0 事件间隔（k=6..50，众数 12/22/28/11），
  且 1e7→3e8 对 244/248 台稳定——家族共享固定长度驱动循环，例程结构清晰。
- 与 mxdys 已证 148 台 SOC 机对比：3×10^8 行为特征**完全同包络**，无法用行为区分已证/未决。
  但找到 **16 对单转移（Hamming-1）突变体**连接未决与已证机（§4）——这是共享结构的最强证据，
  也是攻坚的现成抓手。
- Top-5 攻坚推荐见 §5：全部是 Hamming-1 突变体或其近邻，攻击路线 = 把 mxdys 现成引理
  （LongAccHalt/LongAcc/LongLoop）重实例化到单转移变体。

## 1. 数据层

| 轮 | CAP | 对象 | 结果 |
|---|---|---|---|
| 粗扫 | 10^7 | 279 SOC | 279 DONE（无 HALT/CYCLE/TAPEHUGE） |
| 精扫 | 3×10^8 | 279 SOC | 279 DONE；span≤751，pop≤374 |
| 对照 | 3×10^8 | 119 已证 SOC（HALT+NONHALT） | 119 DONE；span≤1260，pop≤786 |
| 顺带 | 3×10^8 | 40 bouncer + 19 structural | 59 DONE（见 §6） |

特征定义（逐机，`soc-work/soc_classified.tsv`）：
- **增长阶** α_span/α_pop：末 10 检查点 log-log 拟合。
- **驱动节奏 k**：3e8/d0events 取整，相对误差 <0.5% 记"干净整数"；d0=state D 读 0 事件数
  （仅统计 D 态，对 D0-惰性机无信息量）。
- **刚性格子分**：末检查点 RLE 前缀 run-长序列的周期性（p=1..4），≥0.9 记"刚性"。

## 2. 家族总图（279 台，双轴交叉）

| 增长 \ 节奏 | clean-k | 不规则 | D0-惰性 | 合计（最大 pop） |
|---|---|---|---|---|
| FAST（α_pop≥0.15） | 18 | 7 | 6 | **31**（367） |
| MODERATE（0.03–0.15） | 70 | 48 | 11 | **129**（311） |
| FROZEN（<0.03） | 83 | 22 | 14 | **119**（374） |

- 刚性格子：18 台刚性（≥0.9）、213 半刚性（0.6–0.9）、48 不规则。
- 带面普遍为**单 1 锚点链**（runs/pop 中位 ≈1.0，即 1 岛基本全长 1；pop/span 中位 0.48，
  即沟槽以单 0 为主、偶有宽沟）。家族名"Shift-overflow"与带面一致：锚点链 + 稀疏 shift 事件。
- 六类标签（启发式，逐机见 soc_classified.tsv）：SLOW-FROZEN 86 / IRREG-RHYTHM 77 /
  SLOW-REGIME 70 / QUASI-FROZEN 22 / **ADDITIVE-REGIME 17** / FAST-UNCLEAR 7。

## 3. 锚点结构初查（10 台代表，DETAIL 3e8 + EVENT 全 12 对扫描）

四种**结构原型**（时代 = 稀疏决策对的相邻事件间隔；Δ = 每时代增量）：

1. **格子计数器（最像 cm2 的"加法型"）**——`1RB---1RC0LC0RD0LE1LE1RF0LB0RC0RE1RA`、
   `1RB0LD0LC0RE1LA0RD0RB1LF1RC0RF0RA---`、`1RB1LE0RC0RB1RD1RF1LA0LE0LD0LB---0RD`。
   带面为冻结模式 `1^1 0^3 1^1 0^3 …` 的刚性格子，形状在 5×10^2→1.2×10^8 步间逐字不变，
   只有链长参数增长。**递推型：加法**（每时代链长 +常数；代价 ∝ 链长 → pop~t^0.4）。
   风险最低，但增量细小。
2. **二进制移位计数器（ν₂ 旗标，乘法节奏）**——FAST-GROW 前两名
   `1RB0RE1LC1RD1LA0LC1RA0RB0RF1LC0RB---`（α_pop=0.40）与
   `1RB1LD1RC0RB1LA0LE1LC0LA1LF1RB1LB---`（0.27）。多速率驱动（A0 间隔 3/5/10 与
   11/14/17/19/20 步），**shift 间隔精确倍增**：后者连续四次 2.9→5.8→11.5→23.1（×10^6 步）；
   前者 2.31e7→4.61e7。宽度 ~log t（+2~3/shift）。**递推型：乘法（2-adic 计数）**——
   攻坚需 ν₂ 型归纳（参考 attack-sparse2.md M1 的 m=ν₂(n+3) 机器闭合）。
3. **指数迭代器（时代长度几何加速）**——`1RB0LC0RC---1RD0RE1RE1RA1LF1RC1LD0LF`：
   3×10^8 内 A0 仅 5 次，时代长 702→4.6e4→**1.166×10^8** 步，每时代链长 +2 ——
   轨道长度对链长指数级，典型的"计数器遍历 2^n"。
   `1RB0RC1LC1LF1LD0LB1RE1LC1RA0RE0LC---`：时代 ×5–8 加速（0.001→0.005→0.034→0.215→
   1.734→5.256→104.3 ×10^6），Δpop 2→16 递增。
   `1RB---1RC0RF1LD1RB1LE0LD1RB0LB1RB1RA`、`1RB0RF1LC1LF1RD1LC---1RE0RC1RF1RA0LB` 同型。
   **递推型：乘法（倍增/×5 基）**——非停机证明需覆盖指数长轨道，结构最硬。
4. **准冻结洗牌器**——D0-惰性 31 台 + FROZEN 119 台。代表
   `1RB1LC1LA0RE1LD0LC1LE0LB0LF1RA0RA---`（pop 374）：宽度冻结在 589（最后 30× 时间 +5），
   pop 振荡 364–379（吸积-冲刷循环），D0 每 ~1.8×10^6 步一次 = **overflow 标记**。
   若宽度确有界，则终归周期性/停机二选一，但构型空间 ~2^589，直接找周期不可行——
   正是 mxdys LongLoop（长周期循环）引理的领地。

## 4. 已证 vs 未决：差在哪

**（a）行为包络相同。** 119 台已证 SOC（18 HALT + 101 NONHALT）在 3×10^8 的特征中位数
（pop 82–142、span 186–337、α_pop 0.01–0.09、干净 k 节奏）与未决 279 台重合；
单点最近邻距离普遍 <1σ。**结论：未决 279 台不是行为异类，而是引理覆盖未达的"同款"。**

**（b）mxdys 引理库（已证 148 台的证书分布）**：LongAccHaltv1（HALT×18）、
LongLoopv2/v3（NONHALT×24）、LongAccv1（×15）、SOCSSv2–5（×22）、SOMDCv3–6（×14）、
Individual（×10）、EQUIVALENCE 合并（×29）、FAR×1。全部 2026 年 1–4 月产出。

**（c）16 对 Hamming-1 突变体（未决 ↔ 已证，15 台唯一未决机）**：
唯一转移之差即分隔"已证"与"未决"。按孪生引理分布：LongAccv1×4、LongLoop×6、
SOCSSv5×1、**LongAccHalt×5**。完整表（节选，全表在 soc-work/ 会话日志）：

| 未决机 | 孪生（已证） | 孪生证书 |
|---|---|---|
| `1RB1LD_1RC0RB_1LA0LE_1LC0LA_1LF1RB_0LA---` | `…1LF1RB_0LD---` 与 `…1LF1RB_0RA---`（双孪生） | HALT×2（LongAccHaltv1） |
| `1RB0RE_1LC1RD_1LA0LC_1RA0RB_1RF1LC_0RC---` | `…_0RD---` | NONHALT（LongAccv1） |
| `1RB0RE_1LC1RD_1LA0LC_1RA0RB_1RF1LC_1RC---` | `…_0RF1LC_1RC---`（E0 位差） | HALT（LongAccHaltv1） |
| `1RB0RA_1LC0RC_1LE0LD_1LC1LF_1RA1LC_0LC---` | `…_1LC0LF_…` | NONHALT（LongLoopv2） |
| `1RB1LC_0RC0RB_1LD0LA_1LE---_1LF1RA_1LA1LA` | `…_1LA1LC` | NONHALT（SOCSSv5） |

（余 10 对见 soc-work/ 产物。）注意同一位点的不同突变已经两端开花
（如 `1RF1LC` 簇：0RD→NONHALT、1RC→HALT、0RC/0RB/1RC 未决）——
该家族的引理边界就压在这些单转移上。

## 5. 攻坚推荐 Top 5

判据：加法性/结构置信度 × 与已证机共享结构（Hamming 距离）× 现成引理可移植性。

1. **`1RB1LD_1RC0RB_1LA0LE_1LC0LA_1LF1RB_0LA---`**（ADDITIVE-REGIME，k=22，α_pop=0.195，
   刚性 0.69）。**两个** Hamming-1 孪生均被 LongAccHaltv1 证 HALT。路线：把
   LongAccHaltv1.v 的累加器递推重实例化到 0LA 变体——要么证溢出（HALT），要么证发散。
2. **`1RB0RE_1LC1RD_1LA0LC_1RA0RB_1RF1LC_0RC---` + 同簇 0RB/1RC/1RC-变体**（3–4 台，
   k=22，**刚性 0.94 全族最高**）。孪生分别 NONHALT（LongAccv1）与 HALT（LongAccHalt）。
   结构最干净、引理对照最齐全，一次攻克可按引理模板批量收割同簇。
3. **`1RB0RA_1LC0RC_1LE0LD_1LC1LF_1RA1LC_0LC---`**（FAST-UNCLEAR，α_pop=0.154 全族最快之一）。
   Hamming-1 孪生 NONHALT（LongLoopv2）。增长可见 → 时代结构可直接测量，
   LongLoop 长周期引理的首选试验台。
4. **`1RB1LD_1RC0RE_1LA1RC_0LC0LA_0RF0RC_---0RB`**（SLOW-REGIME，k=16）。Hamming-1 孪生
   NONHALT（LongAccv1，D2 位 0RD→0RC 单差）。LongAcc 引理直移植。
5. **`1RB0LB_0RC0LD_1LD1RE_0LA0RB_0RD0RF_1RD---` 与 `…_1RA---`**（IRREG-RHYTHM，双驱动）。
   孪生 `…_1RB---` 已证 NONHALT（LongLoopv2）；两台共享同一主干，适合与 3 号合并做一个
   LongLoop 簇证明。

**拉伸目标（不进 top5 但结构中枢）**：`1RB0RE1LC1RD1LA0LC1RA0RB0RF1LC0RB---`（α_pop=0.40
全族最快，additive-conf 满分，Hamming-2 于 HALT 孪生）——已测得二进制移位节奏（§3.2），
需 ν₂ 型归纳，作为 LongAcc 引理族向乘法侧扩展的试金石。

## 6. 变体家族顺带统计（3×10^8，全部 DONE）

- **Shift-overflow bouncer counter（40 未决）**：span 最大 34,679、pop 最大 28,443；
  39/40 快增长（α_pop≥0.15），33/40 clean-k。**行为上是另一类**：活跃弹跳扩展带面，
  与 SOC 主族的紧凑慢速完全不同。
- **Shift-overflow structural counter（19 未决）**：span 最大 42,764、pop 最大 25,561；
  19/19 快增长，14/19 clean-k。同为快增长型。
- 两者若攻坚，适合单独立项（bouncer/structural 谱系），不应与 SOC 主族混同。

## 7. 诚实条款与局限

- 除"3×10^8 步内无停机/无平移循环/无爆带"这一负面事实外，**一切子类标签均为启发式**；
  CYCLER=0 只覆盖 64 点几何检查点网格的 FNV64 检测（周期不对齐网格的长循环会漏检）。
- 驱动节奏 k 由 D0 事件率反推，仅对 D 态读 0 频繁的机器有意义（31 台 D0-惰性机除外）。
- 倍增/几何加速结论来自 8 台代表机的 EVENT 实测（其中 FG#3 倍增链 4 连、FG#1 仅 2 连），
  未对全部 279 台逐机验证；外推到全族标为猜想。
- 已证孪生的"单转移差"是码面事实（可复跑），但"引理可移植"是假设，未做 Rocq 端验证。
- 未决机在 3×10^8 无停机不排除其在更大步数停机（对照：已证 LongAccHalt 机在 3×10^8 也不停，
  其中台账记至 ~10^18 量级停机步数）。
- 增长指数 α 在跨度 30×（1e7→3e8）上估计，误差不可忽略；只用于分档不用于精确定律。

## 8. 产物清单（均 <10MB）

- `soc-codes.txt`（279 台码表）、`sob-codes.txt`（40）、`sos-codes.txt`（19）
- `soc-work/soc_1e7.tsv`、`soc_3e8.tsv`（279 台批量特征）、`prov_3e8.tsv`（119 台已证对照）
- `soc-work/sob_3e8.tsv`、`sos_3e8.tsv`（变体家族）
- `soc-work/soc_classified.tsv`（逐机：k、刚性、pop、span、α_pop、1NN 已证机+距离、类别标签）
- `soc-work/feats.json`、`clusters.json`、`detail/*.txt`（12 台 DETAIL CP 序列）、
  `ev/*.txt`（120 组 EVENT 扫描）、`evfull_fg1/3_A0_sampled.txt`（2 台 A0 事件降采样；
  全量捕获分析后已删以守 10MB 纪律，可用 EVENT 命令复跑）
- 复跑：`gcc -O2 -o triage_new.exe sim/triage.c -lm`；`triage_new.exe SOC soc-work/chunk_XX 3e8`；
  DETAIL/EVENT 用法见 sim/triage.c 头注释
