// deep1.mjs — BigInt fast engine: transition from P(n) with exact BigInt arithmetic.
// Same rules as phase1.mjs stepFast, all values BigInt.
import { transition as stepTransition, mkR } from './phase1.mjs';
const B = BigInt;
function stepFast(c){
  if(c.t==='R'){
    const [a,b]=c.r;
    if(b<3) return {degenerate:`R b=${b}`};
    return {c:{t:'S',r:[a+1n,b-2n,1n]}, cost:2n*b+3n};
  }
  if(c.t==='S'){
    const [x,y,z,...rest]=c.r;
    if(y>=3n){
      let j,ey,cost;
      if(y%2n===1n){ j=(y-1n)/2n; ey=1n; const m=(y-1n)/2n; cost=2n*m*m+7n*m; }
      else { j=(y-2n)/2n; ey=2n; const m=y/2n; cost=2n*m*m+5n*m-7n; }
      const c2 = ey===1n
        ? (rest.length===0 ? {t:'R',r:[1n,x+j+z+j+3n]} : {t:'L',r:[1n,x+j+z+j+3n,...rest]})
        : {t:'G',r:[x+j+1n,z+j+1n,...rest]};
      const cost2 = ey===1n ? 2n*(x+j)+(z+j)+14n : 7n;
      return {c:c2, cost:cost+cost2};
    }
    if(y===2n) return {c:{t:'G',r:[x+1n,z+1n,...rest]}, cost:7n};
    if(y===1n){
      if(rest.length===0) return {c:{t:'R',r:[1n,x+z+3n]}, cost:2n*x+z+14n};
      return {c:{t:'L',r:[1n,x+z+3n,...rest]}, cost:2n*x+z+14n};
    }
    return {degenerate:`S y=${y}`};
  }
  if(c.t==='G'){
    const [a,b,...rest]=c.r;
    if(a>=4n) return {c:{t:'S',r:[1n,a-3n,1n,b+1n,...rest]}, cost:2n*a+3n};
    if(a===2n) return {c:{t:'L',r:[1n,b+1n,b+1n,...rest]}, cost:16n};
    if(a===3n) return {halt:true, cost:15n};
    return {degenerate:`G a=${a}`};
  }
  if(c.t==='L'){
    const [r1,r2,r3,...rest]=c.r;
    if(r3>=2n){
      const j=r3-1n, cost=(j+1n)*(2n*r2+5n);
      if(c.r.length===3) return {c:{t:'R',r:[r1+j+1n,r2]}, cost};
      return {c:{t:'S',r:[r1+j+1n,r2,...rest]}, cost};
    }
    if(r3===1n){
      if(c.r.length===3) return {c:{t:'R',r:[r1+1n,r2]}, cost:2n*r2+5n};
      return {c:{t:'S',r:[r1+1n,r2,...rest]}, cost:2n*r2+5n};
    }
    return {degenerate:`L r3=${r3}`};
  }
  return {degenerate:'unknown'};
}
export function transitionBig(n){ // n: BigInt
  let c = {t:'R', r:[n,n]}, t = 0n;
  for(let i=0;i<100000;i++){
    const st = stepFast(c);
    if(st.degenerate) return {degenerate:st.degenerate};
    if(st.halt) return {halt:true, cost:t+st.cost};
    t += st.cost; c = st.c;
    if(c.t==='R' && c.r[0]===c.r[1] && c.r[0]>=2n) return {n2:c.r[0], cost:t};
  }
  return {degenerate:'cap'};
}
if(process.argv[1] && process.argv[1].endsWith('deep1.mjs')){
  const mode = process.argv[2];
  if(mode==='gv'){ // g(v) for v in LO..HI: n = 3*2^v - 3
    const LO=+process.argv[3], HI=+process.argv[4];
    const out=[]; let min=1e9, minv=-1;
    for(let v=LO;v<=HI;v++){
      const n = 3n*(2n**BigInt(v)) - 3n;
      const r = transitionBig(n);
      if(r.halt||r.degenerate){ out.push(`v=${v}:${r.halt?'HALT':'D'}`); continue; }
      const g = Number((r.n2-n)/3n);
      if(g<min){min=g;minv=v;}
      out.push(v+':'+g);
    }
    console.log(out.join(' '));
    console.log(`min g = ${min} at v=${minv}`);
  } else if(mode==='orbit'){ // iterate orbit K steps, report n, v, delta, min delta
    const K=+process.argv[3];
    let n=3n, t=54n, mind=1e9;
    const deltas={};
    for(let i=0;i<K;i++){
      const r=transitionBig(n);
      if(r.halt){console.log(`HALT at macro ${i} n=${n}`);break;}
      const d=Number((r.n2-n)/3n);
      deltas[d]=(deltas[d]||0)+1; if(d<mind)mind=d;
      t+=r.cost; n=r.n2;
    }
    console.log(`orbit ${K} macro steps: n=${n}, t=${t.toString().length} digits, min delta/3=${mind}`);
    console.log('delta/3 histogram:', JSON.stringify(deltas));
  }
}
