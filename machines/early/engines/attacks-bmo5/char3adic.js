'use strict';
// Characterize the both-branch reachable set R_m for m = 3^j: for each i-class, which b are reachable?
function bfsOddSets(m) {
  let P = 1, x = 2 % m;
  while (x !== 1 % m) { x = (x * 2) % m; P++; if (P > 4 * m) return null; }
  const seen = new Uint8Array(P * m);
  const q = [5 % m]; seen[5 % m] = 1;
  const amod = new Array(P); for (let i = 0; i < P; i++) { let p = 1; for (let t = 0; t < i; t++) p = (p * 2) % m; amod[i] = ((10 * p - 1) % m + m) % m; }
  for (let qi = 0; qi < q.length; qi++) {
    const id = q[qi], ii = (id / m) | 0, bb = id % m;
    const t1 = ii * m + ((3 * bb + ii + 5) % m);
    const s1 = ((ii + 1) % P) * m + (((bb - amod[ii]) % m + m) % m);
    for (const nid of [t1, s1]) if (!seen[nid]) { seen[nid] = 1; q.push(nid); }
  }
  return { P, seen, amod };
}
for (const j of [2, 3, 4, 5]) {
  const m = 3 ** j;
  const { P, seen, amod } = bfsOddSets(m);
  console.log('=== m = 3^' + j + ' = ' + m + ', P=' + P + ' ===');
  for (let i = 0; i < Math.min(P, 18); i++) {
    const reach = [];
    for (let b = 0; b < m; b++) if (seen[i * m + b]) reach.push(b);
    const halt = ((amod[i] - 1) % m + m) % m;
    // describe reachable set as union of residue classes mod 9 or pattern
    console.log('i-class ' + i + ' (i mod ' + P + '): |b|=' + reach.length + '/' + m + ' haltRes=' + halt + ' haltReachable=' + seen[i * m + halt] + ' b-values mod 9: ' + JSON.stringify([...new Set(reach.map(b => b % 9))].sort((a, b) => a - b)));
  }
  // is R = {(i,b): b mod 9 in F(i mod something)}? derive F
  const F = new Map();
  let consistent = true;
  for (let i = 0; i < P; i++) {
    const s9 = [...new Set([...Array(m).keys()].filter(b => seen[i * m + b]).map(b => b % 9))].sort((a, b) => a - b).join(',');
    const key = i % 6;
    if (F.has(key) && F.get(key) !== s9) consistent = false;
    F.set(key, s9);
  }
  console.log('R described by (i mod 6, b mod 9)? ' + (consistent ? 'YES' : 'NO'));
  for (const [k, v] of F) console.log('  i%6=' + k + ' -> b mod 9 in {' + v + '}');
}
