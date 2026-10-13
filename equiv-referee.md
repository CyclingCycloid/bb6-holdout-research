# equiv-referee.md — §15"排空层时代对应定理"（A−）对抗性审查报告

日期：2026-10-12。审稿人：独立 referee 会话（只读既有文件；新脚本 `bb6/attacks-quad/ref-*.mjs`）。
审查对象：`bb6/attacks-quad/attack-quad.md` §15（定义—实验—定理—边界四段）及论文并入方案
（`bb6-new/machines/quad/paper-zh.tex` / `paper-en.tex` §4）。

**总裁决：fixable（轻微）——§15 定理本体 as-stated 成立。** 排空层恒等（含 cm26 奇 R 修正 σ）、
R≥4 共享域边界、R=3 结构分歧、churn 层 0/110、停机谓词不共轭三实例，全部经独立工具链复现，
无一处依赖被审实现。发现 **0 致命、6 重要、5 次要**，全部为论文/措辞层修复。附带发现论文
§3 的 lap 字引理对 cm26/cm51/cm52 **为假**（严重级，属 §3 但 §4 重写必须连带处理）。

## 0. 审查方法与独立工具链

* 独立引擎 `ref-engine.mjs`：从 §15.1 规格重新实现（不复制 quad-equiv.mjs 代码）——转移表解析、
  Uint8 窗带、(+1,−2,+1) 链式时代检测器、典范构造 ρ_M、真实构型抽象（缝宽/环境缝/锚点偏移核验）。
* C oracle `quad6.exe` `from` 模式作为第二引擎：构造态直接喂 C 引擎，与我的 JS 引擎逐字段对拍。
* 基线复跑 `node quad-equiv.mjs`：exit=0，全部输出数字与 §15 及主会话记录一致（3 分钟）。
* 我的脚本：`ref-fidelity.mjs`（A）、`ref-sigma.mjs`（B）、`ref-count.mjs`（C+F 数据）、
  `ref-halt-conj.mjs`（E）、`ref-laplen2.mjs` / `ref-orbitword.mjs` / `ref-words-param.mjs` /
  `ref-words-small.mjs`（步长与机型字）、`ref-d26b.mjs`（深锚典范形复核）、
  `ref-laplen.mjs`（草稿，被 laplen2 取代）。
* 复用了主会话已有的盲审脚本 `bb6-new/machines/quad/engines/ref-lapword.mjs`（只读运行）。

## 1. 攻击面 A：典范实现的合法性 —— **通过（并给出 S 的精确范围）**

**A1 三个全新真实锚**（深度 2,000,090 / 777,816 / 123,526，与 S1 的 5 锚、S2B 的 60 态均不重叠）：

| 锚 | 典范形 | rebuild==real（era 记录逐字段） | quad6.exe vs 我的引擎 |
|---|---|---|---|
| cm16@t=2,000,090（blocks 12，pos 1，R=1241） | OK | OK | OK（eraA 620 圈耗尽 (755,1,727)） |
| cm26@t=777,816（pos 3，R=101 奇） | OK | OK | OK（eraA ev=49，close (329,3,104)） |
| cm52@t=123,526（pos 4，R=62 偶） | OK | OK | OK（eraA ev=30，close (203,2,63)） |

对拍口径：eraA 全字段（openStep/pos/nb/open/close/ev）+ eraB 开场字段 + 停机步一致；
真实锚重放与典范重构重放在两套引擎上都给出同一抽象记录。

**A2 事件类扫描**（每台 400 个 pivot 事件窗，深度 1.8e6–3e6 全新）：

| 台 | cont（链上） | open（时代开） | fail（链断/churn 相） |
|---|---|---|---|
| cm16 | 398，非典范 0 | 1，非典范 0 | 0 |
| cm26 | 364，非典范 0 | 7，非典范 0 | **28，非典范 17** |
| cm51 | 280，非典范 0 | 25，非典范 0 | **94，非典范 56** |
| cm52 | 398，非典范 0 | 1，非典范 0 | 0 |

