// era-align.mjs — era census & cross-machine alignment statistics for the quad pack.
// Rebuilds (i) the era-key census (distinct (pos,n0) per machine) and (ii) the
// 562-era large-era (R0>=500) parameter alignment across cm16/cm26/cm51/cm52.
// Originally computed by an inline node -e script during the quad campaign; landed
// as a durable artifact (repo-audit F13). One-line rerun:  node era-align.mjs
// Input: eras-m16.txt eras-m26.txt eras-m51.txt eras-m52.txt in this directory
// (regenerate any of them with e.g.
//   ./quad6.exe 1RB0LE0RC1RB1LC1RD1RF0LA0RD1LE1RB--- eras A0 3000000000 > eras-m16.txt
//   pivots: m16=A0  m26=D0  m51=A0  m52=C0  — canonical pivots per quad-equiv.mjs header).
//
// NOTE on reproducibility: the session-time inline script was not preserved, so the
// exact boundary values quoted in attack-quad.md §4 ("0[0..9], 1[10..561]" etc.) are
// not bit-reproduced by the natural index-aligned definition below; the structural
// claim (piecewise-constant offsets in {0,1,2}, no accumulating misalignment over the
// aligned window) does reproduce. Measured values are printed for the record.
import fs from 'fs';

const M = ['m16','m26','m51','m52'];
const PIVOT = { m16:'A0', m26:'D0', m51:'A0', m52:'C0' };
const re = /^ERA (\d+) (\d+) ev=(\d+) pos=(\d+) n0=(\d+) L0=(\d+) R0=(\d+) Rr0=(\d+)/;

function parse(f){
  const eras=[];
  for(const line of fs.readFileSync(f,'utf8').split(/\r?\n/)){
    const m=line.match(re); if(!m) continue;
    eras.push({t:+m[1], pos:+m[4], n0:+m[5], L0:+m[6], R0:+m[7]});
  }
  return eras;
}
const data={};
for(const m of M){
  const eras=parse(`eras-${m}.txt`);
  const seen=new Set(); let lastNew=0, n=0;
  for(const e of eras){ const k=e.pos+','+e.n0; if(!seen.has(k)){seen.add(k); lastNew=e.t; n++;} }
  data[m]={eras, keys:seen, lastNewKeyStep:lastNew};
  console.log(`${m}: eras=${eras.length} (pivot ${PIVOT[m]}) distinctKeys(pos,n0)=${seen.size} lastNewKey@t=${lastNew}`);
}
// key-set identity check (documented: m16/m26/m51 identical, m52 = 89 keys)
const same=(a,b)=>a.size===b.size&&[...a].every(k=>b.has(k));
console.log(`key sets: m16==m26 ${same(data.m16.keys,data.m26.keys)}, m16==m51 ${same(data.m16.keys,data.m51.keys)}`);

// large-era alignment: rank by R0>=500 within each machine, align by rank, window = first 562
const big={};
for(const m of M) big[m]=data[m].eras.filter(e=>e.R0>=500);
const N=Math.min(562,...M.map(m=>big[m].length));
function segs(a,b){ // offset runs of a[i]-b[i]
  const out=[]; let start=0, prev=a[0]-b[0];
  for(let i=1;i<a.length;i++){ const d=a[i]-b[i]; if(d!==prev){out.push({off:prev,from:start,to:i-1}); start=i; prev=d;} }
  out.push({off:prev,from:start,to:a.length-1}); return out;
}
for(const m of ['m26','m51','m52']){
  const L16=big.m16.slice(0,N).map(e=>e.L0), R16=big.m16.slice(0,N).map(e=>e.R0);
  const Lx=big[m].slice(0,N).map(e=>e.L0),  Rx=big[m].slice(0,N).map(e=>e.R0);
  const dl=segs(Lx,L16), dr=segs(Rx,R16);
  const sum=dl.reduce((s,x)=>s+Math.abs(x.off)*(x.to-x.from+1),0);
  console.log(`m16-${m} (N=${N}): dL segments ${dl.map(s=>`${s.off}[${s.from}..${s.to}]`).join(' ')}`);
  console.log(`             dR segments ${dr.map(s=>`${s.off}[${s.from}..${s.to}]`).join(' ')}  totalDrift=${sum} (0 = no accumulating misalignment beyond bounded offsets)`);
}
