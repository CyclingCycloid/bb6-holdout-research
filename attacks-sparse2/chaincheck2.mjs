// chaincheck2.mjs — verify the real M2 2-run anchor stream against the o2 oracle map.
// usage: node chaincheck2.mjs <m2_ev log> <number-of-anchors-to-verify>
// Spawns ./o2.exe start a b <cap> quiet for each consecutive pair and checks
// (a',b') and cost against the stream. Uses child_process.execSync.
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
const file = process.argv[2];
const nver = parseInt(process.argv[3] ?? "40", 10);
const cap = "2000000000";
const evs = [];
for (const ln of readFileSync(file, 'utf8').split('\n')) {
  const m = ln.match(/^EV (\d+) st=D L1 R1 w=1 n=2 (\d+) (\d+) g: 1\s*$/);
  if (m) evs.push({ step: BigInt(m[1]), a: BigInt(m[2]), b: BigInt(m[3]) });
}
console.log(`parsed ${evs.length} 2-run anchors from ${file}`);
let ok = 0, bad = 0;
for (let i = 0; i + 1 < Math.min(evs.length, nver + 1); i++) {
  const cur = evs[i], nxt = evs[i + 1];
  const out = execSync(`o2.exe start ${cur.a} ${cur.b} ${cap} quiet`).toString().trim();
  const mm = out.match(/^RES (\d+) (\d+) -> (\d+) (\d+) cost=(\d+)$/);
  if (!mm) { bad++; console.log(`BAD ${i}: oracle said "${out}" for (${cur.a},${cur.b})`); continue; }
  const cost = BigInt(mm[5]);
  if (BigInt(mm[3]) === nxt.a && BigInt(mm[4]) === nxt.b && evs[i + 1].step - cur.step === cost) ok++;
  else { bad++; console.log(`BAD ${i}: (${cur.a},${cur.b})@${cur.step} -> oracle (${mm[3]},${mm[4]}) cost ${cost}, stream (${nxt.a},${nxt.b})@${nxt.step} (cost ${nxt.step - cur.step})`); }
}
console.log(`chain: ${ok} consecutive 2-run transitions oracle-verified, bad=${bad}`);
