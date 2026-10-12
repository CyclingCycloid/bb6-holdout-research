// xvalbig.mjs — large-n spot check: engine event stream vs raw-oracle event stream prefix.
// For each n: run transition(n, true) (slow engine, per-event configs+times) and
// o1.exe start n n 2000000000 (raw TM, prints D-on-0 events with cumulative step).
// Require: same number of events within the oracle cap, same cumulative times, same runs.
import { transition } from './phase1.mjs';
import { execFileSync } from 'child_process';
import { resolve } from 'path';
const O1 = resolve('./o1.exe');
const picks = [];
for (let n = 100005; n <= 100179; n += 6) picks.push(n);          // 30 on-class
for (let n = 100007; n <= 100051; n += 6) picks.push(n);          // 8 off-class odd
for (const [m, w] of [[13,21],[14,9],[15,9],[16,3],[17,3],[18,9],[19,9],[20,3],[20,9],[21,3]]) { const n = 2**m*w-3; if(n>=100000) picks.push(n); }
for (const k of [260, 261, 515, 1000, 2000, 5000]) { const n = 381+384*k; if (n >= 100000) picks.push(n); }
let ok = 0, bad = 0, totEvents = 0;
for (const n of picks) {
  const res = transition(n, true);
  const evs = res.events.slice(1); // drop initial config
  let out = '';
  try { out = execFileSync(O1, ['start', String(n), String(n), '2000000000'], { encoding: 'utf8', timeout: 900000, maxBuffer: 1 << 28 }).trim(); } catch (e) { out = 'ERR:' + String(e.message).slice(0, 50); }
  const lines = out.split(/\r?\n/).filter(l => l.trim().startsWith('ev'));
  if (!lines.length) { bad++; console.log(`n=${n}: no oracle events (${out.slice(0, 40)})`); continue; }
  let agree = true, why = '';
  if (lines.length > evs.length) { agree = false; why = `oracle events ${lines.length} > engine ${evs.length}`; }
  else {
    for (let i = 0; i < lines.length; i++) {
      const mm = lines[i].match(/^ev \+(\d+) n=(\d+) ((?:\d+ )*\d+) g: (\d+)/);
      if (!mm) { agree = false; why = `line parse: ${lines[i].slice(0, 50)}`; break; }
      const t = +mm[1], k = +mm[2], runs = mm[3].trim().split(/\s+/).map(Number);
      const e = evs[i];
      if (e.t !== t) { agree = false; why = `ev${i} time ${e.t}!=${t}`; break; }
      if (e.c.r.length !== k || e.c.r.some((v, j) => v !== runs[j])) { agree = false; why = `ev${i} runs [${e.c.r}] vs [${runs}]`; break; }
    }
  }
  if (agree) { ok++; totEvents += lines.length; } else { bad++; console.log(`n=${n}: ${why}`); }
}
console.log(`xvalbig: ok=${ok} bad=${bad} (n in [${Math.min(...picks)},${Math.max(...picks)}], total oracle-verified events=${totEvents})`);
