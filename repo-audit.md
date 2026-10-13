# 仓库卫生盲审报告 — bb6-github vs bb6-new

（2026-10-12 整改执行员处置记录版；处置详情见各条目"已处置"行及文末"§六"自查记录）

审计日期：2026-10-12。对象：`bb6-github/`（GitHub 工作副本，remote: CyclingCycloid/bb6-holdout-research）与 `bb6-new/`（暂存源）。全程只读；本报告写入 bb6-new。

## 〇、总体一致性（先说结论）

- **两树零漂移**：对 865 个文件（剔除 .git）做 `diff -r` 全量比对，`machines/ surveys/ meta/ data/ tools/` 与顶层文件逐字节一致，无单向落后或未同步文件。本报告所有发现对两树同时成立。
- bb6-github 工作树干净（无未提交/未跟踪/忽略文件），`main` 与 `origin/main` 同步，最新提交 be9183b。
- 全库无 >5MB 文件（最大 `machines/quad/engines/eras-m16.txt` 4.47MiB、`eras-m51.txt` 3.8MB、`machines/cm2/engines/era1e8.tsv` 3.55MB）——大文件项通过。
- 无 .tmp/.bak/.DS_Store/编辑器备份等临时文件——临时文件项通过。

以下按四个检查项列出发现。每条：位置 + 问题 + 建议处置。

---

## 一、脏文件

### F1. 顶层 `campaign-results.out` — LaTeX 书签残渣且为孤儿
- 位置：`README.md` 同级的 `campaign-results.out`（1907B）。
- 问题：内容是 hyperref 的 `\BOOKMARK` 书签输出（六节合并稿：M1 / cm2 / cm16/26/51/52 …），属 LaTeX 构建残渣；仓库中不存在任何对应 `.tex` 源，也无任何 README 引用它 → 孤儿残渣，且文件名误导（像是"战役结果"数据，实为构建副产物）。
- 处置：删除。

> **已处置（2026-10-12）**：已删除（两树）。
### F2. `machines/cm2/paper-en.out` — LaTeX 书签残渣
- 位置：`machines/cm2/paper-en.out`（1428B）。
- 问题：paper-en 构建的 hyperref 书签残渣；`.aux` 类残渣全库已清，唯 `.out` 漏网两处（F1/F2）。
- 处置：删除。注意不要全局忽略 `*.out`——`orbitstats.out`、`fam1.out`、`struct1.out`、`st.out` 等是程序输出数据工件，必须保留；若加 `.gitignore`，需针对 `paper*.out`、`*.aux`、`*.synctex.gz` 精确列出。仓库目前无 `.gitignore`，建议补一份精确版。

> **已处置（2026-10-12）**：已删除 machines/cm2/paper-en.out（两树）；并新增精确版 `.gitignore`（campaign-results.out、paper*.out、*.aux、*.synctex.gz——不全局忽略 *.out，orbitstats/fam1/struct1/st.out 等数据工件不受影响）。
### F3. 多版本可执行文件与完全相同的二进制副本
- 位置与问题（54 个 `.exe` 全部位于 `engines/` 或 `tools/sim/`，无错位；问题在冗余）：
  - `machines/quad/engines/`：`quad.exe`、`quad2.exe`…`quad6.exe` 共 6 份，对应唯一源 `quad.c`；经哈希比对 **`quad.exe` 与 `quad4.exe` 逐字节相同**；README/dossier 只引用 `quad6.exe`，而 `engines/attack-quad.md` §复跑却写 `./quad4.exe … > eras-m16.txt`（引擎版本引用互相矛盾）。
  - `tools/sim/`：`triage.exe`、`triage2.exe`、`triage3.exe`、`triage_new.exe` 共 4 份，对应唯一源 `triage.c`；**`triage3.exe` 与 `triage_new.exe` 逐字节相同**。
  - `surveys/port/engines/`：`sp.exe`、`sp2.exe` 两份对应唯一源 `sp.c`。
  - `machines/early/engines/attacks-bmo11/`：`tmini.exe`～`tmini7.exe` + `tmini3_O0.exe` + `tmini3s.exe` 共 10 份（各有 `.c` 源，属迭代留档，密度最高）。
- 处置：保留最终版与全部源码（`quad6.exe`、`triage3.exe`、`sp2.exe`、`tmini7.exe`），删除其余中间构建；至少删除两对哈希相同的副本，并统一 attack-quad.md 的引擎版本引用。

