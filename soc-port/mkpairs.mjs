// mkpairs.mjs — rebuild the Hamming-1 pair table (undecided SOC x proven SOC with mxdys .v certs).
// Rerun: node mkpairs.mjs   -> pairs.txt (pos\tcert\tstatus\tundecided\tproven)
import fs from 'fs';
const W='../';
const undec=fs.readFileSync(W+'soc-codes.txt','utf8').split(/\r?\n/).map(s=>s.trim().replace(/_/g,'')).filter(s=>s.length===36);
const led=fs.readFileSync(W+'led_now.csv','utf8').split(/\r?\n/).filter(l=>l.length>40);
const prov=new Map();
for(const line of led){
  const f=line.match(/"([^"]*)","([^"]*)"/);
  if(!f) continue;
  const c=f[1].replace(/_/g,'');
  if(!/^[01LRA-F-]{36}$/.test(c)) continue;
  if(!/Shift-overflow counter/.test(line)) continue;
  const sm=f[2].match(/HALT|NONHALT/);
  if(!sm) continue;
  const cert=line.match(/(LongAccHaltv\d|LongAccv\d|LongLoopv\d|SOCSSv\d|SOMDCv\d)\.v/);
  if(!cert) continue;
  prov.set(c,{st:sm[0],cert:cert[1]});
}
const diff=(a,b)=>{let d=[];for(let i=0;i<12;i++)if(a.substr(3*i,3)!==b.substr(3*i,3))d.push(i);return d;};
const posName=i=>['A0','A1','B0','B1','C0','C1','D0','D1','E0','E1','F0','F1'][i];
const rows=[];
for(const u of undec)for(const [p,info] of prov){const d=diff(u,p);if(d.length===1)rows.push([posName(d[0]),info.cert,info.st,u,p].join('\t'));}
console.log('undec',undec.length,'prov-with-cert',prov.size,'pairs',rows.length,'unique-undec',new Set(rows.map(r=>r.split('\t')[3])).size);
fs.writeFileSync('pairs.txt',rows.join('\n'));
