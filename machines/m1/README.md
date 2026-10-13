# M1 — `1RB1LA_0RC0RD_1LC1LA_1RE1RD_1LF0LA_---0LE`

Cubic Mess 家族（mxdys 台账行 736）。本战役第一台深挖机。

## 结果

- **条件定理（两形式）**：M1 从空白带启动永不停机，条件于假设 M；第二形式"永不停机 ⟸ 漂移律 M″ + 类保持"（出生序列路线：根归约 + E1-重入 3|A + 危险键奇偶歼灭 + 8 窗口族全灭 + m≤40 断言表）。
- **无条件部分**：Σ≡0 mod 3 台账（整半空间不可达）；停机 ⟺ 2-幂根出生（根归约锐化）；E1-重入根全灭（3|A，占根 90.5%）；19/20 观测类按键定义永久安全；停机构型 G(a=3) 结构性不可达（头部形式 a+1 = 2^j·奇≥3；支配引理保证 h≥82 一切比较裕度恒正）；一切轮类 ≤ 2000 的运行不停机（逐类穷尽）——按记录时刻表 ×4/级爬升律（实测至第 32 级）折算为 ≳ 2^(2^2000) 步。
- **障碍定理**：假设 M ≡ 自主映射 α↦α+Δα(ν₂(α+1)) 的记录时刻表无限延续（≡ M″ 的窗口枚举完全性；分段仿射迭代的轨道命中问题）；周期排除定理 + 必要精度定理证明其在本架构内不可有限闭合。研究域：广义 Collatz / 分段仿射迭代（Conway 1972 不可判定类；Kurtz–Simon 2007 独立性）。
- undecided 状态未改变。

## 文件

| 文件 | 内容 |
|---|---|
| `paper-en.tex/.pdf` | Complete paper (English): conditional main theorem + envelope + exclusion theorem |
| `reduction-zh.tex/.pdf` | 数学论文（中文）：归约链完全推导（定理-证明体；与 cm2/quad 的 paper-zh 同性质，因内容为完全推导长文故名 reduction） |
| `dossier.md` | 完整方法叙述（引理-证明-机器三元组 + 台账） |
| `engines/` | 全套引擎与表：`sym4.mjs`（逐类直推）、`sym5.mjs`（主控+盲测配方）、`phase1.mjs`、`o1.exe`（oracle）、`sym4-table.txt`（1024 行）；ladder 用 `node ladder.mjs 64 200000` 再生 |
| `verification/` | 对抗评审报告、独立复算报告 |

复跑入口：见 `dossier.md` §持久表；第三方盲测配方在 `paper-en.pdf` 附录。