结论：ρ_M 对**时代锚事件**（链上与时代开事件）忠实——S1 5 例 + 本轮 3 例 + 扫描，零违例；
非典范几何仅出现在 churn 相的 pivot 事件（例：cm51 收尾态 R\|Z 缝宽实测 1 而典范为 2；
cm26 实测 2 而典范为 1）。**S 的定义应明写为"时代锚事件"**（§15.1"5823 个 era 事件"口径正确
但需此限定）。S2B 的 8 个深锚为"era 闭事件"= 闭前最后一个链上事件（closeStep=end−1），
属链上类、典范形成立（已核 d26b 的原始 EV 行：blocks (11,2,3) 三元组缝 (1,1)、D0 偏移 R+1=3 ✓）。

## 2. 攻击面 B：σ 修正的完备性 —— **通过（域边界 R≥4 恰当）**

网格：5 键 × 4 个 (L,Z) × R∈{1..10,12..15,20,21,40,41,64,65,100,101,200,201,439}，独立环境块
公式；可比较 477 行（R≤2 行部分因 halt 剔除）：

* 偶 R≥4：cm26 ≡ cm16（ev 与 eL/eR/eZ 逐字段）**220/220**；
* 奇 R≥5（至 439）：σ 成立（ν₂₆=ν₁₆−1，(eL,eR,eZ)₂₆=(eL−1,eR+2,eZ−1)₁₆）**220/220**；
* **R=3：20/20 分歧且非 σ 形**——cm26 无排空延续（3 已是其奇终态），其"eraA"是 churn 后
  重播时代的记录（如 (10,3,2) 型）；cm16/51/52 的 eraA=(L+1,1,Z+1)。§15.3"R=3 结构分歧点"
  表述精确，定理域取 R≥4 **不多不少**；
* cm51 ≡ cm16：**460/460**（全部 R≥3 行，含 R=3）；cm52 同（"完全恒等（含 R=3）"成立）；
* 终态剩余：cm16/51/52 eR∈{1,2}、cm26∈{2,3}，**0 违例**；
* quad6.exe from 抽检 6/6 与我的引擎一致（例：R=13 时 cm16 eraA=(6,(11,1,10))、
  cm26=(5,(10,3,9))——精确 σ）。

## 3. 攻击面 C："恒等"的计数口径 —— **澄清（md 的 90/90 与 30/30 均精确；"62 行"不存在）**

390 行精确分解（独立重算，与 quad-equiv 输出一致）：

```
390 = 280 结局混合（某台 halt/timeout —— F_M 部分性，非证据失败）
    + 110 全清洁 = 90 非排空输入（R≥3：R13 组 18 + R8 组 17 + R40 组 55）
                  + 20 排空输入（R≤2，全部来自 b2-R2 组）
90 行中：72 偶 R 原始恒等 + 18 奇 R 经 σ 修正恒等 = 90/90 ✓
20 行既非恒等也非修正恒等 —— 全部 Rin≤2（eraA 已是 churn 输出，在 R≥4 共享域之外）
   实例 key=1,5 set=b2-R2（Rin=2，cm16 ev=1）：eraA 记录四台各异——cm26=[1,(4,3,2)]、
   cm51=[3,(8,1,4)]、cm52=[1,(4,2,2)]（churn 层输出，无共享结构）
```

任务问的"62 行既非恒等也非修正恒等"**不对应任何实际类别**——正确的"既非又非"数是 **20**
（即 110−90），且全部是 R≤2 排空输入（共享域外），**不是** R≥4 域内的覆盖缺口。
clean=110 的含义：四台都产出两条完整时代的行——唯一可做逐字段比较的行；280 混合行本身是
定理边界（F_M 部分性）的表级证据。

S2B：60 = 18 any-halt（13 排空 + 5 中值）+ 2 tmo + 40 可用 = 36 mid + 4 exh；
36 mid = **30 个 R≥4（修正恒等 30/30 —— md"(iii)"逐字精确）+ 6 个 R=3（σ 失败 6/6，
diff 形如 (0,2,2,−1)×5、(1,3,2,0)×1）**；6 个 R=3 行中 cm51/cm52 与 cm16 diff=(0,0,0,0)
（"cm16/51/52 再跑一圈到 1"逐字段成立）。

