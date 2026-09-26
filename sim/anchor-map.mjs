// anchor-map.mjs — 锚点事件选取 + 锚点映射闭式拟合(精确有理) + ν₂ 深度有界性判定
// 用法: node sim/anchor-map.mjs <CODE> [CAP=1e7] [MAXREC=300] [FORCE事件如D0]
// 设计:
//   * 事件构型向量 = 全 run 长度 (1-runs 与 0-runs 交替, 首 run 为 1) + headrel
//   * 形状类 = (run 总数, 向量长度, 0-run 长度模式, 前两个 1-block 奇偶)
//   * 类内相邻对 -> 仿射映射 v' = C·v + s: 精确有理高斯消元 (秩亏时自由变量取 0),
//     对全部相邻对逐对验证 (每步结果必须为整数); 仅 EXACT 类外推轨道
//   * 轨道 50000 步 BigInt(有理), 只对 1-block 分量测 ν₂(v+c), c ∈ {-3..3}:
//     BOUNDED = 后 90% 无新记录 (2-adic 类集合有限迹象 -> 可逐类穷尽)
//     CHAOS   = 晚期记录持续 (M1 型记录事件)
// 校准: M1 = CHAOS (已知); M3 = A2/A3 类精确有理映射 (已知闭式)。
import { execFileSync } from 'child_process';
import { resolve } from 'path';
const TRI = resolve('./sim/triage3.exe');
const CODE = (process.argv[2] ?? '').replace(/_/g, '');
const CAP = process.argv[3] ?? '1e7';
const MAXREC = +(process.argv[4] ?? 300);
const FORCE = process.argv[5] ?? '';

const nu2 = (x) => {
  if (x === 0n) return 9999;
  let v = 0, a = x < 0n ? -x : x;
  while (a % 2n === 0n) { a /= 2n; v++; if (v > 4000) break; }
  return v;
};
const gg = (x, y) => { x = x < 0n ? -x : x; y = y < 0n ? -y : y; while (y) { [x, y] = [y, x % y]; } return x || 1n; };
const red = (nn, dd) => { if (dd < 0n) { nn = -nn; dd = -dd; } const g = gg(nn, dd); return [nn / g, dd / g]; };
const fracAdd = (a, b) => red(a[0] * b[1] + b[0] * a[1], a[1] * b[1]);
const fracMul = (f, x) => [f[0] * x, f[1]];

function runEvents(st, sy, cap, maxrec) {
  let out = '';
  try {
    out = execFileSync(TRI, ['EVENT', CODE, String(cap), `${'ABCDEF'[st]}${sy}`, String(maxrec)],
      { encoding: 'utf8', maxBuffer: 1 << 28 });
  } catch (e) { return { err: String(e.message).slice(0, 60), evs: [] }; }
  const evs = [];
  for (const ln of out.split(/\r?\n/)) {
    if (!ln.startsWith('EV ')) continue;
    const m = ln.match(/^EV (\d+) ([A-F])(\d) (-?\d+) pop=(-?\d+) width=(-?\d+) headrel=(-?\d+) R (-?\d+)\|(.*)$/);
    if (!m) continue;
    const tot = +m[8];
    let vec = null;
    if (tot >= 0 && tot <= 64) {
      const parts = m[9].trim().split(/\s+/).filter(Boolean);
      const lens = parts.map(s => BigInt(s.split('^')[1]));
      vec = [...lens, BigInt(m[7])];
    }
    evs.push({ step: BigInt(m[1]), headrel: BigInt(m[7]), tot, vec, raw: m[9].trim() });
  }
  return { evs };
}

// 精确有理高斯消元, 秩亏 -> 自由变量取 0; 返回系数数组 (有理) 或 null(不一致)
function solveExact(A, b) {
  const n = A.length, d = A[0].length;
  const M = A.map((row, i) => [...row.map(x => [x, 1n]), [b[i], 1n]]);
  let rank = 0; const pivCol = [];
  for (let col = 0; col < d && rank < n; col++) {
    let piv = -1;
    for (let r = rank; r < n; r++) if (M[r][col][0] !== 0n) { piv = r; break; }
    if (piv < 0) continue;
    [M[rank], M[piv]] = [M[piv], M[rank]];
    const pr = M[rank];
    for (let r = 0; r < n; r++) {
      if (r === rank || M[r][col][0] === 0n) continue;
      const fN = M[r][col][0] * pr[col][1], fD = M[r][col][1] * pr[col][0];
      for (let c2 = col; c2 <= d; c2++) {
        const num = fN * pr[c2][0], den = fD * pr[c2][1];
        M[r][c2] = red(M[r][c2][0] * den - M[r][c2][1] * num, M[r][c2][1] * den);
      }
    }
    pivCol.push(col); rank++;
  }
  for (let r = rank; r < n; r++) if (M[r][d][0] !== 0n) return null;
  const c = new Array(d).fill([0n, 1n]);
  for (let r = rank - 1; r >= 0; r--) {
    const pc = pivCol[r];
    let acc = M[r][d];
    for (let j = pc + 1; j < d; j++) {
      if (c[j][0] === 0n || M[r][j][0] === 0n) continue;
      const prod = [M[r][j][0] * c[j][0], M[r][j][1] * c[j][1]];
      acc = fracAdd(acc, [-prod[0], prod[1]]);
    }
    c[pc] = red(acc[0] * M[r][pc][1], acc[1] * M[r][pc][0]);
  }
  return c;
}

