// phase1.mjs — symbolic phase engine for M1 anchor transitions.
// Config grammar (all state D, head reading 0):
//   R(a,b)      : 2 runs (a,b), gaps [1], head on fresh 0 RIGHT of right block.
//   S_k(runs)   : k>=3 runs, gaps [1,2,1,...], head on LEFT 0 of the 2-gap (between run2 and run3).
//   G_k(runs)   : k>=2 runs, gaps [3,1,...],   head on MIDDLE 0 of the 3-gap (between run1 and run2).
//   L_k(runs)   : k>=3 runs, gaps [1,1,1,...], head on the single 0-gap between run2 and run3.
//     L_2 == R (head right of block).
// Rules (each = one D-on-0 event -> next D-on-0 event; cost = exact TM steps):
//   R(a,b)             -> S3(a+1, b-2, 1)                         cost 2b+3        [b>=3]
//   S_k(x,y,z,...rest):
//     y>=3             -> S_k(x+1, y-2, z+1, ...rest)             cost 2y+3
//     y==2             -> G_{k-1}(x+1, z+1, ...rest)              cost 7
//     y==1             -> L_{k-1}(1, x+z+3, ...rest)              cost 2x+z+14
//   G_k(a,b,...rest):
//     a>=4             -> S_{k+1}(1, a-3, 1, b+1, ...rest)        cost 2a+3
//     a==3             -> DEGENERATE (flag)                       [never on-orbit]
//     a==2             -> L_{k+1}(1, b+1, b+1, ...rest)           cost 16
//   L_k(r1,r2,r3,...rest):
//     r3>=2            -> L_k(r1+1, r2, r3-1, ...rest)            cost 2*r2+5
//     r3==1            -> k==3: R(r1+1, r2)   else S_{k-1}(r1+1, r2, ...rest)  cost 2*r2+5
// Anchor transition: from R(n,n) iterate until R(a,a), a>=2.

