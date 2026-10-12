# 四连包技术档案 — cm16 / cm26 / cm51 / cm52

数学内容见 paper-zh / paper-en。本档案为技术记录。

## 判定摘要

- 停机判据 ×4（每台独立）：cm16 = D 读 0 且 [w+1]=1；cm26 = B 读 1 且 [q−1]=0；cm51 = (C 或 D) 读 0 且 [w+1]=1；cm52 = C 读 0 且 [c−1]=0。casecheck 204,800 构型、111,257 停机例零反例。
- 归约（每台）：停机 ⟺ 时代轨道出现头远 (0¹,1¹,0¹) 访问；guard 2×10^11 步 ×4 零危险；裸机 cm16 至 5×10^11 零停机。
- lap 文法统一（每台各自逐格验证，约 78 万锚点；标准字与簿记见论文 §3）；era 键集 cm16/26/51 各 78 键逐键相同、cm52 89 键；大时代序列 562 对常量偏移零错位（深扫前缀观测）；末端构型冻结骨架逐位相同、工作三元组差 ±100。
- 孤岛不变量（casecheck-island 39 断言 + 轨道 892 孤岛步全同位）；词表内安全；audit 10^9 ×4 五格危险零出现。
- 开放问题：五格避让；局部抽象否证——键图半径阶梯 |K*| 每半径 ×3.1（99→8879，r=2..6，复跑逐位复现）。

## 引擎与数据

`quad.c/quad6.exe`（run/ev/cp/from/wv/audit/guard 模式，1.7×10^8 步/s）；`casecheck-halt.mjs`、`casecheck-island.mjs`、`kclosure.mjs`；`eras-m*.txt`、`guard-m*.txt`、`deep/deep5-m*.txt`（era/guard/深扫数据）。

## 复跑

`node casecheck-halt.mjs && node casecheck-island.mjs && node kclosure.mjs`；`./quad6.exe <code> audit 1000000000`；`./quad6.exe <code> guard 200000000000`。

## 勘误记录（事实）

早期"末构型逐位相同"修正为仅冻结骨架；triage hi1 截断 513 格与 pop 计数漂移（测量误差）；孤岛不变量初版论断被 casecheck 修正为同位版本。
