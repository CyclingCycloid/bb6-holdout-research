# cm2 独立复算审计报告（reverify）

- 审计对象：cm2 = `1RB1RA1LC0RC---0LD0LE0RF1RE0RA0LF1LB` 无条件非停机证明
  （叙述：`bb6/attack-cm2.md`；引擎与工件：`bb6/attacks-cm2/`）。
- 审计员：独立复算，不信任既有结论；全部抽样为新跑（新鲜检查点 / 新鲜参数 / 新鲜步区间）。
- 环境：Node v24.16.0，gcc 15.2.0（MinGW-W64），Windows/Git Bash。C 工具：attacks-cm2/ocm.exe（裸机 oracle）、attacks-cm2/stateseq.exe。
- 审计脚本（全部新建，未改动任何现有文件）：`bb6/reverify-cm2/audit1-freshpoint.mjs`、`audit2-halt.mjs`、`audit3b-inv.mjs`（及粗扫版 audit3-inv.mjs）、`audit4-dispatch.mjs`、`audit4b-g6o2.mjs`、`audit5-sigma.mjs`；复跑日志均在 `bb6/reverify-cm2/`。
- 方法注记（两处审计侧假警报，均已定位为审计脚本自身问题，非引擎问题）：
  1. macro2 的 S 例程按**格**发事件、macro3 按**整段 1-run** 发事件（xval-fast.mjs 原作者即为此丢弃 S 项比对）。对拍时须将 macro3 的 S 展开为逐格事件。
  2. 全构型 (g1,1) 对扫描会把 **A 族 M=1 终端标记**（`1^L 0^1 1^1 0^5 1^R`，头左邻的工作区结构）误计为违例；INV-T 是关于**尾字母表**的命题，须按对的位置（头右侧）分类。

---

## 总判定

| # | 审计项 | 判定 |
|---|---|---|
| 1 | 引擎忠实性（新鲜检查点 3×10⁹ / 7×10⁹ 三重对拍） | **PASS** |
| 2 | 停机刻画双向复核（g5B-L2 H2 / g1g1-R1 H1 等 14 格） | **PASS** |
| 3 | INV-T/INV-R 在 4–5×10⁹ 新鲜段复核 | **PASS**（尾侧 0 违例；见方法注记 2） |
| 4 | 分派边界新鲜参数抽查（D1/D2/D3） | **D1 PASS、D2 PASS、D3 叙述公式有误**（实测修正律已给出；引擎自洽、输出仍落 A 族，不影响封闭性与停机排除链） |
| 5 | hclosure 复现 | **PASS**（177 模式、iter-8 零新增） |
| 6 | 台账数字核对 | **PASS**（6.59M/16.6M/1152/68→4/177 全部对上） |
| 7 | σ-换名等价抽查（2 实例） | **PASS** |
| 附A | tailfront.mjs g6o1/g6o2 行实参错位（tf.log 对应两节无效；正确接线补查后 INV-T 结论仍成立） | **工件缺陷（证据级，非证明漏洞）** |
| 附B | L7 "1.67e9 A-访问" 系量级笔误（实测 166,568,637 ≈ 1.67×10⁸） | 台账小误 |

**总体**：主定理（cm2 永不停机）的机器核查链在本轮独立复算下**成立**；发现 2 处工件/叙述级缺陷（§5c D3 的 g6o2 输出闭式错误；tailfront.mjs g6 两节实参错位）与 1 处台账笔误，均经独立实测定位，**不影响任何停机排除论证与闭包结论**（详见 §4/§4b 与影响分析）。

---

## 1. 引擎忠实性新鲜点（PASS）

原 agent 的对拍区间：runsim↔stateseq [0, 3×10⁶)；macro2↔oracle CAP=2×10⁷ 步；macro3↔macro2 CAP=10⁸ 步。本轮在 **agent 从未配对过的检查点 3×10⁹ 与 7×10⁹** 重跑三重对拍。

