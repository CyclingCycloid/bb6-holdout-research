# BB(6) Holdout Research

2026-09-25 至 10-13 对 BB(6) holdout 机器的结构分析档案。每台深挖机一篇数学论文（定理-证明体、完整量词、缺口作为精确数学问题）。

## 机器

| 目录 | 机器 | 论文 | 主定理 |
|---|---|---|---|
| machines/m1 | M1 `1RB1LA_0RC0RD_1LC1LA_1RE1RD_1LF0LA_---0LE` | `reduction-zh.pdf`（中，完全推导）/ `paper-en.pdf`（英） | 永不停机 ⟸ 假设 M（≡ ν₂ 记录时刻表延续；周期排除定理证不可有限化）；无条件：停机不可达 + 类 ≤2000 域非停机 |
| machines/cm2 | cm2 `1RB1RA_1LC0RC_---0LD_0LE0RF_1RE0RA_0LF1LB` | `paper-zh.pdf` | 停机 ⟺ 时代轨道入 P（193 格显式有限集）；开放问题 §7 含三条已否证路线 |
| machines/quad | cm16/26/51/52 | dossier（论文待同构轮） | 各台停机判据 ×4 独立穷尽；残余 = 五格头远规避 |
| machines/early | BMO 1/5/10/11、sparse1 等 | dossiers | 早期刻画（BMO1：停机 ⟺ α 无理性） |

## 目录

```
machines/{m1,cm2,quad,early}/   每台：论文 + dossier + engines + verification
surveys/{triage,soc,port}/      91 台 triage、279 台 SOC 勘图、40 对移植审计
meta/                           范式审计、战役日志、研究笔记
data/                           台账快照、未决码表
tools/sim/                      通用模拟器
```

## 验证纪律

两轮对抗评审（12 major 全修复）、独立复算 16/16、誊写校验与手工转写对拍。撤回记录五项在档。全部机器断言一行可复跑（入口见各 dossier）。
