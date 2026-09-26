// census2.mjs — definitive case table: all families x boundary params x tail-front cases.
// Records: halt?, routine-signature, output (runs+head). One era per cell.
import { FastTape, macroStepFast } from './macro3.mjs';
function build(runs, head) { const t = new FastTape(); let p = 0;
  for (const r of runs) { if (r.v) for (let i=0;i<r.len;i++,p++) t.write(p,1); else p += r.len; }
  t.head = head; t.st = 0; return t; }
const cells = [];
const add = (tag, runs, head) => cells.push({tag, runs, head});
// tail builders: tf = ['E'] | ['g1',S] | ['g2',S]; rest = fixed (g2,7) deep pair
const tailRuns = (tf, S, deep) => {
  const r = [];
  if (tf === 'g1') r.push({v:0,len:1},{v:1,len:S});
  if (tf === 'g2') r.push({v:0,len:2},{v:1,len:S});
  if (deep) r.push({v:0,len:2},{v:1,len:7});
  return r;
};
// F-A clean M>=5 and terminals
for (const M of [5,9,1,2,3,4]) for (const [L,R] of [[3,1],[3,2],[6,2],[30,20]]) for (const tf of ['E','g1','g2']) for (const S of (tf==='E'?[0]:[1,2,3,9]))
  add(`A(M${M},L${L},R${R},${tf}${S})`,
    [{v:1,len:L},{v:0,len:1},{v:1,len:M},{v:0,len:5},{v:1,len:R},...tailRuns(tf,S,true)], L+1+M+1);
// F-g5B
for (const M of [2,3]) for (const L of [1,2,3,6,30]) for (const R of [1,2,9]) for (const tf of ['E','g1','g2']) for (const S of (tf==='E'?[0]:[1,2,9]))
  add(`g5B(M${M},L${L},R${R},${tf}${S})`,
    [{v:1,len:L},{v:0,len:5},{v:1,len:M},{v:0,len:2},{v:1,len:R},...tailRuns(tf,S,true)], L+1);
// F-g3
for (const M of [3,9,50]) for (const R of [1,2,4]) for (const tf of ['E','g1','g2']) for (const S of (tf==='E'?[0]:[1,2,3,9]))
  add(`g3(M${M},R${R},${tf}${S})`,
    [{v:1,len:3},{v:0,len:1},{v:1,len:M},{v:0,len:3},{v:1,len:R},...tailRuns(tf,S,true)], 3+1+M+1);
// F-g1g1 (DANGER: R=1 halts)
for (const M of [3,9]) for (const R of [1,2,3]) for (const tf of ['E','g1','g2']) for (const S of (tf==='E'?[0]:[1,2,9]))
  add(`g11(M${M},R${R},${tf}${S})`,
    [{v:1,len:35},{v:0,len:1},{v:1,len:M},{v:0,len:1},{v:1,len:R},...tailRuns(tf,S,true)], 35+2);
// F-g12
for (const M of [1,9,36]) for (const R of [1,2,7]) for (const tf of ['E','g1','g2']) for (const S of (tf==='E'?[0]:[1,2,9]))
  add(`g12(M${M},R${R},${tf}${S})`,
    [{v:1,len:11},{v:0,len:1},{v:1,len:M},{v:0,len:2},{v:1,len:R},...tailRuns(tf,S,true)], 11+2);
// F-g6 offset1/offset2
for (const off of [1,2]) for (const [L,R] of [[3,2],[18,6],[99,50]]) for (const tf of ['E','g1','g2']) for (const S of (tf==='E'?[0]:[1,2,9]))
  add(`g6o${off}(L${L},R${R},${tf}${S})`,
    [{v:1,len:L},{v:0,len:6},{v:1,len:R},...tailRuns(tf,S,true)], L+off);
// F-gE: 1^L 0^1 1^M head at M.left (empty tail)
for (const M of [1,2,4,9]) for (const L of [11,35])
  add(`gE(M${M},L${L})`, [{v:1,len:L},{v:0,len:1},{v:1,len:M}], L+2);
// out-left state: head left of everything (config 1^3 0^2 1^2 0^1 1^5 0^2 1^1, h=-7 => lo=-2: out-5)
add('outLeft', [{v:1,len:3},{v:0,len:2},{v:1,len:2},{v:0,len:1},{v:1,len:5},{v:0,len:2},{v:1,len:1}], -7);
// out-right single block: 1^L with head at L+2 (gap[1] of infinite gap)
for (const L of [8,42]) add(`outR(L${L})`, [{v:1,len:L}], L+2);
let nh = 0; const sigs = {};
const results = [];
for (const c of cells) {
  const t = build(c.runs, c.head);
  const from = t.rle().s;
  let n = 0, halt = null; const seq = [];
  for (let i = 0; i < 300000; i++) {
    const r = macroStepFast(t); n++; seq.push(r.kind[0] + (r.kind.length>2?'!':''));
    if (String(r.kind).startsWith('HALT')) { halt = r.kind + '@' + t.step; break; }
    if (r.kind==='Dance'||r.kind==='DanceFill'||r.kind==='DBL'||r.kind==='L1') break;
  }
  const to = t.rle().s;
  const rs = to ? to.split(' ').map(x=>{const[v,l]=x.split('^');return{v:+v,len:+l}}) : [];
  const shape = rs.map(x=>x.v?'B':'g'+x.len).join(',');
  // head class in output
  let p = rs.length? t.rle().lo : 0, hc = 'out';
  { let q = t.rle().lo;
    for (let i = 0; i < rs.length; i++) { if (t.head >= q && t.head < q + rs[i].len) { hc = 'r'+i+':'+(t.head-q); break; } q += rs[i].len; }
    if (hc === 'out') hc = 'out:' + (t.head - (rs.length? t.rle().lo : 0)); }
  results.push({tag: c.tag, from, halt, to, shape, hc, n, seq: seq.join('')});
  if (halt) nh++;
}
console.log('cells:', cells.length, 'halts:', nh);
for (const r of results) console.log(r.tag.padEnd(26), r.halt ? 'HALT '+r.halt : (r.shape.padEnd(30)+' @'+r.hc.padEnd(6)).slice(0,37), '['+r.n+'] ' + r.seq.slice(0,28));