普查复核（eras-m\*.txt，3×10⁹ 步）：ERA 记录 41,286/33,112/33,112/59,470 = 166,980 ✓；
恒等式 eL=L₀+(R₀−eR)/2、eZ=Z₀+(R₀−eR)/2 **166,980/166,980 精确，0 反例**；剩余集与奇偶律
每台恰 **1 个例外 = 文件末尾被 cap 截断的最后一条记录**（eR=160/4692/5031/1456，仍在排空中）。
→ "eR∈终态剩余"应加"完整时代"限定（166,976 条完整 + 4 条截断快照）。

## 4. 攻击面 D：churn 0/110 的结论强度 —— **大体如实；两处过度陈述**

* **"停机谓词不共轭"是定理级**：确定性 + 决定性反例 ⟹ 停机结局不是 S 上的函数。措辞如实 ✓。
* "churn 层 eraB 四台恒等 0/110、真实态 0/40"：作为"映射非全同"的证据**超出需要**——确定性
  映射下单个分歧行即已证明非恒等；md 标注"表级反例"是诚实的。但两处措辞过度：
  1. "cm51 churn 后**键必变**"——110+40=150 例全变是经验全称，非证明。应作"实测 150/150 键变"。
     （README.md 第 8 行、dossier.md 第 10 行复制了同一措辞，需同步。）
  2. "值可**无界**偏离"——由单例 (−991,−598,0) 外推，无界性未证。应作"最大实测偏离 (−991,−598,0)"。
* 有利精确化的补充事实：cm26 与 cm16 的 eraB.open 三元组在 **13/110** 清洁行上相同、键在
  95/110 行保持——"不对应"是四台口径；成对口径存在部分重合，建议在负结果旁注明，防绝对化误读。

## 5. 攻击面 E：停机不共轭三实例 —— **四数字全部独立复现**

* 先证锚真实性：cm26 轨道 step 134 的 EV 行——blocks [5,4,2,2]@pos0，典范形 OK（真实轨道态）。
* quad6.exe `from`（C oracle）：**cm16 HALT@170、cm51 HALT@990、cm52 HALT@6294、cm26 30,000 步
  无停机正常演进**（eraA (6,2,3) → eraB 正常开启）。
* 我的独立 JS 引擎：同样三个数字（170/990/6294）。
* 每次停机前一格恰有一次 2-步停机威胁（S4 断言在反例处成立）。
结论：反例的每一个数字都不依赖被审实现。§15.3(2) 的推论（停机不可经时代层对应传递、
逐台装配不可省）成立。

## 6. 攻击面 F：562 对齐的重述 —— **数据精确复现；论文与 md §4 均有残留**

从当前 eras-m\*.txt 重算（R₀≥500：m16 562 条、m26/m51 571、m52 570；按秩对齐 562 对）：

* m16↔m26：(ΔL,ΔR) = **{(1,0):556, (0,2):6}**，翻转邻域 i=10、28、164（2+1+3=6 行）；
* m16↔m51：**{(1,−1):556, (0,1):6}**，同三个翻转邻域；
* m16↔m52：**恒 (0,2):562**，零翻转。

§15/§4 精化数值逐位复现 ✓。但重述不彻底：

1. **论文两版均未更新**：zh §3 remark 与 §4 条目 2、en §3+§4 仍写"常量偏移（0 或 +1）下零错位"——
   与矢量偏移 (1,−1)/(0,2) 矛盾（m51 的 ΔR=−1 根本不是"0 或 +1"）；且深度写 5×10⁹，普查实为
   3×10⁹。
2. **attack-quad.md §4 自身残留**：精化段之前仍原样保留旧测量（"m16↔m51：偏移 0[0..561]"等，
   与精化值 (1,−1) 冲突）——应加"已被 §15 精化取代"标注（旧数不可复现，与 era-align.mjs 头注
   的说明一致；本轮证明**精化后**的直方图在当前文件上逐位复现，该头注可更新）。

## 7. 附带发现（并入时必须处理）：论文 §3 lap 字引理对三台机器为假

双通道机器验证（既有盲审脚本 ref-lapword.mjs + 本轮 ref-orbitword/ref-words-\*）：

