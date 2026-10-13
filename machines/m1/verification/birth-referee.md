# M1 出生序列攻坚（attack-sparse2 §v6）对抗性审查报告

**审查对象**：`bb6/attack-sparse2.md` §v6（根/子分类定理、E1-重入无条件安全、L-出口 20 类表、M′ 显形）；脚本 `bb6/attacks-sparse2/births1-11.mjs` 及其工件（births-roots.json、births5-1e6.log、births7-log.txt、births11-classes.json）。
**审查方式**：只读。全部结论由本审查新写的独立脚本复跑支撑：`ref-b1-partition.mjs`（裸机 TM 独立模拟器 + 非坍缩逐事件审计）、`ref-b2-counts.mjs`（独立计数器，10⁶ 锚点全量）、`ref-b3-apcheck.mjs`（AP 幂包含性的严密暴力判定器 + births11 判定器交叉验证 + 反例演示）、`ref-b4-classes.mjs`（从 births-roots.json 全量重建类表/成对律/族形式）、`ref-b5-events.mjs` / `ref-b5b-uncollapsed.mjs`（v5 数字复现）、`ref-b6-mrecords.mjs`（m-记录 10⁷ 锚点全复跑）。日志：`ref-b1-2e7.log`、`ref-b2-1e6.log`、`ref-b3.log`。

---

## 总裁决

**三条结果全部存活，无一致命；但 §3 的认证论证（"保守超集"）方向倒置、认证工件计数错位（14≠20）、可判定检查器带两处潜伏假阴性缺陷。修正后的净结果比原文更清晰：20 类中 18 类经剩余类论证**无条件**安全（按类键定义），1 类（Lk|j3，A≡8 mod 144）归结为单点命题"A≠8"，1 类（L3|j4，A≡16 mod 144）归结为其仿射族形式——M′ 的全部剩余算术内容恰好浓缩在这一个族上。数字复现：30,791,021、2,908/0、m=1..25 全访，全部逐位复现。

---

## 一、致命问题（无）

未发现。核心定理（根归约、E1-重入安全）经独立引擎与裸机交叉验证后成立；类表与计数数字全部复现。

---

## 二、重要问题（4 项）

### 重要-1：births11 的"保守超集"论证方向倒置（§3 认证方法的核心句）

`births11.mjs` 头注声称："D_fit = 观测差 gcd，为真周期的倍数，故拟合 AP 是类的**超集**；超集无幂 ⟹ 类无幂"。**此蕴含方向错误**：若类真周期 D_true 满足 D_true | D_fit，则 {A₀ + D_fit·k : k ≥ 0} ⊆ {A₀ + D_true·k : k ≥ 0}——拟合 AP 是类完成的**子集**，不是超集。子集无幂推不出超集无幂。
**反例**（ref-b3 [3]，可复跑）：真类 {80+48k} 含 2⁷=128（k=1）；若仅观测到成员 80, 176, 272（k=0,2,4），则 D_fit = gcd(96,96) = 96 是真周期 48 的倍数，拟合 AP {80+96k} 完全无幂，而真类含幂。
**实际影响有限**（这就是为什么不是致命）：对 20 类中的 18 类，安全根本不需要 AP——类键含 A mod 144，凡剩余类 r ∉ {2^t mod 144} = {1,2,4,8,16,32,64,128,112,80} 者，**按键定义**任何（含未来）成员都无幂。真正依赖 AP 外推的只有碰撞类 L3|j4（见重要-2、次要-1）。**修正表述**：AP 认证是"条件于类被拟合同余类包含"的外推，不是保守超集；无条件的部分是 (a) 观测范围内 0 幂（直接扫描），(b) 18 类剩余类安全，(c) 其余两类的单点/族形式化归。

### 重要-2："20/20 类安全（ALL SAFE: true，births11-classes.json）"与工件不符：工件只含 14 类

