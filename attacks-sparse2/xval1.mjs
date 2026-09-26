// xval1.mjs — cross-validate the symbolic engine against the raw oracle o1.exe.
// usage: node xval1.mjs LO HI STEP [CAP]
// For n = LO, LO+STEP, ..., HI: run `o1.exe start n n CAP quiet`, parse result,
// compare n2/cost/halt with transitionFast(n).
import { transitionFast } from './phase1.mjs';
import { execSync } from 'child_process';
const LO=+process.argv[2], HI=+process.argv[3], STEP=+process.argv[4]||1;
const CAP=process.argv[5]||'2000000000';
let ok=0, bad=0, halts=0;
const bads=[];
for(let n=LO;n<=HI;n+=STEP){
  const eng=transitionFast(n);
  let out;
  try{ out=execSync(`./o1.exe start ${n} ${n} ${CAP} quiet`,{encoding:'utf8',timeout:600000}).trim(); }
  catch(e){ out='ERR:'+e.message.slice(0,80); }
  let oracle;
  const m1=out.match(/^RES (\d+) (\d+) -> (\d+) (\d+) cost=(\d+)/);
  const m2=out.match(/^HALT-from \((\d+),(\d+)\) at \+(\d+)/);
  if(m1) oracle={n2:+m1[3], cost:+m1[5]};
  else if(m2) oracle={halt:true, cost:+m2[3]};
  else oracle={weird:out};
  const e = eng.halt?{halt:true,cost:eng.cost}:eng.degenerate?{degen:eng.degenerate}:{n2:eng.n2,cost:eng.cost};
  const agree = (oracle.halt&&e.halt&&oracle.cost===e.cost)||(oracle.n2===e.n2&&oracle.cost===e.cost);
  if(oracle.halt) halts++;
  if(agree) ok++;
  else { bad++; bads.push(`n=${n}: eng=${JSON.stringify(e)} oracle=${JSON.stringify(oracle)}`); if(bad>20)break; }
}
console.log(`xval ${LO}..${HI} step ${STEP}: ok=${ok} bad=${bad} (oracle halts: ${halts})`);
for(const b of bads) console.log('  '+b);
