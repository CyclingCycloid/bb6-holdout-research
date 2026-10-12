// portaudit.mjs — systematic port-judgment audit for the 40 Hamming-1 pairs.
// For each pair: 3D diff location, first firing time of the diff transition on each side,
// transition-count L1 distance (census 3e8), 3e8 pop/span ratios (from soc-work TSVs), verdict.
// Rerun:  node portaudit.mjs
import fs from 'fs';
import { execSync } from 'child_process';

const pairs = fs.readFileSync('pairs.txt','utf8').split(/\r?\n/).filter(l=>l.trim())
  .map(l=>l.split('\t')).map(([pos,cert,st,u,p])=>({pos,cert,st,u,p}));
const posName=i=>['A0','A1','B0','B1','C0','C1','D0','D1','E0','E1','F0','F1'][i];

// feature TSVs (3e8 sweep): col3=code col6=pop col5=span col11=alpha_pop
const feats={};
for (const f of ['../soc-work/soc_3e8.tsv','../soc-work/prov_3e8.tsv']) {
  for (const line of fs.readFileSync(f,'utf8').split(/\r?\n/)) {
    const c=line.split('\t'); if(c.length<12) continue;
    feats[c[2]]={pop:+c[6],span:+c[5],alpha:+c[11]};
  }
}

function census(code){
  const out=execSync(`sp.exe ${code} census 300000000`,{encoding:'utf8'});
  const m={};
  for(const tok of out.trim().split(/\s+/)){ const [k,v]=tok.split('='); if(k&&v&&!isNaN(+v)) m[k]=+v; }
  return m;
}
function firstFire(code,ss){ // first firing time of (state,sym), or -1
  const out=execSync(`sp.exe ${code} ev ${ss} 300000000 1`,{encoding:'utf8'});
  const line=out.split(/\r?\n/).find(l=>l.startsWith('EV'));
  return line? +line.split(/\s+/)[1] : -1;
}

const rows=[];
for (const q of pairs){
  const idx=['A0','A1','B0','B1','C0','C1','D0','D1','E0','E1','F0','F1'].indexOf(q.pos);
  const du=q.u.substr(3*idx,3), dp=q.p.substr(3*idx,3);
  const d3=[ du[0]===dp[0]?'':`write ${dp[0]}->${du[0]}`,
             du[1]===dp[1]?'':`dir ${dp[1]}->${du[1]}`,
             du[2]===dp[2]?'':`next ${dp[2]}->${du[2]}` ].filter(Boolean).join(',');
  const cu=census(q.u), cp=census(q.p);
  const ss=q.pos; // e.g. 'E1'
  const ffU=firstFire(q.u,ss), ffP=firstFire(q.p,ss);
  let l1=0; for(const k of Object.keys(cu)) l1+=Math.abs((cu[k]||0)-(cp[k]||0));
  const tot=Object.values(cu).reduce((a,b)=>a+b,0);
  const fu=feats[q.u], fp=feats[q.p];
  const popR=fu&&fp?(fu.pop/fp.pop):NaN, spanR=fu&&fp?(fu.span/fp.span):NaN;
  // verdict: fork at min(ffU,ffP) if >=0; hot if counts big; heal if l1 tiny AND ratios ~1
  const fork=Math.min(...[ffU,ffP].filter(x=>x>=0), Infinity);
  const hot=(cu[ss]||0)+(cp[ss]||0) > 1e6;
  let verdict;
  if (fork===Infinity) verdict='DIFF-NEVER-FIRES(3e8)';
  else if (hot) verdict='HOT-DIFF(structure changed)';
  else if (l1/tot<0.001 && popR>0.85 && popR<1.18 && spanR>0.8 && spanR<1.25) verdict='ROBUST-CANDIDATE(track)';
  else verdict='FORK-PERSISTS';
  rows.push({pos:q.pos,cert:q.cert,st:q.st,d3,fork,ffU,ffP,diffU:cu[ss]||0,diffP:cp[ss]||0,
    l1pct:(100*l1/tot).toFixed(4),popR:popR?popR.toFixed(3):'-',spanR:spanR?spanR.toFixed(3):'-',
    popU:fu?fu.pop:'-',popP:fp?fp.pop:'-',uc:q.u,pc:q.p,verdict});
}
rows.sort((a,b)=>a.verdict.localeCompare(b.verdict));
console.log('pos\tcert\tstatus\tdiff3D\tforkstep\tcntU\tcntP\tl1%\tpopR\tspanR\tverdict');
for(const r of rows)
  console.log(`${r.pos}\t${r.cert}\t${r.st}\t${r.d3}\t${r.fork===Infinity?'-':r.fork}\t${r.diffU}\t${r.diffP}\t${r.l1pct}\t${r.popR}\t${r.spanR}\t${r.verdict}`);
fs.writeFileSync('portaudit.tsv', ['pos\tcert\tstatus\tdiff3D\tforkstep\tcntU\tcntP\tl1%\tpopR\tspanR\tpopU\tpopP\tUcode\tPcode\tverdict',
  ...rows.map(r=>`${r.pos}\t${r.cert}\t${r.st}\t${r.d3}\t${r.fork===Infinity?'-':r.fork}\t${r.diffU}\t${r.diffP}\t${r.l1pct}\t${r.popR}\t${r.spanR}\t${r.popU}\t${r.popP}\t${r.uc}\t${r.pc}\t${r.verdict}`)].join('\n'));