function fitAffineExact(pairs, d) {
  const cs = [];
  for (let i = 0; i < d; i++) {
    let sol = null;
    for (let t = 0; t < 10 && !sol; t++) {
      const sub = [];
      for (let k = 0; k <= d && k < pairs.length; k++) sub.push(pairs[(k + t * 5) % pairs.length]);
      const A = sub.slice(0, d + 1).map(p => [...p.v, 1n]);
      const b = sub.slice(0, d + 1).map(p => p.w[i]);
      const c = solveExact(A, b);
      if (!c) continue;
      let bad = 0;
      for (const p of pairs) {
        let acc = c[d];
        for (let j = 0; j < d; j++) if (c[j][0] !== 0n) acc = fracAdd(acc, fracMul(c[j], p.v[j]));
        if (acc[1] !== 1n || acc[0] !== p.w[i]) bad++;
      }
      sol = { c, s: c[d], bad };
      if (bad === 0) break;
    }
    if (!sol) return null;
    cs.push(sol);
  }
  return cs;
}
const applyMap = (cs, v) => cs.map(({ c, s }) => {
  let acc = s;
  for (let j = 0; j < v.length; j++) if (c[j][0] !== 0n) acc = fracAdd(acc, fracMul(c[j], v[j]));
  return acc;
});

