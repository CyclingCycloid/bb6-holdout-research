// grid2.mjs — full regime census: markers = (runs, head at era start), one era each, classify map.
// Marker shapes (from the 1e9 orbit): the first-3-run patterns + first tail gap.
import { FastTape, macroStepFast } from './macro3.mjs';
function build(runs, head) { // runs = [{v,len}], head absolute
  const t = new FastTape(); let p = 0;
  for (const r of runs) { if (r.v) for (let i = 0; i < r.len; i++, p++) t.write(p, 1); else p += r.len; }
  t.head = head; t.st = 0; return t;
}
const mk = (a, g1, m, g2, r, tail) => {
  const runs = [{v:1,len:a},{v:0,len:g1},{v:1,len:m},{v:0,len:g2},{v:1,len:r}];
  for (const [g, l] of tail) runs.push({v:0,len:g},{v:1,len:l});
  return runs;
};
const cases = [];
// Regime A: B,g1,B,g5,B with M >= 5 and terminals 1..4
for (const m of [5,6,9,12,20]) for (const [L,R] of [[3,1],[6,2],[9,5],[30,20],[99,50]]) cases.push({tag:'A', runs: mk(L,1,m,5,R,[[2,7]]), head: L+1+m+2});
// Regime A terminals with tail-gap g1 vs g2
for (const m of [1,2,3,4]) for (const tg of [1,2]) for (const [L,R] of [[3,1],[6,2],[9,3],[30,20]]) cases.push({tag:`A-m${m}-tg${tg}`, runs: mk(L,1,m,5,R,[[tg,7]]), head: L+1+m+2});
// Regime B: B,g5,B,g2,B (no g1 prefix)
for (const [L,M,R] of [[1,2,3],[2,2,3],[3,2,3],[6,2,20],[30,2,20],[82,2,31],[6,3,20],[30,3,9]]) cases.push({tag:'B', runs: mk(L,5,M,2,R,[[2,8]]), head: L+1+M+2- M - 2 + 1}); // head = gap5[1] = L+1
// fix: for B the gap5 is between L and M: head = L+1 (gap5[1] = L+1? gap5 = [L..L+4], gap[1] = L+1)
for (const [L,M,R] of [[1,2,3],[2,2,3],[3,2,3],[6,2,20],[30,2,20],[82,2,31],[6,3,20],[30,3,9]]) cases.push({tag:'B2', runs: mk(L,5,M,2,R,[[2,8]]), head: L+1});
// Regime g6: B,g6,B (from M=1/M=4 terminals): head = ? try gap6[1] = L+1
for (const [L,R] of [[3,2],[6,3],[18,6],[30,8],[99,50]]) for (const tg of [1,2]) cases.push({tag:`G6-tg${tg}`, runs: mk(L,6,R,tg,9,[[2,7]]), head: L+1});
// Regime g3: B,g1,B,g3,B
for (const [L,M,R] of [[3,3,3],[17,3,4],[20,7,8],[30,9,13],[3,315,240]]) for (const tg of [1,2]) cases.push({tag:`G3-tg${tg}`, runs: mk(L,1,M,3,R,[[tg,10]]), head: L+1+M+2});
// Regime g1g1: B,g1,B,g1,B
for (const [L,M,R] of [[35,9,13],[3,9,2],[30,9,1],[3,3,2]]) cases.push({tag:'G11', runs: mk(L,1,M,1,R,[[2,7]]), head: L+1+M+2});
// Regime g2: B,g1,B,g2,B
for (const [L,M,R] of [[11,1,7],[30,9,20],[110,36,48]]) cases.push({tag:'G12', runs: mk(L,1,M,2,R,[[2,7]]), head: L+1+M+2});
let halts = 0;
const out = [];
for (const c of cases) {
  const t = build(c.runs, c.head);
  const r0 = t.rle();
  let n = 0, halt = null;
  for (let i = 0; i < 100000; i++) {
    const r = macroStepFast(t); n++;
    if (String(r.kind).startsWith('HALT')) { halt = r.kind + '@' + t.step; break; }
    if (r.kind === 'Dance' || r.kind === 'DanceFill' || r.kind === 'DBL' || r.kind === 'L1') break;
  }
  const r1 = t.rle();
  if (halt) { halts++; console.log('HALT', c.tag, r0.s, '->', halt); }
  out.push({ tag: c.tag, from: r0.s, to: r1.s, n });
}
console.log('census cells:', out.length, 'halts:', halts);
for (const o of out) console.log(o.tag.padEnd(10), o.from.slice(0,58).padEnd(58), '=>', o.to.slice(0,58), `[${o.n}]`);
