// param2.mjs — 参数化符号引擎 v2（变量代换式奇偶分裂, 无分数系数）
// 值 = {a,b} 表示 a + b*var; 路径维护代换链 var = 2*var' + p (p∈{0,1}), 即 m ≡ … (mod 2^s)
// 分支: 值奇偶(若 b 奇则分裂), 值==小常数(阈值/孤立 m 记录), 值≥常数(按 b 符号, b<0 时分裂最低点)
import { writeFileSync } from 'fs';
const RCLS = +(process.argv[2] || 3);   // 3 或 9
const MAXDEPTH = 1500, MAXPATHS = 20000;
const paths = [];
// 代换链: subs = [p1,p2,...] 表示 var0(m) = 2*(2*(...)+p2)+p1 …; 反解用
function walk(state, subs, events, depth) {
  if (paths.length > MAXPATHS) return;
  if (depth > MAXDEPTH) { paths.push({ subs, events, outcome: 'DEPTH-CAP' }); return; }
  const C = (c) => ({ a: c, b: 0 });
  const A = (x, y) => ({ a: x.a + y.a, b: x.b + y.b });
  const S = (x, y) => ({ a: x.a - y.a, b: x.b - y.b });
  const par = (x) => ((x.b % 2) + 2) % 2 === 0 ? (((x.a % 2) + 2) % 2) : null; // b 偶: 固定奇偶; b 奇: null(需分裂)
  // 代换: var = 2*newvar + p: x = a + b*var -> (a + b*p) + (2b)*newvar
  const subst = (x, p) => ({ a: x.a + x.b * p, b: 2 * x.b });
  const substAll = (st, p) => ({ t: st.t, r: st.r.map(v => subst(v, p)) });

  if (state.t === 'R') {
    const [a, b] = state.r;
    if (depth > 0 && a.a === b.a && a.b === b.b) {
      paths.push({ subs, events, outcome: `ANCHOR f=${a.a}+${a.b}*var` });
      return;
    }
    // b 与 3 比较: b 常数或大
    if (b.b === 0) {
      if (b.a < 3) { paths.push({ subs, events, outcome: `DEGEN-R-b=${b.a}` }); return; }
    } else if (b.b < 0) { paths.push({ subs, events, outcome: `R-b-negative-slope` }); return; }
    walk({ t: 'S', r: [A(a, C(1)), S(b, C(2)), C(1)] }, subs, [...events, 'R->S3'], depth + 1);
    return;
  }
  if (state.t === 'S') {
    const [x, y, z, ...rest] = state.r;
    const p = par(y);
    if (p === null) {
      // 分裂 var 奇偶
      for (const pp of [0, 1]) walk(substAll({ t: 'S', r: state.r }, pp), [...subs, pp], events, depth); // 代换后 b 全偶, 重入
      return;
    }
    if (p === 1 && ((y.a - 1) % 2 + 2) % 2 === 0 || p === 0 && ((y.a - 2) % 2 + 2) % 2 === 0) { /* 可整除 */ }
    const div2 = (v, off) => ({ a: (v.a - off) / 2, b: v.b / 2 }); // 调用前保证整除
    if (y.b >= 0 ? (y.a + y.b * 0) >= 3 || y.b > 0 : false) { }
    // y ≥ 3? 需要判断"对所有允许的 var ≥ 下界成立" — 我们不设 var 下界, 改为: y.b<0 时终会小(分裂最低点), y.b≥0 且 (a≥3 或 b>0 且 a+? ) 简化: 若 2|b 且 a≥3 恒真; 若 a<3 且 b>0 则存在 var 阈值
    const alwaysGE3 = (y.b === 0 && y.a >= 3) || (y.b > 0 && (y.a + y.b * ((y.a >= 3) ? 0 : Math.ceil((3 - y.a) / y.b))) >= 3);
    if (y.b > 0 && y.a < 3) {
      // 阈值分裂: var ≥ t 时 y≥3 走 sweep; var < t 走小值分支 — 小值部分只有有限个 var, 记录为 edge-case
      const t = Math.ceil((3 - y.a) / y.b);
      paths.push({ subs, events, outcome: `S(y=${y.a}+${y.b}v)-THRESHOLD(var<${t} 小值待查)` });
      // 主分支: var ≥ t: y≥3: sweep (y 奇偶已知 p)
      sweepFrom({ t: 'S', r: state.r }, subs, events, depth, x, y, z, rest, p);
      return;
    }
    if (alwaysGE3) { sweepFrom({ t: 'S', r: state.r }, subs, events, depth, x, y, z, rest, p); return; }
    // y == 2 / == 1 的固定情形 (b=0)
    if (y.b === 0 && y.a === 2) { walk({ t: 'G', r: [A(x, C(1)), A(z, C(1)), ...rest] }, subs, [...events, 'S->G(y2)'], depth + 1); return; }
    if (y.b === 0 && y.a === 1) {
      if (rest.length === 0) walk({ t: 'R', r: [C(1), A(A(x, z), C(3))] }, subs, [...events, 'S3->R(y1)'], depth + 1);
      else walk({ t: 'L', r: [C(1), A(A(x, z), C(3)), ...rest] }, subs, [...events, 'S->L(y1)'], depth + 1);
      return;
    }
    paths.push({ subs, events, outcome: `S(y=${y.a}+${y.b}v)-EDGE` });
    return;
  }
  if (state.t === 'G') {
    const [a, b, ...rest] = state.r;
    if (a.b === 0) {
      if (a.a === 3) { paths.push({ subs, events, outcome: 'HALT(G-a3)' }); return; }
      if (a.a === 2) { walk({ t: 'L', r: [C(1), A(b, C(1)), A(b, C(1)), ...rest] }, subs, [...events, 'G->L(a2)'], depth + 1); return; }
      if (a.a >= 4) { walk({ t: 'S', r: [C(1), S(a, C(3)), C(1), A(b, C(1)), ...rest] }, subs, [...events, 'G->S'], depth + 1); return; }
      paths.push({ subs, events, outcome: `G-a=${a.a}-EDGE` }); return;
    }
    if (a.b < 0) { paths.push({ subs, events, outcome: `G(a=${a.a}+${a.b}v)-neg` }); return; }
    // a.b > 0: 孤立交点 a==3 / a==2 (var 整数解存在则记录), 其余按 a≥4 (大 var)
    for (const cc of [3, 2]) {
      const num = cc - a.a;
      if (num % a.b === 0) {
        const vAt = num / a.b;
        if (vAt >= 0) paths.push({ subs, events, outcome: cc === 3 ? `HALT(G-a3 @var=${vAt})` : `G-a2 @var=${vAt} 待查` });
      }
    }
    walk({ t: 'S', r: [C(1), S(a, C(3)), C(1), A(b, C(1)), ...rest] }, subs, [...events, 'G->S(big)'], depth + 1);
    return;
  }
  if (state.t === 'L') {
    const [r1, r2, r3, ...rest] = state.r;
    if (r3.b === 0 && r3.a === 1) {
      if (state.r.length === 3) walk({ t: 'R', r: [A(r1, C(1)), r2] }, subs, [...events, 'L3->R'], depth + 1);
      else walk({ t: 'S', r: [A(r1, C(1)), r2, ...rest] }, subs, [...events, 'L->S'], depth + 1);
      return;
    }
    if (r3.b > 0 && r3.a < 2) {
      const t = Math.ceil((2 - r3.a) / r3.b);
      paths.push({ subs, events, outcome: `L(r3)-THRESHOLD(var<${t} 待查)` });
      // 主分支 var ≥ t: r3≥2: sweep
      const j = S(r3, C(1));
      const nr1 = A(r1, A(j, C(1)));
      if (state.r.length === 3) walk({ t: 'R', r: [nr1, r2] }, subs, [...events, 'L3-sw->R'], depth + 1);
      else walk({ t: 'S', r: [nr1, r2, ...rest] }, subs, [...events, 'L-sw->S'], depth + 1);
      return;
    }
    // r3 ≥ 2 恒成立 (a≥2 或 b=0 且 a≥2)
    if ((r3.b === 0 && r3.a >= 2) || (r3.b > 0 && r3.a >= 2) || (r3.b > 0 && r3.a + 0 >= 2 && r3.a >= 2)) {
      const j = S(r3, C(1));
      const nr1 = A(r1, A(j, C(1)));
      if (state.r.length === 3) walk({ t: 'R', r: [nr1, r2] }, subs, [...events, 'L3-sw->R'], depth + 1);
      else walk({ t: 'S', r: [nr1, r2, ...rest] }, subs, [...events, 'L-sw->S'], depth + 1);
      return;
    }
    paths.push({ subs, events, outcome: `L(r3=${r3.a}+${r3.b}v)-EDGE` });
    return;
  }
  function sweepFrom(st, subs2, ev2, d2, x, y, z, rest, p) {
    // y 奇(p=1): j=(y-1)/2; 终点 R(1, x+z+2j+3) 或 L; y 偶(p=0): j=(y-2)/2; 终点 G(x+j+1, z+j+1, rest)
    if (((p === 1 ? y.a - 1 : y.a - 2) % 2 + 2) % 2 !== 0 || y.b % 2 !== 0) { paths.push({ subs: subs2, events: ev2, outcome: `SWEEP-DIV-ERR y=${y.a}+${y.b}v p=${p}` }); return; }
    const j = p === 1 ? { a: (y.a - 1) / 2, b: y.b / 2 } : { a: (y.a - 2) / 2, b: y.b / 2 };
    if (p === 1) {
      const nz = A(A(x, j), A(A(z, j), C(3)));
      if (rest.length === 0) walk({ t: 'R', r: [C(1), nz] }, subs2, [...ev2, 'Sw->R'], d2 + 1);
      else walk({ t: 'L', r: [C(1), nz, ...rest] }, subs2, [...ev2, 'Sw->L'], d2 + 1);
    } else {
      walk({ t: 'G', r: [A(A(x, j), C(1)), A(A(z, j), C(1)), ...rest] }, subs2, [...ev2, 'Sw->G'], d2 + 1);
    }
  }
}
walk({ t: 'R', r: [{ a: RCLS, b: 12 }, { a: RCLS, b: 12 }] }, [], [], 0);
console.log(`类 r=${RCLS}: 路径 ${paths.length}`);
const dist = {};
for (const p of paths) { const k = p.outcome.split('(')[0].split(' ')[0]; dist[k] = (dist[k] || 0) + 1; }
console.log('结果分布:', JSON.stringify(dist));
for (const p of paths.slice(0, 10)) console.log(' ', p.outcome.slice(0, 90), '| subs=[' + p.subs + ']', 'ev=' + p.events.length);
writeFileSync(`param2-r${RCLS}.json`, JSON.stringify(paths.map(p => ({ subs: p.subs, n: p.events.length, outcome: p.outcome, events: p.events })), null, 1));