> **已处置（2026-10-12）**：实测复核：quad.exe vs quad4.exe、triage3.exe vs triage_new.exe 的 md5 均**不同**（分别差 8,005 / 37,301 字节；同尺寸不同编译时间戳与代码的构建产物），审计"逐字节相同"结论与当前文件不符，不满足"哈希同则删"的处置条件，两对均**未删除**；其余中间版本（quad2/3/5、triage/triage2、sp、tmini 系列）作为迭代留档保留；引擎版本引用矛盾已消除（attack-quad.md §9 复跑块统一 quad6.exe，见 F13）。
### F4. 数据文件的别名重复
- 位置：`machines/early/engines/attacks-bmo10/`。
- 问题：`p_tokP_T10.json` == `p_tokP_T10_N1000000.json`、`p_tokP_T9.json` == `p_tokP_T9_N1000000.json`、`p_tokP_T8.json` == `p_tokP_T8_N300000.json`（三对逐字节相同，仅文件名不同）。
- 处置：各留一份，另一份删除；若两名均有引用历史，在 README 说明等价。

> **已处置（2026-10-12）**：三对别名各删裸名版（p_tokP_T10/T9/T8.json，两树），保留 `_N` 后缀版（读取端 p_forward.mjs 的现行约定，写入端 p_token.mjs 为裸名——两边约定不一致即重复来源）；等价性已在 machines/early/README.md 注明。
### F5. 两份台账快照逐字节相同
- 位置：`data/ledger-2026-09-26.csv` 与 `data/ledger-2026-10-12.csv`（各 249,145B）。
- 问题：内容完全相同。`data/README.md` 称"台账快照（两次）"，实际 10-12 快照只是 09-26 的换名副本 → 名义上的新快照没有新数据，属陈旧复制。
- 处置：要么删除 10-12 副本并在 README 改称单快照，要么重新导出真正的新台账。

> **已处置（2026-10-12）**：已删除 data/ledger-2026-10-12.csv（两树，删前 md5 复核一致）；data/README.md 改单快照并注明"2026-10-12 复查与 09-26 快照逐字节一致，未产生新数据"。
### F6. 空目录 `machines/early/engines/attacks-cm57/`
- 位置：两树均存在该空目录。
- 问题：git 不跟踪空目录（GitHub 上没有它），纯本地残渣；`machines/early/README.md` 的引擎清单也未列它（cm57 是 triage 排名 #2 的候选，目录建了没填）。
- 处置：删除（两树）。

> **已处置（2026-10-12）**：已删除空目录 attacks-cm57/（两树）。
### F7. 事故文件名 `machines/quad/engines/=100:`
- 位置：`machines/quad/engines/=100:`（15B，内容为空行 + `all ERA ev`）。
- 问题：shell 重定向事故产物（未加引号的命令碎片落盘），无任何文档引用。
- 处置：删除。

> **已处置（2026-10-12）**：已删除 `machines/quad/engines/=100:`（两树）。
### F8. 轻微：`surveys/soc/work/` 的 32 个 `.err` 文件
- 位置：`sweep1e7_00..15.err`、`sweep3e8_00..15.err`（各约 1KB，stderr 日志）。
- 问题：属扫描证据链的一部分（有同名 `.tsv` 配对），但 `.err` 文件作为"运行残渣"未被任何 README 说明。
- 处置：保留；建议在 `surveys/README.md` 或 soc-map.md 产物清单里注明 `.err` 为扫描 stderr 工件。

> **已处置（2026-10-12）**：全部 .err 保留；surveys/README.md soc 行已注明"work/ 内 .tsv 为扫描结果、同名 .err 为扫描 stderr 工件，各有配对"。
---

## 二、脏描述（README.md / dossier.md 逐个扫读 + 全库 .md/.tex 叙事词扫描）

扫描词表：本轮 / 本会话 / 协调者 / 修复轮 / 收口 / 形态： / 最终裁决 / 用户指令 / 忠实版 / 不含置信度 / 按用户要求 / 置信度数字 / agent 自指。`meta/campaign-log.md` 为 README 明示的"REPORT.md 原文"叙事存档，其内的叙事词属设计内，不计入。

