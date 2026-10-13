> 历史工作记录：cm2 论文（paper-zh/paper-en）成稿前的节草稿与对抗评审过程记录，2026-10-12 自 engines/ 移入 history/。文中"本轮/会话/修复轮/收口/终局裁决"等为写作时点的工作用语；最终表述以论文与 dossier.md 为准。


## 10. 终轮：入口封闭战果与 C=1 终版

### 10.1 本轮闭合

* **M1-重启 R₀′ = 1**（158/158）；**M2-重启 R₀′ = R+2**（171/171）——R₀′ 全闭。
* **4 个 R ≤ 4 特例**（M3-Ψ 的 miss 集）：(6,3,2)→(6,11,2)、(12,3,4)→(3,20,1)、
  (29,3,3)→(3,38,1)、(741,3,2)→(3,745,2)——分别落入 M3(R₀=2, R_term=4)、M4 类、
  M2 类、M1 类，**均不入谱系** ✓。
* **M1-入口的谱系前置**：R₀′=1 ⟹ M3-终点 R = 1+(M₀′−3)/4 ∈ {8·4ⁿ−1} ⟺
  M₀′ ∈ {32·4ⁿ−5} = {27, 123, 507, …}。观测 M0′ ∈ {11,16,31,41,45,46,49,55,66,72,77,80,108,111,133,142,150,152,175,193,198,220,231,341,…}
  ——**零命中** ✓（但 M₀′ mod 4 遍历 {0,1,2,3}：模 4 障碍对此入口证明性失效）。
* **M2-入口的谱系前置**：R₀′=R+2 ⟹ M₀′ ∈ {32·4ⁿ−13−4R}；观测 M0′ ∈ {L−1, L, L−2, L+12, …}
  （路线分段）——**零命中** ✓（同样无模障碍）。
* **mod-24 观察**：谱系 {7,31,127,…} ≡ 7 (mod 24)；观测 M3-终点 R ≡ 7 (mod 24) **零命中**；
  但 R ≡ 1 (mod 24) 的非谱系值（25, 49, 97）在观测中出现——**剩余类检验单独不闭合**
  （谱系是 ≡ 1 (mod 6) 树的真稀疏子集，需精确算术）。

### 10.2 残余（命名的最后缺口）

**LEM-R′（M2/M1-重启算术引理）**：M2/M1 路线的 M₀′ 分段闭式（经 g5B 的 L-分支 /
g6 子分派 / 尾首类，各有限 case）满足 M₀′ ∉ 谱系前置值集
（M1 路线：{32·4ⁿ−5}；M2 路线：{32·4ⁿ−13−4R}）。
**模 4 方法对这两条入口证明性失效**（M₀′ 遍历全部剩余类）——排除若真，
必来自路线常数的精确算术。观测 329/329 零违例（1e9 步）+ 1e10 步零停机。

### 10.3 台账终版

| 层 | 内容 | 级别 |
|---|---|---|
| L1 引擎忠实（三重对拍 + 评审复算） | A | ✓ |
| L5 停机刻画 + 致死集 = 谱系 {8·4ⁿ−1}（机器确立，全 L 链验证） | A | ✓ |
| 扫掠定理（对角算术 + Ψ 逐类：M4 164/164、M3 162/166+4 特例、R₀′ 全闭 329/329） | A− | ✓ |
| 入口封闭：M4（模 4 矛盾 ∎）、M3 谱系（自封闭）、初始态、4 特例 | A− | ✓ |
| **LEM-R′（M2/M1 路线 M₀′ 排除）** | **C** | **未证——唯一残余** |
| 实轨（1e9 零谱系命中；1e10 零停机；1.67e9 A-访问 H1 前提 0） | B | ✓ |

**主定理（条件终版）**：cm2 永不停机，条件于 LEM-R′。
装配：扫掠定理 ⟹ 尾空子轨道 = Ψ-驱动的扫掠序列；致死集 = 谱系；四入口中三闭 +
LEM-R′ 待闭 ⟹ 谱系不可达 ⟹ 无停机。（若 LEM-R′ 失败——即某 M2/M1 路线常数落入
谱系前置集——则 cm2 在有限但极远的时代停机；届时该路线给出精确停机时刻的构造。）

### 10.4 主定理论文块（条件版，英文）

**Theorem (conditional).** cm2 = `1RB1RA1LC0RC---0LD0LE0RF1RE0RA0LF1LB`, started on a
blank tape, never halts, conditional on LEM-R′ (the M2/M1-restart arithmetic lemma).
The tail-less sub-orbit decomposes into diagonal sweeps (L,M,R) → (L+3,M−4,R+1) with
population conserved and terminal M ≡ M₀ (mod 4); the restart maps are Ψ(M4) = (3, pop−1, 1)
(exact, 164/164), Ψ(M3) = (L+8, R−4, 1) (exact, 162/166, four R ≤ 4 special cases safe),
R₀′(M1) = 1 and R₀′(M2) = R+2 (exact, 329/329). The complete lethal set of the tail-less
sector is the lineage {8·4ⁿ − 1}: an empty-tail M3-terminal with R in the lineage halts
(at every L, machine-verified), and every other putative poison cell of the earlier
analyses is chain-safe (their "poison chains" were work-pair detector artifacts). Entry
routes into the lineage: the M4-restart is excluded by a mod-4 contradiction (pop ≡ 0
required, lineage preimage demands pop ≡ 3); the M3-lineage is closed under its own map;
the initial state is safe; four special dispatches are verified safe. The two remaining
entry families (M2/M1-restarts) have no modular obstruction — their exclusion, verified
empirically at 329/329 restarts and along 10^10 raw steps, is exactly the content of
LEM-R′. ∎(conditional)