// anchor-scan.mjs — M1 式锚点结构快查 + ν₂ 有界性探测（价值排序核心工具）
// 用法: node sim/anchor-scan.mjs <CODE> [CAP=1e8] [SHAPE_RUNS=12]
// 阶段:
//   A) CP 全构型稀疏族形状普查（runs ≤ SHAPE_RUNS）
//   B) 主导族参数表（各 1-block 长度 per CP）
//   C) 固定仿射拟合 n' = r·n + s（逐列, 穷举小 r, 中位残差 s, 检验全体样本）
//   D) ν₂(n+c) 记录剖面（c ∈ {-3,-2,-1,0,1,2,3}）：记录是否持续推迟 = M1 型混沌信号
//   E) D0 事件摘要
// 注意: CP 为几何时间采样, 相邻同形 CP 之间可能跳过多个锚点步 —— 拟合失败本身是信号。
import { execFileSync } from 'child_process';
import { resolve } from 'path';
const TRI = resolve('./sim/triage2.exe');
const CODE = (process.argv[2] ?? '').replace(/_/g, '');
const CAP = process.argv[3] ?? '1e8';
const SHAPE_RUNS = +(process.argv[4] ?? 12);

const nu2 = (x) => {
  if (x === 0n) return 999; // 0 -> 视为极深
  let v = 0, a = x < 0n ? -x : x;
  while (a % 2n === 0n) { a /= 2n; v++; if (v > 4000) break; }
  return v;
};

const out = execFileSync(TRI, ['DETAIL', CODE, CAP], { encoding: 'utf8', maxBuffer: 1 << 28 });
const lines = out.split(/\r?\n/);

const cps = [];
for (const ln of lines) {
  if (!ln.startsWith('CP ') || !ln.includes(' R ')) continue;
  const m = ln.match(/^CP (\d+) ([A-F]) pop=(-?\d+) lo1=(-?\d+) headrel=(-?\d+) width=(-?\d+) runs=(-?\d+) R (.*)$/);
  if (!m) continue;
  const runsStr = m[8].trim().split(/\s+/).filter(Boolean);
  const runs = runsStr.map(s => { const [v, l] = s.split('^'); return { sym: +v, len: BigInt(l) }; });
  cps.push({ step: BigInt(m[1]), st: m[2], pop: BigInt(m[3]), lo1: BigInt(m[4]), headrel: BigInt(m[5]), width: BigInt(m[6]), runsTotal: +m[7], runs });
}
const d0s = [];
for (const ln of lines) {
  if (!ln.startsWith('D0 ')) continue;
  const m = ln.match(/^D0 (\d+) head=(-?\d+) pop=(-?\d+) spanv=(-?\d+) R (.*)$/);
  if (m) d0s.push({ step: BigInt(m[1]), head: BigInt(m[2]), pop: BigInt(m[3]), spanv: BigInt(m[4]), rle: m[5].trim() });
}

console.log(`# machine=${CODE} CAP=${CAP}`);
console.log(`# CP总数=${cps.length} D0记录=${d0s.length}`);
if (cps.length) console.log(`# runs_total序列: ${cps.map(c => c.runsTotal).join(',')}`);

// ---- A) 形状普查
const sparse = cps.filter(c => c.runsTotal >= 0 && c.runsTotal <= SHAPE_RUNS && c.runs.length >= 1);
const sigOf = (c) => c.runs.map(r => r.sym === 1 ? 'a' : 'g' + (r.len <= 3n ? r.len.toString() : 'G')).join('');
const bySig = new Map();
for (const c of sparse) {
  const s = sigOf(c);
  if (!bySig.has(s)) bySig.set(s, []);
  bySig.get(s).push(c);
}
const sigsSorted = [...bySig.entries()].sort((a, b) => b[1].length - a[1].length);
console.log(`# 稀疏形状: ` + sigsSorted.slice(0, 5).map(([s, v]) => `${s}×${v.length}`).join('  '));