births11 的成员来源是 births5-1e6.log（10⁶ 锚点）+ births7-log 的 EX 行（仅奇异类）。三个晚现类 Lk|j1|A26、L3|j2|A28、Lk|j0|A29 首现于锚点 1,021,640 / 2,043,278 / 4,086,554，均不在任何输入里，故 births11-classes.json 只有 14 个（三段粗键）类。doc §3 的"逐类保守超集 + 可判定检查 20/20 安全"把 14 类的 ALL SAFE 误标为 20/20。
**本审查已补证**（ref-b3 [2]/[5]）：三个缺失类的剩余类 26/28/29 ∉ 2^t mod 144，其 mod-144 剩余类超集经严密暴力判定无幂——结论"全部已观测类安全"成立，但引用的工件与论断数字不一致，论文并入时必须改为"20 类 = 17 个粗键 = births11 认证的 14 + 剩余类补证的 3（另 Lk|j3、L3|j4 需附加论证，见次要-1）"。

### 重要-3：births11 的可判定检查器 powInAP 有两处潜伏**假阴性**（不安全方向）缺陷 + 一处假阳性

与严密暴力判定器（按 2^t mod D 的预周期 s + 周期 ord_u(2) 全枚举）在 30,000 组随机合成 (A₀,D) 上交叉（ref-b3 [1]）：**假阴性 1,722 例**（判定器说安全、实际含幂），假阳性 249 例。缺陷定位：
1. **s=0（D 奇）整段跳过**：离散对数分支被 `if (s > 0n)` 门控，D 奇时直接返回 safe——而 D 奇时恰恰全部幂都要走 dlog 路径；
2. **dlog 循环过早断出**：`if (p === 1n && (1n<<t) > A0*4n) break` 在**首个**整周期回到 1 且 2^t > 4A₀ 时断出，但首个满足同余的 t 可能 2^t < A₀、真解在下一周期（如 A₀=134212, D=236：首个同余解 t=16（2¹⁶<A₀），真解 t=74，循环在 t=60 断出，漏判）；
3. t<s 路径未检验 k ≥ 0（即 2^j ≥ A₀），产生保守向假阳性（无害方向，但逻辑不完备）。
**对已认证的 14 类无影响**（全部 j = ν₂(A₀) < s = ν₂(D)，dlog 与 s=0 分支均未触发；本审查以独立判定器复核 14 类全部安全，一致）。**但该工具不可原样复用于 m>25 的新类**（新类若出现 j ≥ s 或奇模数结构即触发假阴性）。修复 = 换用本审查的枚举式判定器（ref-b3 powInAPbf，正确性只依赖预周期+周期事实）。

### 重要-4：§4"每个 m 都被访问 ⟹ 类表按 m 无限生长"推理过强

m-记录链本身完全复现（ref-b6，10⁷ 锚点）：m=1..25 全部恰在 n = 3·2^m−3，锚点序号与 doc 逐位一致（…,15965, 31928, 63854, 127706, 255411, 510821, 1021640, 2043278, 4086554, 8173106）。但"访问 ⟹ 生长"不成立：**m=18, 19, 20, 25 的记录锚点均未生成新类**（新类时刻表：m∈{4,5,7,8,11,12,13,14,16,17,21,22,23,24} 及 w∈{9,15,21} 的 5 个附加点；m=25 记录在锚点 8,173,106，其后至 10⁷ 零新类——这正是"表在 4.09×10⁶ 饱和"的原因）。正确表述：**类表截至 10⁷ 锚点未饱和，前 25 个 m-记录中 14 个生成了新类；无限生长是趋势推断而非定理**。§6 中 M′ 的"（w=3 链保证全访）"限定词用于"访问"为真，用于"逐 m 生成类"则为过强。

---

## 三、次要问题（6 项）

