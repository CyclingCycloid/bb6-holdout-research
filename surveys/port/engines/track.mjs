// track.mjs — measure drift between mutant U and twin P at a grid of absolute steps.
// Usage: node track.mjs <U> <P> <stepgrid-csv>
import { execSync } from 'child_process';
const [U,P,grid]=process.argv.slice(2);
const cfg=(code,steps)=>{
  const cap=Math.max(...steps.map(Number))+10;
  const out=execSync(`sp.exe ${code} cp ${cap} ${steps.join(',')}`,{encoding:'utf8',maxBuffer:1e8});
  const m={};
  for(const line of out.split(/\r?\n/)){
    const mm=line.match(/^CP (\d+) st=(\w) h=(-?\d+) lo=(-?\d+) hi=(-?\d+) pop=(\d+)/);
    if(mm) m[+mm[1]]={st:mm[2],h:+mm[3],pop:+mm[6],rle:line.split(' R ')[1]};
  }
  return m;
};
const steps=grid.split(',');
const cu=cfg(U,steps), cp_=cfg(P,steps);
console.log('step\tstU\tstP\thU\thP\tpopU\tpopP\theadLag\tpopR\trleSame');
for(const s of steps){
  const a=cu[s], b=cp_[s];
  if(!a||!b) continue;
  console.log(`${s}\t${a.st}\t${b.st}\t${a.h}\t${b.h}\t${a.pop}\t${b.pop}\t${a.h-b.h}\t${(a.pop/b.pop).toFixed(4)}\t${a.rle===b.rle}`);
}
