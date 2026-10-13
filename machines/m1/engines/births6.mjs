// births6.mjs — aggregate births5-1e6.log signature table by (ty, j): q%144 sets, min q, A%144 sets; safety check.
import { readFileSync } from 'fs';
const lines = readFileSync('births5-1e6.log', 'utf8').split('\n').filter(l => /^\s+\d+\s+(E1r|L3|Lk)\|/.test(l));
const grp = {}; // ty|j -> {count, q144: {}, A144: {}, minq, minA, As:[...], exs}
for (const l of lines) {
  const m = l.match(/^\s+(\d+)\s+(E1r|L3|Lk)\|j(\d+)\|A%(\d+)=(\d+)\|q%144=(\d+)\s+ex:\s+(\S+)\s+A=(\d+)/);
  if (!m) continue;
  const [, cnt, ty, j, M, Am, qm, ex, A] = m;
  const key = ty + '|j' + j;
  const g = grp[key] = grp[key] || { count: 0, q144: {}, A144: {}, minq: null, minA: null, nsig: 0, exs: [] };
  g.count += +cnt; g.nsig++;
  g.q144[qm] = (g.q144[qm] || 0) + +cnt;
  g.A144[+Am % 144] = (g.A144[+Am % 144] || 0) + +cnt;
  if (g.minq === null || +qm < g.minq) g.minq = +qm;
  if (g.exs.length < 3) g.exs.push(`${ex} A=${A}`);
}
const pow144 = new Set([1, 2, 4, 8, 16, 32, 64, 128, 112, 80]); // 2^t mod 144
console.log('group | roots | #sigs | A%144 set | q%144 set | 2^t in A%144? | 1 in q%144?');
for (const key of Object.keys(grp).sort((a, b) => {
  const [ta, ja] = a.split('|'), [tb, jb] = b.split('|');
  return ta === tb ? +ja.slice(1) - +jb.slice(1) : ta.localeCompare(tb);
})) {
  const g = grp[key];
  const aset = Object.keys(g.A144).map(Number).sort((a, b) => a - b);
  const qset = Object.keys(g.q144).map(Number).sort((a, b) => a - b);
  const apow = aset.filter(x => pow144.has(x));
  const q1 = qset.includes(1);
  console.log(`${key}: roots=${g.count} sigs=${g.nsig} A%144∈{${aset.join(',')}} q%144∈{${qset.join(',')}} pow-in-A:${apow.length ? apow.join(',') : 'NONE'} q1:${q1}`);
  if (key.startsWith('L')) console.log(`   ex: ${g.exs.join(' | ')}`);
}
// Overall totals per ty
const tot = {};
for (const l of lines) { const m = l.match(/^\s+(\d+)\s+(E1r|L3|Lk)/); if (m) tot[m[2]] = (tot[m[2]] || 0) + +m[1]; }
console.log('totals:', JSON.stringify(tot));
