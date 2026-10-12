// gen1.mjs — generic-config raw simulator for M1: start from an explicit RLE
// config with D on a chosen gap; print D-on-0 events (runs,gaps) + micro steps.
// usage: node gen1.mjs "runs=a,b,c" "gaps=3,1" "gap=1" [maxsteps] [all]
// gap = 1-based index of the zero-run the head starts on; position within:
//   S-type: left cell of a width-2 gap; G-type: middle of width-3; L: single.
import { transition } from './phase1.mjs';
const CODE = "1RB1LA0RC0RD1LC1LA1RE1RD1LF0LA---0LE";
const T = [];
for (let i = 0; i < 12; i++) {
  const t = CODE.slice(3*i, 3*i+3);
  T[(i/2)|0] = T[(i/2)|0] || [];
  T[(i/2)|0][i%2] = t === "---" ? null : {w:+t[0], m:t[1]==='L'?-1:1, n:t.charCodeAt(2)-65};
}
class Tape {
  constructor(){ this.c = new Map(); this.plo=0; this.phi=0; }
  rd(p){ return this.c.get(p)||0; }
  wr(p,v){ this.c.set(p,v); if(p<this.plo)this.plo=p; if(p+1>this.phi)this.phi=p+1; }
  rle(head){
    const out=[]; let inrun=false, first=null,last=null;
    for(let p=this.plo;p<this.phi;p++) if(this.rd(p)){first=p;break;}
    if(first===null) return [];
    for(let p=this.phi-1;p>=this.plo;p--) if(this.rd(p)){last=p;break;}
    for(let p=first;p<=last;p++){
      const v=this.rd(p);
      if(v){ if(!inrun){out.push({r:0,g:0}); inrun=true;} out[out.length-1].r++; }
      else { if(out.length) out[out.length-1].g++; inrun=false; }
    }
    return out;
  }
}
export function runCfg(runs, gaps, gapIdx, headOff, maxSteps, all=false, stopAtAnchor=true){
  const tp=new Tape(); let p=0;
  const gapPos=[]; // starting cell of each gap
  for(let i=0;i<runs.length;i++){
    for(let j=0;j<runs[i];j++)tp.wr(p++,1);
    if(i<runs.length-1){ gapPos.push(p); for(let j=0;j<gaps[i];j++)tp.wr(p++,0); }
  }
  let head = gapIdx>=0 ? gapPos[gapIdx]+headOff : p; // gapIdx=-1: right of all
  let st=3, step=0;
  const evs=[];
  const isD0=()=> st===3 && tp.rd(head)===0;
  while(step<maxSteps){
    if(all || isD0()){
      const rl=tp.rle(head);
      const rightOfAll = rl.length>0 && head>=Math.max(...Array.from({length:0})) && tp.rd(head)===0 && !tp.c.has(head);
      evs.push({t:step, runs:rl.map(x=>x.r), gaps:rl.slice(0,-1).map(x=>x.g), head});
      if(all===false){
        // print D-event like o1
        const rs=rl.map(x=>x.r).join(' '), gs=rl.slice(0,-1).map(x=>x.g).join(' ');
        console.log(`  +${step} n=${rl.length} ${rs} g: ${gs} head=${head}`);
      } else {
        console.log(`t=${step} st=${'ABCDEF'[st]} h=${head} sym=${tp.rd(head)} runs=[${rl.map(x=>x.r)}] gaps=[${rl.slice(0,-1).map(x=>x.g)}]`);
      }
    }
    const tr=T[st][tp.rd(head)];
    if(!tr){ console.log(`HALT at +${step}`); return {halt:true}; }
    tp.wr(head,tr.w); head+=tr.m; st=tr.n; step++;
  }
  return {halt:false};
}
if(process.argv[1] && process.argv[1].endsWith('gen1.mjs')){
  const runs=process.argv[2].split(',').map(Number);
  const gaps=process.argv[3].split(',').map(Number);
  const gapIdx=+process.argv[4], headOff=+process.argv[5];
  const max=+(process.argv[6]||2000), all=process.argv[7]==='all';
  runCfg(runs,gaps,gapIdx,headOff,max,all);
}
