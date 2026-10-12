// xval-runsim.mjs — runsim vs bare-machine (stateseq.exe) step-by-step over [LO,HI)
import { RunTape } from './runsim.mjs';
import { execFileSync } from 'child_process';
const LO = +process.argv[2] || 0, HI = +process.argv[3] || 100000;
const out = execFileSync('./stateseq.exe', [String(LO), String(HI)], { encoding: 'utf8', maxBuffer: 1e9 });
const t = new RunTape();
const snaps = {};
while (t.step < HI) {
  if (t.step >= LO) snaps[t.step] = { st: t.st, sy: t.read(t.head), h: t.head, win: [t.read(t.head - 2), t.read(t.head - 1), t.read(t.head), t.read(t.head + 1), t.read(t.head + 2)] };
  const r = t.step1();
  if (r.halt) { console.log('HALT at', t.step); break; }
}
let ok = 0, bad = 0;
for (const l of out.split(/\r?\n/)) {
  const m = l.match(/^(\d+) ([A-F])(\d) (-?\d+) (\d)(\d)(\d)(\d)(\d)$/);
  if (!m) continue;
  const s = snaps[+m[1]];
  const mine = { st: m[2].charCodeAt(0) - 65, sy: +m[3], h: +m[4], win: [+m[5], +m[6], +m[7], +m[8], +m[9]] };
  if (s && s.st === mine.st && s.sy === mine.sy && s.h === mine.h && s.win.join('') === mine.win.join('')) ok++;
  else { bad++; if (bad < 6) console.log('MISMATCH t=' + m[1], JSON.stringify(s), JSON.stringify(mine)); }
}
console.log(`xval-runsim [${LO},${HI}): ok=${ok} bad=${bad}`);