命令（bb6/reverify-cm2/ 下）：
```
node audit1-freshpoint.mjs 3000000000 3000
node audit1-freshpoint.mjs 7000000000 3000
```
方法：用 macro3 从空白推进至目标步附近（运输），在该 A-访问边界快照构型，自同一快照分别实例化 裸机 RunTape（纯 step1）、macro2（例程层）、macro3（闭式层）；跑 3000 个 macro 步；macro2↔macro3 逐事件比对（S 展开为逐格），裸机逐 step 推进并在每个 macro 边界比对 (态=A, 头位, 全 RLE)。

输出摘要：
```
checkpoint: step=3000000003 head=401 runs=7   config: 1^1614 0^1 1^740 0^3 1^527 0^2 1^538
macro3<->macro2 (expanded): n=3000 ok=3000 bad=0 (m2 3000, m3 5528)
bare  <->macro2           : boundaries=3000 ok=3000 bad=0 (bare reached 3000009944 / 3000009944)
AUDIT1 VERDICT(3000000000): PASS

checkpoint: step=7000000414 head=726 runs=5   config: 1^1933 0^1 1^1471 0^2 1^1184
macro3<->macro2 (expanded): n=3000 ok=3000 bad=0 (m2 3000, m3 5928)
bare  <->macro2           : boundaries=3000 ok=3000 bad=0 (bare reached 7000009561 / 7000009561)
AUDIT1 VERDICT(7000000000): PASS
```
（注：7×10⁹ 首轮曾报 boundaries=2999/2999 bad=0，系审计脚本漏查最后一个边界；修复后重跑见上。两检查点均为全同：例程类、精确步数、头位、全 RLE 三方逐边界一致。）

## 2. 停机刻画独立复核（PASS）

L5 断言：停机 ⟺ 冲刺落点紧邻 (0¹,1¹,0¹)（H1）或 F 扫描入空白（H2）。从 6 个停机格族中取 **g5B-L2（H2）与 g1g1-R1（H1）** 两族做双向复核（另附 g6o1-L2 与 (g1,1) 毒尾一致性组）。每格同时用：裸机 RunTape、C oracle `ocm.exe from`、macro3 单时代。

命令：`node audit2-halt.mjs`。输出（14/14 PASS）关键行：
```
PASS g5B L=2 tail(g2,9) expect=HALT | bare: HALT@34 | oracle: HALT@34 | macro3-era: HALT-DBL@35
PASS g5B L=1/3/4/5 tail(g2,9) expect=RUN | bare: no-halt 2e6 步, 36–65 万次 A-访问 | oracle: DONE | era 正常收尾
PASS g1g1 R=1 expect=HALT | bare: HALT@11 lastA0win=010@h=45 (H1 几何) | oracle: HALT@11 | HALT-L1@12
PASS g1g1 R=2,3 expect=RUN | bare: no-halt 2e6 步 | oracle: DONE | era 收尾 (L1)
PASS g6o1 L=2 expect=HALT（H2，本轮新发现族）| bare/oracle HALT@34；L=3,6 RUN ✓
PASS g5B-poisoned L=1/4/5 tail(g1,1) expect=LATE-HALT | 首时代不 halt、随后时代经 (g1,1) 尾对 H1 停机（bare=oracle=HALT@178/542/732，窗口=010）——与理论"尾 (g1,1) 必致 H1"一致
```
双向结论：停机格真停（裸机+C oracle 双确认，且最后 A0 窗口呈 010=H1 / 空扫=H2 几何）；非停机格在 INV-T 合规尾下 2×10⁶ 步内零停机且时代正常收尾。毒尾组的晚停机恰是理论预测（INV-T 排除此类尾），不构成反例。

## 3. 不变量新鲜轨迹复核（PASS）

新鲜段 **[4×10⁹, 5×10⁹)**（agent 的 invariant.mjs 只在 ≤2×10⁹ 引用过；shape2 1e10 只数形状未查对）。每个时代边界处检查：全构型 (g1,1) 对按位置分类（头左侧且后随 0^{3,5,6} = A/g3 族 M=1 终端工作区结构，头右侧 = 尾侧违例）、g1g1 形标记（头在 M 左缘的 `1^L 0^1 1^M 0^1 1^R`）的 R≥2、H1 前提扫描。

