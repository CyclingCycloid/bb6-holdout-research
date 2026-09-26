// agree1.mjs — assert transitionFast === transition (n2, cost, halt) over range
import { transition, transitionFast } from './phase1.mjs';
const LO=+process.argv[2]||3, HI=+process.argv[3]||2000;
let bad=0;
for(let n=LO;n<=HI;n++){
  const a=transition(n), b=transitionFast(n);
  const ka = a.halt?'H':a.degenerate?'D':`${a.n2}/${a.cost}`;
  const kb = b.halt?'H':b.degenerate?'D':`${b.n2}/${b.cost}`;
  if(ka!==kb){ console.log(`MISMATCH n=${n}: step=${ka} fast=${kb}`); if(++bad>10) break; }
}
console.log(bad===0?`agree ${LO}..${HI}: OK`:`${bad} mismatches`);
