# BMO 10 攻坚交接文档（主会话直接攻坚记录，2026-09-25 13:50）

目标：证明 BMO 10 博弈答案为 NO（最右 # 永不失活）⟹ 机器 `1RB0LB0RC0LD1LD1RE0LA0RF0RD1RF0RC---` 永不停机。
规则：`#0→1`（R1）; `#100→000#`（R2）; `#110→000#`（R3）; `#1010→1010##`（R4）。初始字 ⋯(10#)^∞·0^∞。
失活 ⟺ 最右 # 尾部以 `111…` 或 `1011…` 开头（已证：枚举全部 5-尾部）。

## 已确立（全部机器验证）

1. **TM=右优先策略**：TM 只在（删 # 视图下的）最右 # 上应用规则（前 agent 验证 212 步精确 + 25K 步窗口一致；TM 10^8 步不停机）。
2. **确定性右优先轨道（800K–2M 次重写，本会话独立模拟器，双向补给防边界伪影）经验事实**：
   - `111`、`1011` **从未出现**（任何位置）；
   - `11#`、`1#0`、`1#1` **从未出现** ⟹ **`1#` 后必为 `#`**（确定性轨道！全策略下 `1#` 可达）；
   - 5-gram 宇宙仅 64/243（完整缺失清单 `det-absent5.json`）；
   - 最右 # 尾前缀(8) 仅 66 种（top: `10101010`,`00010100`,`10010100`,`00000010`,`10000010`,`00010010`,`10010010`,`10100000`,`10100001`,`10101001`,…）；
   - 末两 # 间材料仅 199 种（`""`,`1010`,`10101010`,`000`,`0001010`,`1010000`,`101010101010`,…）——嵌套 `1010`-链+`000` 的"高速公路"计数器结构；
   - 最右 # 中心 31-窗口仅 3097 种（`windows-k8.json`/会话记录）。
3. **全策略空间的否定结果**（前 agent + 本会话复验）：
   - BFS 深度 80（1.57M 构形）无 YES；`111`/`1011` 任意位置不出现；
   - 因子型不变量阶梯（本会话 ladder2–ladder5.mjs，严格封闭语义）：**发散**——朝无限族 `#0^k1`/`#0^k#` 爆炸；且 `#01`/`#001`/`1#0`/`#1010` 等在**随机策略**深层可达（我 25 万步随机轨迹中 `#01` 出现 450+ 次，前驱 0/#）；
   - 纯有限窗口抽象失败（含计数器）；幻影上下文障碍确认。
4. **右优先轨道的伪影教训**：模拟必须双侧补给（左补 `10#`、右补 `0`）——否则会先后伪报"INACTIVE"（tail 空）与"无 #"。

## 推荐证明架构（下一步）

**参数化宏规则系统**（Skelet-10 模板，参考 bb6/attack-sparse1.md 方法论）：
- 宏态 = 高速公路计数器参数化构形：建议形式 `(c1,…,ck)`：`#`-链间材料模式（`1010`^a · `000`-run · … 的计数值）+ 最右 # 的面对模式；
- 从 2M 步轨道的 (尾前缀 × 间隔) 联合分布（66×199 截断后更小）归纳宏规则；
- 对每条宏规则证明：尾前缀集合封闭且不含 `111`/`1011` 前缀，`1#⟹#` 保持；
- 归纳于计数器值（机器检查每条规则的代数）。
- 关键子目标（可能是引理）：确定性轨道上 **`1#` 后必 `#`** 的保持性——它阻断 R1 在 `1#0y` 的发射（`111`/`1011` 的唯一产生源）。
- 最终链条：宏系统归纳 ⟹ 尾部永无 `111`/`1011` 前缀 ⟹ 最右 # 恒活 ⟹（TM=右优先）TM 永不停机。
- 同时需补强 TM⟺右优先 对应的严格论证（占优性：TM 的确定轨道=右优先轨道，已在删 # 编码下验证 25K 步）。

## 工具（bb6/attacks-bmo10/ 与 bb6/sim/）
- `ladder2–5.mjs`：因子不变量阶梯（严格封闭语义在 v5）；
- `census2.mjs`：多策略 k-窗口普查（常数内存）；
- `gamecheck.mjs`（sim/）：随机策略断言器；
- `invclosure.mjs`（sim/）：任意禁串集的全上下文封闭性验证器；
- 本会话的确定性轨道模拟器代码在各 node -e 命令中（重写为文件待后续 agent 完成）；
- `det-absent5.json`：确定性轨道 179 个缺失 5-gram。

## 补充（14:05）

- RLE 记号化（窗口=倒数第2个#起、最右#+16、游程截断9）宏态 3392 种、转移 5910 种，**出边数分布非 1**（2250 个宏态出边 1，其余 2–22）⟹ 截断抽象不确定——游程长度（计数器值）是真参数，必须参数化（勿截断）。
- 顶级宏态呈现清晰高速公路结构：`#2.11.01.11.04.11.02.…`（#-游程 + 单独的 `1` 原子 + 0-游程交替）。设计参数化宏态时建议：状态 = (#-游程向量, 0-游程/1-原子交替的模版序列)，参数 = 各游程精确长度。
- `det-absent5.json` 中 `0#0**`、`1#0**`、`1#1**` 全缺 ⟹ 确定性轨道上 **`[#] 后跟 0 时…** 需机械整理成封闭条件表（agent 任务 1）。
- 伪影警告（重申）：双侧补给；左截断须保留 ≥5 个 #。

## Phase 3 update (2026-09-25 20:00) — READ attack-bmo10.md §3 (Phase 3) FIRST

New verified tools (all in attacks-bmo10/, all differentially verified 500K steps vs p_lib Det):
- `q_stack.mjs`: exact stack machine (mats/r/region). THE macro object. Materials ∈ ^(10)?(000|1010)*$ by construction (verified 3M steps).
- `q_parse.mjs`: region as explicit block parse (units A/Z/T/s + pseudos, offset).
- `q_meas.mjs`, `q_meas2.mjs`: danger-position measurements.

Established this session (all in attack-bmo10.md §3):
1. **Lethality fully localized**: `111`/`1011` can only be created at R1 seams; conditions (P1)/(P2) there; everything else trivially safe. Danger position = suffix `011`/`0011`; win ⟺ head lands on one at R1 / head `111|1011`.
2. **10^8 rewrites: never inactive; min danger distance = 1 (never 0)** (`q_stack_1e8.log`; R3 fired 290×; region ≤ 245; stack ≤ 25).
3. **Near-field danger automaton CLOSED** (§3.9): shape always `0011`, states d ∈ {1,4,5,7,8,10,11,12}×r, funnel {10,11,12}→{7,8}→{4,5}→{1}→dead. Traps d∈{2,3}@R2-time, d=6@R4-time are provably lethal — the orbit avoids them because block content dictates R2-vs-R4.
4. Locality: ≤167 symbols between flushes; ≤7 cascades; region ≤16 chunks; quasi-period 717·2^k / 2033·2^k (counter doubling — plain finite exploration cannot close; 619K distinct projections @2M steps).

THE REMAINING PROGRAM (for the next agent): the material-traversal lemma (§3.9 final statement): a FINITE memoized check over (r, offset, block-run-summary of current material) × (post-seam context classes) with the flush recursion (stack-top patterns, family closure under deposits). Materials are small (≤~40 symbols, runs ≤ 6): the per-material transducer is finite. If it closes, THEOREM: rightmost # always active on the deterministic play ⟹ BMO10 = NO ⟹ (via TM=rightmost-# correspondence, §4/§3.7) the holdout machine never halts.
- `q_tmalign.mjs` (fixed matcher; trailing-zero subtlety): 92 ordered exact matches, stalls at g=93 (checkpoint instants need head/state modeling; predecessor's verify-align reached 212 exact/25K windowed).