命令：`node audit3b-inv.mjs 4000000000 5000000000`（粗扫版 audit3-inv.mjs 先行暴露了 60 个全构型命中，全部样本形如 `1^2496 0^1 1^1 0^5 1^1257` = A-M1 终端标记，头左侧工作区结构）。输出：
```
window [4e9,5e9): era-boundaries=122984 (total eras 862187)
(g1,1) pairs: work-zone-left(A/g3 M=1 terminals)=60, TAIL-side=0 (expect 0), other/unclassified=0
INV-R: g1g1 markers=20, minR=93 (expect>=2), R=1 count=0
H1 preconditions: 0
AUDIT3b VERDICT: PASS
```
佐证：agent 原工具 invariant.mjs 原样重跑——CAP=1e9：`A-visits: 166568637 eras: 293846 H1-precond hits: 0 (g1,1)-pair hits: 489`；CAP=4e9：`A-visits: 666420183 eras: 739203 H1-precond hits: 0 (g1,1)-pair hits: 794`。全构型 (g1,1) 命中自 1e9 起即存在（样本 `1^21 0^1 1^1 0^5 1^9`@t=3937，同为 A-M1 工作区结构），叙述从未引用过全构型 0 命中——INV-T 的"尾侧 0 违例"与工件一致；t=1e9 处时代数 293,846 与叙述引用一致 ✓。

## 4. 分派边界抽查（D1/D2 PASS；D3 叙述公式有误）

新鲜参数（dispatch.mjs 枚举之外）：g5B L∈{13,17,25}（原表只到 12）；g6o1 (L,R)∈{(7,4),(12,3)}；g6o2 (L,R)∈{(5,3),(8,7),(18,9)} 及 16 格系统网格 + 尾块敏感性扫描；g6o2 结论另用**裸机驱动的 macro2** 独立复测（8 格，含 L∈{1,2}）。

命令：`node audit4-dispatch.mjs`、`node audit4b-g6o2.mjs`。输出摘要（8/8 PASS）：
```
PASS D1 g5B L=13/17/25 (M2,R2) → 1^3 0^1 1^{L-4} 0^5 1^3 0^2 1^2 0^1 1^1 0^2 1^7 @3-:1
      （与 dispatch.mjs 自家 L=5..12 输出 B3,g1,B{L-4},g5,B3,g2,B2,g1,B1,g2,B7 完全同律；旧 R 块转为新尾首对 (g2,2)）
PASS D2 g6o1 (7,4)/(12,3) → A(3, L-4, 1, 前插(g1,R), deep) @3-:1   （叙述公式逐字成立）
PASS D3* g6o2 (5,3)/(8,7)/(18,9) → 1^3 0^1 1^{L+R-1} 0^5 1^10 0^2 1^7 @3-:1 （修正律）
```

**D3 差异表（叙述 vs 实测）**：

| 项 | attack-cm2.md §5c D3 原文 | 独立实测（macro3 网格 + macro2 裸机复核） | 判定 |
|---|---|---|---|
| 输出族/头位 | A 族 | A 族 @3-:1（16/16 格一致） | 一致 |
| M′ | L+1（"与 R 无关"） | **L+R−1**（R=2 时恰为 L+1；(5,3)→7≠6、(8,7)→14≠9、(18,9)→26） | **不符** |
| R′ | R+1 | **尾首块+1**（尾 (g2,9) 时恒 10；尾块敏感性 1/2/3/5/9/20 → 2/3/4/6/10/21） | **不符** |
| 尾 T | 携带 | deep (g2,7) 携带 ✓；g6o2 自身 R 块并入 M′ | 部分不符 |
| 停机 | 无停机 | 16 格 + L∈{1,2} 格全部无停机（"L∈{1,2} 未见"系未测，非不可达） | 一致 |

**影响分析**：D3 错误源自把 R=2 行（L+1、B*）过度泛化（R≥3 行在 dispatch.mjs 输出中显示为 B*，无法区分 L+1 与 L+R−1）。修正后输出仍落 **A 族 @3-:1**，族图闭包（hclosure 直跑引擎，不用 D3 文本）、D4 中转、入口不可达性论证（g6o1-L2/g5B-L2/g1g1-R1/g2L-M1 的排除链均不依赖 g6o2 输出参数的具体值）**均不受影响**。属叙述/台账级错误，非证明漏洞。

