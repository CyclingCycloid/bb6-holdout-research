// v5: blocker = 包含 LHS 的最短非初始子串; 严格封闭 (pre 无 F ⟹ post 无 F, F ⊇ GOAL)
import { writeFileSync } from 'fs';
const RULES = [['#0','1'],['#100','000#'],['#110','000#'],['#1010','1010##']];
const GOAL = ['111','1011'];
const A = ['0','1','#'];
const CL = +(process.argv[2]||6), CR = +(process.argv[3]||6), MAXITER = 60;
const INIT = '10#'.repeat(40)+'0'.repeat(60);
function allWords(n){let out=[''];for(let i=0;i<n;i++){const nx=[];for(const p of out)for(const a of A)nx.push(p+a);out=nx;}return out;}
const has=(w,l)=>l.some(f=>w.includes(f));
const initSubs=new Set();
for(let i=0;i<INIT.length;i++)for(let l=1;l<=14&&i+l<=INIT.length;l++)initSubs.add(INIT.substr(i,l));
function blocker(pre,lhs){
  const s=pre.indexOf(lhs);
  for(let len=lhs.length;len<=pre.length;len++){
    for(let a=Math.max(0,s+len-lhs.length-pre.length+ (0)); a+len<=pre.length; a++){
      if(a>s)break;
      const w=pre.substr(a,len);
      if(!w.includes(lhs))continue;
      if(!initSubs.has(w))return w;
    }
  }
  return null;
}
const ctxL=[];for(let n=0;n<=CL;n++)ctxL.push(...allWords(n));
const ctxR=[];for(let n=0;n<=CR;n++)ctxR.push(...allWords(n));
let F=[...GOAL];
for(let iter=1;iter<=MAXITER;iter++){
  const newF=[];let unblock=0;
  for(const[lhs,rhs]of RULES)for(const cl of ctxL)for(const cr of ctxR){
    const pre=cl+lhs+cr,post=cl+rhs+cr;
    if(has(pre,F)||has(pre,newF))continue;
    if(!has(post,F))continue;
    const w=blocker(pre,lhs);
    if(w===null||F.includes(w)){unblock++;if(unblock<4)console.log('  UNBLOCKABLE rule='+lhs+' pre='+pre);continue;}
    if(!newF.includes(w))newF.push(w);
  }
  console.log(`iter ${iter}: +${newF.length} (|F|=${F.length+newF.length}) unblock=${unblock} new=${JSON.stringify(newF)}`);
  F.push(...newF);
  if(newF.length===0&&unblock===0){
    console.log('*** CONVERGED ***');
    F=[...new Set(F)];
    writeFileSync('invariant-F5.json',JSON.stringify(F));
    console.log('|F|='+F.length+' maxLen='+Math.max(...F.map(f=>f.length)));
    console.log(JSON.stringify(F));
    process.exit(0);
  }
  if(unblock>0){writeFileSync('invariant-F5-partial.json',JSON.stringify(F));process.exit(3);}
}
