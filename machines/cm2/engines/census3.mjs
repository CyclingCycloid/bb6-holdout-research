// census3.mjs — closure iteration: census ALL families (incl. new g2L/outLeft, corrected heads),
// collect output (shape,head-class) set, check membership in the family set.
import { FastTape, macroStepFast } from './macro3.mjs';
function build(runs, head) { const t = new FastTape(); let p = 0;
  for (const r of runs) { if (r.v) for (let i=0;i<r.len;i++,p++) t.write(p,1); else p += r.len; }
  t.head = head; t.st = 0; return t; }
const deep = () => [{v:0,len:2},{v:1,len:7}];
const t1 = (tf,S) => [{v:0,len:tf==='g1'?1:2},{v:1,len:S},...deep()];
const tE = () => [...deep()];
const cells = [];
const add = (tag, runs, head) => cells.push({tag, runs, head});
// A family (correct): M terminals + clean, tail E/(1,S)/(2,S)
for (const M of [1,2,3,4,5,9]) for (const [L,R] of [[3,1],[6,2],[30,20]]) for (const [tf,S] of [['E',0],['g1',1],['g1',3],['g2',1],['g2',9]])
  add(`A(M${M},${tf}${S})`, [{v:1,len:L},{v:0,len:1},{v:1,len:M},{v:0,len:5},{v:1,len:R},...(tf==='E'?tE():t1(tf,S))], L+1+M+1);
// g5B: L in {1,2,3,6,30}, M in {2,3}
for (const M of [2,3]) for (const L of [1,2,3,6,30]) for (const R of [1,2,9]) for (const [tf,S] of [['E',0],['g1',1],['g1',3],['g2',1],['g2',9]])
  add(`g5B(M${M},L${L},${tf}${S})`, [{v:1,len:L},{v:0,len:5},{v:1,len:M},{v:0,len:2},{v:1,len:R},...(tf==='E'?tE():t1(tf,S))], L+1);
// g3: tail-front E/(1,S)/(2,S)
for (const M of [3,9,50]) for (const R of [1,2,4]) for (const [tf,S] of [['E',0],['g1',1],['g1',3],['g2',1],['g2',9]])
  add(`g3(M${M},R${R},${tf}${S})`, [{v:1,len:3},{v:0,len:1},{v:1,len:M},{v:0,len:3},{v:1,len:R},...(tf==='E'?tE():t1(tf,S))], 3+1+M+1);
// g1g1 (head M.left = L+1): R=1 halts expected
for (const M of [3,9]) for (const R of [1,2,3]) for (const [tf,S] of [['E',0],['g1',1],['g2',9]])
  add(`g11(M${M},R${R},${tf}${S})`, [{v:1,len:35},{v:0,len:1},{v:1,len:M},{v:0,len:1},{v:1,len:R},...(tf==='E'?tE():t1(tf,S))], 35+1);
// g12 corrected: head M.left = L+1
for (const M of [1,9,36]) for (const R of [1,2,7]) for (const [tf,S] of [['E',0],['g1',1],['g1',3],['g2',1]])
  add(`g12(M${M},R${R},${tf}${S})`, [{v:1,len:11},{v:0,len:1},{v:1,len:M},{v:0,len:2},{v:1,len:R},...(tf==='E'?tE():t1(tf,S))], 11+1);
// g6 offset1/2 with tail fronts
for (const off of [1,2]) for (const [L,R] of [[3,2],[18,6],[99,50]]) for (const [tf,S] of [['E',0],['g1',1],['g1',3],['g2',1],['g2',9]])
  add(`g6o${off}(L${L},${tf}${S})`, [{v:1,len:L},{v:0,len:6},{v:1,len:R},...(tf==='E'?tE():t1(tf,S))], L+off);
// gE corrected: head M.left = L+1, M in {1,2,3,4,9} (M=3 added 2026-10-13: real orbit visits gE(37,3) at t=5071, era1e8.tsv)
for (const M of [1,2,3,4,9]) for (const L of [11,35])
  add(`gE(M${M})`, [{v:1,len:L},{v:0,len:1},{v:1,len:M}], L+1);
