// struct1.mjs — extract compact (a-coefficient, tail-position) structure from sym2-m<m>.json
import { readFileSync, writeFileSync } from 'fs';
function parseForm(s) {
  const m = s.match(/^\((\d+)\+(\d+)u\)$/); if (m) return [BigInt(m[1]), BigInt(m[2])];
  return [BigInt(s), 0n];
}
const v2 = (x) => { let c = 0n; while (x % 2n === 0n) { c++; x /= 2n; } return c; };
const Ms = process.argv.slice(2).map(Number);
const out = [];
for (const M of Ms) {
  const p = JSON.parse(readFileSync(`sym2-m${M}.json`, 'utf8'));
  const path = p.find(q => q.subs.length === 0 && q.lo <= 1) || p.find(q => q.subs.length === 0);
  out.push(`=== m=${M}  outcome=${path.outcome}`);
  path.gstates.forEach((g, i) => {
    const runs = g.split(',');
    const [a0, a1] = parseForm(runs[0]);
    const A = a1 / 6n;
    let tstr = '-';
    if (runs.length > 2) {
      const [r0, r1] = parseForm(runs[2]);
      const T = r1 / 6n;
      tstr = `T=${T}(2^${v2(T)}) r0=${r0}`;
    }
    out.push(` ${i}: a=${a0}+${A}w [A=2^${v2(A)}·odd] mod4(a0)=${((a0 % 4n) + 4n) % 4n} ${tstr} k=${runs.length}`);
  });
}
writeFileSync('struct1.out', out.join('\n'));
console.log('written struct1.out, lines=' + out.length);
