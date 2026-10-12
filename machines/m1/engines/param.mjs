// param.mjs — 参数化符号引擎: 从 R(12m+r, 12m+r) (r ∈ {3,9}) 推导 f(n) 闭式
// 值 = {a, b} 表示 a + b*m。分支: 奇偶(分裂 m mod 2), 与常数比较(阈值分裂)。
// 输出: 每条路径的 (条件, 事件序列, 结果 R(A,A) 的 A 仿射式, 是否停机/退化)
import { writeFileSync } from 'fs';

const R = process.argv[2] === '9' ? 9 : 3;   // 类
const M_MIN = 1;                              // m ≥ 1 (n = 12m+r ≥ 15)

// 值运算
const V = {
  const: (c) => ({ a: c, b: 0 }),
  add: (x, y) => ({ a: x.a + y.a, b: x.b + y.b }),
  sub: (x, y) => ({ a: x.a - y.a, b: x.b - y.b }),
  isConst: (x) => x.b === 0,
  eq: (x, y) => x.a === y.a && x.b === y.b,
  // 比较 x vs 常数 c: 返回 {always:bool|null, mAt:int|null}
  cmpConst: (x, c) => {
    if (x.b === 0) return x.a === c ? { always: true } : { always: false };
    const mAt = (c - x.a) / x.b; // 相等的唯一 m (b≠0)
    return { always: false, mAt: Number.isInteger(mAt) ? mAt : null };
  },
  geConst: (x, c) => { // x ≥ c 是否恒成立 (m ≥ M_MIN)
    if (x.b === 0) return x.a >= c;
    if (x.b > 0) return (x.a + x.b * M_MIN) >= c;
    return (x.a + x.b * 1e15) >= c; // b<0: 大 m 时不成立 — 近似处理,实际应分裂
  },
  parityFixed: (x) => (x.b % 2 === 0 ? x.a % 2 : null), // null = 随 m 变
};