1. **"粗模 144 下唯一碰撞类是 L3|j4"不准**（§3 末）：Lk|j3 的剩余类 8 同样碰撞（2³ = 8）。区别是 A≡16 的幂族 t ∈ {4,10,16,…} 无界（真不可判定），而 A≡8 只有唯一幂 8 < 类最小成员 584。后者的剩余类安全仍需一个单点补丁"类成员 ≠ 8"——而 A=8 本身就是一次幂出生，即 M′ 的一个实例。建议改述为"唯一**实效**碰撞类（幂族无界）是 L3|j4；Lk|j3 为单点碰撞，由 8 < 584 排除"。
2. **§结论行"杀死全部出生的 90.5%"口径**：90.5% 是**根出生**中 E1-重入占比（2,787,614/3,079,097 = 90.533%，ref-b2 复算一致）；含子出生的"全部出生"占比不同（10⁶ 锚点全部出生 7,218,164）。§5 表格内（"90.5% 的根"）用词正确，仅 §开头摘要行需改。
3. **M′ 的模数族写法 "{A₀ + 9·2^s·k}" 不完备**：观测模数为 9·2^s（s∈{4,7,11,13,16}）**及** 184320 = 2¹²·45（u = 5·9，L3|j0 的四个奇 A 类）。族式应为 {A₀ + 2^s·u·k}，u ∈ {9, 45}。
4. **births7 的 10⁷ "bad=0" 只检查 L-出口根**：代码上 E1r 分支不做出生幂检查（roots 计数含 E1r，`q===1` 检查仅在 `ty!=='E1r'` 分支）。E1r 由引理 2（3|A）与 births5（10⁶，全根检查 bad=0）覆盖，结论无恙，但"30,791,021 根 0 幂"的直接扫描证据链在 10⁷ 尺度上实际是"E1r 由引理 + 10⁶ 实测，L-出口由 10⁷ 直接扫描"。论文脚注应写明。
5. **"累计 TM 步 ≳ 10²³"偏保守约 1.5 个数量级**：以 16–22n² 成本带与 n ≈ 12.32k 增长复估，Σcost ≈ 10²⁴–10²⁵。作为下界无错，建议改为 ~10²⁴⁺。
6. **安全机制表述可锐化**：对一切 j = ν₂(A₀) < s = ν₂(D) 的类，{A₀ + Dk : k≥0} 无幂 ⟺ **A₀ 自身非幂**（每成员奇部 = q₀ + 2^{s−j}·u·k ≥ q₀ ≥ 3 仿射递增）。doc 的"q₀ ≢ 1 (mod 2^{s−j})"是 k∈ℤ 版充分条件，与"仿射递增恒>1"并不等价（q₀ ≡ 1 mod 2^{s−j} 且 q₀ ≥ 3 时类仍安全）。两者在本表上都判安全，建议采用锐化版（见下方审稿引理），M′ 的陈述因此更短。

---

## 四、攻击面逐项结论

### A. 根/子划分完备性 —— **通过**

- **规则级穷尽**：坍缩引擎中 S 的前驱只能是 R（E1）、L（E9b 直连 k≥4）、G（E6）；S 永不步进到 S（y≥3 扫掠出 R/L/G，y=2→G，y=1→R/L）。R(a≠1) 的来源穷尽为：L3 中转（L3→R）与锚点初始化 R(n,n)（锚点出生 iff n 偶，n 奇被 L7 条件隔离——doc 已诚实标注）。
- **引擎实证**（ref-b1，2×10⁷ 非坍缩事件 / 572 锚点）：4,120 次出生（1,760 根 + 2,360 子）来源仅 R/L/G（S-内部重复 8,576,839 次正确去重）；L3 标记的 R 全部 0 例外地来自 L3→R 中转；偶锚点出生 0 次。
- **闭式核对全过**：每个 G 入口头值 a+1 = 产出它的 S 入口出生值 A（0 违例）；E6 子 A′ = (a_prev+1)/2 逐例成立（0 违例）；子出生奇部 = 最近根奇部（0 违例）；扫掠守恒 (x,y)→(x+1,y−2) 保 A、保 y 奇偶。停机两向推导复核：G 头只能出自 y 偶 S 扫掠（每次都是出生），故停机 G(3)（a+1=4=2²）⟹ 某出生 = 2^t ⟹ 链根 = 2^t；反向根 2^t ⟹ 确定性减半链 2^t→2^{t−1}→…→4→G(3) 停机，与 b/rest 无关（代数逐级复核）。
- **裸机锚定**：独立裸机 TM 模拟器从空白带复跑：P(3)@54 步 ✓，前 12 个锚点转移的 n′ 与代价**逐个精确**等于坍缩引擎（(54,3),(627,9),(5487,21),(17738,33),…）——L1 忠实性的独立抽查通过。
- **非坍缩≡坍缩根序列**：同锚点数下两引擎 (ty, A) 逐项全等（0 mismatch；births10 的 600 锚点扩展到 572 锚点/1,760 根独立复现）。