* 从**论文引理的配置**（0² 双缝、A 于左缝）出发，cm26 在第 4 个事件起偏离（A0 B0 C1 C1 C1…，
  库被吸收成 1²⁴）；cm51 第 5 事件起偏离（…D1 F1^…）；cm52 第 4 事件起偏离。**引理"对每台机器"
  的字面陈述为假**；casecheck-island.mjs 的逐字验证是 **cm16 专属**（文件头明写）。
* 从各机**自身典范锚**（§15 几何）出发，四台执行**机型字**（已验 R=4..21 参数化 + 多组 (L,Z)），
  净效应均 (+1,−2,+1)：

| 台 | 圈事件字（R=圈首储量；末事件为与下一圈共享的 pivot 边界事件） | 周期 |
|---|---|---|
| cm16 | `A0 B0 C1 D1 A1 E0 D0 F0 B1^{R−2} B0 C0² C1 D1 A1 E1^{R−1} E0 D1` (+A0) | 2R+13 |
| cm26 | `D0 B1 E1 F1^{R−2} F0 D1 A1 C1^{R−4} C0` (+D0) | 2R+1 |
| cm51 | `A0 B0 C1 D1 F1^{R−1} F0 B1 C1 D0 E0 A1^{R−3}` (+A0) | 2R+5 |
| cm52 | `C0 E1 F1^{R−1} F0 A1 D1 D0 B1 D1^{R−3} D0 B0` (+C0) | 2R+5 |

（周期由 quad6.exe from 的 EV 间隔独立钉死：R=8/13/20/21 → 29/39/53/55、17/27/41/43、
21/31/45/47、21/31/45/47。）**因此 §15.3 推论中"cm51/cm52 2R+9"为笔误：按其自述口径
（R=圈首储量）应为 2R+5**（"2R+9"对应圈末储量口径，与 cm16/cm26 两行的口径不一致）。
"78 万锚点"逐点通过的是 (+1,−2,+1) 净簿记检测器（对四台各自成立，由 166,980 条普查恒等式
背书），不是字级同一——§2"lap 文法同构"与论文 §4 条目 1 的"字同一"表述需按此修正。

## 8. 发现清单

**致命（定理层）：0。**

**重要：**
1. 论文 en §1 表三处停机转移笔误：cm16 应为 "F on 1"（非 "F on 0"）、cm51 应为 "E on 1"
   （非 "E on 0"）、cm52 应为 "E on 0"（非 "D on 0"）。zh 版四处全对（仅 en 版错）。
2. 论文 zh/en §3 Lemma（lap 字"对每台机器"）对 cm26/cm51/cm52 为假（§7）；须重写为四机型
   字表；§4 条目 1 连动修正。
3. attack-quad.md §15.3 推论：cm51/cm52 圈步长 "2R+9" → **2R+5**（R=圈首储量口径）。
4. "cm51 churn 后键必变 / 值可无界偏离"过度陈述（§4 建议）；attack-quad §15.3、README.md、
   dossier.md 三处同文需同步。
5. 论文 §3/§4 的 562 对齐旧表述（常量偏移 0/+1、5×10⁹）未随 §15 精化更新（§6）；
   attack-quad.md §4 旧测量行应标注被取代。
6. 论文 zh/en thm:island 验证域描述与工件不符："每台 2×10⁷ 步、892 孤岛时刻"实为 cm16 专属
   casecheck Part3；四台轨道级覆盖是 audit 1e9（islNear 20 万+/台、islFar=0）。按工件改写。

**次要：**
1. 普查剩余断言加"完整时代"限定（4 条/台的 cap 截断尾记录是唯一例外，eR=160/4692/5031/1456）。
2. S 的定义收紧为"时代锚事件"；§15.1 补一句"churn 相 pivot 事件非典范形"（A2 数据）。
3. C 项澄清落档：既非恒等也非修正恒等 = 20 行（R≤2），非 62；clean=110 的语义写明。
4. 负结果旁注明成对部分重合（cm26 eraB.open 13/110 与 cm16 相同、键保 95/110）。
5. era-align.mjs 头注可更新：精化后的 (ΔL,ΔR) 直方图在当前文件上逐位复现（本轮已验）。

