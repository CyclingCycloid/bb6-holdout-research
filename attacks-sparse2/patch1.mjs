// patch1.mjs — rewrite sym3.mjs to cons-list events/gstates (kill O(E^2) memory).
import { readFileSync, writeFileSync } from 'fs';
let s = readFileSync('sym3.mjs', 'utf8');
const reps = [
  ["[...events, 'R->S3']", "{h:'R->S3',t:events}"],
  ["[...events, 'Sw(y1)->R']", "{h:'Sw(y1)->R',t:events}"],
  ["[...events, 'Sw(y1)->L']", "{h:'Sw(y1)->L',t:events}"],
  ["[...events, 'Sw(y2)->G']", "{h:'Sw(y2)->G',t:events}"],
  ["[...events, 'S(y2)->G']", "{h:'S(y2)->G',t:events}"],
  ["[...events, 'S3(y1)->R']", "{h:'S3(y1)->R',t:events}"],
  ["[...events, 'S(y1)->L']", "{h:'S(y1)->L',t:events}"],
  ["[...events, 'G->S']", "{h:'G->S',t:events}"],
  ["[...events, 'G(a2)->L']", "{h:'G(a2)->L',t:events}"],
  ["[...events, 'L-sw']", "{h:'L-sw',t:events}"],
];
for (const [a, b] of reps) s = s.split(a).join(b);
s = s.split('[...events]').join('events'); // remaining bare spreads (none expected)
s = s.replace('const gs = [...gstates, st.r.map(show).join(",")];', 'const gs = {h: st.r.map(show).join(","), t: gstates};');
s = s.split('[...gstates]').join('gstates');
const wfOld = 'writeFileSync(`sym2-m${m}.json`, JSON.stringify(paths.map(p => ({ subs: p.subs, lo: p.lo, outcome: p.outcome, gstates: p.gstates, events: p.events })), null, 1));';
const wfNew = 'const toArr = (c) => { const a = []; while (c) { a.push(c.h); c = c.t; } return a.reverse(); };\nwriteFileSync(`sym2-m${m}.json`, JSON.stringify(paths.map(p => ({ subs: p.subs, lo: p.lo, outcome: p.outcome, gstates: toArr(p.gstates), events: toArr(p.events) })), null, 1));';
if (!s.includes(wfOld)) { console.log('WF PATTERN MISS'); process.exit(1); }
s = s.replace(wfOld, wfNew);
s = s.split('g=${p.gstates.length}').join('g=${toArr(p.gstates).length}');
s = s.split('ev=${p.events.length}').join('ev=${toArr(p.events).length}');
// initial work.push with [] events/gstates is fine (null-terminated cons base: use null)
s = s.replace('walk({ t: \'G\', r: runs }, [], 0, [], [], 0);', 'walk({ t: \'G\', r: runs }, [], 0, null, null, 0);');
writeFileSync('sym3.mjs', s);
console.log('sym3 cons-patched ok');