### B. 3|A 引理 —— **通过（代数与前提双重核验）**

- 代数：重入 R(1,b) 由台账定理 I₀（无条件）给 b ≡ 2 (mod 3)；出生需 b 偶 ⟹ b ≡ 2 (mod 6) ⟹ A = 1 + b/2 + 1 = b/2 + 2 ≡ 1 + 2 ≡ 0 (mod 3)。2^t ≢ 0 (mod 3)。域 b≥3 ∧ b≡2 (mod 6) ⟹ b≥8 ⟹ A≥6。全部成立。a 的剩余类信息不需要——a=1 固定。
- 前提在轨道上恒真（实证）：ref-b2 于 10⁶ 锚点统计 **3,669,365 次重入（含奇 b）全部 b ≡ 2 (mod 3)，0 违例**；E1r 出生 2,787,614/2,787,614 被 3 整除且 b ≡ 2 (mod 6)，q_min = 3。
- 分母口径：90.5% = E1r/(全部根出生) 于 10⁶ 锚点（2,787,614/3,079,097 = 90.533%，与 births5/births6 及我的独立计数器三方一致）。10⁷ 的 30,791,021 由 births7 工件确认（bad=0；E1r 部分见次要-4 脚注）。

### C. 20 类覆盖完备性 —— **快照性质确认；"保守"不可信，改按剩余类分层**

- 20 类 = 4 段键 (ty, ν₂(A), A mod 144, q mod 144) 在 **10⁷ 锚点（m ≤ 25）内的快照**；类生成挂在**小 w 锚点**（n+3 = 2^a·w，w∈{3,9,15,21}）上，m-记录链保证 w=3 锚点被无限访问，其中一部分（前 25 个中 14 个）生成新类——类表按 m 的生长是**趋势而非定理**（重要-4）。"20/20 安全"的安全域应写明 **锚点 ≤ 10⁷（m ≤ 25，n ≤ 123,164,085）**。
- 修正后的分层（本审查证明）：**18 类**剩余类安全（按键定义无条件，含 births11 缺证的 3 个晚现类）；**Lk|j3**（A≡8）归结为单点"A≠8"；**L3|j4**（A≡16，族 A = 9·2¹²·W+16，W 奇 ≥ 1，r₂−σ = 30 常数——ref-b4 于 10⁵ 锚点 25/25 成员逐个验证）归结为族形式（奇部 2304W+1 奇 > 1 ⟹ 恒非幂；ref-b3 对 W ≤ 2×10⁶ 直接验证 0 幂）。AP 拟合本身（D_fit 与全量成员一致性）ref-b4 全部复核通过（doc 列出的 8 个 AP 逐个 MATCH；L3|j2 主链按 q 子类周期 576、合并类 144，与 doc 一致）。
- 成对律：**14,560/14,560 Lk 根与 L3 根 (σ−1, r₂) 成对，A_Lk = A_L3 + 1 零违例**（10⁵ 锚点全量）；反向 7,305/14,587 L3 无 Lk 伴侣（doc 只主张 Lk→L3 方向，正确）。
- "保守超集"不可验证为"保守"（方向倒置，重要-1）；可验证的是拟合与全量观测成员一致（已验证）。

