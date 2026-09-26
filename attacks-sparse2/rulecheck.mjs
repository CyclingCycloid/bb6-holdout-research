// rulecheck.mjs — verify every grammar rule against the RAW TM on parameter grids.
// For each instance: construct config, run raw TM, find first D-on-0 event (t>0),
// compare (type-equivalent RLE + head position + exact cost) with engine step().
import { step } from './phase1.mjs';
const CODE = "1RB1LA0RC0RD1LC1LA1RE1RD1LF0LA---0LE";
const T = [];
for (let i = 0; i < 12; i++) {
  const t = CODE.slice(3*i, 3*i+3);
  T[(i/2)|0] = T[(i/2)|0] || [];
  T[(i/2)|0][i%2] = t === "---" ? null : {w:+t[0], m:t[1]==='L'?-1:1, n:t.charCodeAt(2)-65};
}
// raw run from explicit config; returns first D-event after t=0 (or halt)
function rawEvent(runs, gaps, gapIdx, headOff){
  const c = new Map(); let plo=0, phi=0;
  const wr=(p,v)=>{c.set(p,v); if(p<plo)plo=p; if(p+1>phi)phi=p+1;};
  const rd=p=>c.get(p)||0;
  let p=0; const gapStarts=[];
  for(let i=0;i<runs.length;i++){
    for(let j=0;j<runs[i];j++)wr(p++,1);
    if(i<runs.length-1){ gapStarts.push(p); for(let j=0;j<gaps[i];j++)wr(p++,0); }
  }
  let head = gapIdx<0 ? p : gapStarts[gapIdx]+headOff;
  let st=3, stepc=0;
  let first1=null,last1=null;
  const rle=()=>{
    first1=null;last1=null;
    for(let q=plo;q<phi;q++) if(rd(q)){first1=q;break;}
    if(first1===null) return null;
    for(let q=phi-1;q>=plo;q--) if(rd(q)){last1=q;break;}
    const out=[]; let inrun=false;
    for(let q=first1;q<=last1;q++){
      if(rd(q)){ if(!inrun){out.push({r:0,g:0}); inrun=true;} out[out.length-1].r++; }
      else { out[out.length-1].g++; inrun=false; }
    }
    return out;
  };
  for(let s=0;s<5e5;s++){
    if(stepc>0 && st===3 && rd(head)===0){
      const rl = rle();
      if(rl){
        // head position descriptor
        let L=rd(head-1), R=rd(head+1), w=1;
        let a=head,b=head,ca=0,cb=0;
        while(!rd(a-1)&&ca<500){a--;ca++;} if(!rd(a-1))a=head;
        while(!rd(b+1)&&cb<500){b++;cb++;} if(!rd(b+1))b=head;
        w=b-a+1;
        const rightOfAll = head>last1;
        return {t:stepc, runs:rl.map(x=>x.r), gaps:rl.slice(0,-1).map(x=>x.g), L,R,w,rightOfAll};
      }
    }
    const tr=T[st][rd(head)];
    if(!tr) return {halt:true, t:stepc};
    wr(head,tr.w); head+=tr.m; st=tr.n; stepc++;
  }
  return {cap:true};
}
// expected head descriptor for engine config
function descr(c){
  if(c.t==='R') return {rightOfAll:true, w:1, L:1, R:0};
  if(c.t==='S') return {rightOfAll:false, w:2, L:1, R:0};   // left cell of 2-gap (gap index 1)
  if(c.t==='G') return {rightOfAll:false, w:3, L:0, R:0};   // middle of 3-gap (gap index 0)
  if(c.t==='L') return {rightOfAll:false, w:1, L:1, R:1};   // single-0 gap (gap index 1)
}
let ok=0, bad=0; const bads=[];
function check(name, cfg, gapIdx, headOff){
  const st = step(cfg);
  const ev = rawEvent(cfg.r, gapsOf(cfg), gapIdx, headOff);
  if(st.halt){
    if(ev.halt && ev.t===st.cost){ok++; return;}
    bad++; bads.push(`${name} ${cfg.t}${cfg.r}: engine HALT@${st.cost}, raw ${JSON.stringify(ev)}`); return;
  }
  if(ev.halt||ev.cap){ bad++; bads.push(`${name} ${cfg.t}${cfg.r}: raw ${JSON.stringify(ev)}, engine -> ${st.c.t}${st.c.r} @${st.cost}`); return; }
  // compare
  const sameRuns = ev.t===st.cost && JSON.stringify(ev.runs)===JSON.stringify(st.c.r);
  const d = descr(st.c);
  const sameHead = ev.rightOfAll===!!d.rightOfAll && (!d.rightOfAll ? (ev.w===d.w&&ev.L===d.L&&ev.R===d.R) : true) ;
  if(sameRuns && sameHead && gapsMatch(cfg, st.c, ev)) ok++;
  else { bad++; bads.push(`${name} ${cfg.t}${cfg.r}: eng ${st.c.t}${st.c.r}@${st.cost} vs raw ${JSON.stringify(ev)}`); }
}
function gapsOf(c){
  if(c.t==='R') return [1];
  if(c.t==='S') return [1,2, ...Array(c.r.length-3).fill(1)];
  if(c.t==='G') return [3, ...Array(c.r.length-2).fill(1)];
  if(c.t==='L') return Array(c.r.length-1).fill(1);
}
function gapsMatch(cfg, out, ev){
  const g = gapsOf(out);
  return JSON.stringify(ev.gaps)===JSON.stringify(g);
}
// ---- grids ----
// R(a,b): head right of all
for(const a of [1,2,3,5,8,50]) for(const b of [3,4,5,6,7,9,12,40])
  check('R', {t:'R',r:[a,b]}, -1, 0);
// S3, S4, S5: head = left cell of gap index 1
for(const x of [1,2,4,7]) for(const y of [1,2,3,4,5,8,11]) for(const z of [1,2,5]){
  check('S3', {t:'S',r:[x,y,z]}, 1, 0);
  check('S4', {t:'S',r:[x,y,z,13]}, 1, 0);
  check('S5', {t:'S',r:[x,y,z,9,17]}, 1, 0);
}
// G2, G3, G4: head = middle of gap index 0 (offset 1)
for(const a of [2,3,4,5,6,7,9,14,20]) for(const b of [2,3,5,10]){
  check('G2', {t:'G',r:[a,b]}, 0, 1);
  check('G3', {t:'G',r:[a,b,11]}, 0, 1);
  check('G4', {t:'G',r:[a,b,7,23]}, 0, 1);
}
// L3, L4, L5: head on gap index 1
for(const r1 of [1,2,4]) for(const r2 of [2,3,5,9]) for(const r3 of [1,2,3,6]){
  check('L3', {t:'L',r:[r1,r2,r3]}, 1, 0);
  check('L4', {t:'L',r:[r1,r2,r3,12]}, 1, 0);
  check('L5', {t:'L',r:[r1,r2,r3,8,15]}, 1, 0);
}
console.log(`rulecheck: ok=${ok} bad=${bad}`);
bads.slice(0,20).forEach(b=>console.log('  '+b));
