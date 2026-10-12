'use strict';
// c-coordinate phase-level verification (BigInt, exact):
//  d_j = phase-j entry c-value; start d_0 = 15 at i=0.
//  Claim 1: if all phases so far had ns=1, then d_j === 1 (mod 3) for j odd, 2 for j even (j>=1).
//  Claim 2: (B)-halt entry condition d_j = H(j) can only hold for j === 2 or 5 (mod 6) under that invariant.
//  Claim 3: (A)-halt (mid-phase 3^t d_j = H(j)) requires v3(H(j)) >= t, possible only j === 0,1 (mod 6).
let i = 0, b = 5n, c = 15n;
const aOf = x => (10n << BigInt(x)) - 1n;
const H = x => (20n << BigInt(x)) + BigInt(x) + 1n;
let nsViol = 0, mod3Viol = 0, phases = 0, maxk = 0;
const N = 300000;
while (phases < N) {
  const A = aOf(i), Hi = H(i);
  if (c !== 2n * b + BigInt(i) + 5n) { console.log('conj FAIL'); break; }
  if (phases > 0) { const expect = (i % 2 === 1) ? 1n : 2n; if (c % 3n !== expect) mod3Viol++; }
  // run the phase in b-coords
  let k = 0;
  while (b <= A - 2n) { b = 3n * b + BigInt(i) + 5n; c = 3n * c; k++; if (b === A - 1n) { console.log('HALT mid-phase'); process.exit(0); } }
  if (k > maxk) maxk = k;
  // crossing; subtract once
  b -= A; c = c - (20n << BigInt(i)) + 3n; i++;
  const A2 = aOf(i);
  if (b >= A2) { nsViol++; while (b >= aOf(i)) { b -= aOf(i); i++; } c = 2n * b + BigInt(i) + 5n; }
  phases++;
}
console.log('phases=' + phases + ' maxk=' + maxk + ' mod3-law violations=' + mod3Viol + ' ns=2 events=' + nsViol);
// Claim 2/3 arithmetic check
function v3(x){let v=0n;while(x%3n===0n){x/=3n;v++;}return v;}
let bOK=true, aOK=true;
for (let j=0n;j<400n;j++){
  const hj=H(j);
  if (j%6n===2n||j%6n===5n){ if (v3(hj)!==0n) bOK=false; }
  if (j%6n===3n||j%6n===4n){ if (v3(hj)!==0n) bOK=false; }
  if (j%6n===0n||j%6n===1n){ if (v3(hj)<1n) aOK=false; } else { if (v3(hj)!==0n) aOK=false; }
}
console.log('v3(H(j))>=1 iff j=0,1 mod 6: ' + (aOK?'VERIFIED':'FAIL') + ' ; v3(H(j))=0 for j=2,3,4,5 mod 6: ' + (bOK?'VERIFIED':'FAIL'));