### D. M′ 的显式陈述 —— 见第六节命题 M′（含修正：模数族 u∈{9,45}；类生成对 m 的依属性改为"访问链 + 部分生成"）

### E. 数字复现 —— **全部通过**

| 数字 | doc | 本审查 | 方式 |
|---|---|---|---|
| 10⁶ 锚点根出生 | 3,079,097（E1r 2,787,614 / Lk 145,614 / L3 145,869） | **逐位相同** | ref-b2 独立计数器 |
| 10⁷ 锚点根出生 / 幂 | 30,791,021 / 0 | 30,791,021 / 0（bad=0） | births7 工件 DONE 行核对 + 计数比例一致 |
| v5 "10⁷ 事件 2,908 出生 0 幂" | 2,908 / 0（406 锚、1,485 重入） | **406 锚、1,485 重入、2,908 出生（根 1,244 + 子 1,664）、0 幂——逐位复现** | ref-b5b（语义澄清：v5 的"事件"=**非坍缩逐事件步**，"出生"=去重后含子） |
| m-记录 1..25 | n = 3·2^m−3 全访，锚点序号表 | **m=1..25 全部 OK，锚点序号逐位一致**（m=25 @ 8,173,106） | ref-b6 全新 10⁷ 锚点复跑 |
| 类表饱和 | 锚点 ≈ 4.09×10⁶ 后零新类 | 最后 NEW 类 = 锚点 4,086,554（= m=24 记录），其后 5.9×10⁶ 零新类 | births7-log 20 条 NEW 核对 |
| 锚点 n mod 12 | {3,9}（60,198 + 9,939,802 @10⁷） | {3,9}（6,021 + 993,979 @10⁶，比例一致） | ref-b2 |

（另：非坍缩 10⁷ 步复现 v5 的语义是本审查新澄清的点——坍缩事件口径下 10⁷ 事件只有 2,205,832 次出生、305,596 锚点，与 v5 引用的 406/1,485/2,908 不匹配；两种口径下均 0 幂。）

---

## 五、结论重述（修正版，供 §v6 修订）

1. **根归约定理（无条件，承接 L1）**：成立，含两向（停机 ⟺ 某根出生 = 2^t, t≥2）。机器证据：ref-b1（0 违例 + 裸机 12/12）。
2. **E1-重入安全引理（无条件）**：成立。10⁶ 锚点全量 3|A 与护城河 0 违例。
3. **L-出口类表（10⁷ 锚点快照，条件认证）**：20 类结构、成对律、族形式全部复核通过；认证修正为剩余类分层（18 无条件 + Lk|j3 单点 + L3|j4 族形式），AP 外推只对 L3|j4 有实质载荷且应明示为条件。
4. **M′ 未被绕过**：确认。类表按小 w 锚点生长，w=3 链无限访问保证生长的**机会**无限，但"逐 m 生成"与"有限类表不可能"仍是命题 M 的内容。

---

## 六、论文并入草案（中英双语）

### 引理 R（根归约 / Root Reduction）

