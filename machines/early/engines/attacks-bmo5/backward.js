'use strict';
// Backward reachability from BMO5 halt states.
// Halt states: (i, a(i)-1). Backward preimages of a state (i,b):
//   T-preimage (i, (b-i-5)/3) iff b >= i+5, b === i+5 (mod 3), and 0 <= (b-i-5)/3 <= a(i)-2
//   S-preimage (i-1, b + a(i-1)) iff i >= 1 (always valid)
// BFS to depth D from all halt states with i_h <= IH. Checks whether (0,5) is in the basin,
// and censuses basin states with small coordinates.
const IH = parseInt(process.argv[2] || '40', 10);
const D = parseInt(process.argv[3] || '24', 10);
const CAP = parseInt(process.argv[4] || '3000000', 10);
const aOf = i => (10n << BigInt(i)) - 1n;

const visited = new Map(); // key -> depth
let nodes = 0;
const queue = [];
for (let ih = 0; ih <= IH; ih++) {
  const key = ih + ',' + (aOf(BigInt(ih)) - 1n).toString();
  if (!visited.has(key)) { visited.set(key, 0); queue.push([ih, aOf(BigInt(ih)) - 1n, 0]); nodes++; }
}
let found05 = -1;
const smallStats = [];
let qi = 0;
while (qi < queue.length && nodes < CAP) {
  const [i, b, d] = queue[qi++];
  if (d >= D) continue;
  // S-preimage
  if (i >= 1) {
    const nb = b + aOf(BigInt(i - 1));
    const k = (i - 1) + ',' + nb.toString();
    if (!visited.has(k)) { visited.set(k, d + 1); queue.push([i - 1, nb, d + 1]); nodes++; if (nodes >= CAP) break; }
  }
  // T-preimage
  const num = b - BigInt(i) - 5n;
  if (num >= 0n && num % 3n === 0n) {
    const nb = num / 3n;
    if (nb <= aOf(BigInt(i)) - 2n) {
      const k = i + ',' + nb.toString();
      if (!visited.has(k)) { visited.set(k, d + 1); queue.push([i, nb, d + 1]); nodes++; if (nodes >= CAP) break; }
    }
  }
}
// checks
for (const [k, d] of visited) {
  const [i, b] = k.split(',').map(x => BigInt(x));
  if (i === 0n && b === 5n) found05 = d;
  if (b < 1000000n) smallStats.push([Number(i), b.toString(), d]);
}
console.log('IH=' + IH + ' D=' + D + ' nodes=' + visited.size + ' (cap ' + CAP + ', ' + (nodes >= CAP ? 'HIT CAP — result partial' : 'complete') + ')');
console.log('(0,5) in basin: ' + (found05 >= 0 ? ('YES depth ' + found05) : 'NO'));
let mini = Infinity, minb = null;
for (const [k] of visited) { const ci = k.split(',')[0] | 0; if (ci < mini) mini = ci; }
const i0states = [...visited.keys()].filter(k => k.split(',')[0] === '0').map(k => BigInt(k.split(',')[1])).sort((x, y) => (x < y ? -1 : x > y ? 1 : 0));
console.log('min i in basin: ' + mini + ' ; #states at i=0: ' + i0states.length + (i0states.length <= 20 ? ' b-values: ' + i0states.join(',') : ' smallest 10: ' + i0states.slice(0, 10).join(',')));
// b mod 3 / mod 2 of basin states at i=0
const r3 = new Set(i0states.map(b => Number(b % 3n)));
console.log('i=0 basin b mod 3 values: ' + [...r3].sort().join(','));
const r2 = new Set(i0states.map(b => Number(b % 8n)));
console.log('i=0 basin b mod 8 values: ' + [...r2].sort().join(','));
console.log('basin states with b < 10^6: ' + smallStats.length + (smallStats.length <= 30 ? ' : ' + JSON.stringify(smallStats) : ''));
// per-depth counts
const perD = new Map();
for (const [, d] of visited) perD.set(d, (perD.get(d) || 0) + 1);
console.log('per-depth counts: ' + [...perD.entries()].sort((x, y) => x[0] - y[0]).map(([dd, n]) => dd + ':' + n).join(' '));