## 9. §4 重写要点（zh/en 同步）

1. **标题**："四台间已验证的对应事实" → "四台间的对应：排空层定理与三层边界"。
2. **先立定义**：标记态空间 S（块向量 + 三元组位置）与典范实现 ρ_M（缝宽表 (2,2)/(1,1)/(1,2)/(1,1)；
   锚点 cm16=A0@L\|R 缝首格、cm26=D0 / cm51=A0 / cm52=C0@R\|Z 缝首格）；忠实性证据 =
   8 个真实锚（S1 5 + referee 3）rebuild==real + 事件类扫描（时代锚事件零违例；churn 相事件
   不在 S 内）。
3. **正定理（排空层对应）**：见 §10 草案；证据分三档（轨道全量 166,976 完整时代恒等式精确、
   合成表 90/90、真实态重放 R≥4 行 30/30）。圈步长机型各异（2R+13/2R+1/2R+5/2R+5）——
   对应是抽象层的，须在定理后注明。
4. **负结果命题**：churn 层不传递（0/110、0/40；cm51 键变 150/150 实测、最大偏离 (−991,−598,0)；
   cm26 成对部分重合 13/110）；停机谓词不共轭（(5,4,2,2)@0：170/990/6294 vs cm26 正常）；
   σ54 不存在（S3：53 次中 42 次回共享键、2 次直接 halt）；原始构型级不对应（S1 附加）。
5. **旧条目 2 整条替换**为 562 轨迹现象：(ΔL,ΔR) 直方图 + 各 6 翻转点 + m52 恒 (0,2)；
   深度 3×10⁹。
6. **旧条目 1 替换**："净簿记 (+1,−2,+1) 四台同一（78 万级锚点 + 166,980 普查恒等式）；
   事件字机型各异（§3 修正后的字表）"。
7. **§3 remark（"本文不声明时代层的闭式映射"）改为**："排空层为仿射级联（定理 X），
   churn/重播种层无闭式（表级证据）"。
8. en §1 表修 3 处；§3 引理重写为四机型字；thm:island 域描述对齐工件。
9. §6/§7（归约/开放问题）不动，在"逐台装配"处加引负结果命题 (ii)。

## 10. 定理陈述草案（双语）

### 中文（paper-zh.tex §4）