**中**：设 M1 的相位语义如 L1（对裸机忠实）。称 S-入口 y 偶者为**出生**，值为 A = x + y/2 + 1。则每个出生恰为下列之一：(i) **根**，由 R(a,b)（b 偶）产生，A = a + b/2 + 1；(ii) **根**，由 L(r₁,r₂,·)（r₂ 偶；含 L3 经 R(σ,r₂) 中转，σ = r₁+r₃）产生，A = σ + r₂/2 + 1；(iii) **子**，由 G(a,·)（a 奇 ≥ 5）产生，A′ = (a+1)/2，且 a+1 即产出该 G 的出生之值。子值逐级精确减半，故**每个出生的奇部等于其链根出生的奇部**。因而 **M1 停机 ⟺ 存在根出生 A = 2^t（t ≥ 2）**；且该情形成立时，机器经 t−2 次确定性减半后停机，与剩余游程无关。
**EN**: In the phase semantics of M1 (faithful by L1), call an S-entry with y even a *birth*, of value A = x + y/2 + 1. Every birth is exactly one of: (i) a *root* produced by R(a,b) with b even, A = a + b/2 + 1; (ii) a *root* produced by L(r₁,r₂,·) with r₂ even (including L3 relays through R(σ,r₂), σ = r₁+r₃), A = σ + r₂/2 + 1; (iii) a *descendant* produced by G(a,·) with a odd ≥ 5, A′ = (a+1)/2, where a+1 is the value of the birth that produced that G. Descendant values halve exactly, so *the odd part of every birth equals the odd part of its chain's root birth*. Consequently **M1 halts ⟺ some root birth satisfies A = 2^t (t ≥ 2)**; and when this occurs the machine halts after t−2 further deterministic halvings, independently of the remaining runs.
*机器证据 / machine evidence*: rule exhaustion + ref-b1 (2×10⁷ uncollapsed events: 0 provenance, 0 inheritance, 0 G-head violations; uncollapsed ≡ collapsed root sequences; raw-TM cross-check 12/12 anchors exact in n′ and cost).

### 引理 E（E1-重入安全 / E1-Reentry Safety，无条件）

**中**：轨道上每个重入构型 R(1,b) 满足 b ≡ 2 (mod 3)（台账不变量 I₀，无条件）。若 b 偶（产生出生的唯一情形），则 b ≡ 2 (mod 6)，b ≥ 8，且出生值 A = b/2 + 2 满足 3 | A、A ≥ 6，故 A 非二的幂。
**EN**: Every re-entry configuration R(1,b) on the orbit satisfies b ≡ 2 (mod 3) (the unconditional ledger invariant I₀). If moreover b is even (the only case that births), then b ≡ 2 (mod 6), b ≥ 8, and the birth value A = b/2 + 2 satisfies 3 | A and A ≥ 6; hence A is not a power of two.
*机器证据 / machine evidence*: 10⁶ anchors: 2,787,614/2,787,614 births with 3 | A, all b ≡ 2 (mod 6); 3,669,365 re-entries (both parities of b) all with b ≡ 2 (mod 3).

### 审稿引理（AP 幂判据锐化 / Sharpened AP Criterion）

**中**：设 D = 2^s·u（u 奇）> 0，A₀ = 2^j·q₀（q₀ 奇）且 j < s。则 {A₀ + Dk : k ≥ 0} 含二的幂 ⟺ q₀ = 1（即 A₀ 自身为幂）。若 j ≥ s，则为可判定问题：∃t ≥ s, 2^t ≥ A₀, 2^t ≡ A₀ (mod D)（离散对数 mod u）。
**EN**: Let D = 2^s·u (u odd) > 0 and A₀ = 2^j·q₀ (q₀ odd) with j < s. Then {A₀ + Dk : k ≥ 0} contains a power of two **iff** q₀ = 1 (i.e. A₀ itself is a power). For j ≥ s the question is decidable: ∃ t ≥ s with 2^t ≥ A₀ and 2^t ≡ A₀ (mod D) (a discrete logarithm modulo u).
*证明 / proof*: for j < s every member has 2-adic valuation exactly j and odd part q₀ + 2^{s−j}·u·k, which is odd and ≥ q₀. ∎ （观测到的全部类满足 j < s、q₀ ≥ 3。/ All observed classes satisfy j < s and q₀ ≥ 3.）

### 命题 C（L-出口类表快照 / L-Exit Class Table Snapshot）

