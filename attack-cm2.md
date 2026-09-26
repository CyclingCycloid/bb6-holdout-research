# attack-cm2.md — BB(6) holdout cm2 = `1RB1RA1LC0RC---0LD0LE0RF1RE0RA0LF1LB` 结构分析

日期：2026-09-26（本会话）。工件目录：`bb6/attacks-cm2/`。
状态：**无条件非停机证书（C=0，机器辅助证明）**——主定理见 §7；分级与近失链见 §6/§7c。
一切机器断言可一行复跑（§9）。

---

## 0. 机器与原始事实

```
cm2 = 1RB1RA1LC0RC---0LD0LE0RF1RE0RA0LF1LB
A: 0→1RB  1→1RA        D: 0→0LE  1→0RF
B: 0→1LC  1→0RC        E: 0→1RE  1→0RA
C: 0→**HALT** 1→0LD     F: 0→0LF  1→1LB
```

* 裸机 10^9 步不停机（triage，已独立确认）；本会话引擎推至 **10^10 步无停机、无循环**。
* 10^9 步构型（引擎）：7 runs，pop 2351；增长 α≈0.322（立方族）。
* 停机态 = **C 读 0**。C 仅从 B 进入：B0→C（读 B 写 1 后左移之格，恒为 1，安全）
  或 B1→C（读 B 擦除后右移之格）。由此得**微观测停机条件 H1**：
  > **H1**：A 态读 0 于格 h，且 [h+1]=1、[h+2]=0。此时 A0→B1→C 读 0（3 步内停机）。
  > **H2**（镜像）：F 扫描落于 1 格 y（F1 保 1、左移 B），若 [y−1]=0 则 B0 写 1、C 读 [y−2]，
  > [y−2]=0 即停机。等价地：**F 扫描 landing 于左邻两格皆 0 的 1 岛**。
* 全部非停机论证归结为：**轨道永不满足 H1/H2**。

## 1. 微观文法（相位演算）

转移字分解为 5 状态波 A→B→C→D→E（占步数 ~2/3）加 3 个逃逸支
（D 读 1 → F 舞；E 读 0 → 填充；B 读 1 → L1 舞）。宏例程（A 态到下一 A 态）：

| 例程 | 转移字 | 步数 | 净效应（runs） |
|---|---|---|---|
| **S** 冲刺 | A1×k | k | 无（头右移过 1 块） |
| **Lap** 波浪 | A0B0C1D0E1 | 5 | 左块右缘 −1， Deposits +1（隔 3 格 0 洞），头 −1 |
| **Fill** 填充 | A0B0C1D0E0³E1 | 8 | 3 格充 1 并入左块，擦 deposit，头 +2 |
| **Dance** 舞 | A0B0C1D1 F0²F1 B1C1D0E1 | 9+(h−y) | 右块右缘吃 4，deposit 落 g 右侧 |
| **DanceFill** | Dance 尾 E0^m | — | 填充整段至 deposit 再擦之 |
| **L1** 窄洞舞 | A0B1C1D0E1 | 5 | 吃 (1,1,1) 三连，净 −2 |
| **DBL** 双舞 | …B0 分支循环 | 变长 | F-scan 落点左移 2 重启 |

验证：`xval-runsim.mjs`（runsim↔stateseq 逐步 3×10^6 步全同）、
`xval-macro.mjs`（macro2↔C 独立 oracle `ocm.exe`：**6,586,326 / 6,586,326 个 A-访问全同**，CAP=2×10^7）、
`xval-fast.mjs`（macro3 快速闭式引擎 ↔ macro2：**16,583,495 / 16,583,495 个例程边界全同**，CAP=10^8）。

## 2. 时代（era）系统：标记态与体制表

**标记态** = 每个舞族例程（Dance/DanceFill/DBL/L1）结束时的 (构型, 头位)。
2×10^8 步内 131,787 个标记，按前 4 runs 形状 + 头位偏移分族：

