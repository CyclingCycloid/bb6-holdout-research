// micro1.mjs — M1 micro-simulator with structured logging.
// Machine M1 = 1RB1LA0RC0RD1LC1LA1RE1RD1LF0LA---0LE
// A:0->1RB 1->1LA | B:0->0RC 1->0RD | C:0->1LC 1->1LA | D:0->1RE 1->1RD
// E:0->1LF 1->0LA | F:0->HALT 1->0LE
const CODE = "1RB1LA0RC0RD1LC1LA1RE1RD1LF0LA---0LE";
const T = [];
for (let i = 0; i < 12; i++) {
  const t = CODE.slice(3*i, 3*i+3);
  T[(i/2)|0] = T[(i/2)|0] || [];
  T[(i/2)|0][i%2] = t === "---" ? null : {w:+t[0], m:t[1]==='L'?-1:1, n:t.charCodeAt(2)-65};
}
// tape: Map or plain object indexed by integer
class Tape {
  constructor(){ this.c = new Map(); this.plo=0; this.phi=0; }
  rd(p){ return this.c.get(p)||0; }
  wr(p,v){ this.c.set(p,v); if(p<this.plo)this.plo=p; if(p+1>this.phi)this.phi=p+1; }
  rle(){ // runs & gaps over [plo,phi)
    const out=[]; let inrun=false;
    for(let p=this.plo;p<this.phi;p++){
      const v=this.rd(p);
      if(v){ if(!inrun){out.push({r:0,g:0}); inrun=true;} out[out.length-1].r++; }
      else { if(out.length) out[out.length-1].g++; inrun=false; }
    }
    return out;
  }
  toString(head){
    let s='';
    for(let p=this.plo;p<this.phi;p++){ if(p===head)s+='['+(this.rd(p)?'1':'0')+']'; else s+=this.rd(p)?'1':'0'; }
    if(head>=this.phi)s+='[0]';
    return s;
  }
}
// run from P(n): 1^n 0 1^n, D on fresh 0 right of right block
function run(n, maxSteps, logAll=false){
  const tp=new Tape(); let p=0;
  for(let i=0;i<n;i++)tp.wr(p++,1); tp.wr(p++,0); for(let i=0;i<n;i++)tp.wr(p++,1);
  let head=p, st=3, step=0; // D
  const isD0 = ()=> st===3 && tp.rd(head)===0;
  while(step<maxSteps){
    if(logAll || isD0()){
      const runs=tp.rle();
      console.log(`t=${step} st=${'ABCDEF'[st]} h=${head} sym=${tp.rd(head)} runs=[${runs.map(r=>r.r).join(',')}] gaps=[${runs.slice(0,-1).map(r=>r.g).join(',')}] tape=${tp.toString(head)}`);
    }
    const tr=T[st][tp.rd(head)];
    if(!tr){ console.log(`HALT at t=${step}`); return {halt:true, step}; }
    tp.wr(head,tr.w); head+=tr.m; st=tr.n; step++;
  }
  return {halt:false, step};
}
const n=+(process.argv[2]||3), max=+(process.argv[3]||200), logAll=process.argv[4]==='all';
run(n,max,logAll);
