import { FastTape, macroStepFast } from '../macro3.mjs';
function build(runs, head) { const t = new FastTape(); let p = 0;
  for (const r of runs) { if (r.v) for (let i=0;i<r.len;i++,p++) t.write(p,1); else p += r.len; }
  t.head = head; t.st = 0; return t; }
for (const L of [11, 35, 37]) {
  const t = build([{v:1,len:L},{v:0,len:1},{v:1,len:3}], L+1);
  let n = 0, halt = null, kinds = [];
  for (let i = 0; i < 300000; i++) {
    const r = macroStepFast(t); n++; kinds.push(r.kind);
    if (String(r.kind).startsWith('HALT')) { halt = r.kind; break; }
    if (r.kind==='Dance'||r.kind==='DanceFill'||r.kind==='DBL'||r.kind==='L1') { if (i>0) break; }
  }
  const to = t.rle().s;
  const rs = to.split(' ').map(x=>{const[v,l]=x.split('^');return{v:+v,len:+l}});
  const shape = rs.map(x=>x.v?'B':'g'+x.len).join(',');
  let q = t.rle().lo, hc='out';
  for (let i = 0; i < rs.length; i++) { if (t.head >= q && t.head < q + rs[i].len) { hc = i+(rs[i].v?'+':'-')+':'+(t.head-q); break; } q += rs[i].len; }
  const pref = rs.slice(0,4).map(x=>x.v?'B':('g'+x.len)).join(',');
  console.log(`gE(${L},3): steps-macro=${n} halt=${halt} kinds=${kinds.join(',')} shape=${shape} headrun=${hc} key=${pref} @r${hc}`);
}
