// lib.mjs — trajectory library for invariant synthesis (counterexample oracle).
// Walks the REAL orbit from R(3,3): iterates anchor transitions (transitionFast) and records
// every intermediate phase state (single-step events via stepFast, uncollapsed semantics),
// with phase type, run vector, and event index. Output: library.json (compact).
// Usage: node lib.mjs [NANCH=120] [MAXEV=400000]
import { stepFastB, transitionFastB } from './bstep.mjs';
// single-step (uncollapsed) BigInt stepper — the 9 phase rules
function step1(c){
  if(c.t==='R'){const[a,b]=c.r;return{c:{t:'S',r:[a+1n,b-2n,1n]}};}
  if(c.t==='S'){const[x,y,z,...rest]=c.r;
    if(y>=3n)return{c:{t:'S',r:[x+1n,y-2n,z+1n,...rest]}};
    if(y===2n)return{c:{t:'G',r:[x+1n,z+1n,...rest]}};
    if(y===1n){if(rest.length===0)return{c:{t:'R',r:[1n,x+z+3n]}};return{c:{t:'L',r:[1n,x+z+3n,...rest]}};}}
  if(c.t==='G'){const[a,b,...rest]=c.r;
    if(a>=4n)return{c:{t:'S',r:[1n,a-3n,1n,b+1n,...rest]}};
    if(a===3n)return{c:{t:'G',r:[1n,1n,b+1n,...rest]}};
    if(a===2n)return{c:{t:'L',r:[1n,3n,b+1n,...rest]}};
    if(a===1n)return{halt:true};
    return{degenerate:'G a='+a};}
  if(c.t==='L'){const[r1,r2,r3,...rest]=c.r;
    if(r3>=2n)return{c:{t:'L',r:[r1+1n,r2,r3-1n,...rest]}};
    if(r3===1n){if(c.r.length===3)return{c:{t:'R',r:[r1+1n,r2]}};return{c:{t:'S',r:[r1+1n,r2,...rest]}};}
    return{degenerate:'L r3='+r3};}
  return{degenerate:'?'};}
import { writeFileSync } from 'fs';

const NANCH = +(process.argv[2] ?? 120);
let n = 3n;
const states = [];
let totEv = 0;
for (let k = 0; k < NANCH; k++) {
  let c = { t: 'R', r: [n, n] };
  const res = transitionFastB(n);
  if (res.halt || res.degenerate) { console.log(`anchor n=${n}: HALT/DEG — orbit died`); break; }
  for (let it = 0; it < 500000; it++) {
    states.push(c.t + ':' + c.r.map(String).join(','));
    const st = step1(c);
    totEv++;
    if (st.degenerate || st.halt) { console.log('unexpected end at ' + c.t); break; }
    c = st.c;
    if (c.t === 'R' && c.r[0] === c.r[1] && c.r[0] >= 2n) break;
  }
  n = c.r[0];
  if (k % 20 === 0) console.log(`  anchor ${k}: n=${n}, states so far ${states.length}`);
}
writeFileSync('library.json', JSON.stringify({ anchors: NANCH, events: totEv, states }));
console.log(`library: ${states.length} states over ${NANCH} anchors (final n=${n})`);