// g2L: 1^L 0^2 1^M 0^2 1^R T, head at the first g2's gap[1] = L+1
for (const M of [2,5,20]) for (const L of [1,3,8]) for (const [tf,S] of [['E',0],['g1',1],['g2',9]])
  add(`g2L(M${M},L${L},${tf}${S})`, [{v:1,len:L},{v:0,len:2},{v:1,len:M},{v:0,len:2},{v:1,len:R0(M)},...(tf==='E'?tE():t1(tf,S))], L+1);
function R0(M){ return 3; }
// outLeft: the observed config
add('outLeft', [{v:1,len:3},{v:0,len:2},{v:1,len:2},{v:0,len:1},{v:1,len:5},{v:0,len:2},{v:1,len:1}], -7);
// outRight (A with R=empty)
for (const L of [8,42]) add(`outR(L${L})`, [{v:1,len:L}], L+2);
let nh = 0; const outShapes = new Map(); const newsigs = new Map();
for (const c of cells) {
  let t; try { t = build(c.runs, c.head); } catch(e) { console.log("BUILD-FAIL", c.tag, JSON.stringify(c.runs), c.head); nh++; continue; }
  let n = 0, halt = null;
  for (let i = 0; i < 300000; i++) {
    const r = macroStepFast(t); n++;
    if (String(r.kind).startsWith('HALT')) { halt = r.kind + '@' + t.step; break; }
    if (r.kind==='Dance'||r.kind==='DanceFill'||r.kind==='DBL'||r.kind==='L1') break;
  }
  const to = t.rle().s;
  const rs = to ? to.split(' ').map(x=>{const[v,l]=x.split('^');return{v:+v,len:+l}}) : [];
  const shape = rs.map(x=>x.v?'B':'g'+x.len).join(',');
  let q = t.rle().lo, hc = 'out';
  for (let i = 0; i < rs.length; i++) { if (t.head >= q && t.head < q + rs[i].len) { hc = i+(rs[i].v?'+':'-')+':'+(t.head-q); break; } q += rs[i].len; }
  if (halt) { nh++; console.log('HALT', c.tag, halt); }
  else {
    // family key: prefix4 + head run-index (not offset) — offset kept separately
    const pref = rs.slice(0,4).map(x=>x.v?'B':('g'+x.len)).join(',');
    const key = pref + ' @r' + hc;
    outShapes.set(key, (outShapes.get(key)||0)+1);
  }
}
console.log('cells:', cells.length, 'halts:', nh, 'distinct output (prefix4@headrun):', outShapes.size);
for (const [k,v] of [...outShapes.entries()].sort((a,b)=>b[1]-a[1])) console.log(String(v).padStart(4), k);

// ===== closure iteration 2: the new families from iteration 1 =====
const cells2 = []; const add2 = (tag, runs, head) => cells2.push({tag, runs, head});
// g2-g5B: 1^L 0^2 1^M 0^5 1^R T, head at the 0^5's gap[1] = L+2+M+1
for (const M of [2,3]) for (const L of [3,8]) for (const R of [1,9]) for (const [tf,S] of [['E',0],['g1',1],['g2',9]])
  add2(`g2g5B(M${M},L${L},R${R},${tf}${S})`, [{v:1,len:L},{v:0,len:2},{v:1,len:M},{v:0,len:5},{v:1,len:R},...(tf==='E'?tE():t1(tf,S))], L+2+M+1);
// head-out variants: 1^L 0^2 1^M 0^2 1^R T with A on blank LEFT (out:-): the observed outLeft-output class
for (const M of [2,5]) for (const L of [3,8]) for (const R of [1,7]) for (const [tf,S] of [['E',0],['g1',1],['g2',9]])
  add2(`hoL(M${M},L${L},R${R},${tf}${S})`, [{v:1,len:L},{v:0,len:2},{v:1,len:M},{v:0,len:2},{v:1,len:R},...(tf==='E'?tE():t1(tf,S))], -3);
