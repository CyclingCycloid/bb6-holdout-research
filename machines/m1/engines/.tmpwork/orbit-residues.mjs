// collect ALL on-orbit event signatures (type + run vector mod M) over several anchors
import { stepFastB } from '../bstep.mjs';
const v2 = (x) => { x = x<0n?-x:x; let c=0n; while (x%2n===0n){c++;x/=2n;} return c; };
let c = { t:'R', r:[3n,3n] }; const sigs = [];
for (let i = 0; i < 200000; i++) {
  const st = stepFastB(c);
  if (st.degenerate || st.halt) break;
  c = st.c;
  if (c.t==='R' && c.r[0]===c.r[1] && c.r[0]>=2n) {
    // next anchor: record and jump to next anchor's start is implicit (c is the anchor)
  }
  sigs.push(c.t + ':' + c.r.map(String).join(','));
  if (sigs.length > 150000) break;
}
// extract all R(1,b) second values
const bs = sigs.filter(s=>s.startsWith('R:1,')).map(s=>BigInt(s.split(',')[1]));
console.log('total events recorded:', sigs.length, ' R(1,b) events:', bs.length);
let bad9=[], bad12=[];
for (let M=2n; M<=64n; M++) {
  const cls = new Set(bs.map(b=>b%M));
  if (!cls.has(9n%M)) bad9.push(M);
  if (!cls.has(12n%M)) bad12.push(M);
}
console.log('M: class 9 not covered:', bad9.map(String).join(',')||'none');
console.log('M: class 12 not covered:', bad12.map(String).join(',')||'none');
// sample distinct R(1,b) values seen (small ones)
const small=[...new Set(bs.filter(b=>b<200n).map(String))].sort((a,b)=>a-b);
console.log('distinct R(1,b) with b<200:', small.join(', '));