### 4b. 附加发现 A：tailfront.mjs 的 g6o1/g6o2 行存在实参错位（工件缺陷，证据级）

`tailfront.mjs` 对单参数族用 4 形参 `mk(L,R,g,S)`，但主循环统一按 5 实参调用 `mk(L, M, R, g, S)`：实际跑的构型是 `1^L 0^6 1^2 0^{R_loop} 1^{g_loop} 0^2 1^7`（R 恒 2、gap←R_loop、块←g_loop、S_loop 被丢弃）。验证：用错位构型 `1^3 0^6 1^2 0^2 1^2 0^2 1^7`（头 5）复跑，精确复现 tf.log 存档行 `1^3 0^1 1^4 0^5 1^3 0^2 1^7`。⇒ **tf.log 中 g6o1/g6o2 两节的 (g,S) 格并非其标注的格**；§5d INV-T 引用 "tailfront.mjs 全族×(g,S) 格" 对这两族不成立。其余 8 族（A/g5B/g3/g1g1/g12/g2L/g4A/g4，mk 均为 5 形参）接线正确。

**补救核查（本轮新跑，正确接线）**：g6o1/g6o2 × (L,R)∈{(3,2),(18,6)} × (g,S)∈{1,2}×{1,2,3,5,9} 全 40 格：
- g6o2 in(g1,1) → HALT-L1（即 §4/§5c 已知停机格）；g6o1 in(g1,1) 时代内不停机，尾对 (g1,1) 原样携带（毒进毒出）。
- 其余 38 格输出尾首 ∈ {(g1,S≥2), (g2,S), (g3,S−2), (g2,R_old)}，**无新生 (g1,1)** ⇒ INV-T 对 g6o1/g6o2 的结论本身成立，只是原引用证据无效；正确证据由 census2/3（接线正确）+ dispatch.mjs + 本网格补齐。
- 顺带：g6o1(L18,R6) 输出 `1^3 0^1 1^14 0^5 1^1 0^1 1^6 T` 与 D2 闭式（A(3, L−4, 1, 前插(g1,R_old))）逐字一致——D2 再获一组独立确认。

## 5. 闭包复现（PASS）

命令：`node hclosure.mjs`（原脚本未改，输出存 reverify-cm2/hclosure-rerun.log）。输出：
```
iter0: patterns 88 new 88 halts 33   iter1: +38=126   iter2: +21=147   iter3: +15=162
iter4: +6=168    iter5: +4=172      iter6: +3=175    iter7: +2=177
iter8: new patterns 0 total 177
CLOSURE at iteration 8
```
与叙述"iter-8 达不动点，177 个模式，0 新增"**逐字一致**。33 个种子停机格族分布（g5B-L2/g3-(g1,1)/g11-R1/g6o2-(g1,1)/g4A-R1）与 §4/§7c 记载相符。

## 6. 工件数字核对（PASS）

| 台账数字 | 来源 | 复跑结果 | 判定 |
|---|---|---|---|
| 6.59M（6,586,326 A-访问全同） | xval-macro CAP=2e7 | `ok=6586326 bad=0 (oracle 6586326)` | ✓ |
| 16.6M（16,583,495 例程边界全同） | xval-fast CAP=1e8 | `stream lengths 16583495 16583495 … ok=16583495 bad=0`（需 --max-old-space-size 加堆） | ✓ |
| 3M 步 runsim↔stateseq | xval-runsim [0,3e6) | `ok=3000000 bad=0` | ✓ |
| 1,152 普查格 = 665+407+80 | census2/3 | census2 复跑 `cells: 665 halts: 68` **与存档 log 逐字节一致**；census3 `cells: 407`（+halt 48）/ `iter2 cells: 80`（+halt 12） | ✓ |
| 68 停机格 → 4 族 | census2.log | 68 = g5B 42 + g11 14 + g3 9 + g6o2 3，恰 4 族 | ✓ |
| 177 模式 / iter-8 | hclosure | 见 §5 | ✓ |
| （附）1e9 步 293,846 era | 叙述 §3 | audit3 推进线 `t=1000000009 eras=293846` | ✓ |
| （附）L0：空白→1^3@t=8 | §6 L0 | 8 步后 `1^3`，态 A，头 2 | ✓ |
| （附）L7 "1.67e9 A-访问" | §6 L7 | invariant.mjs 1e9 实测 A-visits=166,568,637 ≈ **1.67×10⁸**——原叙述量级笔误（10⁹ 应为 10⁸）；H1 0 命中与 eras 293,846 则逐字对上 | 量级笔误 |