**中**：在锚点序号 ≤ 10⁷（n ≤ 123,164,085，m = ν₂(n+3) ≤ 25）范围内，全部 L-出口根出生落入按 4 段键 (ty, ν₂(A), A mod 144, q mod 144) 的 **20 个类**（L-出口约 2.9M 个，占根的 9.47%）；每个 Lk 类 (σ, r₂) 与一个 L3 类 (σ−1, r₂) 成对（A_Lk = A_L3 + 1）。20 类中 18 类的剩余类不属于 {2^t mod 144}，故按类键定义**无条件**无幂；Lk|j3 类（A ≡ 8 mod 144）除单点 A = 8 外无幂（8 < 观测最小成员 584）；L3|j4 类（A ≡ 16 mod 144）的成员族为 A = 9·2¹²·W + 16（W 奇 ≥ 1，r₂ − σ = 30），奇部 2304W + 1 > 1，**条件于族形式**无幂。范围内直接扫描 30,791,021 个根出生 0 幂。类表在该范围内于锚点 4,086,554（m = 24 记录）后饱和；类生成挂在 n+3 = 2^a·w、w ∈ {3,9,15,21} 的小 w 锚点上。
**EN**: For anchor indices ≤ 10⁷ (n ≤ 123,164,085, m = ν₂(n+3) ≤ 25), every L-exit root birth (≈2.9M of them, 9.47% of all roots) falls into one of **20 classes** keyed by (ty, ν₂(A), A mod 144, q mod 144); every Lk class (σ, r₂) is paired with an L3 class (σ−1, r₂) and A_Lk = A_L3 + 1. For 18 of the 20 classes the residue A mod 144 is not among {2^t mod 144}, so by the key definition no member is ever a power of two, unconditionally. The class Lk|j3 (A ≡ 8 mod 144) is power-free except for the single value 8 (8 < its least observed member 584). The class L3|j4 (A ≡ 16 mod 144) consists of the family A = 9·2¹²·W + 16 (W odd ≥ 1, r₂ − σ = 30) with odd part 2304W + 1 > 1 — power-free **conditional on the family form**. A direct scan found 0 powers among all 30,791,021 root births in range. The table saturates after anchor 4,086,554 (the m = 24 record); class creation events sit at small-w anchors (n+3 = 2^a·w, w ∈ {3,9,15,21}).

### 命题 M′（残余算术命题 / Residual Arithmetic Proposition）——精确陈述

**中**：设 (n_k)_{k≥0} 为 M1 的锚点列（n₀ = 3）。**（M′）对每个 k ≥ 0 及锚点 n_k 段内的每次 L-出口根出生（即每个在直接前驱为 L-出口或 L3-中转 R(σ, r₂)（r₂ 偶）的 S-入口处实现的值 A = σ + r₂/2 + 1）：A 的奇部 ≥ 3（等价地 A ∉ {2^t : t ≥ 2}）。**
族式精化（观测结构支持、条件于类生成完全性）：对每个 m ≥ 1 与每个奇 w ≡ 3 (mod 6)，锚点 n = 2^m·w − 3 段内的 L-出口根出生包含于有限个算术级数 C_{m,w,i} = {A₀ + 2^{s}·u·k : k ≥ 0}（观测 u ∈ {9, 45}，s ∈ {4,7,11,12,13,16,…}），每个满足 ν₂(A₀) < s 且奇部 q₀ ≥ 3——由审稿引理，这等价于各级数无幂。**w = 3 的锚点链 n = 3·2^m − 3 被 m-记录机制逐 m 访问（m=1..25 已机器确认，锚点序号 0,1,2,4,…,8,173,106）；其中部分（前 25 个中 14 个）生成新类。**
**EN**: Let (n_k)_{k≥0} be the anchor sequence of M1 (n₀ = 3). **(M′) For every k ≥ 0 and every L-exit root birth in the segment of anchor n_k — every value A = σ + r₂/2 + 1 realized at an S-entry whose immediate predecessor is an L-exit or an L3-relay R(σ, r₂) with r₂ even — the odd part of A is at least 3 (equivalently A ∉ {2^t : t ≥ 2}).**
Family-refined form (supported by the observed structure, conditional on completeness of class generation): for every m ≥ 1 and every odd w ≡ 3 (mod 6), the L-exit root births in the segment of the anchor n = 2^m·w − 3 lie in finitely many arithmetic progressions C_{m,w,i} = {A₀ + 2^s·u·k : k ≥ 0} (observed u ∈ {9, 45}, s ∈ {4,7,11,12,13,16,…}), each with ν₂(A₀) < s and odd part q₀ ≥ 3 — which, by the Sharpened AP Criterion, is equivalent to each progression being power-free. **The w = 3 anchor chain n = 3·2^m − 3 is visited for every m by the m-record mechanism (machine-confirmed for m = 1..25 at anchor indices 0, 1, 2, 4, …, 8,173,106); a subset of these (14 of the first 25) create new classes.**

