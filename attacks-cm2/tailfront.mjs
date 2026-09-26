// tailfront.mjs — per-family: input tail-front (g,S) -> output config; establishes the
// tail-front evolution table and the "no (g1,1) creation" invariant. One era per cell.
import { FastTape, macroStepFast } from './macro3.mjs';
function build(runs, head) { const t = new FastTape(); let p = 0;
  for (const r of runs) { if (r.v) for (let i=0;i<r.len;i++,p++) t.write(p,1); else p += r.len; }
  t.head = head; t.st = 0; return t; }
const deep = [{v:0,len:2},{v:1,len:7}];
const fams = {
  A:   { mk: (L,M,R,g,S) => [{v:1,len:L},{v:0,len:1},{v:1,len:M},{v:0,len:5},{v:1,len:R},{v:0,len:g},{v:1,len:S},...deep], head: (L,M)=>L+1+M+1, M: [5,9,1,2,3,4], L: [3,6], R: [2] },
  g5B: { mk: (L,M,R,g,S) => [{v:1,len:L},{v:0,len:5},{v:1,len:M},{v:0,len:2},{v:1,len:R},{v:0,len:g},{v:1,len:S},...deep], head: (L,M)=>L+1, M: [2,3], L: [1,3,4,6,30], R: [2] },
  g3:  { mk: (L,M,R,g,S) => [{v:1,len:L},{v:0,len:1},{v:1,len:M},{v:0,len:3},{v:1,len:R},{v:0,len:g},{v:1,len:S},...deep], head: (L,M)=>L+1+M+1, M: [3,9], L: [3], R: [2,4] },
  g1g1:{ mk: (L,M,R,g,S) => [{v:1,len:L},{v:0,len:1},{v:1,len:M},{v:0,len:1},{v:1,len:R},{v:0,len:g},{v:1,len:S},...deep], head: (L,M)=>L+1, M: [3,9], L: [35], R: [2,3] },
  g12: { mk: (L,M,R,g,S) => [{v:1,len:L},{v:0,len:1},{v:1,len:M},{v:0,len:2},{v:1,len:R},{v:0,len:g},{v:1,len:S},...deep], head: (L,M)=>L+1, M: [9,36], L: [11], R: [2,7] },
  g6o1:{ mk: (L,R,g,S) => [{v:1,len:L},{v:0,len:6},{v:1,len:R},{v:0,len:g},{v:1,len:S},...deep], head: (L,R)=>L+1, R: [2,3,9], L: [3,18] },
  g6o2:{ mk: (L,R,g,S) => [{v:1,len:L},{v:0,len:6},{v:1,len:R},{v:0,len:g},{v:1,len:S},...deep], head: (L,R)=>L+2, R: [2,3,9], L: [3,18] },
  g2L: { mk: (L,M,R,g,S) => [{v:1,len:L},{v:0,len:2},{v:1,len:M},{v:0,len:2},{v:1,len:R},{v:0,len:g},{v:1,len:S},...deep], head: (L,M)=>L+1, M: [2,5], L: [3,8], R: [3] },
  g4A: { mk: (L,M,R,g,S) => [{v:1,len:L},{v:0,len:1},{v:1,len:M},{v:0,len:4},{v:1,len:R},{v:0,len:g},{v:1,len:S},...deep], head: (L,M)=>L+1+M+1, M: [3,5], L: [9], R: [2] },
  g4:  { mk: (L,M,R,g,S) => [{v:1,len:L},{v:0,len:4},{v:1,len:M},{v:0,len:2},{v:1,len:R},{v:0,len:g},{v:1,len:S},...deep], head: (L,M)=>L+2, M: [3,5], L: [3], R: [3] },
};
const rows = [];
for (const [fam, F] of Object.entries(fams)) {
  for (const M of (F.M || [F.R[0]])) for (const L of (F.L || [F.L[0]])) for (const R of (F.R)) for (const g of [1,2]) for (const S of [1,2,3,5,9]) {
    const t = build(F.mk(L, M, R, g, S), F.head(L, M));
    let halt = null;
    for (let i = 0; i < 400000; i++) {
      const r = macroStepFast(t);
      if (String(r.kind).startsWith('HALT')) { halt = r.kind; break; }
      if (r.kind==='Dance'||r.kind==='DanceFill'||r.kind==='DBL'||r.kind==='L1') break;
    }
    const rl = t.rle();
    rows.push({ fam, M, L, R, g, S, halt, out: rl.s.slice(0, 100) });
  }
}
const summary = new Map();
for (const r of rows) {
  const key = `${r.fam} in(g${r.g},S${r.S})`;
  const out = (r.halt ? 'HALT-' + r.halt : r.out);
  if (!summary.has(key)) summary.set(key, new Set());
  summary.get(key).add(out);
}
for (const [k, v] of summary) {
  console.log('==', k);
  for (const o of v) console.log('    ', o.slice(0, 95));
}
