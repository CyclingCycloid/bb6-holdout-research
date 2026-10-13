// ref-b6-mrecords.mjs — REFEREE: lean m-record walk (births9 reproduction). transitionFastB per anchor,
// record max m = nu2(n+3); verify each record occurs at n = 3·2^m − 3. Usage: node ref-b6-mrecords.mjs NANCH
import { transitionFastB } from './bstep.mjs';
const NANCH = Number(process.argv[2] ?? 1000000);
const B = BigInt;
let n = 3n, maxM = 0;
const recs = [];
for (let k = 0; k < NANCH; k++) {
  let x = n + 3n, m = 0;
  while ((x & 1n) === 0n) { m++; x >>= 1n; }
  if (m > maxM) {
    maxM = m;
    const expect = 3n * (1n << BigInt(m)) - 3n;
    recs.push(`m=${m} k=${k} n=${n} ${n === expect ? 'OK(=3·2^m−3)' : 'MISMATCH expect ' + expect}`);
  }
  const r = transitionFastB(n);
  if (r.halt || r.degenerate) { console.log('END', JSON.stringify(r)); break; }
  n = r.n2;
}
console.log(`anchors=${NANCH} finalN=${n} maxM=${maxM} records=${recs.length}`);
for (const r of recs) console.log(r);
