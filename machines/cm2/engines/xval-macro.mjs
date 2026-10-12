// xval-macro.mjs — Phase 1 faithfulness: macro2 routine boundaries vs C oracle (ocm.exe alla)
// Streams the oracle file to avoid string-size limits. Usage: node xval-macro.mjs <cap>
import { MacroTape } from './macro2.mjs';
import fs from 'fs';
import readline from 'readline';
import { execFileSync } from 'child_process';
const CAP = +process.argv[2] || 200000;
execFileSync('./ocm.exe', ['alla', String(CAP), String(20000000)], { encoding: 'utf8', maxBuffer: 1e9, stdio: ['ignore', fs.openSync('alla_oracle.txt', 'w'), 'ignore'] });
const rl = readline.createInterface({ input: fs.createReadStream('alla_oracle.txt') });
const mt = new MacroTape();
const mine = [{ t: 0, h: 0, s: '' }];
let kinds = {};
while (mt.step < CAP) {
  const r = mt.macroStep();
  kinds[r.kind] = (kinds[r.kind] || 0) + 1;
  const rl2 = mt.t.rle().s;
  if (r.kind.startsWith('HALT')) { mine.push({ t: mt.step, h: mt.head, s: rl2, halt: r.kind }); break; }
  mine.push({ t: mt.step, h: mt.head, s: rl2 });
}
let oi = 0, ok = 0, bad = 0;
for await (const l of rl) {
  const m = l.match(/^EV (\d+) (A)(\d) h=(-?\d+) lo=(-?\d+) hi=(-?\d+) pop=(\d+) width=(\d+) runs=(\d+) rel=(-?\d+) R (.*)$/);
  if (!m) continue;
  const o = { t: +m[1], h: +m[4], s: m[11] };
  const e = mine[oi];
  if (!e) break;
  if (o.t === e.t && o.h === e.h && o.s === e.s) ok++;
  else { bad++; if (bad <= 5) console.log('MISMATCH', oi, 'oracle', JSON.stringify(o), 'mine', JSON.stringify(e)); }
  oi++;
}
console.log('macro routines:', JSON.stringify(kinds));
console.log(`xval-macro CAP=${CAP}: ok=${ok} bad=${bad} (oracle ${oi}, mine ${mine.length})`);
