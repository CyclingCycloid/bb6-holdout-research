# cm2 — `1RB1RA_1LC0RC_---0LD_0LE0RF_1RE0RA_0LF1LB`

Cubic Mess 家族。动力学：五状态波 + F 舞 + E 填充的"质量传送机"。

## 结果

- 主定理（归约，paper-zh 定理 6.4）：cm2 停机 ⟺ 时代轨道进入显式有限集 P（193 格，逐格裸机验证）；已验 k ≤ 2,830,885（3×10^10 步）不进入。
- 无条件组件：停机刻画 H1/H2（转移级穷尽）；干链定理与 g5B 分派（完整代数推导）；扫掠守恒（pop、Q=L−3R、M mod 4）；M4 入口封闭（mod 4 矛盾，完整证明）。
- 开放问题（paper-zh §7）：轨迹避让猜想——三条进攻路线（路线常数、剩余类、线性不变量）的否证在册；范式定位：分段仿射迭代可达性（Conway 1972 / Kurtz–Simon 2007 谱系）。
- undecided 状态未改变。

## 文件

| 文件 | 内容 |
|---|---|
| `paper-zh.tex/.pdf` | 数学论文（中文）：完全推导 + 开放问题 |
| `paper-en.tex/.pdf` | Mathematical paper (English edition, theorem-by-theorem counterpart) |
| `case-tables.md` | 例程/分派案例明细 |
| `dossier.md` | 方法叙述与全部实验记录（§1–§14） |
| `engines/` | ocm.exe（oracle）、census/dispatch/hclosure2/tailfront/invariant/shape2 全套；lethal-db.json |
| `verification/` | 对抗评审报告、独立复算报告 |
| `history/` | 历史工作记录：论文成稿前的节草稿与对抗评审过程记录（sec9–sec13、fixround、final-sections；时点用语保留） |