// ---- B/C/D) 主导族分析
for (const [sig, group] of sigsSorted.slice(0, 2)) {
  if (group.length < 5) continue;
  console.log(`\n## 形状 ${sig} (${group.length} CP, ${(100 * group.length / cps.length).toFixed(0)}%)`);
  const ncols = Math.max(...group.map(c => c.runs.filter(r => r.sym === 1).length));
  const cols = Array.from({ length: ncols }, () => []);
  for (const c of group) {
    const ones = c.runs.filter(r => r.sym === 1).map(r => r.len);
    ones.forEach((v, i) => cols[i].push({ step: c.step, v }));
  }
  // 参数表（列并行时逐行打印）
  console.log(`  参数表 (step : block0 block1 ...):`);
  for (const c of group.slice(0, 40)) {
    const ones = c.runs.filter(r => r.sym === 1).map(r => r.len.toString());
    console.log(`    ${c.step} : ${ones.join(' ')}`);
  }
  if (group.length > 40) console.log(`    ...共 ${group.length} 行`);
  // 固定仿射拟合 + ν₂ 剖面（逐列）
  for (let i = 0; i < ncols; i++) {
    const col = cols[i];
    if (col.length < 5) continue;
    const vs = col.map(p => p.v);
    // 拟合: 穷举 r ∈ [-8..8]\{0}, s = 中位(v_{k+1} - r·v_k), 检验全部残差
    let best = null;
    for (let r = -8; r <= 8; r++) {
      if (r === 0) continue;
      const diffs = [];
      for (let k = 1; k < vs.length; k++) diffs.push(vs[k] - BigInt(r) * vs[k - 1]);
      const sd = [...diffs].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
      const s = sd[Math.floor(sd.length / 2)];
      const bad = diffs.filter(d => d !== s).length;
      if (!best || bad < best.bad) best = { r, s, bad };
    }
    const ratios = [];
    for (let k = 1; k < vs.length; k++) if (vs[k - 1] > 0n) ratios.push(Number(vs[k]) / Number(vs[k - 1]));
    const rmed = ratios.length ? ratios.sort((a, b) => a - b)[Math.floor(ratios.length / 2)] : 0;
    let fitStr2 = '无一致仿射(跳步变率)';
    if (best && best.bad === 0) fitStr2 = `n'=r·n+s 精确: r=${best.r} s=${best.s} (全部 ${vs.length - 1} 跳)`;
    else if (best) fitStr2 = `最优 r=${best.r} s=${best.s} 误差 ${best.bad}/${vs.length - 1}`;
    console.log(`  block[${i}] n=${col.length} 中位比=${rmed.toFixed(3)} | ${fitStr2}`);
    // ν₂ 剖面
    for (const cc of [-3n, -2n, -1n, 0n, 1n, 2n, 3n]) {
      let mx = -1, mxAt = -1; const prof = [];
      col.forEach((p, k) => {
        const v = nu2(p.v + cc);
        if (v > mx) { mx = v; mxAt = k; prof.push(`${v}@${k}`); }
      });
      const late = col.length > 1 ? mxAt / (col.length - 1) : 1;
      const verdict = late >= 0.7 ? ' [记录仍在末期!]' : '';
      console.log(`    ν2(n${cc >= 0n ? '+' : ''}${cc}): max=${mx} 最后记录@${mxAt}/${col.length - 1} (${(late * 100).toFixed(0)}%)${verdict} ${prof.slice(-3).join(' ')}`);
    }
  }
}

// ---- E) D0 摘要
if (d0s.length) {
  console.log(`\n## D0事件 前2+后2:`);
  for (const e of [...d0s.slice(0, 2), ...d0s.slice(-2)])
    console.log(`  step=${e.step} head=${e.head} pop=${e.pop} spanv=${e.spanv} ${e.rle.slice(0, 80)}`);
  if (d0s.length > 6) {
    const gaps = [];
    for (let i = 1; i < d0s.length; i++) gaps.push(Number(d0s[i].step - d0s[i - 1].step));
    gaps.sort((a, b) => a - b);
    console.log(`  D0间隔: min=${gaps[0]} 中位=${gaps[Math.floor(gaps.length / 2)]} max=${gaps[gaps.length - 1]}`);
  }
}
