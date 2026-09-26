// scan1.mjs — scan n range with the symbolic engine: classify outcome, delta.
// usage: node scan1.mjs LO HI [mode]  mode=show -> print every line
import { transition } from './phase1.mjs';
const LO=+process.argv[2], HI=+process.argv[3], show=process.argv[4]==='show';
const stats={ok:0,halt:0,degen:0}; const halts=[]; const degens=[]; const deltas={};
for(let n=LO;n<=HI;n++){
  const r=transition(n);
  if(r.halt){ stats.halt++; halts.push(n); if(show)console.log(`n=${n} HALT at +${r.cost} (event ${r.at})`); }
  else if(r.degenerate){ stats.degen++; degens.push([n,r.degenerate]); if(show)console.log(`n=${n} DEGEN ${r.degenerate} at ${r.at}`); }
  else { stats.ok++; const d=r.n2-n; deltas[d]=(deltas[d]||0)+1; if(show)console.log(`n=${n} -> ${r.n2} (+${d}) cost=${r.cost} ev=${r.events.length-1}`); }
}
console.log(`range ${LO}..${HI}: ok=${stats.ok} halt=${stats.halt} degen=${stats.degen}`);
console.log(`deltas:`, JSON.stringify(deltas));
if(halts.length) console.log(`HALTING n:`, halts.slice(0,200).join(','));
if(degens.length) console.log(`DEGEN:`, degens.slice(0,50).map(d=>`${d[0]}:${d[1]}`).join(' '));