### 定理（条件装配 / Conditional Assembly）

**中**：假设 (i) M′ 与 (ii) 类保持（每个锚点 n_k ≡ 3 (mod 6)）。则 M1 永不停机。证明：由引理 R，停机需要某根出生 = 2^t；根分为 E1-重入（引理 E 无条件排除）、L-出口（M′ 排除）、锚点初始化（n 奇 ⟹ y = n−2 奇 ⟹ 无出生）。∎
**EN**: Assume (i) M′ and (ii) class preservation (every anchor n_k ≡ 3 (mod 6)). Then M1 never halts. Proof: by Lemma R a halt requires a root birth equal to 2^t; roots split into E1-reentries (excluded unconditionally by Lemma E), L-exits (excluded by M′), and anchor initializations (n odd ⟹ y = n−2 odd ⟹ no birth). ∎
（注 / note: 偶锚点出生确为实效危险：n = 10, 42, 170, 682, … 时锚点出生 A = 3n/2 + 1 = 16, 64, 256, 1024, … 正是二的幂，与已知偶 n 停机集 {10,26,42,…} 的子族吻合——类保持条件的必要性与 doc 的"诚实标注为条件件"一致。/ Even-anchor births are a genuine hazard: at n = 10, 42, 170, 682, … the anchor birth A = 3n/2 + 1 equals 16, 64, 256, 1024, …, matching a subfamily of the known even-n halting set — consistent with the doc's honest labelling of class preservation as conditional.）

---

## 七、工件清单（本轮新增，attacks-sparse2/）

| 脚本 | 内容 | 结果 |
|---|---|---|
| ref-b1-partition.mjs → ref-b1-2e7.log | 裸机 TM 独立模拟器 + 非坍缩逐事件审计（来源/中转溯源/继承/奇部/G-头/序列等价） | 裸机 12/12 精确；2×10⁷ 事件全检查 0 违例 |
| ref-b2-counts.mjs → ref-b2-1e6.log | 独立计数器（10⁶ 锚点全量：分类计数、3\|A、护城河、q_min、锚点 mod 12、m-记录） | 与 births5/6 逐位一致 |
| ref-b3-apcheck.mjs → ref-b3.log | AP 幂包含严密判定器；births11 判定器交叉（30k 合成）；反演反例；L3\|j4 族直验 | cf11 假阴性 1,722 / 假阳性 249；14 类一致全安全 |
| ref-b4-classes.mjs | births-roots.json 全量类表重建、AP 拟合、成对律、族形式、碰撞类分层 | doc 8 个 AP 全 MATCH；成对 14,560/14,560 |
| ref-b5-events.mjs / ref-b5b-uncollapsed.mjs | v5 数字双口径复现 | 非坍缩口径 406/1,485/2,908/0 **逐位复现** |
| ref-b6-mrecords.mjs | m-记录 10⁷ 锚点全新复跑 | m=1..25 全部 = 3·2^m−3，锚点序号逐位一致 |
