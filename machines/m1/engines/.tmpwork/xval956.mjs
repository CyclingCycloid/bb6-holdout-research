// fresh anchor crosscheck: corrected phase1.transitionFast vs raw oracle o1.exe, n=2..957
import { transitionFast } from '../phase1.mjs';
import { execFileSync } from 'child_process';
import { resolve } from 'path';
const O1 = resolve('../engines/o1.exe');
let ok = 0, bad = 0, halts = 0, degen = 0; const bads = [];
for (let n = 2; n <= 957; n++) {
  const eng = transitionFast(n);
  let out;
  try { out = execFileSync(O1, ['start', String(n), String(n), '2000000000', 'quiet'], { encoding: 'utf8', timeout: 600000, maxBuffer: 1 << 28 }).trim(); }
  catch (e) { out = 'ERR:' + String(e.message).slice(0, 60); }
  let oracle;
  const m1 = out.match(/^RES (\d+) (\d+) -> (\d+) (\d+) cost=(\d+)/);
  const m2 = out.match(/^HALT-from \((\d+),(\d+)\) at \+(\d+)/);
  if (m1) oracle = { n2: +m1[3], cost: +m1[5] };
  else if (m2) oracle = { halt: true, cost: +m2[3] };
  else oracle = { weird: out.slice(0, 60) };
  if (oracle.halt) halts++;
  const e = eng.halt ? { halt: true, cost: eng.cost } : eng.degenerate ? { degen: eng.degenerate } : { n2: eng.n2, cost: eng.cost };
  const agree = (oracle.halt && e.halt && oracle.cost === e.cost) || (!oracle.halt && !e.halt && !e.degen && oracle.n2 === e.n2 && oracle.cost === e.cost);
  if (e.degen && oracle.halt) degen++; // degenerate-but-oracle-halts (off-grammar anchor)
  if (agree) ok++; else { bad++; if (bads.length < 10) bads.push(`n=${n}: eng=${JSON.stringify(e)} oracle=${JSON.stringify(oracle)}`); }
}
console.log(`xval956 (n=2..957): ok=${ok} bad=${bad} oracle-halts=${halts} degenerate-with-oracle-halt=${degen}`);
bads.forEach(b => console.log('  ' + b));