```latex
\begin{definition}[标记态与典范实现]
标记态 $s=(b,\mathrm{pos})$：$b$ 为全带 $1$-块长向量，$\mathrm{pos}$ 为工作三元组
$(b_{\mathrm{pos}},b_{\mathrm{pos}+1},b_{\mathrm{pos}+2})$ 的位置（时代锚事件处的构型抽象）。
典范实现 $\rho_M(s)$：块间以 $0^1$ 相隔，唯三元组内部缝宽为机型常数
$cm16{=}(2,2)$、$cm26{=}cm52{=}(1,1)$、$cm51{=}(1,2)$；头与态取该机的锚点事件
（$cm16$ 为 $A0$ 于 $L|R$ 缝首格，$cm26{=}D0$、$cm51{=}A0$、$cm52{=}C0$ 于 $R|Z$ 缝首格）。
\end{definition}

\begin{theorem}[排空层对应]\label{thm:drain}
设 $F_M(s)$ 为从 $\rho_M(s)$ 起跑到本时代排空为止的映射，输出圈数 $\nu$ 与闭三元组
$(eL,eR,eZ)$。则在共享域 $R\ge 4$ 上：
\begin{enumerate}
\item $F_{cm51}=F_{cm52}=F_{cm16}$（逐字段；且在 $R=3$ 亦恒等）；
\item $F_{cm26}=\sigma\circ F_{cm16}$，修正 $\sigma$ 仅作用于奇 $R$ 输入：
$\nu_{26}=\nu_{16}-1$，$(eL,eR,eZ)_{26}=(eL-1,\;eR+2,\;eZ-1)_{16}$；
\item 终态剩余 $eR\in\{1,2\}$（$cm16/51/52$）或 $\{2,3\}$（$cm26$），且恒有
$eL=L_0+\tfrac{R_0-eR}{2}$、$eZ=Z_0+\tfrac{R_0-eR}{2}$。
\end{enumerate}
$R=3$ 为结构分歧点：$cm26$ 无排空延续（$3$ 已是其奇终态），其余三台再跑一圈至 $1$；
$R\le 2$ 时 $F_M$ 进入 churn 层（不属本定理域）。对应是抽象层的：圈步长机型各异
（$2R{+}13$/$2R{+}1$/$2R{+}5$/$2R{+}5$，$R$ 为圈首储量）。
\end{theorem}
\begin{proof}[证据等级（机器验证）]
(i) 轨道全量：$3\times 10^9$ 步普查 $166{,}976$ 条完整时代（四台合计）恒等式 (3) 精确、
零反例（另每台 1 条 cap 截断快照除外）；(ii) 合成表：78 共享键 $\times$ 5 参数组中
90 个全清洁非排空行，恒等（含 $\sigma$）$90/90$；(iii) 真实轨道态反事实重放：
$R\ge 4$ 行 $30/30$。独立复核（referee 会话）：$\sigma$ 网格偶 $R$ $220/220$ 恒等、
奇 $R$ $220/220$（$R$ 至 439），$R=3$ 分歧 $20/20$。
\end{proof}

\begin{proposition}[对应不传递的三条边界]\label{prop:boundary}
\begin{enumerate}
\item（churn 层）eraB（重播种后下一时代开参数）在共享清洁行上四台恒等 $0/110$、
真实态 $0/40$：$cm51$ 键实测 $150/150$ 改变（最大值偏离 $(-991,-598,0)$，无界性未证）；
$cm26$ 成对部分重合（$13/110$ 行 eraB 开三元组与 $cm16$ 相同）。故 churn 映射非恒等
（由分歧行证），且无已知商结构。
\item（停机谓词）停机结局不是 $S$ 上的函数：$cm26$ 轨道自身的首个时代开锚
$(5,4,2,2)@\,\mathrm{pos}\,0$（步 $134$）对 $cm26$ 正常演进，而 $cm16$ 停机于第 $170$ 步、
$cm51$ 于第 $990$ 步、$cm52$ 于第 $6294$ 步。因此停机性不可经时代层对应传递，
非停机证明逐台装配。
\item（大时代对齐是轨迹现象）$562$ 对 $R_0\ge 500$ 大时代的 $(L_0,R_0)$ 序列按秩对齐时
$(\Delta L,\Delta R)$ 取值：$m26\leftrightarrow m16\in\{(1,0)\!:\!556,(0,2)\!:\!6\}$、
$m51\in\{(1,-1)\!:\!556,(0,1)\!:\!6\}$、$m52$ 恒 $(0,2)$——分段矢量偏移带翻转点，
是轨迹现象而非排空层恒等式的推论（排空层恒等只约束时代内演化的簿记）。
\end{enumerate}
\end{proposition}
```

### English (paper-en.tex §4)