### F9. `surveys/triage/dossier.md` — 叙事重灾区（最重条目之一）
- 位置与问题：
  - 标题仍是旧文件名 `# attack-next.md`（实际文件为 dossier.md）；
  - `日期：2026-09-25～26（本轮会话）`、"排名标准（**按协调者指令修订**）"、"CYCLER 存档表（**协调者指令**：只存档，不排名）"——会话叙事词；
  - "经**我方**流水线，即…的置信度"、"引理集 **90% 复用**"——主观置信数字与第一人称元话语；
  - §四路线图含 ≥10 处"X 会话"工期估算（"预估 1 个会话"、"共 ~4 会话"、"0.5 会话"…）——纯会话规划语言；
  - **引用不存在的文件**：`temp/cm2-ev.txt`、`temp/amap-cm57|cm29|cm50|cm12|qm6|qm30|qm5.txt`、`temp/amap2-*.txt`、`temp/scan-*.txt`（仓库无 `temp/` 目录）；`attack-sparse2.md`（M3 节）不存在（现库只有 attack-sparse1.md）；工具路径 `sim/triage.c` 实际在 `tools/sim/`；
  - 数字口径矛盾：§一与 §五称"**91 台**"，而自身 §三表为 CM(58)+QM(30)=88；88+3 台校准机（`triage-calib.tsv`）=91，但全文从未说明该口径；顶层 README 与 surveys/README 均沿用"91 台"。
- 处置：去除会话叙事与工期估算；标题改为与文件名一致；修正工具路径；删除或补齐 `temp/` 与 attack-sparse2 引用；统一 91/88 口径（建议表述为"88 台目标 + 3 台校准"）。

