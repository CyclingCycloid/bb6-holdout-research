import { FastTape, macroStepFast } from '../macro3.mjs';
function build(runs, head) { const t = new FastTape(); let p = 0;
  for (const r of runs) { if (r.v) for (let i=0;i<r.len;i++,p++) t.write(p,1); else p += r.len; }
  t.head = head; t.st = 0; return t; }
// gE(L,3): 1^L 0^1 1^3, head at M.left = L+1
for (const L of [11, 35, 37]) {
  const t = build([{v:1,len:L},{v:0,len:1},{v:1,len:3}], L+1);
  let n = 0, halt = null, kinds = [];
  for (let i = 0; i < 300000; i++) {
    const r = macroStepFast(t); n++; kinds.push(r.kind);
    if (String(r.kind).startsWith('HALT')) { halt = r.kind; break; }
    if (r.kind==='Dance'||r.kind==='DanceFill'||r.kind==='DBL'||r.kind==='L1') { if (i>0) break; }
  }
  console.log(`gE(${L},3): macrosteps=${n} halt=${halt} kinds=${kinds.slice(0,8).join(',')}${kinds.length>8?'...+'+(kinds.length-8):''}`);
  console.log(`  end rle: ${t.rle().s} head=${t.head}`);
}
