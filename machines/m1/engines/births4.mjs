// births4.mjs — analyze births-roots.json: residue classes, nu2, odd parts, chains, recurrences.
import { readFileSync } from 'fs';
const { roots } = JSON.parse(readFileSync('births-roots.json', 'utf8'));
const B = BigInt;
const mod = (v, m) => Number(((B(v) % B(m)) + B(m)) % B(m));
const nu2 = (v) => { let n = 0; let x = B(v); while ((x & 1n) === 0n) { n++; x >>= 1n; } return { j: n, q: x }; };

for (const ty of ['Lk', 'L3', 'E1r']) {
  const list = roots.filter(r => r.ty === ty);
  const m48 = {}, nu = {}, qm = {}, am = {};
  let pow2 = 0, qmin = null, amin = null;
  for (const r of list) {
    const A = B(r.A); const { j, q } = nu2(A);
    m48[mod(A, 48)] = (m48[mod(A, 48)] || 0) + 1;
    nu[j] = (nu[j] || 0) + 1;
    qm[q.toString()] = (qm[q.toString()] || 0) + 1;
    am[mod(A, 144)] = (am[mod(A, 144)] || 0) + 1;
    if (q === 1n) pow2++;
    if (qmin === null || q < B(qmin)) qmin = q.toString();
    if (amin === null || A < B(amin)) amin = r.A;
  }
  const sm = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [Number(k), v]).sort((a, b) => a[0] - b[0]));
  console.log(`== ${ty}: n=${list.length} pow2=${pow2} Amin=${amin} qmin=${qmin}`);
  console.log(`   A%48=${JSON.stringify(sm(m48))}`);
  console.log(`   A%144=${JSON.stringify(sm(am))}`);
  console.log(`   nu2=${JSON.stringify(sm(nu))}`);
  const qtop = Object.entries(qm).sort((a, b) => b[1] - a[1]).slice(0, 12);
  console.log(`   q top: ${qtop.map(([q, c]) => q + 'x' + c).join(' ')}`);
}

// Lk: the +144 chain — consecutive Lk births
const lk = roots.filter(r => r.ty === 'Lk');
console.log('\nLk consecutive deltas (first 60):');
for (let i = 1; i <= 60 && i < lk.length; i++) process.stdout.write((Number(B(lk[i].A) - B(lk[i - 1].A))) + ' ');
console.log('');
const delt = {};
for (let i = 1; i < lk.length; i++) { const d = (B(lk[i].A) - B(lk[i - 1].A)).toString(); delt[d] = (delt[d] || 0) + 1; }
console.log('Lk delta hist:', JSON.stringify(Object.fromEntries(Object.entries(delt).sort((a, b) => Number(b[0]) - Number(a[0])))));
// Lk nu2=3 cases: list first 40 with sigma, r2
const lk3 = lk.filter(r => { let x = B(r.A), j = 0; while ((x & 1n) === 0n) { j++; x >>= 1n; } return j === 3; });
console.log(`\nLk nu2=3 cases: ${lk3.length}; first 30 (sigma,r2,q):`);
console.log(lk3.slice(0, 30).map(r => { let x = B(r.A), j = 0; while ((x & 1n) === 0n) { j++; x >>= 1n; } return `(${r.sig},${r.r2},${x})`; }).join(' '));
// Lk nu2=1 cases
const lk1 = lk.filter(r => { let x = B(r.A), j = 0; while ((x & 1n) === 0n) { j++; x >>= 1n; } return j === 1; });
console.log(`\nLk nu2=1 cases: ${lk1.length}; first 20 (sigma,r2,q):`);
console.log(lk1.slice(0, 20).map(r => { let x = B(r.A), j = 0; while ((x & 1n) === 0n) { j++; x >>= 1n; } return `(${r.sig},${r.r2},${x})`; }).join(' '));
// Lk nu2=0 odd-part classes
const lk0 = lk.filter(r => (B(r.A) & 1n) === 1n);
console.log(`\nLk odd A: ${lk0.length}; A%144 hist of odd ones:`);
const h0 = {}; for (const r of lk0) h0[mod(r.A, 144)] = (h0[mod(r.A, 144)] || 0) + 1;
console.log(JSON.stringify(Object.fromEntries(Object.entries(h0).map(([k, v]) => [Number(k), v]).sort((a, b) => a[0] - b[0]))));
// L3 analysis: sig,r2 structure
const l3 = roots.filter(r => r.ty === 'L3');
console.log(`\nL3: first 30 (sig, r2, A):`);
console.log(l3.slice(0, 30).map(r => `(${r.sig},${r.r2},${r.A})`).join(' '));
const l3d = {};
for (let i = 1; i < l3.length; i++) { const d = (B(l3[i].A) - B(l3[i - 1].A)).toString(); l3d[d] = (l3d[d] || 0) + 1; }
console.log('L3 delta hist (top):', JSON.stringify(Object.fromEntries(Object.entries(l3d).sort((a, b) => b[1] - a[1]).slice(0, 15))));
// E1r: b structure
const e1 = roots.filter(r => r.ty === 'E1r');
const bh = {}; for (const r of e1) bh[mod(r.b, 12)] = (bh[mod(r.b, 12)] || 0) + 1;
console.log('\nE1r b%12:', JSON.stringify(Object.fromEntries(Object.entries(bh).map(([k, v]) => [Number(k), v]).sort((a, b) => a[0] - b[0]))));
// nu2 of E1r
const nh = {}; for (const r of e1) { let x = B(r.A), j = 0; while ((x & 1n) === 0n) { j++; x >>= 1n; } nh[j] = (nh[j] || 0) + 1; }
console.log('E1r nu2 hist:', JSON.stringify(Object.fromEntries(Object.entries(nh).map(([k, v]) => [Number(k), v]).sort((a, b) => a[0] - b[0]))));