> **已处置（2026-10-12）**：dossier.md 整体重写：标题改为内容名"Cubic/Quadratic Mess 分类勘图 — 88 台正式样本 + 3 台校准机"；叙事词全清（本轮会话/协调者指令/我方/各路线图的会话工期估算/"90% 复用"置信话术等）；计数口径文内显式说明（88 正式 = CM58 + QM30，+3 校准 = 91，经 tsv 数据行数核实）；工具路径改 tools/sim/；temp/* 与 attack-sparse2.md 死引用改指现路径（cm2 事件表 → machines/cm2/engines/ev_d0.txt；M1/M3 校准记录 → triage-calib.tsv + machines/m1/dossier.md），未归档的 amap/scan 拟合报告在工件清单如实勘误；分类表、α 分布、五名排名、后备名单、CYCLER 结论、诚实声明全部保留。
### F10. `surveys/port/engines/soc-port.md` — dossier.md 清理前的旧版残留（最重条目之一）
- 位置：`surveys/port/engines/soc-port.md`。
- 问题：与 `surveys/port/dossier.md` 内容几乎全同，diff 仅 7 处——全部是 dossier.md 已清除的会话叙事（"本轮未能…"、"本轮预算内"、"本轮最强正结果"、"本轮未完成该归纳…（诚实条款）"、"本轮未能对任何一台…"等 ×5 处"本轮"）。git 提交 028b58f"last narrative term in port dossier"只清了 dossier.md，漏了 engines/ 下这份旧副本。
- 处置：删除 engines/soc-port.md（以 dossier.md 为唯一版本）。

> **已处置（2026-10-12）**：已删除 surveys/port/engines/soc-port.md（两树；删前 diff 复核其与 dossier.md 仅差 7 处已消毒的"本轮"叙事）；dossier.md 为唯一版本。
### F11. `surveys/port/dossier.md` — 旧文件名标题与失效引用
- 问题：标题仍是旧文件名 `# soc-port.md`；正文"工作目录：`soc-port/`"与 §1 "`soc-port/pairs.txt`"路径失效（现为 `surveys/port/engines/`）；引用 `led_now.csv`（不存在，现为 `data/ledger-*.csv`）；§7 引用 "`attack-cm2.md` §11 纪律"（不存在，cm2 的叙述现为 dossier.md/case-tables.md）。
- 处置：改标题、修路径、更新三处引用。

> **已处置（2026-10-12）**：标题改内容名"Hamming-1 引理移植审计 — …"；工作目录与 pairs.txt 路径改 surveys/port/engines/；led_now.csv → data/ledger-2026-09-26.csv；"attack-cm2.md §11 纪律" → cm2 的 casecheck 断言表纪律（machines/cm2/engines/casecheck-*.mjs）；对表重建由"node -e 内嵌"改为 node mkpairs.mjs，并修复 mkpairs.mjs 自身的失效输入路径（../soc-codes.txt、../led_now.csv → ../../../data/…），复跑验证 pairs.txt 逐字节一致（40 对 / 32 台唯一未决 / 108 证书机）。
### F12. `machines/cm2/engines/` 内的会话叙事文档群
- 位置与问题（这些 .md 也是"论述文档放错引擎目录"——见 F21）：
  - `sec9.md`："本轮核心发现"、"修复轮补充"、"本轮工件"；
  - `sec10.md`："本轮闭合"；`sec13.md`："追加修复轮"；
  - `sec11_12.md`："（收官会话）"、两处"终局裁决"；**§12.1/§12.2 标题各出现两次**（第 31/35 行旧版与第 55/65 行"终值"版并存，内容块重复）；
  - `fixround.md`：标题即"修复轮（对抗评审后）"、"本会话前期装配"、"终局裁决：C=1"；
  - `final-sections.md`："收口确认"、"忠实性分层（Ledger，收口版）"、"本轮新发现"×2、"上一轮 C=1…本轮"。
- 处置：这些是论文成稿前的节草稿与对抗评审过程记录；建议移入 `meta/`（或机器目录下专门的 `history/`），清除"本轮/收口/修复轮/会话/终局裁决"字样，并消除 sec11_12 的重复块。若坚持原位保留，至少加"历史工作记录"头注。

> **已处置（2026-10-12）**：六个节草稿（sec9/sec10/sec11_12/sec13/fixround/final-sections.md）迁至 machines/cm2/history/（两树），各加"历史工作记录"头注（声明时点用语保留、最终表述以论文与 dossier 为准），cm2/README.md 登记 history/ 行；sec11_12.md 的 §12.1/§12.2 旧版重复块已删除（保留终值版并去重标题）。
### F13. `machines/quad/engines/attack-quad.md` — 叙事词与失效引用
- 问题："日期：2026-09-26（本会话）"、"本会话"×6、"应**协调者**'结构层确认'要求"、"协调者结构层同构要求：✓"、"×4 分别**收口**"、"§8 终局裁决（**收官轮终版**…）"、"§14.3 终局裁决"；"工件目录：`bb6/attacks-quad/`"（旧顶层路径）；"era 对齐/锚点统计脚本**内嵌于会话**（node -e 内联）"——关键统计脚本未落盘（可复现性缺口）；复跑命令用 `./quad4.exe` 与 README/dossier 引用的 `quad6.exe` 不一致（另见 F3）；引用 "attack-cm2 §11"（不存在）。
- 处置：清理叙事词与旧路径；把内联统计脚本落盘为 `era-align.mjs` 之类工件；统一 quad6.exe 引用。

> **已处置（2026-10-12）**：attack-quad.md 清理：日期去"（本会话）"，"本会话"×6、协调者引用、"收口/收官轮/终局裁决"等全部中性化（终局裁决→终局判定）；工件目录改 machines/quad/engines/；复跑块统一 quad6.exe 并补四台 pivot 表（m16=A0 m26=D0 m51=A0 m52=C0，与 quad-equiv.mjs 头注一致）；"内嵌于会话"的 era 统计脚本落盘为 engines/era-align.mjs——复跑验证：键集 78/78/78/89、m16/m26/m51 逐键相同、末新键 ≈2.16e9 全部复现；session 期对齐段边界数值（"0[0..9],1[10..561]"等）在自然秩对齐口径下不逐位复现，已在脚本头注与 quad/dossier.md 勘误节如实记录。
### F14. `machines/early/engines/attacks-bmo10/HANDOFF.md` — 会话交接文档入库
- 问题："本会话"×3、"前 agent"、"重写为文件待后续 agent 完成"、"THE REMAINING PROGRAM (for the next agent)"——典型 agent 间交接文档，含未完成事项清单，混在引擎目录。
- 处置：移至 `meta/`（作为战役史料）或删除；保留则加头注说明其为时点交接记录。

> **已处置（2026-10-12）**：HANDOFF.md 迁至 meta/HANDOFF-bmo10.md（两树）并加历史头注（时点交接记录、后继状态指引）；meta/README.md 登记；meta/campaign-log.md 内的旧路径按史料原貌保留。
### F15. `machines/early/dossiers/` 中的英文会话自指（轻）
- `attack-sparse1.md`："browser rendering is unavailable in **this agent** (checked)"、工具路径 "`bb6/attacks-sparse1/`"（旧路径）；`attack-invariants.md:367`："directions for **future agents**"。
- 处置：中性化措辞（"经网页核验"）、更新路径。

> **已处置（2026-10-12）**：attack-sparse1.md：agent 自指删除（"browser rendering is unavailable in this agent (checked)"句改中性）、bb6/holdouts、bb6/sim、bb6/attacks-sparse1 旧路径全部更新；attack-invariants.md："future agents" → "follow-up directions"。
### F16. 验证报告的悬空引用（历史文档，轻）
- `machines/m1/verification/referee-report.md`、`reverify-report.md`：引用 `M1-paper-en.md`、`attack-sparse2.md`、`REPORT.md`、`SESSION-STATE.md`、`ladder.json`（均不存在或已更名）。
- `machines/cm2/verification/referee-report-cm2.md`：审稿对象 `cm2-proof-full-zh.tex`、`cm2-nonthalt-zh.tex`、`attack-cm2.md` 均已被 paper-zh/paper-en 与 dossier.md 取代；`cm2-reverify-report.md` 复现命令 `node ../attacks-cm2/...` 路径失效，且含"本轮"×5、"agent 原工具"多处。
- 处置：验证报告为时点文档，可保留原貌；建议各加一行头注："历史文档，文中路径/文件名为当时工作区名称，现对应 …"。

> **已处置（2026-10-12）**：四份验证报告（m1 referee/reverify、cm2 referee/reverify）各加一行"历史文档"头注，注明文中文件名为当时工作区名称及现行对应（M1-paper-en.md→paper-en、attack-sparse2.md→triage-calib/m1 记录、REPORT.md→meta/campaign-log.md、cm2-proof-full-zh.tex→paper-zh、attack-cm2.md→dossier/case-tables、attacks-cm2/→engines/）；原文貌保留。
### F17. 其余零星叙事词（轻）
- `meta/paradigm-audit.md:185`："（本会话路线，已推至 LEM-R′）"。
- `surveys/soc/soc-map.md:91`："全表在 `soc-work/` 会话日志"——`soc-work/` 不存在（现为 `surveys/soc/work/`），且"会话日志"不该作为发布文档的数据出处。
- `surveys/soc/soc-map.md:107`："加法性/结构置信度"——作为排名判据的定义词可接受，但建议改为中性术语（结构规则性）。
- `machines/cm2/case-tables.md:3、134`：引用 `attack-cm2.md §11.5/§11.3`（不存在）。
- 处置：逐处清理。

> **已处置（2026-10-12）**：paradigm-audit.md:185"本会话路线"→"本库已采路线"；soc-map.md:91 出处改 work/ 工件 + ../port/engines/pairs.txt（可复跑口径）、:107"结构置信度"→"结构规则性"；case-tables.md 两处 attack-cm2 §11 死引用改现路径。整改中另发现并同修该文件其余 6 处 soc-work/ 旧路径、sim/triage.c、led_now.csv 旧名（审计未逐一点名的同类缺陷）。
---

## 三、结构错位

### F18. 顶层 README 的结构声明与实际不符
- 位置：`README.md` 目录节 "`machines/{m1,cm2,quad,early}/` 每台：论文 + dossier + engines + verification"。
- 问题：`machines/quad/` **没有 verification/ 目录**（对抗评审内容在 `engines/attack-quad.md` 内）；`machines/early/` 没有论文、没有 verification/，且 dossier 形式是 `dossiers/` 汇编目录。声明只对 m1、cm2 成立。
- 处置：按各机实际情况改写（quad：验证记录并入 attack-quad.md；early：dossiers/ 汇编、无单机论文）。

> **已处置（2026-10-12）**：顶层 README 目录节按实际结构逐机改写（quad：验证记录并入 engines/attack-quad.md、无独立 verification/；early：dossiers/ 汇编、无单机论文）。
### F19. `surveys/soc/` 缺 dossier.md，README 引用落空
- 位置：`surveys/README.md` 写 soc 行 "`dossier.md` = soc-map.md + `work/` 数据"；实际 `surveys/soc/` 只有 `soc-map.md` 与 `work/`。
- 问题：三族（triage/soc/port）中唯 soc 没有 dossier.md，README 引用不存在；port 的 dossier.md 标题又自称 soc-port.md（F11）——命名链混乱。
- 处置：要么将 soc-map.md 更名或复制为 dossier.md（保持三族一致），要么把 surveys/README 改为直接引用 soc-map.md。

> **已处置（2026-10-12）**：取"改引用"方案：surveys/README.md soc 行直接引用 soc-map.md + work/ 数据，不再引用不存在的 dossier.md。
### F20. 命名不对称未作全局说明
- 位置：m1 用 `reduction-zh` / `paper-en`（无 paper-zh、无 reduction-en）；cm2、quad 用 `paper-zh` / `paper-en`。
- 问题：不对称本身在 `machines/m1/README.md` 文件表中有隐式说明（中文版=归约链完全推导、英文版=完整论文），但顶层 README 与任何地方都没有一句"为何 m1 中文版名为 reduction"的解释，检索者难以建立对应规律。
- 处置：在 m1/README 或顶层 README 加一行说明（如"m1 中文版为完全推导长文故名为 reduction-zh；英文版与 cm2/quad 的 paper-en 同性质"）。

> **已处置（2026-10-12）**：m1/README.md 文件表 reduction-zh 行注明命名缘由（中文版为归约链完全推导长文故名 reduction-zh，与 cm2/quad 的 paper-zh 同性质）。
### F21. 论述/交接类 .md 混入 engines/ 目录
- 位置：`machines/cm2/engines/{sec9,sec10,sec11_12,sec13,final-sections,fixround}.md`、`machines/quad/engines/attack-quad.md`（22KB 论述文档）、`machines/early/engines/attacks-bmo10/HANDOFF.md`。
- 问题：engines/ 应放引擎与数据；论文节草稿、评审过程记录、agent 交接文档属叙述层，与"dossier=方法叙述、verification=验证、meta=战役史料"的既有分区冲突。
- 处置：见 F12/F13/F14——迁至 meta/ 或机器级 history/，并在相应 README 登记。

> **已处置（2026-10-12）**：随 F12/F14 落地（cm2 节草稿→history/、HANDOFF→meta/）；attack-quad.md 经叙事清理后作为 quad 的技术验证记录留在 engines/（README 与 dossier 均有登记）。
### F22. 空目录（同 F6）与标题-文件名错位（同 F9/F11）
- `attacks-cm57/` 空目录；`surveys/triage/dossier.md` 标题 attack-next.md；`surveys/port/dossier.md` 标题 soc-port.md。
- 处置：删空目录；标题与文件名对齐。

> **已处置（2026-10-12）**：同 F6（空目录删除）；triage/port 两份 dossier 标题随 F9/F11 改为内容名，标题-文件名错位消除。
---

## 四、内容新鲜度（旧版本残留）

### F23. `machines/m1/README.md` 文件表三处陈旧 + 失效锚点（最重条目之一）
- 位置与问题：
  - 第 17/18 行：`reduction-zh.tex/.pdf` **重复两行**（描述一为"数学论文（中文）：归约链完全推导"、一为"归约链完整推导（中文，定理-证明体）"）——旧版残留的重复行；
  - 第 19 行：`report-zh.tex/.pdf`（成果报告）——**文件已不存在**（m1 目录只有 paper-en、reduction-zh），死行；
  - 第 23 行：`drafts/`（早期论文草稿 md 版）——**目录已不存在**，死行；
  - "复跑入口：见 `dossier.md` §复跑命令"——dossier.md **没有**该章节（复跑命令散在"持久表"节），失效锚点。
- 处置：删除两行死行、合并重复行；在 dossier.md 设"## 复跑"节（与 quad/dossier.md 体例对齐）或改 README 锚点。

> **已处置（2026-10-12）**：m1/README.md 文件表修复：reduction-zh 重复两行合并（并带 F20 命名说明）；report-zh 与 drafts/ 两死行删除；"§复跑命令"失效锚点改为"§持久表"（复跑命令实际所在节）。
### F24. 顶层 README 机器表两行陈旧
- 位置与问题：
  - quad 行论文列写 "`dossier`（**论文待同构轮**）"——quad 现已有 `paper-zh.pdf` 与 `paper-en.pdf`（提交 3b04724、e082e1f、be9183b），表格未更新，且"待同构轮"本身是会话词；quad/README.md 已正确列出双语论文对；
  - cm2 行论文列只写 `paper-zh.pdf`，漏 `paper-en.pdf`（提交 53d0158 增加了英文版；cm2/README 已列双语对）。
- 处置：更新两行（quad：paper-zh/paper-en + dossier；cm2：paper-zh/paper-en）。

> **已处置（2026-10-12）**：顶层 README 机器表：quad 行改"paper-zh.pdf / paper-en.pdf + dossier"（"论文待同构轮"会话词随之消除）；cm2 行补 paper-en.pdf。
### F25. `surveys/port/engines/soc-port.md` 旧版残留（同 F10）
- 处置：删除。

> **已处置（2026-10-12）**：同 F10：soc-port.md 已删除（两树）。
### F26. `data/ledger-2026-10-12.csv` 陈旧副本（同 F5）
- 处置：见 F5。

> **已处置（2026-10-12）**：同 F5：台账副本已删除（两树）并在 data/README.md 注明。
### F27. `machines/quad/engines/` 缺 `eras-m52.txt` 工件
- 位置与问题：`attack-quad.md` 声称"era 普查（3e9 步）：…m52 59,470"、quad/dossier.md 称"era 键集 …cm52 89 键"，但 engines/ 只有 `eras-m16/m26/m51.txt`，**cm52 的 era 普查工件不在库**（`evc-m16.txt` 只有 m16；guard/deep 系列倒是有 m52）。相关统计脚本又"内嵌于会话"未落盘（F13）→ cm52 的 era 断言目前在库内不可复跑。
- 处置：补跑落盘 `eras-m52.txt`，或在 dossier 注明数据出处；同时把内联脚本落盘。

> **已处置（2026-10-12）**：eras-m52.txt 已用 quad6.exe 复生成：`./quad6.exe 1RB0LD1LC1RD0LE1LA0RB1RD---0LF1RA1LF eras C0 3000000000`（pivot C0 经 quad-equiv.mjs 头注证实为 cm52 的 canonical pivot）。验证：quad6 复刻 eras-m16.txt 逐字节一致（工具链基准）；新件 era 计数 **59,470** 与 attack-quad §3 声明精确一致、键集 (pos,n0) **89 键**与 §5b 一致（m16/m26/m51 同口径复核 78/78/78 且逐键相同、末新键 ≈2.16e9 一致）。cm52 的 era 普查断言恢复库内可复跑；quad/dossier.md 勘误节登记复生成事实；统计脚本落盘见 F13。
### F28. 旧版文件本体核查（任务点名项的结论）
- `proof-full-zh`（cm2-proof-full-zh.tex）、`cm2-nonthalt-zh.tex`、`M1-report`（report-zh）、`drafts/`：**文件本体均已清理干净**，残留在引用层（F16 的 referee-report-cm2、F23 的 m1/README 行）而非文件层；
- `campaign-results`：`.out` 书签残渣仍留在顶层（F1）；
- `surveys/port/engines/soc-port.md` 是唯一一份"整文件级"的旧版残留（F10）。

> **已处置（2026-10-12）**：文件层与审计确认一致（无动作）；引用层残留已随 F16（头注）、F23（死行）处置，soc-port.md 与 campaign-results.out 已删（F10/F1）。
---

## 五、发现计数与处置优先级汇总

| 类别 | 条目 |
|---|---|
| 一致性 | 零漂移（通过）；git 干净同步（通过）；无 >5MB（通过）；无临时文件（通过） |
| 脏文件 | F1–F8（8 条） |
| 脏描述 | F9–F17（9 条） |
| 结构错位 | F18–F22（5 条） |
| 新鲜度 | F23–F28（6 条） |
| **合计** | **28 条**（F6/F22、F10/F25、F5/F26 互为同一事实的不同侧面，按条计） |

处置优先级建议：
1. **先删**（零风险）：F1、F2、F7、F6、F10/F25（soc-port.md 旧副本）、F4（别名副本）、F3 中的两对相同二进制；
2. **再修文档**（影响可信度）：F23（m1/README 死行）、F24（顶层 README 陈旧行）、F9（triage dossier 叙事+死引用+91/88）、F19（soc dossier.md 缺失）、F11、F17；
3. **结构性整理**（需决策）：F12/F13/F14/F21（叙事文档迁出 engines/）、F18、F20、F27；
4. **低优先**：F5/F26（台账快照）、F8、F15、F16。

最重三条：
1. **F9 triage dossier**：会话叙事 + 协调者指令 + 死引用（temp/、attack-sparse2.md）+ 91/88 数字矛盾四毒俱全，且是三份 survey 门户文档之一；
2. **F10 port 的 soc-port.md 旧副本**：清理轮漏删的未消毒版本，"本轮"叙事原样保留，直接对冲 dossier.md 的清理成果；
3. **F23 m1/README 文件表**：指向已删除的 report-zh 与 drafts/、reduction-zh 重复行、失效复跑锚点——发布库门面文档里的死链。

---

## 六、整改后一致性自查（2026-10-12，整改执行员）

1. **处置计数**：28/28 条均有处置记录。27 条执行了实体整改；F3 经实测复核不满足其自身删除条件（见下），按"先核实再动手"原则记录而不强删。
2. **审计结论修正（两处，以实测为准）**：
   - F3 的"quad.exe 与 quad4.exe、triage3.exe 与 triage_new.exe 逐字节相同"经 md5 + cmp 复核**不成立**（两对分别差 8,005 / 37,301 字节；同尺寸、不同编译的构建产物）——两对均未删除；
   - F9 的 91/88 口径经数据核实为"88 台正式样本（CM 58 + QM 前 30/53）+ 3 台校准机 = 91"，已写入重写后的 triage dossier。
3. **发布层叙事词扫描**（词表同 §二；排除声明保留的史料区：meta/campaign-log.md、meta/HANDOFF-bmo10.md、machines/cm2/history/、四份 verification 报告）：零残留（含整改中发现的 2 处漏网：case-tables.md 的 lap 义"本轮"改"当前轮"、attack-quad.md §8 首句）。
4. **引用完整性**：对 12 份 README/dossier/soc-map 提取反引号路径逐一核对，全部解析或属上下文简写（engines/ 行内裸文件名、evU/evP 简写等均实测存在）。整改中额外修复的失效引用（审计未逐一点名的同类缺陷）：soc-map.md 的 6 处 soc-work/ 旧路径与 led_now.csv 旧名、early/dossiers 的 8 处 bb6/ 旧根路径、bmo-5-8-10-11.md 的 2 处 bb6/temp/ 引用（其一文件从未入库，已注明"not archived"）、port mkpairs.mjs 的 2 处失效输入路径。
5. **复跑验证（三链）**：quad6 复刻 eras-m16.txt 逐字节一致；eras-m52.txt 新件计数 59,470 / 键集 89 与文档精确一致（era-align.mjs 复核四台键集 78/78/78/89、m16/m26/m51 逐键相同、末新键 ≈2.16e9）；mkpairs.mjs 复跑 pairs.txt 逐字节一致（40 对 / 32 台唯一 / 108 证书机）。
6. **两树状态**：删除与移动类操作已在两树同步执行（8 个残渣文件、attacks-cm57/ 空目录、cm2 六节草稿→history/、HANDOFF→meta/）。内容修订与新工件（.gitignore、era-align.mjs、eras-m52.txt、全部 .md 修改）目前仅在 bb6-new，**待同步至 bb6-github**（同步后 `diff -r` 应仅余本报告文件本身）。
7. **观察项（28 条之外，未动，如实记录）**：整改窗口内存在一条平行的 §15"时代层对应定理"工作流在两树留下未提交状态——`machines/quad/engines/quad-equiv.mjs`（git 未跟踪，两树一致）、`machines/quad/{README.md,dossier.md,engines/attack-quad.md}` 的 §15 相关增补（bb6-github 工作树因此三文件显示 M；bb6-new 侧为同一内容并叠加了本整改的叙事清理），以及 bb6-new 独有的 `machines/m1/engines/ref-phaserules.mjs`、`machines/quad/engines/ref-lapword.mjs`（01:37/01:41 生成的论文引理独立审稿脚本，bb6-github 无）。本整改的编辑均建立在该并行状态之上，无冲突；同步 bb6-new → bb6-github 并提交时将一并纳入，ref-* 两件的去留需明示。
