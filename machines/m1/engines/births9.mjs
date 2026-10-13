// births9.mjs — anchor-sequence stats over NANCH anchors: n parity, n mod 12, m=nu2(n+3) records, small-w set.
// (anchor R(n,n) births iff n even — must stay 0; class-first schedule ties to m-records.)
import { transitionFastB } from './bstep.mjs';
const NANCH = Number(process.argv[2] ?? 10000000);
const B = BigInt;
let n = 3n;
let evenAnchors = 0, maxM = 0, recN = 3n;
const nmod12 = {}; const smallW = {};
const recs = [];
for (let k = 0; k < NANCH; k++) {
  if ((n & 1n) === 0n) evenAnchors++;
  const nm = Number(n % 12n);
  nmod12[nm] = (nmod12[nm] || 0) + 1;
  let x = n + 3n, m = 0;
  while ((x & 1n) === 0n) { m++; x >>= 1n; }
  if (m > maxM) { maxM = m; recN = n; recs.push(`m=${m} @anchor=${k} n=${n} w=${x}`); }
  if (x < 100n) smallW[x.toString()] = (smallW[x.toString()] || 0) + 1;
  const r = transitionFastB(n);
  if (r.halt || r.degenerate) { console.log('END', JSON.stringify(r)); break; }
  n = r.n2;
}
console.log(`anchors=${NANCH} finalN=${n} evenAnchors=${evenAnchors} maxM(nu2(n+3))=${maxM} @n=${recN}`);
console.log('n mod 12:', JSON.stringify(nmod12));
console.log('m-records:', recs.join(' ; '));
console.log('small w (<100) counts:', JSON.stringify(smallW));
