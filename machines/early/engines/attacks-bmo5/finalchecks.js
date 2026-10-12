'use strict';
// (1) B*_k integer <=> v3(H(i)) >= k, where B*_k = (a(i)-1-(i+5)(3^k-1)/2)/3^k, H(i)=20*2^i+i+1
const aOf = i => (10n << BigInt(i)) - 1n;
const H = i => (20n << BigInt(i)) + BigInt(i) + 1n;
function v3(x){let v=0n;while(x%3n===0n){x/=3n;v++;}return v;}
let ok = true;
for (let i = 0; i < 300; i++) for (let k = 1; k <= 8; k++) {
  const num = aOf(BigInt(i)) - 1n - (BigInt(i)+5n)*((3n**BigInt(k))-1n)/2n;
  const intDiv = (num % (3n**BigInt(k))) === 0n;
  const gOK = v3(H(BigInt(i))) >= BigInt(k);
  if (intDiv !== gOK) { ok = false; console.log('FAIL i='+i+' k='+k); }
}
console.log('B*_k integer <=> v3(H(i))>=k : ' + (ok ? 'VERIFIED (i<300, k<=8)':'FAIL'));
// (2) dump check: g(i)=0 exactly for i=2,3,4,5 mod 6 (1e6 phases)
const fs = require('fs');
const buf = fs.readFileSync('dump1e6.bin');
const n = buf.readUInt32LE(4);
let off = 16 + 4*n + 2*n + n + 2*n + 2*n; // G3 position
let bad = 0;
for (let q = 0; q < n; q++) {
  const g = buf.readInt8(off + q);
  const i = 16 + 0; // recompute I below
}
// read I
let off2 = 16;
const Iarr = new Int32Array(n);
for (let q = 0; q < n; q++) Iarr[q] = buf.readInt32LE(off2 + 4*q);
for (let q = 0; q < n; q++) {
  const g = buf.readInt8(off + q), im = Iarr[q] % 6;
  if ((im === 2 || im === 3 || im === 4 || im === 5) && g !== 0) bad++;
  if ((im === 0 || im === 1) && g < 1) bad++;
}
console.log('g(i)=0 iff i=2,3,4,5 mod 6 (over 1e6 true-orbit phases): violations=' + bad);
// (3) minGap exact recomputation for first 5000 phases (independent of GAPMIN array): find 5 smallest gaps
