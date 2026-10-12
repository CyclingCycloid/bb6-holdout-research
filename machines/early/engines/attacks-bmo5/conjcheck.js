'use strict';
// Verify c-coordinate conjugation: c = 2b+i+5.
//  b<=a(i)-2  <=> c <= H(i)-2 : (i, 3b+i+5) => c -> 3c
//  b = a(i)-1 <=> c = H(i) : HALT
//  b >= a(i)   <=> c >= H(i)+2 : (i+1, b-a(i)) => c' = c - 20*2^i + 3, i'=i+1
// H(i) = 20*2^i + i + 1. Cross-check step-by-step vs (i,b) dynamics for 200k states.
let i = 0, b = 5n, c = 15n; // 2*5+0+5
const aOf = x => (10n << BigInt(x)) - 1n;
const H = x => (20n << BigInt(x)) + BigInt(x) + 1n;
let bad = 0;
for (let s = 0; s < 200000; s++) {
  const A = aOf(i), Hi = H(i);
  const ccheck = 2n * b + BigInt(i) + 5n;
  if (ccheck !== c) { bad++; console.log('MISMATCH c at step ' + s); break; }
  if (b === A - 1n) { if (c !== Hi) { bad++; console.log('MISMATCH halt'); } break; }
  if (b <= A - 2n) { b = 3n * b + BigInt(i) + 5n; c = 3n * c; }
  else { b = b - A; c = c - (20n << BigInt(i)) + 3n; i++; }
}
console.log('conjugation check: ' + (bad ? 'FAILED' : 'OK (200000 states)') + ' final i=' + i + ' halt=' + (b === aOf(i) - 1n));
// also: verify halt condition equivalences at a few points
console.log('H(0)=' + H(0) + ' (c0=15 <= H0-2=' + (H(0)-2n) + ' -> triple)');
// g(i) = v3(H(i)) for i=0..20 vs the (A)-feasibility
function v3(x){ let v=0; while (x % 3n === 0n){ x/=3n; v++; } return v; }
let out=[];
for (let x=0n;x<30n;x++) out.push(x+':'+v3(H(x)));
console.log('v3(H(i)) i=0..29: ' + out.join(' '));