// 状态: {t:'R'|'S'|'G'|'L', r:[值...]}
// 路径条件: {mParity: 0|1|null, mGE: 下界, mLT: 上界|null}
const paths = [];
function walk(state, cond, events, depth) {
  if (depth > 400) { paths.push({ cond, events, outcome: 'DEPTH-CAP' }); return; }
  const c = state;
  if (c.t === 'R') {
    const [a, b] = c.r;
    if (depth > 0 && V.eq(a, b)) {
      // 锚点达成: f(12m+r) = a = α+βm (需 m ≥ M_MIN 且 β ≥ 0 保证 ≥ 起点+6 检查)
      paths.push({ cond, events, outcome: `ANCHOR f=${a.a}+${a.b}m delta=${a.b * 1 - 12}m+${a.a - R}` });
      return;
    }
    if (V.geConst(b, 3)) {
      walk({ t: 'S', r: [V.add(a, V.const(1)), V.sub(b, V.const(2)), V.const(1)] }, cond, [...events, 'R->S3'], depth + 1);
    } else if (V.cmpConst(b, 2).always) {
      paths.push({ cond, events, outcome: 'DEGENERATE-R-b2' });
    } else {
      paths.push({ cond, events, outcome: `R(b=${JSON.stringify(b)})-small` });
    }
    return;
  }
  if (c.t === 'S') {
    const [x, y, z, ...rest] = c.r;
    if (V.geConst(y, 3)) {
      // sweep: 奇偶决定终点
      const p = V.parityFixed(y);
      if (p !== null) {
        sweep(y, p === 1);
      } else {
        // 分裂 m mod 2: y = a + b m, b 奇: m 偶时 y ≡ a, 奇时 ≡ a+b
        for (const mp of [0, 1]) {
          const yPar = (y.a + y.b * mp) % 2;
          const c2 = { ...cond, mParity: mp };
          sweepY(y, yPar === 1, x, z, rest, c2, events, depth);
        }
      }
      function sweepY(yy, endsAt1, x2, z2, rest2, cond2, ev2, d2) {
        // j 步后 y→end; x+j, z+j
        const j1 = endsAt1 ? V.sub(V.sub(yy, V.const(1)), V.const(0)) : null; // 占位
        // 简化: 直接用规则名, 数值端 sweep 后: x' = x+j, y'=1或2, z'=z+j, j=(y-1)/2 或 (y-2)/2
        // j 是仿射的: (y-1)/2 = { (a-1)/2 + (b/2) m } 要求 a,b 同奇偶使整除 — 奇偶分裂已保证
        const half = (v, off) => ({ a: (v.a - off) / 2, b: v.b / 2 }); // off=1 或 2
        if (endsAt1) {
          const j = half(yy, 1);
          const nx = V.add(x2, j), nz = V.add(z2, j);
          if (rest2.length === 0) {
            const target = { t: 'R', r: [V.const(1), V.add(V.add(nx, nz), V.const(3))] };
            walk(target, cond2, [...ev2, `S-sweep->R`], d2 + 1);
          } else {
            walk({ t: 'L', r: [V.const(1), V.add(V.add(nx, nz), V.const(3)), ...rest2] }, cond2, [...ev2, 'S-sweep->L'], d2 + 1);
          }
        } else {
          const j = half(yy, 2);
          walk({ t: 'G', r: [V.add(V.add(x2, j), V.const(1)), V.add(V.add(z2, j), V.const(1)), ...rest2] }, cond2, [...ev2, 'S-sweep->G'], d2 + 1);
        }
      }
      function sweep(yy, e1) { sweepY(yy, e1, x, z, rest, cond, events, depth); }
      return;
    }
    const c2y = V.cmpConst(y, 2);
    if (c2y.always) { walk({ t: 'G', r: [V.add(x, V.const(1)), V.add(z, V.const(1)), ...rest] }, cond, [...events, 'S->G(y=2)'], depth + 1); return; }
    const c1y = V.cmpConst(y, 1);
    if (c1y.always) {
      if (rest.length === 0) walk({ t: 'R', r: [V.const(1), V.add(V.add(x, z), V.const(3))] }, cond, [...events, 'S3->R(y=1)'], depth + 1);
      else walk({ t: 'L', r: [V.const(1), V.add(V.add(x, z), V.const(3)), ...rest] }, cond, [...events, 'S->L(y=1)'], depth + 1);
      return;
    }
    paths.push({ cond, events, outcome: `S(y=${JSON.stringify(y)})-edge(mAt=${c2y.mAt ?? c1y.mAt})` });
    return;
  }
  if (c.t === 'G') {
    const [a, b, ...rest] = c.r;
    if (V.cmpConst(a, 3).always) { paths.push({ cond, events, outcome: 'HALT(G a=3)' }); return; }
    if (V.cmpConst(a, 2).always) { walk({ t: 'L', r: [V.const(1), V.add(b, V.const(1)), V.add(b, V.const(1)), ...rest] }, cond, [...events, 'G->L(a=2)'], depth + 1); return; }
    if (V.geConst(a, 4)) { walk({ t: 'S', r: [V.const(1), V.sub(a, V.const(3)), V.const(1), V.add(b, V.const(1)), ...rest] }, cond, [...events, 'G->S'], depth + 1); return; }
    // a 与 3 的交点: 阈值分裂
    const mAt = V.cmpConst(a, 3).mAt;
    if (mAt !== null && mAt >= M_MIN) {
      // m = mAt: HALT
      paths.push({ cond: { ...cond, mEq: mAt }, events, outcome: 'HALT(G a=3 @m=' + mAt + ')' });
      // m ≠ mAt 继续按 geConst
      walk({ t: 'S', r: [V.const(1), V.sub(a, V.const(3)), V.const(1), V.add(b, V.const(1)), ...rest] }, { ...cond, mNE: mAt }, [...events, 'G->S(split)'], depth + 1);
      return;
    }
    paths.push({ cond, events, outcome: `G(a=${JSON.stringify(a)})-edge` });
    return;
  }
  if (c.t === 'L') {
    const [r1, r2, r3, ...rest] = c.r;
    if (V.geConst(r3, 2)) {
      const j = V.sub(r3, V.const(1));
      const nr1 = V.add(r1, V.add(j, V.const(1)));
      if (c.r.length === 3) walk({ t: 'R', r: [nr1, r2] }, cond, [...events, 'L3-sweep->R'], depth + 1);
      else walk({ t: 'S', r: [nr1, r2, ...rest] }, cond, [...events, 'L-sweep->S'], depth + 1);
      return;
    }
    if (V.cmpConst(r3, 1).always) {
      if (c.r.length === 3) walk({ t: 'R', r: [V.add(r1, V.const(1)), r2] }, cond, [...events, 'L3->R'], depth + 1);
      else walk({ t: 'S', r: [V.add(r1, V.const(1)), r2, ...rest] }, cond, [...events, 'L->S'], depth + 1);
      return;
    }
    paths.push({ cond, events, outcome: `L(r3=${JSON.stringify(r3)})-edge` });
    return;
  }
  paths.push({ cond, events, outcome: 'unknown' });
}
// 起始: R(12m+r, 12m+r), r=3 或 9
walk({ t: 'R', r: [{ a: R, b: 12 }, { a: R, b: 12 }] }, { mParity: null, mGE: M_MIN }, [], 0);
// 汇总结果
const outcomes = {};
for (const p of paths) {
  const key = p.outcome.startsWith('R-anchor') ? 'ANCHOR' : p.outcome.split('(')[0];
  outcomes[key] = (outcomes[key] || 0) + 1;
}
console.log(`类 r=${R}: 路径总数 ${paths.length}`);
console.log('结果分布:', JSON.stringify(outcomes));
const sample = paths.slice(0, 8);
for (const p of sample) console.log(' ', JSON.stringify({ cond: p.cond, n: p.events.length, out: p.outcome.slice(0, 60) }));
writeFileSync(`param-r${R}.json`, JSON.stringify(paths.map(p => ({ cond: p.cond, events: p.events, outcome: p.outcome })), null, 1));
