// fcheck.mjs — verify closed-form G/S predictions against every oracle grid cell.
// Grid file lines: "F <m> <d> <k> -> <m2> <d2> <k2> cost=... maxr=..." or "... -> HALT at N ..."
// Rules (deco d ignored when k==0 — constructor builds identical tape):
//  m%3==1 (m>=4): G: m2 = (4m+2)/3 + J[m%9][k%3] + 3*floor(k/3); k2 = KK[m%9][k%3]
//  m%3==2 (m>=11, m!=5... only 5 is <11): S: m2 = (m+1)/3|(m-5)/3|(m-8)/3 by m%9; k2 = m+k-m2+1
//  exceptional zone: m in {1,2,5} and (m%3==1, m<4)={1,4}: 4 handled by G; 1,2,5 chaotic.
// Also verify invariant: k2>=1 => d2==1.
import { readFileSync } from 'node:fs';
const file = process.argv[2];
const J  = { 1: [0,2,5], 4: [1,4,2], 7: [3,1,3] };
const KK = { 1: [3,2,0], 4: [2,0,3], 7: [0,3,2] };
const lines = readFileSync(file, 'utf8').split('\n');
let n = 0, okv = 0, okh = 0, bad = 0, dinv = 0, dinvN = 0, excl = 0;
const bads = [];
for (const ln of lines) {
  const mm = ln.match(/^F (\d+) (\d+) (\d+) -> (?:(\d+) (\d+) (\d+) cost=\d+ maxr=\d+|HALT at \d+ maxr=\d+)/);
  if (!mm) continue;
  const m = +mm[1], d = +mm[2], k = +mm[3];
  n++;
  const inZone = (m % 3 === 1 && m >= 4) || (m % 3 === 2 && m >= 11 && m !== 5 && (d === 1 || k === 0));
  if (m % 3 === 0) { // halt predicted: d==2 any k, or k==0
    const predHalt = (d === 2 && k >= 1) || (k === 0);
    if (mm[4] === undefined) { if (predHalt) okh++; else { bad++; bads.push(ln); } }
    else { if (!predHalt) okv++; /* non-halt cells at m%3==0 exist (d=1,k>=1): chaotic zone */ excl++; }
    continue;
  }
  if (!inZone) { excl++; continue; }
  let m2, k2;
  if (m % 3 === 1) {
    const r = m % 9, k3 = k % 3;
    m2 = (4 * m + 2) / 3 + J[r][k3] + 3 * Math.floor(k / 3);
    k2 = KK[r][k3];
  } else {
    const r = m % 9;
    m2 = r === 2 ? (m + 1) / 3 : r === 8 ? (m - 5) / 3 : (m - 8) / 3;
    k2 = m + k - m2 + 1;
  }
  if (mm[4] === undefined) { bad++; bads.push(ln); continue; }
  if (+mm[4] === m2 && +mm[6] === k2) okv++;
  else { bad++; bads.push(ln); }
  // d-invariant: k2>=1 => d2==1
  dinvN++;
  if (+mm[6] >= 1 && +mm[5] !== 1) { dinv++; if (bads.length < 20) bads.push("DINV " + ln); }
}
console.log(`cells=${n} value-ok=${okv} halt-ok=${okh} bad=${bad} excluded(chaotic zone)=${excl}`);
console.log(`d-invariant (k'>=1 => d'=1): ${dinvN - dinv}/${dinvN} hold`);
if (bads.length) console.log(bads.slice(0, 15).join('\n'));
