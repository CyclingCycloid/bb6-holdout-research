# BB(6) Holdout Research

2026-09-25 至 10-13 对 BB(6) holdout 机器的结构分析档案。

**总览文档：[`campaign-results.pdf`](campaign-results.pdf)**——全部结果汇编（每条断言标注证明级别 A / A− / B，残余附所属研究域）。

## 六台深挖机（均未改变 undecided 状态）

| 机器 | 条件定理 | 无条件部分要点 | 残余 → 研究域 |
|---|---|---|---|
| [m1](machines/m1/) | 永不停机 ⟸ 假设 M | 停机不可达；类 ≤2000 域非停机（≳2^(2^2000) 步，计时律为观测级） | ν₂ 记录时刻表 → 分段仿射迭代（Conway 1972；Kurtz–Simon 2007） |
| [cm2](machines/cm2/) | 永不停机 ⟸ 轨迹避让 | 停机刻画；Q=L−3R 守恒；停机 ⟺ 轨道入 P（193 格逐格裸机验证）；>3×10^10 步 | 同域（三闭合技术失效点在档） |
| [quad](machines/quad/)（cm16/26/51/52） | 各台永不停机 ⟸ 五格规避 | 判据 ×4 独立穷尽；孤岛不变量；guard 2×10^11 零威胁 | 同型轨迹避让（类比归类） |

负结果定理：周期排除、必要精度、剩余类否定、键图发散（详见总览 §各节与撤回记录）。

## 目录

```
campaign-results.tex/.pdf   总览（先读这个）
machines/{m1,cm2,quad,early}/   每台机器：子 README + 论文 + dossier + engines + verification
surveys/{triage,soc,port}/      91 台 triage、279 台 SOC 勘图、40 对移植审计
meta/                            范式审计、战役日志、研究笔记、社区草稿
data/                            台账快照、未决码表、历史清单
tools/sim/                       通用模拟器（triage 等）
```

## 验证纪律

两轮对抗评审（12 major 全修复）、誊写校验（6 处转写错误）、独立复算 16/16、手工转写表对拍。撤回记录五项在档（模 3、pop 排名 ×2、D3 公式、逐位相同修正、cm2 的 C=0 降级）。全部机器断言一行可复跑（入口见各 dossier）。