export function mkR(a,b){ return {t:'R', r:[a,b]}; }
export function step(c){
  // returns {c: next, cost, rule}
  if(c.t==='R'){
    const [a,b]=c.r;
    if(b<3) return {degenerate:`R(a=${a},b=${b}) b<3`};
    return {c:{t:'S',r:[a+1,b-2,1]}, cost:2*b+3, rule:`R(${a},${b})->S3`};
  }
  if(c.t==='S'){
    const [x,y,z,...rest]=c.r;
    if(y>=3) return {c:{t:'S',r:[x+1,y-2,z+1,...rest]}, cost:2*y+3, rule:'S'};
    if(y===2) return {c:{t:'G',r:[x+1,z+1,...rest]}, cost:7, rule:'S->G(y=2)'};
    if(y===1){
      // k=3 (no rest) -> 2-run result == R (head right of block); k>=4 -> L_{k-1}
      if(rest.length===0) return {c:{t:'R',r:[1,x+z+3]}, cost:2*x+z+14, rule:'S3->R(y=1)'};
      return {c:{t:'L',r:[1,x+z+3,...rest]}, cost:2*x+z+14, rule:'S->L(y=1)'};
    }
    return {degenerate:`S y=${y}`};
  }
  if(c.t==='G'){
    const [a,b,...rest]=c.r;
    if(a>=4) return {c:{t:'S',r:[1,a-3,1,b+1,...rest]}, cost:2*a+3, rule:'G->S'};
    if(a===2) return {c:{t:'L',r:[1,b+1,b+1,...rest]}, cost:16, rule:'G->L(a=2)'};
    if(a===3) return {halt:true, cost:15, rule:'G(a=3)->HALT'};
    return {degenerate:`G a=${a}`};
  }
  if(c.t==='L'){
    const [r1,r2,r3,...rest]=c.r;
    if(r3>=2) return {c:{t:'L',r:[r1+1,r2,r3-1,...rest]}, cost:2*r2+5, rule:'L'};
    if(r3===1){
      if(c.r.length===3) return {c:{t:'R',r:[r1+1,r2]}, cost:2*r2+5, rule:'L3->R'};
      return {c:{t:'S',r:[r1+1,r2,...rest]}, cost:2*r2+5, rule:'L->S'};
    }
    return {degenerate:`L r3=${r3}`};
  }
  return {degenerate:'unknown type'};
}
export function transition(n, trace=false){
  let c = mkR(n,n), t = 0, ev = 0;
  const events = [{c, t}];
  for(let i=0;i<2e7;i++){
    const st = step(c);
    if(st.degenerate) return {degenerate:st.degenerate, at:events.length, events};
    if(st.halt) return {halt:true, cost:t+st.cost, at:events.length, events};
    t += st.cost; c = st.c; ev++;
    events.push({c, t, rule: st.rule});
    if(c.t==='R' && c.r[0]===c.r[1] && c.r[0]>=2) return {n2:c.r[0], cost:t, events};
  }
  return {degenerate:'iteration cap', events};
}
// Fast transition: same rule outcomes, sweeps collapsed arithmetically.
// S-sweep on y: y odd -> j=(y-1)/2 steps end y=1; y even -> j=(y-2)/2 steps end y=2.
//   cost sum(2*y_i+3): y odd: 2*m^2+3m with m=(y+1)/2; y even: 2*m*(m+1)+3m with m=y/2.
// L-sweep on r3: r3-1 steps then termination; each step cost 2r2+5 (r2 fixed).
// G/R: single events.
export function stepFast(c){
  if(c.t==='R'){
    const [a,b]=c.r;
    if(b<3) return {degenerate:`R(a=${a},b=${b}) b<3`};
    return {c:{t:'S',r:[a+1,b-2,1]}, cost:2*b+3, rule:`R(${a},${b})->S3`};
  }
  if(c.t==='S'){
    const [x,y,z,...rest]=c.r;
    if(y>=3){
      let j, ey, cost;
      if(y%2===1){ j=(y-1)/2; ey=1; const m=(y-1)/2; cost=2*m*m+7*m; }        // terms y,y-2,...,3
      else { j=(y-2)/2; ey=2; const m=y/2; cost=2*m*m+5*m-7; }                  // terms y,y-2,...,4
      const c2 = ey===1
        ? (rest.length===0 ? {t:'R',r:[1,x+j+z+j+3]} : {t:'L',r:[1,x+j+z+j+3,...rest]})
        : {t:'G',r:[x+j+1,z+j+1,...rest]};
      const cost2 = ey===1 ? 2*(x+j)+(z+j)+14 : 7;
      return {c:c2, cost:cost+cost2, rule:`S-sweep(y=${y}->${ey})`};
    }
    if(y===2) return {c:{t:'G',r:[x+1,z+1,...rest]}, cost:7, rule:'S->G(y=2)'};
    if(y===1){
      if(rest.length===0) return {c:{t:'R',r:[1,x+z+3]}, cost:2*x+z+14, rule:'S3->R(y=1)'};
      return {c:{t:'L',r:[1,x+z+3,...rest]}, cost:2*x+z+14, rule:'S->L(y=1)'};
    }
    return {degenerate:`S y=${y}`};
  }
  if(c.t==='G'){
    const [a,b,...rest]=c.r;
    if(a>=4) return {c:{t:'S',r:[1,a-3,1,b+1,...rest]}, cost:2*a+3, rule:'G->S'};
    if(a===2) return {c:{t:'L',r:[1,b+1,b+1,...rest]}, cost:16, rule:'G->L(a=2)'};
    if(a===3) return {halt:true, cost:15, rule:'G(a=3)->HALT'};
    return {degenerate:`G a=${a}`};
  }
  if(c.t==='L'){
    const [r1,r2,r3,...rest]=c.r;
    if(r3>=2){
      const j=r3-1; // steps to reach r3=1
      const cost=j*(2*r2+5)+(2*r2+5);
      if(c.r.length===3) return {c:{t:'R',r:[r1+j+1,r2]}, cost, rule:`L3-sweep(r3=${r3})`};
      return {c:{t:'S',r:[r1+j+1,r2,...rest]}, cost, rule:`L-sweep(r3=${r3})`};
    }
    if(r3===1){
      if(c.r.length===3) return {c:{t:'R',r:[r1+1,r2]}, cost:2*r2+5, rule:'L3->R'};
      return {c:{t:'S',r:[r1+1,r2,...rest]}, cost:2*r2+5, rule:'L->S'};
    }
    return {degenerate:`L r3=${r3}`};
  }
  return {degenerate:'unknown type'};
}
export function transitionFast(n){
  let c = mkR(n,n), t = 0;
  for(let i=0;i<1e6;i++){
    const st = stepFast(c);
    if(st.degenerate) return {degenerate:st.degenerate};
    if(st.halt) return {halt:true, cost:t+st.cost};
    t += st.cost; c = st.c;
    if(c.t==='R' && c.r[0]===c.r[1] && c.r[0]>=2) return {n2:c.r[0], cost:t};
  }
  return {degenerate:'iteration cap'};
}
// CLI: node phase1.mjs n        -> print summary + optional event list
if(process.argv[1] && process.argv[1].endsWith('phase1.mjs')){
  const n = +(process.argv[2]||9);
  const res = transition(n, true);
  if(res.degenerate){ console.log(`DEGENERATE at event ${res.at}: ${res.degenerate}`); process.exit(1); }
  console.log(`P(${n}) -> P(${res.n2})  cost=${res.cost}  delta=${res.n2-n}  events=${res.events.length-1}`);
  if(process.argv[3]==='ev'){
    for(const e of res.events){
      const runs = e.c.r.join(',');
      console.log(`  +${e.t} ${e.c.t}${e.c.r.length}[${runs}] ${e.rule||''}`);
    }
  }
}
