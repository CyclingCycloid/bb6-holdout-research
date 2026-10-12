// closure.mjs — automated family-closure explorer.
// Frontier: (prefix4-runs, head-offset-class, tail-front class). Instantiate, run 1 era, collect outputs.
// Iterate until every output lands in a known family. Records halt cells too.
import { FastTape, macroStepFast } from './macro3.mjs';
function build(runs, head) { const t = new FastTape(); let p = 0;
  for (const r of runs) { if (r.v) for (let i=0;i<r.len;i++,p++) t.write(p,1); else p += r.len; }
  t.head = head; t.st = 0; return t; }
const deep = () => [{v:0,len:2},{v:1,len:7}];
// tail-front variants: [name, runs-suffix]
const tails = [ ['E', () => deep()], ['g1-1', () => [{v:0,len:1},{v:1,len:1},...deep()]],
  ['g1-3', () => [{v:0,len:1},{v:1,len:3},...deep()]], ['g1-9', () => [{v:0,len:1},{v:1,len:9},...deep()]],
  ['g2-1', () => [{v:0,len:2},{v:1,len:1},...deep()]], ['g2-9', () => [{v:0,len:2},{v:1,len:9},...deep()]] ];
// family builders: each returns {runs, head} given size params (small s, large l)
const families = new Map(); // name -> builder(params) -> {runs, head}
families.set('A', (L,M,R,tf) => ({ runs: [{v:1,len:L},{v:0,len:1},{v:1,len:M},{v:0,len:5},{v:1,len:R},...tf()], head: L+1+M+1 }));
families.set('g5B', (L,M,R,tf) => ({ runs: [{v:1,len:L},{v:0,len:5},{v:1,len:M},{v:0,len:2},{v:1,len:R},...tf()], head: L+1 }));
families.set('g3', (L,M,R,tf) => ({ runs: [{v:1,len:L},{v:0,len:1},{v:1,len:M},{v:0,len:3},{v:1,len:R},...tf()], head: L+1+M+1 }));
families.set('g1g1', (L,M,R,tf) => ({ runs: [{v:1,len:L},{v:0,len:1},{v:1,len:M},{v:0,len:1},{v:1,len:R},...tf()], head: L+1 }));
families.set('g12', (L,M,R,tf) => ({ runs: [{v:1,len:L},{v:0,len:1},{v:1,len:M},{v:0,len:2},{v:1,len:R},...tf()], head: L+1 }));
families.set('g6o1', (L,R,tf) => ({ runs: [{v:1,len:L},{v:0,len:6},{v:1,len:R},...tf()], head: L+1 }));
families.set('g6o2', (L,R,tf) => ({ runs: [{v:1,len:L},{v:0,len:6},{v:1,len:R},...tf()], head: L+2 }));
families.set('gE', (L,M,tf) => ({ runs: [{v:1,len:L},{v:0,len:1},{v:1,len:M},...tf()], head: L+1 }));
families.set('g2L', (L,M,R,tf) => ({ runs: [{v:1,len:L},{v:0,len:2},{v:1,len:M},{v:0,len:2},{v:1,len:R},...tf()], head: L+1 }));
families.set('g4', (L,M,R,tf) => ({ runs: [{v:1,len:L},{v:0,len:4},{v:1,len:M},{v:0,len:2},{v:1,len:R},...tf()], head: L+2 }));
families.set('g4A', (L,M,R,tf) => ({ runs: [{v:1,len:L},{v:0,len:1},{v:1,len:M},{v:0,len:4},{v:1,len:R},...tf()], head: L+1+M+1 }));
families.set('outLeft', () => ({ runs: [{v:1,len:3},{v:0,len:2},{v:1,len:2},{v:0,len:1},{v:1,len:5},{v:0,len:2},{v:1,len:1}], head: -7 }));
families.set('outR', (L,tf) => ({ runs: [{v:1,len:L},...tf()], head: L+2 }));
families.set('g2Lrout', (L,M,R,tf) => ({ runs: [{v:1,len:L},{v:0,len:2},{v:1,len:M},{v:0,len:2},{v:1,len:R},...tf()], head: -3 }));
// signature extraction
const sig = t => {
  const rl = t.rle(); const rs = rl.s ? rl.s.split(' ').map(x=>{const[v,l]=x.split('^');return{v:+v,len:+l}}) : [];
  let q = rl.lo, hc = 'out';
  for (let i = 0; i < rs.length; i++) { if (t.head >= q && t.head < q + rs[i].len) { hc = i+(rs[i].v?'+':'-')+':'+(t.head-q); break; } q += rs[i].len; }
  const pref = rs.slice(0,4).map(x=>x.v?'B':('g'+x.len)).join(',');
  return { pref, hc, full: rs.map(x=>x.v?'B':('g'+x.len)).join(',') };
};
// instantiate each family at boundary + regular sizes
const sizes = {
  A: [[3,5,1],[3,9,2],[6,5,2],[30,50,20]], g5B: [[1,2,1],[2,2,2],[3,3,3],[6,2,9],[30,3,20]],
  g3: [[3,3,1],[3,9,2],[3,50,4],[9,9,1]], g1g1: [[35,3,2],[35,9,3],[11,3,2]],
  g12: [[11,1,2],[11,9,7],[35,9,2]], g6o1: [[3,2],[18,6],[99,50]], g6o2: [[3,2],[18,6],[99,50]],
  gE: [[11,1],[11,2],[35,4],[35,9]], g2L: [[1,2,3],[3,5,3],[8,20,3]],
  g4: [[3,5,3],[8,9,3],[30,50,20]], g4A: [[3,5,3],[9,9,3],[30,50,20]],
  outLeft: [[]], outR: [[8],[42]], g2Lrout: [[3,5,3]]
};
const known = new Set(families.keys());
const seenSigs = new Map();
const haltCells = [];
let iter = 0, newFamilies = [];
for (iter = 0; iter < 6; iter++) {
  let added = 0;
  for (const [fam, list] of Object.entries(sizes)) {
    for (const args of list) {
      for (const [tn, tb] of tails) {
        if ((fam==='gE'||fam==='outR') && tn!=='E') continue;
        if (fam==='outLeft' && tn!=='E') continue;
        const b = families.get(fam)(...args, tb);
        let t; try { t = build(b.runs, b.head); } catch(e) { console.log('BUILD-FAIL', fam, args, tn); continue; }
        let n = 0, halt = null;
        for (let i = 0; i < 400000; i++) {
          const r = macroStepFast(t); n++;
          if (String(r.kind).startsWith('HALT')) { halt = r.kind; break; }
          if (r.kind==='Dance'||r.kind==='DanceFill'||r.kind==='DBL'||r.kind==='L1') break;
        }
        const s = sig(t);
        const key = s.pref + ' @' + s.hc;
        if (!seenSigs.has(key)) seenSigs.set(key, { fam: fam+'->'+key, n: 0, ex: t.rle().s.slice(0,90) });
        seenSigs.get(key).n++;
        if (halt) haltCells.push({ fam, args, tn, halt });
        // classify output into a family by (prefix4, head-run+side)
        const m = classify(s);
        if (m === null) { console.log('NEW-UNCLASSIFIED OUTPUT:', key, '| from', fam, args, tn, '|', t.rle().s.slice(0,90)); added++; }
      }
    }
  }
  console.log('iteration', iter, 'new unclassified:', added);
  if (!added) break;
}
function classify(s) {
  const p4 = s.pref.split(','), hr = s.hc.split(':')[0];
  // head run index and side
  const hrun = hr === 'out' ? -1 : +hr.replace(/[+-]/g,'').slice(0,-1) === 0 ? +hr.slice(1).replace(/[+-].*/,'') : +hr.slice(1).split(/[-+]/)[0];
  return null; // placeholder — manual inspection instead
}
console.log('=== all output signatures ===');
for (const [k,v] of [...seenSigs.entries()].sort((a,b)=>b[1].n-a[1].n)) console.log(String(v.n).padStart(4), k, '| ex:', v.ex.slice(0,70));
console.log('=== halt cells ===');
const hc = {};
for (const h of haltCells) { const k = h.fam + ' | ' + h.halt; hc[k] = (hc[k]||0)+1; }
for (const [k,v] of Object.entries(hc)) console.log(v, k);
