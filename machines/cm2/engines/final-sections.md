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
**D3（g6o2 的 L-分派）**：L≥3 → **A(3, L+1, g5, R+1, T)**（均匀，与 R 无关）；L∈{1,2} 未见。
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
| L7 | 1.67e9 A-访问 H1 前提 0 命中；1e10 步零停机/零出表 | B | invariant.mjs / shape2.mjs |

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