## 7. σ-换名等价抽查（PASS）

取 @r4+:0 型输出态 `…0^g 1^{R′} T`（头在 R′ 左缘）与规范 g12 标记 `1^11 0^1 1^{R′} 0^2 1^S 0^2 1^7`（头在 R′ 左缘）各 2 对实例；每实例同时用 macro3 与 macro2（裸机驱动）跑一个时代，逐事件比对 (例程类, 步数增量, 相对头位)，并检查输出 = 前缀原样携带 + 窗口逐 run 相同 + 头偏移相同。

命令：`node audit5-sigma.mjs`。输出：
```
PASS sigma-1: 1^25 0^4 vs g12(1^11 0^1), R'=6, tail (2,3)(2,7)
   逐转移序列相同（7 例程, S×6+Dance）；输出窗口 1^2 0^5 1^4 0^2 1^7 @headRel=3 两边一致；
   前缀 1^25/0^4 与 1^11/0^1 各自原样携带
PASS sigma-2: 1^40 0^5 vs g12(1^11 0^1), R'=12, tail (2,5)(2,7)
   逐转移序列相同（13 例程, S×12+Dance）；输出窗口 1^8 0^5 1^6 0^2 1^7 @headRel=9 一致；前缀携带
```
σ 断言（冲刺/落点/波分派逐一相同、仅绝对位置平移、σ-像后继保持）在两实例上**逐规则成立**——左侧 gap 宽 4/5 与前缀长度差异完全不进入时代力学。

---

## 复现命令一览（本轮全部新跑）

```
cd bb6/reverify-cm2
node audit1-freshpoint.mjs 3000000000 3000        # T1 @3e9（PASS）
node audit1-freshpoint.mjs 7000000000 3000        # T1 @7e9（PASS）
node audit2-halt.mjs                              # T2（14/14 PASS）
node audit3-inv.mjs 4000000000 5000000000         # T3 粗扫（暴露 A-M1 工作区对）
node audit3b-inv.mjs 4000000000 5000000000        # T3 位置感知（尾侧 0 违例）
node audit4-dispatch.mjs                          # T4（8/8 PASS，D3 用修正律）
node audit4b-g6o2.mjs                             # T4 g6o2 系统网格（16 格 + 敏感性）
node audit5-sigma.mjs                             # T7（2/2 PASS）
node ../attacks-cm2/hclosure.mjs                  # T5（177/iter-8）
node ../attacks-cm2/xval-macro.mjs 20000000       # T6（6,586,326）
NODE_OPTIONS=--max-old-space-size=12288 node ../attacks-cm2/xval-fast.mjs 100000000   # T6（16,583,495）
node ../attacks-cm2/xval-runsim.mjs 0 3000000     # T6（3,000,000）
node ../attacks-cm2/census2.mjs                   # T6（665/68，与存档一致）
node ../attacks-cm2/census3.mjs                   # T6（407+80）
node ../attacks-cm2/invariant.mjs 1000000000      # T3 佐证（agent 原工具 1e9 口径）
node ../attacks-cm2/invariant.mjs 4000000000      # T3 佐证（agent 原工具 4e9 口径）
node ../attacks-cm2/dispatch.mjs                  # T4 对照（原表原始输出）
```

（g6o2 D3 修正律另经 macro2 裸机驱动引擎独立复测 8 格，脚本见 audit4b 说明，命令内联于会话记录。）
