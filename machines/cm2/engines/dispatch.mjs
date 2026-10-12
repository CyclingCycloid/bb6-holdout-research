// dispatch.mjs — extract the exact output (shape@headclass) per input parameter for
// the size-branching families: g5B (L-dispatch), g6o1/g6o2 ((L,R)-dispatch), g3-terminal.
import { FastTape, macroStepFast } from './macro3.mjs';
function build(runs, head) { const t = new FastTape(); let p = 0;
  for (const r of runs) { if (r.v) for (let i=0;i<r.len;i++,p++) t.write(p,1); else p += r.len; }
  t.head = head; t.st = 0; return t; }
const deep = [{v:0,len:2},{v:1,len:7}];
function era(runs, head) {
  const t = build(runs, head);
  let halt = null;
  for (let i = 0; i < 400000; i++) {
    const r = macroStepFast(t);
    if (String(r.kind).startsWith('HALT')) { halt = r.kind; break; }
    if (r.kind==='Dance'||r.kind==='DanceFill'||r.kind==='DBL'||r.kind==='L1') break;
  }
  const rl = t.rle();
  const rs = rl.s ? rl.s.split(' ').map(x=>{const[v,l]=x.split('^');return{v:+v,len:+l}}) : [];
  let q = rl.lo, hc = 'out';
  for (let i = 0; i < rs.length; i++) { if (t.head >= q && t.head < q + rs[i].len) { hc = i+(rs[i].v?'+':'-')+':'+(t.head-q); break; } q += rs[i].len; }
  const shape = rs.map(x=>x.v?'B'+(x.len<10?x.len:'*'):('g'+x.len)).join(',');
  return { halt, shape, hc, s: rl.s.slice(0,80), h: t.head };
}
console.log('===== g5B L-dispatch (M=2, R=2, tail (g1,1)) =====');
for (let L = 1; L <= 12; L++) {
  const r = era([{v:1,len:L},{v:0,len:5},{v:1,len:2},{v:0,len:2},{v:1,len:2},{v:0,len:1},{v:1,len:1},...deep], L+1);
  console.log('L='+String(L).padStart(2), r.halt ? 'HALT-'+r.halt : (r.shape+' @'+r.hc).slice(0,60));
}
console.log('===== g6o1 (L,R)-dispatch (tail empty) =====');
for (const [L,R] of [[1,1],[1,2],[2,1],[2,2],[3,1],[3,2],[3,3],[4,2],[5,2],[6,2],[9,2],[3,6],[6,6],[18,6],[3,9],[9,9],[18,9],[50,20]]) {
  const r = era([{v:1,len:L},{v:0,len:6},{v:1,len:R},...deep], L+1);
  console.log(`(${L},${R})`.padStart(9), r.halt ? 'HALT-'+r.halt : (r.shape+' @'+r.hc).slice(0,60));
}
console.log('===== g6o2 (L,R)-dispatch (tail (g2,9)) =====');
for (const [L,R] of [[3,2],[4,2],[6,2],[9,2],[18,6],[3,9],[9,9],[50,20]]) {
  const r = era([{v:1,len:L},{v:0,len:6},{v:1,len:R},{v:0,len:2},{v:1,len:9},...deep], L+2);
  console.log(`(${L},${R})`.padStart(9), r.halt ? 'HALT-'+r.halt : (r.shape+' @'+r.hc).slice(0,60));
}
console.log('===== g3-terminal (M,R) dispatch (tail empty) =====');
for (const [M,R] of [[1,1],[2,1],[3,1],[3,2],[3,3],[4,1],[5,1],[9,1],[9,2],[20,3],[50,4]]) {
  const r = era([{v:1,len:3},{v:0,len:1},{v:1,len:M},{v:0,len:3},{v:1,len:R},...deep], 3+1+M+1);
  console.log(`(M${M},R${R})`.padStart(10), r.halt ? 'HALT-'+r.halt : (r.shape+' @'+r.hc).slice(0,60));
}
