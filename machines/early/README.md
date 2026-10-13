# 早期刻画对象 — BMO 1/5/10/11、sparse1、启发式集

会话前期的分析对象（非深挖主线）：BMO1（双重计数器归约至 α 无理性）、BMO5/10/11（字重写博弈与数论刻画）、sparse1 与 M2/M3 等。

## 文件

- `dossiers/` — 各对象的方法叙述（attack-bmo*.md、attack-sparse1.md、attack-invariants.md = BMO1 完整分析、attack-heuristics.md、formal-reduction.md、BMO.lean）
- `engines/` — 对应工具目录（attacks-bmo10/11/5、attacks-sparse1、attacks-heur、attacks、crossval）。注：attacks-bmo10 的 `p_tokP_T*_N*.json` 与同名不带 `_N` 后缀的旧文件曾逐字节相同（写入端 p_token.mjs 用裸名、读取端 p_forward.mjs 用 `_N` 名），2026-10-12 删除裸名副本、保留 `_N` 版。

其中 BMO1 的完整结论：停机 ⟺ 常数 α≈0.3621 的无理性（社区已知的开放缺口）；BMO10 缩减为两个指定的有限任务（见 dossier）。
