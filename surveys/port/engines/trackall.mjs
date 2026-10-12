// trackall.mjs — run 3-point shadowing track for every ROBUST-CANDIDATE pair in portaudit.tsv.
import fs from 'fs';
import { execSync } from 'child_process';
const lines=fs.readFileSync('portaudit.tsv','utf8').split(/\r?\n/).filter(l=>l.includes('ROBUST-CANDIDATE'));
console.log('pos\tcert\tstatus\tU\tP\tlagMin\tlagMax\tpopRmin\tpopRmax');
for(const row of lines){
  const c=row.split('\t');
  const pos=c[0],cert=c[1],st=c[2],U=c[12],P=c[13];
  try{
    const out=execSync(`node track.mjs ${U} ${P} 50000000,150000000,300000000`,{encoding:'utf8'});
    const rows=out.trim().split(/\r?\n/).slice(1).map(l=>l.split('\t'));
    const lags=rows.map(r=>+r[7]), popRs=rows.map(r=>+r[8]);
    console.log(`${pos}\t${cert}\t${st}\t${U}\t${P}\t${Math.min(...lags)}\t${Math.max(...lags)}\t${Math.min(...popRs).toFixed(3)}\t${Math.max(...popRs).toFixed(3)}`);
  }catch(e){ console.error('ERR',U,e.message.slice(0,80)); }
}
