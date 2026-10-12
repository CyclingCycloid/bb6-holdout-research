'use strict';
// Both-branch residue over-approximation for BMO5 states <i,b>.
// Step map: T(i,b)=(i, 3b+i+5) valid when b <= a(i)-2 ; S(i,b)=(i+1, b-a(i)) valid when b >= a(i).
// Over-approx: close {(0,5)} under BOTH branches on (i-class, b mod m); halt residue = b === a(i)-1 mod m.
// For odd part m_odd of m: 2 is invertible; a(i) mod m_odd periodic in i with period ord_m(2) -> state space Z/P x Z/m.
// For 2^j part: a(i) = 10*2^i - 1. For true i >= j: a(i) = -1 mod 2^j. For i < j: exact.
//   Class c = i mod 2^j: if c >= j, any true i in class has i >= c >= j -> a = -1 (deterministic).
//   If c < j: true i = c possible only once (early); true i >= 2^j -> a = -1. Both must be included (sound).
//   T-branch offset i+5 depends only on i mod 2^j. So run BFS over Z/2^j x Z/2^j with S-successors being
//   the UNION of (b - (10*2^c -1)) and (b+1) whenever c < j.
// For m composite 2^j * odd: run 2^j and odd parts separately (if either kills halt residues -> proof;
//   we verify none does, i.e. halt residues are reachable in every modulus).
function bfsOdd(m) {
  let P = 1, x = 2 % m;
  while (x !== 1 % m) { x = (x * 2) % m; P++; if (P > 4 * m) return null; } // ord_m(2)
  const seen = new Uint8Array(P * m);
  const q = [0 * m + (5 % m)]; seen[0 * m + (5 % m)] = 1;
  const amod = new Array(P); for (let i = 0; i < P; i++) { let p = 1; for (let t = 0; t < i; t++) p = (p * 2) % m; amod[i] = ((10 * p - 1) % m + m) % m; }
  for (let qi = 0; qi < q.length; qi++) {
    const id = q[qi], ii = (id / m) | 0, bb = id % m;
    const t1 = ii * m + ((3 * bb + ii + 5) % m);
    const s1 = ((ii + 1) % P) * m + (((bb - amod[ii]) % m + m) % m);
    for (const nid of [t1, s1]) if (!seen[nid]) { seen[nid] = 1; q.push(nid); }
  }
  // halt residues: (i, b) with b = a(i)-1 = 10*2^i - 2 mod m
  let haltReach = 0, haltTotal = 0;
  for (let i = 0; i < P; i++) { const hb = ((10 * amod[i] - 10 * 1 - 2 + m) % m + m) % m; /* careful: 10*2^i-2 = amod[i]+1-2+... */ }
  // recompute cleanly: a(i)-1 = 10*2^i - 2 = (amod[i] + 1) - 2 = amod[i] - 1 mod m
  for (let i = 0; i < P; i++) { const hb = ((amod[i] - 1) % m + m) % m; haltTotal++; if (seen[i * m + hb]) haltReach++; }
  return { P, size: q.length, space: P * m, haltReach, haltTotal };
}
function bfsTwoPow(j) {
  const m = 1 << j;
  const seen = new Uint8Array(m * m);
  const q = [0 * m + (5 % m)]; seen[0 * m + (5 % m)] = 1;
  const pow2 = new Array(Math.min(j, m)); pow2[0] = 1; for (let i = 1; i < pow2.length; i++) pow2[i] = (pow2[i - 1] * 2) % m;
  for (let qi = 0; qi < q.length; qi++) {
    const id = q[qi], ii = (id / m) | 0, bb = id % m;
    // T-branch (validity: b <= a(i)-2; over-approx: always take)
    const t1 = ii * m + ((3 * bb + ii + 5) % m);
    if (!seen[t1]) { seen[t1] = 1; q.push(t1); }
    // S-branch: b - a(i), a(i) in {10*2^c - 1 (true i = c, only c<j), -1 (true i >= max(j, ...))}
    const succs = [];
    if (ii < j) succs.push(((bb - (10 * pow2[ii] - 1)) % m + m) % m);
    succs.push((bb + 1) % m);
    for (const nb of succs) { const nid = ((ii + 1) % m) * m + nb; if (!seen[nid]) { seen[nid] = 1; q.push(nid); } }
  }
  let haltReach = 0, haltTotal = 0;
  for (let i = 0; i < m; i++) {
    // halt value a(i)-1 mod m: true i in class i: either i (<m) or >= m: both give 10*2^i-2
    const hbs = new Set();
    if (i < j) hbs.add(((10 * pow2[i] - 2) % m + m) % m);
    hbs.add(((-2) % m + m) % m);
    for (const hb of hbs) { haltTotal++; if (seen[i * m + hb]) haltReach++; }
  }
  return { size: q.length, space: m * m, haltReach, haltTotal };
}
console.log('== odd prime powers and composites ==');
for (const m of [3, 5, 7, 9, 11, 13, 17, 19, 23, 25, 27, 29, 31, 37, 41, 43, 47, 49, 53, 59, 61, 65, 67, 71, 73, 79, 81, 83, 89, 97, 101, 103, 107, 109, 113, 121, 125, 127, 131, 169, 243, 625, 729, 2049, 3125, 59049 - 729 * 0]) {
  if (m > 20000) { console.log('m=' + m + ': skipped (space too big)'); continue; }
  const r = bfsOdd(m); if (!r) { console.log('m=' + m + ': ord(2) too big'); continue; }
  console.log('m=' + m + ' P=' + r.P + ' reachable=' + r.size + '/' + r.space + ' haltResReachable=' + r.haltReach + '/' + r.haltTotal);
}
console.log('== powers of two ==');
for (let j = 2; j <= 14; j++) {
  const r = bfsTwoPow(j);
  console.log('m=2^' + j + ' reachable=' + r.size + '/' + r.space + ' haltResReachable=' + r.haltReach + '/' + r.haltTotal);
}