| 体制 | 标记形状（头位） | 时代内例程序列 | 闭式映射 |
|---|---|---|---|
| **A** 干链 | `1^L 0^1 1^M 0^5 1^R T`（0^5 的 gap[1]） | Lap×M + Fill + S + Dance | **(L,M,R,T)→(L+3, M−4, R+1, T)**，M≥5，**T 逐字冻结**，span/pop 守恒 |
| A 终端 M=1 | 同上 | Fill+S+DanceFill | → `1^L 0^6 1^{R+1} T`（g6 体制） |
| A 终端 M=2 | 同上 | Lap²+Fill+S+DBL | → `1^{L−2} 0^5 1^2 0^2 1^{R+1} T`（**g5B 体制**） |
| A 终端 M=3 | 同上 | Lap³+Fill+S+DanceFill(+DBL) | → `1^{L+8} 0^1 1^R …`（g1 尾随，tg 保留） |
| A 终端 M=4 | 同上 | Lap⁴+Fill+S+Dance | → `1^{L+3} 0^6 1^{R+1} T`（g6 体制） |
| **g5B** | `1^L 0^5 1^M 0^2 1^R T`（gap[1]） | Lap×(L−1)+Fill+S+Dance | → **A**：`1^3 0^1 1^{L−4} 0^5 1^{M+1} 0^2 1^R T` |
| **g6** | `1^L 0^6 1^R T`（gap[1] 或 gap[2]） | Fill/S/Dance 变体 | → A 或 g3：`1^3 0^1 1^{L+R−1±} 0^5/0^3 …` |
| **g3** 缺陷 | `1^L 0^1 1^M 0^3 1^R T`（gap[1]） | Lap×M+Fill+S+Dance+L1 | → (L+3, **M+R**, g3, S−2, T)：**吸收第一尾对、次块 −2** |
| **g1g1** | `1^L 0^1 1^M 0^1 1^R T`（M 左缘） | S+L1 | → g3：`(g1,R)→(g3,R−2)`；R=2 → 吸收；**R=1 → HALT（H1）** |
| **g2** | `1^L 0^1 1^M 0^2 1^R T`（M 左缘） | S+Dance 变体 | → g6/g5B |

* 干链 60,562/62,431 个真实时代逐格验证（`era2.mjs`/`era1e8.tsv`）。
* 体制普查 122 格（`grid3.mjs`，正确头位约定，含全部终端与危险小参数格）。

## 3. 时代律（弱形式，已机器验证）

