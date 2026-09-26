// 引擎↔oracle 交叉验证 v2 (execFileSync 无壳直调)
import { transitionFast } from './phase1.mjs';
import { execFileSync } from 'child_process';
import { resolve } from 'path';
const O1 = resolve('./o1.exe');
const LO=+process.argv[2], HI=+process.argv[3], STEP=+process.argv[4]||1;
const CAP=process.argv[5]||'2000000000';
let ok=0,bad=0,haltOr=0,haltEng=0;
const bads=[];
for(let n=LO;n<=HI;n+=STEP){
  const eng=transitionFast(n);
  let out='';
  try{ out=execFileSync(O1,['start',String(n),String(n),CAP,'quiet'],{encoding:'utf8',timeout:600000, cwd:process.cwd()}).trim(); }catch(e){ out='ERR:'+String(e.message).slice(0,60); }
  const m1=out.match(/^RES (\d+) (\d+) -> (\d+) (\d+) cost=(\d+)/);
  const m2=out.match(/^HALT-from \((\d+),(\d+)\) at \+(\d+)/);
  let oracle = m1?{n2:+m1[3],cost:+m1[5]} : m2?{halt:true,cost:+m2[3]} : {weird:out};
  const e = eng.halt?{halt:true,cost:eng.cost} : eng.degenerate?{degen:eng.degenerate} : {n2:eng.n2,cost:eng.cost};
  if(oracle.halt)haltOr++; if(e.halt)haltEng++;
  const agree=(oracle.halt&&e.halt&&oracle.cost===e.cost)||(oracle.n2!==undefined&&oracle.n2===e.n2&&oracle.cost===e.cost);
  if(agree)ok++;else{bad++;bads.push(`n=${n}: eng=${JSON.stringify(e)} or=${JSON.stringify(oracle).slice(0,90)}`);if(bad>15)break;}
}
console.log(`xval ${LO}..${HI}/${STEP}: ok=${ok} bad=${bad} (oracle停机:${haltOr}, 引擎停机:${haltEng})`);
bads.forEach(b=>console.log('  '+b));
