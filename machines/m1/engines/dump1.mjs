// dump1.mjs — dump the full event chain for one n (to see where halts happen)
import { transition } from './phase1.mjs';
const n=+process.argv[2];
const r=transition(n);
console.log(r.halt?`HALT at +${r.cost}`:r.degenerate?`DEGEN ${r.degenerate}`:`P(${n})->P(${r.n2}) +${r.n2-n} cost=${r.cost}`);
for(const e of r.events){
  console.log(`  +${e.t} ${e.c.t}${e.c.r.length}[${e.c.r.join(',')}] ${e.rule||''}`);
}
