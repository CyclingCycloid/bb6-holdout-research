# 四连包技术档案 — cm16 / cm26 / cm51 / cm52

数学内容见 paper-zh / paper-en。本档案为技术记录。

## 判定摘要

- 停机判据 ×4（每台独立）：cm16 = D 读 0 且 [w+1]=1；cm26 = B 读 1 且 [q−1]=0；cm51 = (C 或 D) 读 0 且 [w+1]=1；cm52 = C 读 0 且 [c−1]=0。casecheck 204,800 构型、111,257 停机例零反例。
- 归约（每台）：停机 ⟺ 时代轨道出现头远 (0¹,1¹,0¹) 访问；guard 2×10^11 步 ×4 零危险；裸机 cm16 至 5×10^11 零停机。
- lap 文法统一（每台各自逐格验证，约 78 万锚点；标准字与簿记见论文 §3）；era 键集 cm16/26/51 各 78 键逐键相同、cm52 89 键；大时代序列 562 对常量偏移零错位（深扫前缀观测）；末端构型冻结骨架逐位相同、工作三元组差 ±100。
- **时代层对应定理（A−，attack-quad §15 / `quad-equiv.mjs`）**：抽象标记态 =（全带块向量, 三元组位置），四台典范实现（三元组内缝宽 (2,2)/(1,1)/(1,2)/(1,1)，锚点 A0@L|R 缝 vs D0/A0/C0@R|Z 缝，5823/5823 era 事件零违例）。**排空映射在 R≥4 共享域四台恒等**（每 pivot 间隔 (+1,−2,+1)；cm26 奇 R 差显式修正：少一圈、eR+2、eL/eZ−1；cm51/cm52 与 cm16 完全恒等）——合成表 90/90、真实态重放 30/30、轨道全量 166,976 条完整时代精确（另每台 1 条 cap 截断快照）。**边界**：churn/重播种层恒等 0/110（cm51 键实测 150/150 变、最大值偏离 −991（无界性未证）；cm52 值偏移主型 R₀+1）；停机谓词不共轭（cm26 轨道首时代开锚 (5,4,2,2)@0：cm26 正常、cm16 halt@170、cm51 halt@990、cm52 halt@6294）；562 对齐是轨迹现象、非映射恒等推论。
- 孤岛不变量（casecheck-island 39 断言 + 轨道 892 孤岛步全同位）；词表内安全；audit 10^9 ×4 五格危险零出现。
- 开放问题：五格避让；局部抽象否证——键图半径阶梯 |K*| 每半径 ×3.1（99→8879，r=2..6，复跑逐位复现）。

## 引擎与数据

`quad.c/quad6.exe`（run/ev/cp/from/wv/audit/guard 模式，1.7×10^8 步/s）；`casecheck-halt.mjs`、`casecheck-island.mjs`、`kclosure.mjs`、`quad-equiv.mjs`（时代层对应实验）；`eras-m*.txt`、`guard-m*.txt`、`deep/deep5-m*.txt`（era/guard/深扫数据）。

## 复跑

`node casecheck-halt.mjs && node casecheck-island.mjs && node kclosure.mjs && node quad-equiv.mjs && node era-align.mjs`；`./quad6.exe <code> audit 1000000000`；`./quad6.exe <code> guard 200000000000`；era 普查 `./quad6.exe <code> eras <pivot> 3000000000`（pivot：m16=A0 m26=D0 m51=A0 m52=C0）。

## 勘误记录（事实）

早期"末构型逐位相同"修正为仅冻结骨架；triage hi1 截断 513 格与 pop 计数漂移（测量误差）；孤岛不变量初版论断被 casecheck 修正为同位版本。`eras-m52.txt` 原为库内缺口（era 普查断言不可复跑），2026-10-12 以 quad6.exe 复生成（pivot C0，3e9 步）：era 计数 59,470、键集 (pos,n0) 89 键，与本档案及 attack-quad §3/§5b 声明一致；跨机 era 统计脚本同时落盘为 `era-align.mjs`（其 562-era 对齐口径为按 R0≥500 秩对齐，session 期边界的精确数值不逐位复现，结构性结论——分段常量偏移、零累积错位——复现，详见脚本头注）。