```latex
\begin{definition}[marked states and canonical realization]
A marked state is $s=(b,\mathrm{pos})$: $b$ lists all $1$-block lengths and $\mathrm{pos}$
indexes the working triple (the abstraction of an era-anchor event). The canonical
realization $\rho_M(s)$ separates blocks by $0^1$ except inside the triple, where the seam
widths are machine constants $cm16{=}(2,2)$, $cm26{=}cm52{=}(1,1)$, $cm51{=}(1,2)$; the head
and state are the machine's anchor event ($cm16$: $A0$ at the $L|R$ seam start;
$cm26{=}D0$, $cm51{=}A0$, $cm52{=}C0$ at the $R|Z$ seam start).
\end{definition}

\begin{theorem}[drain-layer correspondence]\label{thm:drain}
Let $F_M(s)$ denote the map from $\rho_M(s)$ to the exhaustion of the current era, with
output the lap count $\nu$ and the closing triple $(eL,eR,eZ)$. On the shared domain
$R\ge 4$:
\begin{enumerate}
\item $F_{cm51}=F_{cm52}=F_{cm16}$ field-by-field (and also at $R=3$);
\item $F_{cm26}=\sigma\circ F_{cm16}$, where the correction $\sigma$ acts only on odd $R$:
$\nu_{26}=\nu_{16}-1$ and $(eL,eR,eZ)_{26}=(eL-1,\;eR+2,\;eZ-1)_{16}$;
\item the terminal residues are $eR\in\{1,2\}$ ($cm16/51/52$) or $\{2,3\}$ ($cm26$), and
always $eL=L_0+\tfrac{R_0-eR}{2}$, $eZ=Z_0+\tfrac{R_0-eR}{2}$.
\end{enumerate}
$R=3$ is a structural divergence point ($3$ is already $cm26$'s odd terminal residue, so
$cm26$ has no drain continuation, while the other three run one further lap to $1$);
for $R\le 2$ the map enters the churn layer, outside this theorem. The correspondence is
abstract: lap periods differ per machine ($2R{+}13$/$2R{+}1$/$2R{+}5$/$2R{+}5$, $R$ = lap-start
reservoir).
\end{theorem}
\begin{proof}[evidence grade (machine-checked)]
(i) whole-orbit: over the $3\times 10^9$-step census the identity of (3) holds exactly for
all $166{,}976$ complete eras of the four machines (one cap-truncated snapshot per machine
excluded); (ii) synthetic table: $90/90$ all-clean non-exhausted rows identical (with
$\sigma$); (iii) counterfactual replay of real-orbit states: $30/30$ on $R\ge 4$.
Independent referee re-run: even $R$ $220/220$ identical, odd $R$ $220/220$ via $\sigma$
($R$ up to 439), $R=3$ divergent $20/20$.
\end{proof}

\begin{proposition}[three boundaries of the correspondence]\label{prop:boundary}
\begin{enumerate}
\item (churn layer) the eraB (post-reseed) component is identical on $0/110$ clean shared
rows and $0/40$ real states; $cm51$'s key changed in all $150$ observed cases (largest value
deviation $(-991,-598,0)$; unboundedness unproved), while $cm26$ agrees pairwise on $13/110$
rows --- the churn maps are non-identical (by counterexample), with no known quotient.
\item (halt predicate) the halt outcome is not a function on $S$: the first era-opening
anchor of $cm26$'s own orbit, $(5,4,2,2)$ at $\mathrm{pos}\,0$ (step 134), evolves normally
for $cm26$ but halts for $cm16$ at step $170$, $cm51$ at $990$, $cm52$ at $6294$. Halting
therefore does not transfer through the era correspondence; non-halting proofs are
assembled per machine.
\item (large-era alignment is a trajectory phenomenon) over 562 aligned pairs with
$R_0\ge 500$ the offsets are vector-valued with flips: $m26\leftrightarrow m16\in
\{(1,0)\!:\!556,(0,2)\!:\!6\}$, $m51\in\{(1,-1)\!:\!556,(0,1)\!:\!6\}$, $m52$ constantly
$(0,2)$ --- a trajectory phenomenon, not a consequence of the drain-layer identity (which
constrains only the within-era bookkeeping).
\end{enumerate}
\end{proposition}
```

## 11. 复跑清单（全部一行）

```
cd bb6/attacks-quad
node quad-equiv.mjs                     # 基线（exit=0；3 分钟）
node ref-fidelity.mjs                   # A：3 新锚 + 事件类扫描（exit 0 = PASS）
node ref-sigma.mjs                      # B：σ 网格 + quad6 抽检
node ref-count.mjs                      # C+F：390/60 重算 + 普查恒等式 + 562 直方图
node ref-halt-conj.mjs                  # E：170/990/6294 双引擎复现（exit 0 = PASS）
node ref-laplen2.mjs && node ref-words-param.mjs && node ref-words-small.mjs   # 机型字与周期
node ref-d26b.mjs                                                                     # 深锚典范形复核
cd ../../bb6-new/machines/quad/engines && node ref-lapword.mjs                # 论文配置下的字偏离（既有盲审脚本）
```

（ref-laplen.mjs 为草稿脚本，被 ref-laplen2.mjs 取代，可删。）