// g4A and g4 (from iteration-1 outputs), g2L with (g1,1) tail front (danger probe)
for (const M of [3,5]) for (const R of [1,2]) for (const [tf,S] of [['E',0],['g1',1],['g2',9]])
  add2(`g4A(M${M},R${R},${tf}${S})`, [{v:1,len:9},{v:0,len:1},{v:1,len:M},{v:0,len:4},{v:1,len:R},...(tf==='E'?tE():t1(tf,S))], 9+1+M+1);
for (const M of [3,5]) for (const R of [1,3]) for (const [tf,S] of [['E',0],['g1',1],['g2',9]])
  add2(`g4(M${M},R${R},${tf}${S})`, [{v:1,len:3},{v:0,len:4},{v:1,len:M},{v:0,len:2},{v:1,len:R},...(tf==='E'?tE():t1(tf,S))], 3+2);
// g2L with (g1,1)/(g2,1) tail fronts (the halt probes) and g6o2 with (g2,1)
for (const M of [5]) for (const R of [3]) for (const tfS of [['g1',1],['g2',1],['g1',2]])
  add2(`g2L(M${M},R${R},${tfS[0]}${tfS[1]})`, [{v:1,len:3},{v:0,len:2},{v:1,len:M},{v:0,len:2},{v:1,len:R},...t1(tfS[0],tfS[1])], 3+1);
for (const [L,R] of [[18,6]]) for (const tfS of [['g2',1],['g1',2]])
  add2(`g6o2(L${L},${tfS[0]}${tfS[1]})`, [{v:1,len:L},{v:0,len:6},{v:1,len:R},...t1(tfS[0],tfS[1])], L+2);
// g1g1 with (g1,2)/(g2,1) probes; g12 with (g1,1) probe
add2('g11probe(g1,2)', [{v:1,len:35},{v:0,len:1},{v:1,len:3},{v:0,len:1},{v:1,len:2},...t1('g1',2)], 36);
add2('g11probe(g2,1)', [{v:1,len:35},{v:0,len:1},{v:1,len:3},{v:0,len:1},{v:1,len:2},...t1('g2',1)], 36);
add2('g12probe(g1,1)', [{v:1,len:11},{v:0,len:1},{v:1,len:9},{v:0,len:2},{v:1,len:2},...t1('g1',1)], 12);
let nh2 = 0; const out2 = new Map();
for (const c of cells2) {
  let t; try { t = build(c.runs, c.head); } catch(e) { console.log('BUILD-FAIL', c.tag); continue; }
  let halt = null;
  for (let i = 0; i < 400000; i++) {
    const r = macroStepFast(t);
    if (String(r.kind).startsWith('HALT')) { halt = r.kind + '@' + t.step; break; }
    if (r.kind==='Dance'||r.kind==='DanceFill'||r.kind==='DBL'||r.kind==='L1') break;
  }
  const rs = t.rle().s ? t.rle().s.split(' ').map(x=>{const[v,l]=x.split('^');return{v:+v,len:+l}}) : [];
  const shape = rs.map(x=>x.v?'B':('g'+x.len)).join(',');
  let q = t.rle().lo, hc = 'out';
  for (let i = 0; i < rs.length; i++) { if (t.head >= q && t.head < q + rs[i].len) { hc = i+(rs[i].v?'+':'-')+':'+(t.head-q); break; } q += rs[i].len; }
  if (halt) { nh2++; console.log('HALT', c.tag, halt); }
  else { const key = shape.split(',').slice(0,4).join(',') + ' @r' + hc; out2.set(key, (out2.get(key)||0)+1); }
}
console.log('iter2 cells:', cells2.length, 'halts:', nh2);
for (const [k,v] of [...out2.entries()].sort((a,b)=>b[1]-a[1])) console.log(String(v).padStart(3), k);
