'use strict';
// Backward basin with census output + consistency check vs 3-adic over-approximation reachable set.
const IH = parseInt(process.argv[2] || '200', 10);
const aOf = i => (10n << BigInt(i)) - 1n;
const visited = new Map();
const queue = [];
for (let ih = 0; ih <= IH; ih++) {
  const v = aOf(BigInt(ih)) - 1n;
  const key = ih + ',' + v.toString();
  if (!visited.has(key)) { visited.set(key, 0); queue.push([ih, v, 0]); }
}
let qi = 0, maxd = 0;
while (qi < queue.length) {
  const [i, b, d] = queue[qi++];
  if (d > maxd) maxd = d;
  if (i >= 1) { const nb = b + aOf(BigInt(i - 1)); const k = (i - 1) + ',' + nb.toString(); if (!visited.has(k)) { visited.set(k, d + 1); queue.push([i - 1, nb, d + 1]); } }
  const num = b - BigInt(i) - 5n;
  if (num >= 0n && num % 3n === 0n) { const nb = num / 3n; if (nb <= aOf(BigInt(i)) - 2n) { const k = i + ',' + nb.toString(); if (!visited.has(k)) { visited.set(k, d + 1); queue.push([i, nb, d + 1]); } } }
}
console.log('IH=' + IH + ' total basin=' + visited.size + ' maxdepth=' + maxd + ' (queue exhausted: complete)');
const perI = new Map();
for (const k of visited.keys()) { const ci = +k.split(',')[0]; perI.set(ci, (perI.get(ci) || 0) + 1); }
const ks = [...perI.keys()].sort((a, b) => a - b);
console.log('per-i basin sizes (i:count): ' + ks.slice(0, 40).map(i2 => i2 + ':' + perI.get(i2)).join(' '));
console.log('total i-values covered: ' + ks.length);
const i0 = [...visited.keys()].filter(k => k.split(',')[0] === '0').map(k => BigInt(k.split(',')[1])).sort((x, y) => (x < y ? -1 : x > y ? 1 : 0));
console.log('i=0 halting starts: n=' + i0.length + '; b < 1000: ' + i0.filter(b => b < 1000n).map(String).join(','));
console.log('(0,5) halts: ' + i0.includes(5n));
// NOTE: basin states are arbitrary halting states, NOT necessarily reachable from (0,5),
// so no subset relation w.r.t. the (0,5)-over-approximation is expected. The sound check
// (true orbit from (0,5) stays inside the over-approx reachable set) is done in analyze.js.
// 2-adic density of the i=0 basin: which residue classes do halting starts occupy?
for (const j of [3, 5, 8]) {
  const m = 2 ** j, pres = new Set();
  for (const k of visited.keys()) { const parts = k.split(','); if (+parts[0] === 0) pres.add(Number(BigInt(parts[1]) % BigInt(m))); }
  console.log('i=0 basin covers ' + pres.size + '/' + m + ' classes mod 2^' + j);
}
