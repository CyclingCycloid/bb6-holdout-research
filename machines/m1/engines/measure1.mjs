// measure1.mjs — trajectory structure in destiny-invariant coordinates.
// Coordinates (sweep-invariant combos of phase1 run vectors):
//   R(a,b): forms (a=1 reentry / a=b anchor / other); residues (a mod 12, b mod 12)
//   S(x,y,z,rest): y odd -> N := x+y+z+2 (future R(1,.) b or L r2)
//                  y even -> A := x+y/2+1 (future G head a+1), w := z+y/2 (future G b)
//                  low-y classes: y=1, y=2 vs y>=3
//   G(a,b,...rest): head form a+1 = 2^j * q (q odd>=3), j-class {0,1,e>=2,o>=3}, q mod 12, a mod 12, b mod 12
//   L(r1,r2,r3,...rest): sigma := r1+r3 (invariant under L-sweep), r2 mod 12, r3 mod 12, r1 mod 12
// Also: k distribution per family; destiny D mod 3 at every R-exit; guard checks.
import { readFileSync } from 'fs';
const lib = JSON.parse(readFileSync('library.json', 'utf8')).states;

const mod = (v, m) => Number(((Number(v) % m) + m) % m);
const nu2 = (v) => { let n = 0n, x = BigInt(v); while ((x & 1n) === 0n) { n++; x >>= 1n; } return { j: Number(n), q: x }; };

const fam = { R: 0, S: 0, G: 0, L: 0 };
const kHist = {};
const Rform = { a1: 0, anchor: 0, other: 0 };
const Rres = {};   // (a mod 12, b mod 12) for non-anchor
const RanchorRes = {};
const Sodd = {};   // N mod 12, kclass
const Seven = {};  // (A mod 12, q(A) mod 12, jclass) , kclass
const Ghead = {};  // (jclass, q mod 12, b mod 12, kclass)
const GheadAmod = {};
const Lsig = {};   // (sigma mod 12, r2 mod 12, kclass)
const lowy = { y1: 0, y2: 0 };
const badGuards = [];

function kclass(k) { return k <= 4 ? String(k) : 'BIG'; }

for (const s of lib) {
  const [t, rs] = s.split(':');
  const r = rs.split(',').map(Number);
  const k = r.length;
  fam[t]++; kHist[t + kclass(k)] = (kHist[t + kclass(k)] || 0) + 1;
  if (t === 'R') {
    const [a, b] = r;
    if (a === 1) { Rform.a1++; Rres['a1 b' + mod(b, 12)] = (Rres['a1 b' + mod(b, 12)] || 0) + 1; }
    else if (a === b) { Rform.anchor++; RanchorRes['n' + mod(a, 12)] = (RanchorRes['n' + mod(a, 12)] || 0) + 1; }
    else { Rform.other++; Rres['o ' + mod(a, 12) + '_' + mod(b, 12)] = (Rres['o ' + mod(a, 12) + '_' + mod(b, 12)] || 0) + 1; }
  }
  if (t === 'S') {
    const [x, y, z] = r;
    if (y === 1) lowy.y1++;
    if (y === 2) lowy.y2++;
    if (y % 2 === 1) {
      const N = x + y + z + 2;
      const key = 'N' + mod(N, 12) + ' k' + kclass(k);
      Sodd[key] = (Sodd[key] || 0) + 1;
    } else {
      const A = x + y / 2 + 1, w = z + y / 2;
      const { j, q } = nu2(A);
      const jc = j === 0 ? 'j0' : j === 1 ? 'j1' : (j % 2 === 0 ? 'jE' : 'jO');
      const key = 'A' + mod(A, 12) + ' q' + mod(q, 12) + ' ' + jc + ' w' + mod(w, 12) + ' k' + kclass(k);
      Seven[key] = (Seven[key] || 0) + 1;
    }
  }
  if (t === 'G') {
    const [a, b] = r;
    const { j, q } = nu2(a + 1);
    const jc = j === 0 ? 'j0' : j === 1 ? 'j1' : (j % 2 === 0 ? 'jE' : 'jO');
    const key = jc + ' q' + mod(q, 12) + ' b' + mod(b, 12) + ' k' + kclass(k);
    Ghead[key] = (Ghead[key] || 0) + 1;
    GheadAmod['a' + mod(a, 12) + ' ' + jc] = (GheadAmod['a' + mod(a, 12) + ' ' + jc] || 0) + 1;
    if (q < 3n) badGuards.push('G q<3: ' + s);
    if (a === 3 || a === 1) badGuards.push('G a in {1,3}: ' + s);
  }
  if (t === 'L') {
    const [r1, r2, r3] = r;
    const sig = r1 + r3;
    const key = 's' + mod(sig, 12) + ' r2_' + mod(r2, 12) + ' k' + kclass(k);
    Lsig[key] = (Lsig[key] || 0) + 1;
  }
}

console.log('families:', JSON.stringify(fam));
console.log('k-class hist:', JSON.stringify(kHist, null, 0));
console.log('R forms: reentry(a=1)', Rform.a1, 'anchor(a=b)', Rform.anchor, 'other', Rform.other);
console.log('R reentry/other residues:', JSON.stringify(Rres));
console.log('R anchor residues:', JSON.stringify(RanchorRes));
console.log('S-odd N classes:', JSON.stringify(Sodd));
console.log('S-even (A mod12, q mod12, jclass, w mod12, k):', JSON.stringify(Seven, null, 1));
console.log('G-head (jclass, q mod12, b mod12, k):', JSON.stringify(Ghead, null, 1));
console.log('G-head a mod12 x jclass:', JSON.stringify(GheadAmod));
console.log('L (sigma mod12, r2 mod12, k):', JSON.stringify(Lsig, null, 1));
console.log('low-y counts:', JSON.stringify(lowy));
console.log('guard violations on trajectory:', badGuards.length, badGuards.slice(0, 5));
