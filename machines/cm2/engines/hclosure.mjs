// hclosure.mjs — head-anchored family closure: keys = head-anchored local pattern.
// Pattern = (runs from i-2..i+3 around head's run i, sizes classed {1,2,3,4..8,9+}, head offset class).
// Iterate: instantiate each pattern at several absolute scales, run era, re-classify, until fixed point.
import { FastTape, macroStepFast } from './macro3.mjs';
function build(runs, head) { const t = new FastTape(); let p = 0;
  for (const r of runs) { if (r.v) for (let i=0;i<r.len;i++,p++) t.write(p,1); else p += r.len; }
  t.head = head; t.st = 0; return t; }
const cls = n => n <= 3 ? String(n) : 'B';
function key(runs, head) {
  // find head run
  let p = 0, i = -1, off = 0;
  for (let k = 0; k < runs.length; k++) { if (head >= p && head < p + runs[k].len) { i = k; off = head - p; break; } p += runs[k].len; }
  if (i < 0) return 'OUT' + (head < 0 ? 'L' : 'R') + ':' + (head - (i<0? (head<runs.reduce((a,r)=>a+r.len,0)?0:0):0));
  const win = [];
  for (let k = Math.max(0, i-2); k <= Math.min(runs.length-1, i+3); k++) {
    const r = runs[k];
    win.push((r.v?'b':'g') + (k===i ? '@' + (r.v ? (off===0?'L':'+') : ('-'+off)) : cls(r.len)));
  }
  return win.join(',');
}
function era(runs, head) {
  const t = build(runs, head); let halt = null;
  for (let i = 0; i < 400000; i++) {
    const r = macroStepFast(t);
    if (String(r.kind).startsWith('HALT')) { halt = r.kind; break; }
    if (r.kind==='Dance'||r.kind==='DanceFill'||r.kind==='DBL'||r.kind==='L1') break;
  }
  return { halt, runs: t.runs.map(r=>({...r})), head: t.head };
}
// seed patterns: from the orbit taxonomy + the census outputs; instantiate with scales.
// We represent each seed as a concrete (runs, head) built from a template with size slots.
const seeds = [];
const S = (v, c) => ({ v, len: c === 's' ? 3 : c === 'm' ? 12 : c === 'l' ? 40 : c });
function tmpl(spec, head, scales) { // spec: alternating [v,len-class] pairs; scales: {s,m,l} sizes for non-fixed
  return () => {
    const runs = spec.map(([v, c]) => ({ v, len: typeof c === 'number' ? c : S(v, c).len }));
    // scale: replace 'm'/'l' slots by scale values
    let j = 0;
    for (const r of runs) if (r.len === 'm') r.len = scales[j++ % scales.length];
    // fix alternation & compute head
    const rr = []; let p = 0;
    for (const r of runs) { if (r.len <= 0) continue; if (rr.length && rr[rr.length-1].v === r.v) rr[rr.length-1].len += r.len; else rr.push({...r}); }
    // head: spec head position marker 'H' handled by caller
    return { runs: rr, head };
  };
}
// Simpler: enumerate concrete seeds directly (the observed families at boundary/regular sizes).
const cells = [];
const add = (tag, runs, head) => cells.push({ tag, runs, head });
const T = (g,S,deep) => { const r = [{v:0,len:g},{v:1,len:S}]; if (deep) r.push({v:0,len:2},{v:1,len:7}); return r; };
// A(M>=5 / terminals) x tail
for (const M of [1,2,3,4,5,9,40]) for (const [g,S] of [[1,1],[1,3],[2,1],[2,9]]) for (const L of [3,6,30])
  add(`A(M${M},${g},${S},L${L})`, [{v:1,len:L},{v:0,len:1},{v:1,len:M},{v:0,len:5},{v:1,len:2},...T(g,S,true)], L+1+M+1);
// g5B
for (const L of [1,2,3,4,5,9,30]) for (const M of [2,3]) for (const [g,S] of [[1,1],[2,9]])
  add(`g5B(L${L},${g},${S})`, [{v:1,len:L},{v:0,len:5},{v:1,len:M},{v:0,len:2},{v:1,len:2},...T(g,S,true)], L+1);
