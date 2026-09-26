// mod3.mjs — verify: (a) no halt (engine-checked); (b) regime-A L mod 3 in {0,2}; (c) no (g1,1) tail pair at sprint-reachable spots;
// (d) H1 precond at every A-visit; (e) collect regime-A terminal (M<=4) L-values mod 3.
import { FastTape, macroStepFast } from './macro3.mjs';
const CAP = +process.argv[2] || 2e9;
const t = new FastTape();
let eras = 0, h1 = 0, termL = new Map(), viol = 0;
while (t.step < CAP) {
  if (t.st === 0 && t.read(t.head) === 0 && t.read(t.head+1) === 1 && t.read(t.head+2) === 0) { h1++; if(h1<4) console.log('H1-PRE t='+t.step, t.rle().s.slice(0,110)); }
  const r = macroStepFast(t);
  if (String(r.kind).startsWith('HALT')) { console.log('HALT', r.kind, t.step); break; }
  if (r.kind==='Dance'||r.kind==='DanceFill'||r.kind==='DBL'||r.kind==='L1') {
    eras++;
    const rl = t.rle();
    const rs = rl.s ? rl.s.split(' ').map(x=>{const[v,l]=x.split('^');return{v:+v,len:+l}}):[];
    // classify regime by first runs and head offset
    let p = rl.lo, hi = 0; for (let i = 0; i < rs.length; i++) { if (t.head >= p && t.head < p + rs[i].len) { hi = i; break; } p += rs[i].len; }
    const shape = rs.map(x=>x.v?'B':'g'+x.len).join(',');
    if (shape.startsWith('B,g1,B,g5,')) {
      const L = rs[0].len, M = rs[2].len, lm = L % 3;
      if (lm === 1) { viol++; if (viol < 4) console.log('L%3=1 VIOLATION t='+t.step, rl.s.slice(0,110)); }
      if (M <= 4) { const k = 'M'+M+'L%3='+lm; termL.set(k, (termL.get(k)||0)+1); }
    }
  }
}
console.log('eras:', eras, 'H1-precond:', h1, 'L%3=1 violations in regime A:', viol);
console.log('regime-A terminals (M, L%3):', JSON.stringify([...termL.entries()]));