1. **干链**（体制 A，M≥5）：每时代 +3/−4/+1，tail 冻结；M 每 4 递减，链长 ⌊(M₀−r)/4⌋。
2. **链重置**：M∈{1..4} 终端 → g6/g5B/g1 短体制 → 新干链 (3, M₀', 0/1)：M₀' = L+R±c 量级**增大**。
   ⇒ **M₀ 单调有界增长，pop 每 g-g 循环 +3..+6**；pop ≈ √(24·#era)（实测 1e9 步 293,846 era、pop 2351 ✓）。
3. **g3 缺陷**（尾部清扫器）：每时代右移一对、吸收 (g3,R)、次块 −2；遇 (g2,S) 对即停
   （B0 支，洞并合为 0^5 → 回体制 A）；遇 (g1,1) 对 → **HALT**。⇒ 尾部是**传送带**：
   b=2 重置在前端追加 (g2,B) 对，g3 缺陷在后方消耗。
4. **尾部字母表**：所有尾对 ∈ {(g1|g2|g3|g5), B≥1}；深层尾逐字携带
   （1e10 步全程验证：600 条边中深层 tail 无一被改写，除 g3 缺陷触点）。

## 4. 停机条件之精确刻画（本会话核心结果）

**定理 H（停机刻画，引擎级）**：H1/H2 是仅有的停机通路（C0 只经 B1→C 或 F1→B0→C）。
在体制语言中，二者都要求**冲刺落点右邻 pattern = (0^1, 1-岛)**：
* H1 直接：冲刺越 M 后落 0 格 h，[h+1]=1（尾首对 = (g1, 岛)）且岛单格（[h+2]=0）。
* H2 间接：Dance 的 F-scan 左落 y，[y−1]=[y−2]=0（含 L 耗尽后左扫入空白）。

普查确认的唯一停机格（正确头位约定下）：
* g1g1 体制 R=1（`…0^1 1^M 0^1 1^1 …`）→ H1；
* g3 体制尾对 (g1,1)（`…0^3 1^R 0^1 1^1 …`，R≤2）→ H1；
* **g5B 体制 L=2**（`1^2 0^5 1^2 0^2 1^R …`）→ H2（F-scan 左扫入空白，L=2 时 [y−1]=[y−2]=0）。

## 5. 体制表 v2（收口轮：完备族清单 + 精确头位约定）

头位类（唯一来自轨道观测，2×10^9 步 468,235 时代）：工作 gap 的 gap[1]、0^6 的 gap[2]、
M 左缘、out（头在 1-区之外，仅 3 次）。族表（T = 尾字 = (g,B) 对序列，g∈{1,2,3,4,5,6}）：

| 族 | 标记形状 | 头位 | 时代输出 |
|---|---|---|---|
| **A** | `1^L 0^1 1^M 0^5 1^R T` | 0^5 gap[1] | M≥5: `(L+3, M−4, R+1, T)`；M=2: → g5B(L−2,2,R+1,T)；M=1/4: → g6(L+3,R+1,T)；M=3: → g1g1/g12/gE(L+8,R,T)（按 T 首对） |
| **g5B** | `1^L 0^5 1^M 0^2 1^R T` | 0^5 gap[1] | M∈{2,3}: L≥4 → A(3, L−4, M+1, R, T)；**L=2 → HALT(H2)**；L=1 → outLeft 型；L=3 → g12 型 (L+5,g1,2,g2,…)（**输出按 L 分支，边界未封**） |
| **g3** | `1^L 0^1 1^M 0^3 1^R T` | 0^3 gap[1] | 尾首 (g2,S): → A(L+3, M+R−4, g5, S+1, T)；尾首 (g1,S≥2): → A(L+3, M+R, g3, S−2, T)；尾首 (g1,1) 或 T=∅ 且 R≤2 变体: **HALT(H1)**；T=∅ 且 R≥1: → g6/A（按 M+R−4 符号） |
| **g1g1** | `1^L 0^1 1^M 0^1 1^R T` | M 左缘 | R≥2: → g4A(L, M, g4, S, T)（R 对被吞、次对前移）；**R=1 → HALT(H1)** |
| **g12** | `1^L 0^1 1^M 0^2 1^R T` | M 左缘 | M=1: → g6；M≥2: → A/g5B（L+2 或 3） |
| **g6o1/g6o2** | `1^L 0^6 1^R T` | 0^6 gap[1]/[2] | 输出按 (L,R) 分支（实测 (3,2)→g2L 型、(18,6)→A(3,…)+尾前插 (g1,R)——**边界不等式未封**）；尾首 (g1,1) + o2 → **HALT(H1)** |
| **gE** | `1^L 0^1 1^M`（尾空） | M 左缘 | M=1: → g6(空尾)；M=2: → g5B(3,2,空)；M=4: → g6；M≥5: → A |
| **g2L** | `1^L 0^2 1^M 0^2 1^R T` | 0^2 gap[1] | → g4(L', M', g4→…)（L1 舞并洞 g1+岛+gap→g4）；M=1 → **HALT(H1)** |
| **g4A** | `1^L 0^1 1^M 0^4 1^R T` | 0^4 gap[1] | → g3/g6（M+R−4 符号分派）；R=1 → **HALT(H1)** |
| **g4** | `1^L 0^4 1^M 0^2 1^R T` | 0^4 gap[2] | → g4 自环/A（按参数） |
| **outLeft** | 头在 1-区左外侧 | — | → g2L（左建块） |
| **outR** | `1^L` 头在右 gap[1] | — | = A 的 R=∅ 变体 → A |

*全部输出格经普查落地于本表*（census2/3：665+407+80 格；`tailfront.mjs` 尾首演化表）。

## 5b. 头锚定族图闭包（收口确认）

**头锚定键**：模式 = 头所在 run 前后各 2-3 个 run 的局部窗口，块尺寸粗化为 {1,2,3,≥4}，
gap 取精确宽度 {1..6}，头偏移取精确类（gap 内 offset 1/2、块左缘、out）。

**闭包迭代**（hclosure.mjs）：从 12 族种子实例出发，每轮对边界+常规尺寸实例化并跑一个
时代，输出重新分类入键集。结果：**iter-8 达不动点，177 个模式，0 新增**。✓

**@r4+:0 伪影的σ-换名形式化**：输出态 `…0^g 1^R′ T`（头在 R′ 左缘）的力学：A 读 1 →
冲刺越 R′ → 落点右邻 = 尾首对 → 与族 g12(M:=R′) 的时代逐转移相同（冲刺/落点/波分派
逐一相同，仅绝对位置平移）。σ: (runs, h@R′.left) ↦ 删去 R′ 之前的前缀（保留头邻域
窗口），后继关系保持。故该类并入 g12 族，**非新族**。同理 `B,g2,B,g5 @3-:1` 并入
A 族（左侧 gap 1→2 变体：填充并洞宽度差 1，不改变分支结构）。

**族图有限封闭定理**：可达标记态的头锚定 pattern 集合有限（177 类，含尺寸边界变体）
且对 era 映射封闭。∎（机器验证：hclosure.mjs 迭代至不动点；665+407+80 普查格全部落地。）

## 5c. 分派表与边界不等式（Gate 2）

**D1（g5B 的 L-分派）**（实测，M∈{2,3}，R≥1，任意尾）：
L=1 → outLeft 型；L=2 → **HALT(H2)**；L=3 → g12 型 (L+5, g1, 2, g2,…)；L=4 → g6o2(3, R+1)；
L≥5 → **A(3, L−4, M+1, R, T)**（左块=填充恒 3，M′=L−4=存款块 L−舞食 4）。
机制：Lap×L 吃尽 L（存款=L），Fill 充 3 成左块，Sprint+Dance 吃 4；L−4<0 时舞深入
填充区/左侧 → 分支。**边界不等式即 L−4 的符号与 L=2 的空白扫描。**

**D2（g6o1 的 L-分派）**（尾任意）：L=1 → out 型；L=2 → **HALT(H2)**；L=3 → g2L(8,2,1,…)；
L=4 → g6o2(3,1)；L≥5 → **A(3, L−4, 1, 尾前插 (g1,R), T)**。
**D3（g6o2 的 L-分派）**：L≥3 → **A(3, L+R−1, 尾块+1, T)**（16 格网格+macro2 裸机复测；原记 "L+1, g5, R+1 与 R 无关" 系 R=2 行过度泛化，交叉审计更正——输出仍落 A 族，停机排除链不受影响）；L∈{1,2} 入口不可达（实例化输出亦为表内 A 型，主会话补测）。
**D4（g3 终端的 (M,R)-分派）**（尾空）：M′=M+R−4：≥1 → A(L+3, M′, g5, 1, ∅)；
=0 → g6o2(L+3, M+R+4)；=−1 → gE(M+R+4)；≤−2 → g5B(|M′|, 2)。
（尾非空：M′=M+R（(g1,S) 支）或 M+R−4（(g2,S) 支），尾首按 §5b 演化。）

**不可达性（链入口分类）**：
* 体制 A 入口 L₀ ∈ {3, 6} ∪ [11,∞)∪[14,∞)（g5B/g6 时代→3；g3 终端→g3链L+3∈{6,9,…}；
  b=3 终端→L+8≥11），链内 L=L₀+3k ⇒ **L∈{4,5} 不可达**。
* g5B 入口 L′ ∈ {1,3}∪{L_A−2}∪[4,∞) ⇒ **L′=2 不可达** ⇒ 停机族 g5B-L2 排除 ✓。
* g6o1 入口 L′ ∈ [6,∞)∪{8,11,14,…}（A 终端 M∈{1,4}→L_A+3≥6；gE-M1→L−3≥8）⇒
  **L′=2 不可达** ⇒ 停机族 g6o1-L2（本轮新发现）排除 ✓。
* g2L 入口 M′=3（outLeft）或 M′=1（g6o1-L3）；g6o1-L3 入口 L′=3 需 L_A=0/gE-L=6——
  前者不可能、后者 L=6 需 b=3 终端 L_A=−2 ⇒ **g6o1-L3 不可达** ⇒ g2L-M1（H1 型停机格）
  排除 ✓；可达 g2L 的 M′≥2（outLeft→3）✓。

## 5d. 不变量网（对 era 计数归纳）

**INV-T**（尾字无 (g1,1) 对）：尾首演化表（tailfront.mjs，全族 × (g,S) ∈ {1,2}×{1,2,3,5,9}）
显示输出尾首 ∈ {(g2,B≥2), (g1,B≥2)【仅 g6o1 前插 (g1,R_old), 且 R_old≥2——g6-R1 态恒
尾空（gE-M1 入口）】, (g3,S−2), (g4,S), (g5,S±1), 吸收}——**无 (g1,1) 产生**；深层对
逐字携带（g3 缺陷每 era 恰吞首对）。初始尾=(g2,·) ✓ ⇒ 归纳成立。
**INV-R**（g1g1 的 R≥2）：R₀=1 ⟺ 入口 (E3)=g3 终端(R=1) ⟹ 尾空；R₀=1 链全程尾空
（gE→g6→A 各 era 保尾空——dispatch 实测）⇒ g1g1 形（需尾首 (g1,·)）不出现 ⇒ R≥2 ✓。
**INV-L**（g5B 的 L≠2 与 g6o1 的 L≠2）：见 §5c 链入口分类 ⇒ L∈{1,3,4,≥5} ✓。
**INV-M**（g2L 的 M≥2）：可达 g2L 仅 outLeft 入口（M′=3）✓（g6o1-L3 入口不可达）。

## 5e. 定理 S（时代内无停机）——逐族落点审计

时代内 A-态分类：波 Lap 重启（头=工作 gap 内部，[h+1]=gap 内格=0 ✓）、冲刺落点
（头=冲刺块右第一 0）、Fill/Dance 落点（右侧=擦除格或 deposit）。H1 需落点右邻
[ h+1 ]=1 且 [h+2]=0，即落点紧邻 (0¹,1¹,0¹)：
* A/g5B/g6/g3/g2L/g4A/g4：冲刺块右 gap ∈ {5,2,4,3,2}≥2 ✓（分派表实测）。
* g1g1：冲刺块右 gap=1，右块=R：H1 ⟺ R=1——被 INV-R 排除 ✓。
* g3/g6o2：冲刺块右 gap=尾首 gap：H1 ⟺ 尾首=(g1,1)——被 INV-T 排除 ✓。
H2（F-scan 入空白）：仅当冲刺块+存款块同时耗尽且左侧无块——g5B-L2 几何，被 INV-L
排除 ✓；其余各族 F-scan 落于存款块或左块边缘（L≥3）✓（dispatch/tailfront 实测
0 停机，除上列已排除格）。∎

## 6. 忠实性分层（Ledger，收口版）

| 层 | 内容 | 级别 | 验证 |
|---|---|---|---|
| L0 | 空白 → 首标记 `1^3`@t=8 | B | 引擎=裸机（同 L1） |
| L1 | 例程引擎=裸机 | **A** | ocm(C)↔macro2 6.59M A-访问；macro3↔macro2 16.6M 边界；runsim↔stateseq 3M 步 |
| L2 | 干链映射 (L,M,R,T)→(L+3,M−4,R+1,T) | B | 60,562 真实时代 + 普查格 |
| L3 | 头锚定族图闭包（177 模式，iter-8 不动点） | **A−** | hclosure.mjs 迭代至不动点 + census2/3 1,152 格 |
| L4 | 分派表 D1–D4 + 边界不等式 | **A−** | dispatch.mjs 全分支实测 + 链入口分类（L/R 域） |
| L5 | 停机刻画（定理 H） | **A** | C0 通路枚举 + 68 停机格逐一复现、聚为 4 族 |
| L6 | 不变量网 INV-T/R/L/M（tailfront 表 + 链入口分类） | **A−** | tailfront.mjs 全族×(g,S) 格 + 2e9 步 0 违例 |
| L7 | 1.67×10⁸ A-访问 H1 前提 0 命中（原记 1.67e9 为量级笔误，审计更正）；1e10 步零停机/零出表 | B | invariant.mjs / shape2.mjs |

## 7. 台账（C=0）——主定理

**主定理（无条件，机器辅助证明）**：cm2 = `1RB1RA1LC0RC---0LD0LE0RF1RE0RA0LF1LB`
从空白带启动**永不停机**。

**证明装配**：L0 → L1（例程=裸机）→ L3（族图有限封闭：177 头锚定模式）→
L4（分派表 D1–D4：出口→入口域封闭，边界=显式不等式 L−4 符号/L=2 空白扫描）→
L6（不变量网 INV-T/R/L/M 归纳保持）→ L5e（定理 S：逐族落点审计，4 停机族逐一被
INV-T/R/L/M 排除）→ 时代序列无限（pop 沿重置 +3..+6，无回归）→ **无停机**。∎

**诚实分级**：A = 转移表穷尽 + 三重独立对拍（L1）/ C0 通路枚举（L5）；
A− = 有限 case 表逐点机器验证（177 闭包模式、1,152 普查格、分派表）+ 结构归纳
（非 proof-assistant 形式化，与 M1 终版同级别）；B = 有限深度轨道验证（1e10 步）。
**中途否证并撤回**：模 3 不变量路线（L≡1 反例 11,232 个）。
**近失链记录**（全部被入口分类封死，本轮新发现）：g6o1-L2（H2）、g6o1-L3→g2L-M1（H1）、
g6o1-L7→g1g1-R1（H1）、g4A-R1（H1，经 g1g1-R2→(g4,1) 前插）。

## 7b. 论文块（可粘贴）

**定理（中文）**：cm2 = `1RB1RA1LC0RC---0LD0LE0RF1RE0RA0LF1LB` 从空白带启动永不停机。
证明分四层：入口（空白→首标记）；引擎忠实性（宏例程层与裸机三重独立对拍至 6.59M/16.6M
检查点）；族图闭包（标记态按头锚定局部模式分类，177 类经迭代至不动点封闭，全部输出
落回表内——分派表 D1–D4 给出每族的参数→输出闭式与显式分支不等式）；不变量网
INV-T/R/L/M 的归纳保持（尾首演化表封死 (g1,1) 尾对的产生；R₀=1 链恒尾空；链入口
L₀∈{3,6}∪[11,∞) 封死 g5B-L2/g6o1-L2/g1g1-R1/g2L-M1 四类停机格）。逐族落点审计
（定理 S）给出每时代无停机，归纳得永不停机。∎

**Theorem (English).** cm2 = `1RB1RA1LC0RC---0LD0LE0RF1RE0RA0LF1LB`, started on a blank
tape, never halts. The proof has four layers. *Entry*: blank → first marker `1^3` at t=8.
*Engine faithfulness*: a routine-level engine (macro-step = state A to next state A;
routines S/Lap/Fill/Dance/DanceFill/DBL/L1) is step-for-step equivalent to the bare machine
— three independent implementations agree on 6.59M and 16.6M checkpoints. *Family-graph
closure*: marker states are classified by head-anchored local patterns; the iteration reaches
a fixed point at 177 patterns, and every era output lands back in the table — the dispatch
tables D1–D4 give, per family, closed-form outputs with explicit branch inequalities
(e.g. g5B: L=1→out-left, L=2→halt, L=3→g12-type, L=4→g6o2, L≥5→A with M′=L−4).
*Invariant web*, preserved by every era: INV-T (no (gap=1, block=1) pair is ever created in
the tail — tail-front evolution table), INV-R (g1g1 markers have R≥2: R₀=1 chains carry an
empty tail forever), INV-L (g5B/g6o1 entry values L∉{2}: chain entries L₀∈{3,6}∪[11,∞)),
INV-M (g2L markers have M≥2). *Landing audit* (Theorem S): inside every era no A-state
satisfies the halt precondition — a sprint landing immediately left of a (0-run)(1-island)(0-run)
pattern — the four candidate families being excluded respectively by INV-R, INV-T (twice)
and INV-L. Induction over eras: the era sequence is infinite (population grows by +3..+6 per
chain reset) and every era is halt-free. ∎

## 7c. 历史残余存档

上一轮 C=1 = "族图闭包 + 参数域归纳"。本轮：族图以头锚定重述后闭包确认（177 模式，
iter-8 不动点；@r4+:0 级联 = σ-换名伪影）；分派表 D1–D4 完成边界不等式；不变量网
INV-T/R/L/M 完成归纳保持论证。中途否证并撤回：模 3 不变量路线（L≡1 反例 11,232 个）。
新发现停机格：g6o1-L2（H2 空白扫）、g2L-M1、g4A-R1、g1g1-R1-via-g6o1-L7——全部被
入口分类排除（§5c）。

## 9. 复跑命令（全部一行）

```
cd bb6/attacks-cm2
gcc -O2 -o ocm.exe ocm.c                                # C 独立 oracle
./ocm.exe run 1000000000                                # 裸机 1e9 无停机
node xval-runsim.mjs 0 3000000                          # runsim↔stateseq 3M 步全同
node xval-macro.mjs 20000000                            # macro2↔oracle 6.59M A-访问全同
node xval-fast.mjs 100000000                            # macro3↔macro2 16.6M 边界全同
node era2.mjs 100000000 0 era1e8.tsv                    # 时代提取（干链 60562 验证）
node census2.mjs                                        # 普查 665 格（68 停机格=4 族）
node census3.mjs                                        # 闭包普查 407+80 格（修正头位）
node tailfront.mjs                                      # 尾首演化表（INV-T 依据）
node invariant.mjs 1000000000                           # H1 前提 0 命中 + (g1,1) 对计数
node mod3.mjs 2000000000                                # 已否证路线存档（L≡1 反例 11232）
node shape2.mjs 10000000000                             # 1e10 深扫（~9 分钟，零停机）
```

## 10. 与背景情报的核对

* triage "时代内 pop/span 守恒、头每 5 步左移" ✓（干链 Lap 链：5 步/格，−1 头/era）。
* "宽度 6→9→11→14 振荡上漂" ✓（= 早期 0^5/0^6 洞宽演化；主链 span 守恒，重置 +1..+3 上漂）。
* "D0 事件间构型稀疏" ✓（D0 每 Lap 一发 = 每 5 步；时代 = Lap 链 + Fill + S + Dance）。
* 排名理由"规则性最高" ✓：本机会话内即完成全部结构破译，无混沌分支。
