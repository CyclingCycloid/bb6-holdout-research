// grid3.mjs — definitive census with correct head conventions from the real orbit.
import { FastTape, macroStepFast } from './macro3.mjs';
function build(runs, head) { const t = new FastTape(); let p = 0;
  for (const r of runs) { if (r.v) for (let i=0;i<r.len;i++,p++) t.write(p,1); else p += r.len; }
  t.head = head; t.st = 0; return t; }
const cases = [];
const push = (tag, runs, head) => cases.push({tag, runs, head});
// Regime A clean: (L, 1, M, 5, R) head=gap5[1]=L+1+M+1; M>=5
for (const M of [5,6,9,50]) for (const [L,R] of [[3,1],[6,2],[99,50]]) for (const tg of [1,2])
  push('A'+tg, [{v:1,len:L},{v:0,len:1},{v:1,len:M},{v:0,len:5},{v:1,len:R},{v:0,len:tg},{v:1,len:7}], L+1+M+1);
// Regime A terminals M=1..4 (tail gap 1 and 2)
for (const M of [1,2,3,4]) for (const [L,R] of [[3,1],[3,2],[6,2],[30,20]]) for (const tg of [1,2])
  push('At'+M+'g'+tg, [{v:1,len:L},{v:0,len:1},{v:1,len:M},{v:0,len:5},{v:1,len:R},{v:0,len:tg},{v:1,len:7}], L+1+M+1);
// Regime B: (L, 5, M, 2, R) head=gap5[1]=L+1
for (const [L,M,R] of [[1,2,3],[3,2,3],[82,2,31],[6,3,20],[3,3,3]]) 
  push('B', [{v:1,len:L},{v:0,len:5},{v:1,len:M},{v:0,len:2},{v:1,len:R},{v:0,len:2},{v:1,len:8}], L+1);
// Regime g6 with head offset 1 and 2: (L, 6, R, tg, S)
for (const off of [1,2]) for (const [L,R] of [[3,2],[18,6],[99,50]]) for (const tg of [1,2])
  push('G6o'+off+'g'+tg, [{v:1,len:L},{v:0,len:6},{v:1,len:R},{v:0,len:tg},{v:1,len:9},{v:0,len:2},{v:1,len:7}], L+off);
// Regime g3: (L, 1, M, 3, R, tg, S): head = gap3[1] = L+1+M+1; danger: R,S small; tail variants
for (const M of [3,9,315]) for (const [R,S] of [[4,10],[1,3],[2,2],[3,2],[1,1],[2,1]]) for (const emp of [0,1]) {
  const runs = [{v:1,len:3},{v:0,len:1},{v:1,len:M},{v:0,len:3},{v:1,len:R}];
  if (!emp) { runs.push({v:0,len:1},{v:1,len:S},{v:0,len:2},{v:1,len:7}); }
  push('G3m'+M+'r'+R+'s'+S+(emp?'E':''), runs, 3+1+M+1);
}
// Regime g1g1: (L, 1, M, 1, R): head = M's left edge = L+2; danger R=1,2
for (const [L,M,R] of [[35,9,13],[3,9,2],[30,9,1],[3,3,2],[3,3,1]]) for (const tg of [1,2]) {
  const runs = [{v:1,len:L},{v:0,len:1},{v:1,len:M},{v:0,len:1},{v:1,len:R},{v:0,len:tg},{v:1,len:7}];
  push('G11r'+R+'g'+tg, runs, L+2);
}
// Regime g2: (L, 1, M, 2, R): head = M's left edge = L+2
for (const [L,M,R] of [[11,1,7],[110,36,48],[3,1,2]]) 
  push('G12', [{v:1,len:L},{v:0,len:1},{v:1,len:M},{v:0,len:2},{v:1,len:R},{v:0,len:2},{v:1,len:7}], L+2);
let halts = 0;
for (const c of cases) {
  const t = build(c.runs, c.head);
  const r0 = t.rle().s;
  let n = 0, halt = null;
  for (let i = 0; i < 200000; i++) {
    const r = macroStepFast(t); n++;
    if (String(r.kind).startsWith('HALT')) { halt = r.kind + '@' + t.step; break; }
    if (r.kind==='Dance'||r.kind==='DanceFill'||r.kind==='DBL'||r.kind==='L1') break;
  }
  if (halt) { halts++; console.log('HALT', c.tag, '|', r0, '->', halt); }
  else console.log(c.tag.padEnd(12), r0.slice(0,52).padEnd(52), '=>', t.rle().s.slice(0,52), '[#r='+n+']');
}
console.log('cells:', cases.length, 'halts:', halts);