// g3
for (const M of [3,9,40]) for (const R of [1,2,4]) for (const [g,S] of [[1,1],[1,3],[2,1],[2,9]])
  add(`g3(M${M},R${R},${g},${S})`, [{v:1,len:3},{v:0,len:1},{v:1,len:M},{v:0,len:3},{v:1,len:R},...T(g,S,true)], 3+1+M+1);
// g1g1 / g12 (head M.left)
for (const M of [3,9,40]) for (const R of [1,2,3,9]) for (const [g,S] of [[1,1],[1,3],[2,1],[2,9]])
  add(`g11(M${M},R${R},${g},${S})`, [{v:1,len:35},{v:0,len:1},{v:1,len:M},{v:0,len:1},{v:1,len:R},...T(g,S,true)], 35+1);
for (const M of [1,9,40]) for (const R of [1,2,7]) for (const [g,S] of [[1,1],[2,1],[2,9]])
  add(`g12(M${M},R${R},${g},${S})`, [{v:1,len:11},{v:0,len:1},{v:1,len:M},{v:0,len:2},{v:1,len:R},...T(g,S,true)], 11+1);
// g6o1/g6o2
for (const off of [1,2]) for (const [L,R] of [[3,2],[6,2],[18,6],[99,50]]) for (const [g,S] of [[1,1],[2,1],[2,9]])
  add(`g6o${off}(L${L},${g},${S})`, [{v:1,len:L},{v:0,len:6},{v:1,len:R},...T(g,S,true)], L+off);
// g2L / g4A / g4 / gE
for (const M of [2,5,20]) for (const [g,S] of [[1,1],[2,9]])
  add(`g2L(M${M},${g},${S})`, [{v:1,len:3},{v:0,len:2},{v:1,len:M},{v:0,len:2},{v:1,len:3},...T(g,S,true)], 4);
for (const M of [3,5]) for (const R of [1,2]) for (const [g,S] of [[1,1],[2,9]])
  add(`g4A(M${M},R${R},${g},${S})`, [{v:1,len:9},{v:0,len:1},{v:1,len:M},{v:0,len:4},{v:1,len:R},...T(g,S,true)], 9+1+M+1);
for (const M of [3,5]) for (const [g,S] of [[1,1],[2,9]])
  add(`g4(M${M},${g},${S})`, [{v:1,len:3},{v:0,len:4},{v:1,len:M},{v:0,len:2},{v:1,len:3},...T(g,S,true)], 5);
for (const M of [1,2,9]) for (const L of [11,35])
  add(`gE(M${M},L${L})`, [{v:1,len:L},{v:0,len:1},{v:1,len:M}], L+1);
// out states
add('outLeft', [{v:1,len:3},{v:0,len:2},{v:1,len:2},{v:0,len:1},{v:1,len:5},{v:0,len:2},{v:1,len:1}], -7);
for (const L of [1,3,8,42]) add(`outR(L${L})`, [{v:1,len:L}], L+1);
// run
const pat = new Map(); const halts = [];
let iter = 0, newp = 0;
const frontier = [];
for (const c of cells) {
  let r;
  try { r = era(c.runs, c.head); } catch(e) { console.log('BUILD-FAIL', c.tag); continue; }
  const k = key(r.runs, r.head);
  if (!pat.has(k)) { pat.set(k, 0); newp++; frontier.push({ k, runs: r.runs, head: r.head }); }
  pat.set(k, pat.get(k)+1);
  if (r.halt) halts.push({ tag: c.tag, halt: r.halt });
}
console.log('iter0: patterns', pat.size, 'new', newp, 'halts', halts.length);
halts.forEach(h => console.log('  HALT', h.tag, h.halt));
// iterate: run eras from frontier states
for (let it = 1; it <= 8; it++) {
  const f2 = [];
  newp = 0;
  for (const f of frontier) {
    let r;
    try { r = era(f.runs, f.head); } catch(e) { continue; }
    const k = key(r.runs, r.head);
    if (!pat.has(k)) { pat.set(k, 0); newp++; f2.push({ k, runs: r.runs, head: r.head }); console.log('  NEW', k.slice(0,70), '|', f.k.slice(0,40)); }
    pat.set(k, pat.get(k)+1);
  }
  frontier.length = 0; frontier.push(...f2);
  console.log('iter'+it+': new patterns', newp, 'total', pat.size);
  if (!newp) { console.log('CLOSURE at iteration', it); break; }
}
