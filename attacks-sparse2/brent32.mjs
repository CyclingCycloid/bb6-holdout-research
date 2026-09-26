// brent32.mjs — DECISIVE periodicity experiment: Brent cycle detection on the alpha-walk
// modulo 2^32 (the exact reduction of the true walk while its nu2-record stays < 32;
// the table DA[h] is machine-proven for all h that can occur below the record-32 event).
// Outcomes: (a) cycle found with (mu, lambda) BEFORE the bad residue => the 32-bit signature
//   dynamics is eventually periodic => Form-1 closure becomes possible (verify one period);
// (b) bad residue (a = 2^32-1, i.e. nu2 >= 32) reached first => record schedule hits level 32
//   => the K-regime exits => Form-2 structural diagnosis confirmed at the next level;
// (c) step cap. Fast Number arithmetic (mod 2^32 via >>>0, ctz via Math.clz32).
// Usage: node brent32.mjs [CAP=6e9]
import { readFileSync, writeFileSync } from 'fs';
const CAP = +(process.argv[2] ?? 6e9);
const DA32 = new Int32Array(64);
for (const l of readFileSync('sym4-table.txt', 'utf8').split('\n')) {
  const m = l.match(/h=(\d+).*da=(\d+) dt=(\d+)/);
  if (m) DA32[+m[1]] = Number(BigInt(m[2]) & 0xffffffffn) | 0;
}
const ctz = (x) => { const X = x >>> 0; if (X === 0) return 32; return 31 - Math.clz32((X & -X) >>> 0); };
// f: residue -> next residue; returns h = nu2 level used (for logging); BAD if X = 2^32-1.
function step(a) { // a is unsigned int32
  const X = (a + 1) >>> 0;
  if (X === 0) return -1; // a = 2^32-1: nu2 >= 32 (BAD, record-32 event)
  const h = ctz(X);
  if (DA32[h] === 0 && h !== 0) { if (!DA32[h]) return -2; } // table gap (should not happen: h<32 covered)
  return (a + DA32[h]) >>> 0;
}
let a = 7;
// record schedule logging within this walk
let recMax = ctz((7 + 1) >>> 0), recStep = 0;
const recLog = [];
let tortoise = a, hare = step(a), power = 1, lam = 0, n = 1, bad = 0;
const t0 = Date.now();
while (true) {
  if (hare === -1 || hare === -2) { bad = n; break; }
  if (hare === tortoise) break;
  if (power === lam) { tortoise = hare; power *= 2; lam = 0; }
  const h2 = step(hare); n++;
  if (h2 === -1 || h2 === -2) { bad = n; hare = h2; break; }
  hare = h2; lam++;
  if (n > CAP) break;
  if (n % 268435456 === 0) console.log(`  ...${n} steps, ${(Date.now() - t0) / 1000}s`);
}
if (bad) {
  console.log(`BAD residue (record-32 event) at step ${n} — Form-2: the 32-bit regime exits before any cycle (Brent progressed ${n} steps).`);
  writeFileSync('brent32-result.json', JSON.stringify({ outcome: 'bad', atStep: n }));
} else if (n > CAP) {
  console.log(`Step cap ${CAP} reached without cycle or bad residue (mu+lambda > ${CAP}).`);
  writeFileSync('brent32-result.json', JSON.stringify({ outcome: 'cap', steps: n }));
} else {
  // Brent found a repetition: lam = current cycle-length estimate; find exact mu, then REPLAY-verify
  let mu = 0, t2 = a, h2 = t2;
  for (let i = 0; i < lam; i++) { h2 = step(t2); t2 = h2; }
  let h3 = a, h4 = t2;
  while (h3 !== h4) { h3 = step(h3); h4 = step(h4); mu++; }
  console.log(`CYCLE FOUND mod 2^32: mu = ${mu}, lambda = ${lam} (Brent), at ${n} steps, ${(Date.now() - t0) / 1000}s`);
  // replay verification (task 3 rigor): walk mu+lambda from 0 and check return to start
  let x = 7; for (let i = 0; i < mu + lam; i++) x = step(x);
  console.log(`replay: after mu+lambda = ${mu + lam} steps residue returns to start: ${x === 7}`);
  writeFileSync('brent32-result.json', JSON.stringify({ outcome: 'cycle', mu, lambda: lam }));
}