function analyzeEvent(st, sy, cap, maxrec) {
  const { evs } = runEvents(st, sy, cap, maxrec);
  const seq = [];
  let lastRaw = null;
  for (const e of evs) {
    if (!e.vec || e.vec.length < 2 || e.vec.length > 12) continue;
    if (e.raw === lastRaw) continue; // 扫描内微事件 (同构型, headrel 漂移) 折叠 — 只保留锚点级转移
    seq.push(e); lastRaw = e.raw;
  }
  if (seq.length < 16) { console.log(`  (去重序列过短 ${seq.length}, 跳过)`); return; }
  // 粗类: (run总数, 向量长度, 0-run模式) -> 精确拟合; 失败再按前两个 1-block 奇偶细分
  const coarseKey = (e) => {
    const gaps = e.vec.filter((_, i) => i % 2 === 1 && i < e.vec.length - 1).join(',');
    return `r${e.tot}/d${e.vec.length}/g${gaps}`;
  };
  const parKey = (e) => [0, 2].map(i => i < e.vec.length - 1 ? (e.vec[i] % 2n === 0n ? '0' : '1') : '-').join('');
  const bySig = new Map();
  for (const e of seq) { const s = coarseKey(e); if (!bySig.has(s)) bySig.set(s, []); bySig.get(s).push(e); }
  const sigs = [...bySig.entries()].sort((a, b) => b[1].length - a[1].length);
  console.log(`# 粗形状类: ${sigs.slice(0, 4).map(([s, v]) => `${s}×${v.length}`).join('   ')}`);

    for (const [s, groupAll] of sigs.slice(0, 4)) {
    const d0 = groupAll[0].vec.length;
    if (groupAll.length < Math.max(10, d0 + 3)) continue;
    // 观测序列 ν₂ 概览 (无外推, 纯实测): 每个类内事件序列的 1-block ν₂(v+c) 记录
    {
      const oneLen = (e, i) => e.vec[i];
      let mx = -1, mxAt = -1;
      for (let i = 0; i < d0 - 1; i += 2) for (const e of groupAll) for (const c of [-3n, 0n, 3n]) {
        if (oneLen(e, i) + c === 0n) continue;
        const val = nu2(oneLen(e, i) + c);
        if (val > mx) { mx = val; mxAt = groupAll.indexOf(e); }
      }
      console.log(`  [实测] ${s}: 类内最大 ν₂(1-block+c, c∈{-3,0,3}) = ${mx} @序位${mxAt}/${groupAll.length}`);
    }
    // 自适应: 先整体拟合, 非精确则按奇偶细分
    const variants = [{ key: '(全体)', group: groupAll }];
    const byPar = new Map();
    for (const e of groupAll) { const p = parKey(e); if (!byPar.has(p)) byPar.set(p, []); byPar.get(p).push(e); }
    for (const [p, g] of byPar) if (byPar.size > 1) variants.push({ key: `奇偶${p}`, group: g });
    let done = false;
    for (const { key, group } of variants) {
      const d = group[0].vec.length;
      if (group.length < Math.max(5, d + 2) || done) continue;
      console.log(`## ${s} ${key} (${group.length} 事件) 前6: ${group.slice(0, 6).map(e => '(' + e.vec.join(',') + ')').join(' ')}`);
      const pairs = [];
      for (let k = 1; k < group.length; k++) pairs.push({ v: group[k - 1].vec, w: group[k].vec });
      const cs = fitAffineExact(pairs, d);
      if (!cs) { console.log('  [求解失败]'); continue; }
      const badTot = cs.reduce((a, m) => a + m.bad, 0);
      const exact = badTot === 0;
      const od = pairs.length >= Math.max(3 * d, 10); // 过确定倍率 (防欠定过拟合)
      console.log(`  映射(${exact ? 'EXACT✓ 全部' + pairs.length + ' 对' : `近似,${badTot}/${pairs.length} 误`}${od ? '' : ' [欠定风险:对数<3d]'}): ` +
        cs.map((m, i) => `w${i}=` + m.c.map((c, j) => c[0] !== 0n ? `${c[1] === 1n ? c[0] : `${c[0]}/${c[1]}`}v${j}` : '').filter(Boolean).join('+') + (m.s[0] !== 0n ? (m.s[0] > 0n ? '+' : '') + (m.s[1] === 1n ? m.s[0] : `${m.s[0]}/${m.s[1]}`) : '')).join(' ; '));
      if (!exact) { console.log('  [映射非精确 — 试更细分类或放弃]'); continue; }
      if (!od) { console.log('  [精确但欠定 — 需更多事件验证, 不外推]'); continue; }
      done = true;
      const K = 50000;
      let v = group[0].vec.slice().map(x => [x, 1n]);
      const offs = [-3n, -2n, -1n, 0n, 1n, 2n, 3n];
      const rec = new Map();
      const lateRecs = [];
      for (let k = 0; k < K; k++) {
        for (let i = 0; i < d - 1; i += 2) for (const c of offs) {
          if (v[i][1] !== 1n) continue;
          if (v[i][0] + c === 0n) continue; // ν₂(0) 无定义, 跳过防污染
          const val = nu2(v[i][0] + c);
          const kk = i + ':' + c;
          const r = rec.get(kk) ?? { max: -1, at: -1 };
          if (val > r.max) {
            r.max = val; r.at = k; rec.set(kk, r);
            if (k > K * 0.1) lateRecs.push(`v${i}${c >= 0n ? '+' : ''}${c}=${val}@${k}`);
          }
        }
        v = applyMap(cs, v);
        if (v.some(x => x[0] < -(10n ** 14n) || x[0] > (10n ** 40n))) { console.log(`  [轨道 k=${k} 溢出]`); break; }
      }
      for (let i = 0; i < d - 1; i += 2) {
        console.log('    v' + i + ': ' + offs.map(c => {
          const r = rec.get(i + ':' + c) ?? { max: -1, at: -1 };
          return `c=${c}:max=${r.max}@${r.at}${r.at >= K * 0.9 ? '!' : ''}`;
        }).join(' '));
      }
      const v0 = lateRecs.length === 0 ? 'BOUNDED-信号' : lateRecs.length <= 2 ? '弱CHAOS' : 'CHAOS';
      console.log(v0 === 'BOUNDED-信号'
        ? `>> BOUNDED-信号: ${K} 步模型轨道 ν₂ 全部被前 10% 封顶 [映射逐事件精确]`
        : v0 === '弱CHAOS' ? `>> 弱CHAOS: ${lateRecs.length} 条晚期记录 (${lateRecs.join(' ')})`
        : `>> CHAOS: ${lateRecs.length} 条晚期记录, 末记录 ${lateRecs.slice(-1)} (M1 型)`);
    }
  }
}

console.log(`# machine=${CODE} CAP=${CAP} MAXREC=${MAXREC}`);
if (FORCE) {
  const st = FORCE.charCodeAt(0) - 65, sy = +FORCE[1];
  console.log(`# 强制事件 ${FORCE}`);
  analyzeEvent(st, sy, CAP, MAXREC);
} else {
  const cands = [];
  for (let st = 0; st < 6; st++) for (const sy of [0, 1]) {
    const { evs } = runEvents(st, sy, CAP, 80);
    const withV = evs.filter(e => e.vec && e.vec.length >= 2 && e.vec.length <= 12);
    if (withV.length < 25) continue;
    cands.push({ st, sy, n: withV.length, medRuns: withV.map(e => e.tot).sort((a, b) => a - b)[Math.floor(withV.length / 2)] });
  }
  console.log('# 候选事件类型:', cands.map(c => `${'ABCDEF'[c.st]}${c.sy}(n=${c.n},runs~${c.medRuns})`).join(' ') || '无');
  for (const c of cands) {
    console.log(`\n===== 事件 ${'ABCDEF'[c.st]}${c.sy} =====`);
    analyzeEvent(c.st, c.sy, CAP, MAXREC);
  }
}
console.log('\n# 诚实声明: 映射由前 ≤MAXREC 个事件拟合; 轨道为模型外推; BOUNDED = 模型+验证深度内结论。');
