# cm2 — `1RB1RA_1LC0RC_---0LD_0LE0RF_1RE0RA_0LF1LB`

Cubic Mess 家族。动力学：五状态波 + F 舞 + E 填充的"质量传送机"。

## 结果

- **条件定理**：cm2 永不停机，条件于轨迹避让命题（见下）。
- **无条件部分**：停机刻画（H1/H2，转移级穷尽）；扫掠守恒 Q=L−3R（逐格代数）；致死前像集 P 共 193 格、每格独立裸机验证；**cm2 停机 ⟺ 扫掠-重启分段仿射轨迹首次进入 P**（归约定理）；若停机则 > 3×10^10 步（狩猎 3×10^10 步 / 283 万时代零命中）。
- **障碍**：三族闭合技术（路线常数、剩余类、线性不变量）均确定性失效于 M2/M1 重启（各有反例或否定定理）。研究域：分段仿射迭代可达性（Conway 类；ZFC 独立性不可排除——Kurtz–Simon 谱系）。
- undecided 状态未改变。

## 文件

| 文件 | 内容 |
|---|---|
| `proof-full-zh.tex/.pdf` | 完整证明版（注意：早期 C=0 表述已被评审轮修正，终版以 dossier 台账为准） |
| `paper-zh.tex/.pdf` | 紧凑版论文 |
| `case-tables.md` | 例程/分派案例明细 |
| `dossier.md` | 完整方法叙述（§1–§14，含致死库与修复轮全记录） |
| `engines/` | `ocm.exe`（oracle）、`macro2/3`、census/dispatch/hclosure2/tailfront/invariant/shape2 全套（一行可跑）；`lethal-db.json` 致死前像库 |
| `verification/` | 对抗评审报告（7 major 修复记录）、独立复算报告（9 项 PASS） |
