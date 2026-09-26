// invariant.mjs — scan the orbit: (a) halt preconditions at every A-visit; (b) tail-pair invariant
// H1 precond: A at 0-cell h, [h+1]=1, [h+2]=0. H2 precond: (checked at dance) F1 landing y with [y-1]=[y-2]=0.
// Tail-pair invariant: no (gap=1, block=1) pair anywhere in the config.
import { FastTape, macroStepFast } from './macro3.mjs';
const CAP = +process.argv[2] || 1e9;
const t = new FastTape();
let nA = 0, h1 = 0, badPair = 0, eras = 0;
let minTailBlock = 1e18;
while (t.step < CAP) {
  // check H1 precondition at this A-state (before the routine)
  if (t.st === 0 && t.read(t.head) === 0 && t.read(t.head+1) === 1 && t.read(t.head+2) === 0) {
    h1++; if (h1 <= 3) console.log('H1-PRECOND at t='+t.step, t.rle().s.slice(0,100));
  }
  const r = macroStepFast(t);
  if (String(r.kind).startsWith('HALT')) { console.log('HALT', r.kind, t.step); break; }
  nA++;
  if (r.kind==='Dance'||r.kind==='DanceFill'||r.kind==='DBL'||r.kind==='L1') {
    eras++;
    const rl = t.rle();
    const rs = rl.s ? rl.s.split(' ').map(x=>{const[v,l]=x.split('^');return{v:+v,len:+l}}):[];
    // pair scan: consecutive (0-run of len 1, 1-run of len 1)
    for (let i = 0; i + 1 < rs.length; i++) {
      if (rs[i].v === 0 && rs[i].len === 1 && rs[i+1].v === 1 && rs[i+1].len === 1) {
        badPair++; if (badPair <= 3) console.log('(g1,1) PAIR at t='+t.step, rl.s.slice(0,110));
      }
      if (rs[i].v === 0 && rs[i+1].v === 1) minTailBlock = Math.min(minTailBlock, rs[i+1].len === 1 ? 1 : rs[i+1].len);
    }
  }
}
console.log('A-visits:', nA, 'eras:', eras, 'H1-precond hits:', h1, '(g1,1)-pair hits:', badPair);
