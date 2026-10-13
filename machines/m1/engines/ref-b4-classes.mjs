// ref-b4-classes.mjs — REFEREE: audit the 20-class L-exit table (v6 §3) from births-roots.json (1e5 anchors).
//  (1) recompute 4-part class keys (ty, nu2, A mod 144, q mod 144) independently; compare to births7's 20;
//  (2) per-class AP fit from FULL member lists (not samples): A0=min, D=gcd diffs; verify doc's listed values;
//  (3) pairing law: every Lk (sigma,r2) pairs with L3 (sigma-1, r2), A_Lk = A_L3 + 1;
//  (4) L3|j4 family form: A = 9·2^12·W+16, W odd >= 1; check sig/r2 relations;
//  (5) which class residues collide with 2^t mod 144 (and whether the collision is 'effective' given min member);
//  (6) verify doc's claim that L-exit births split L3 = relay count, Lk = direct count.
import { readFileSync } from 'fs';
const { roots, nanchor, finalN } = JSON.parse(readFileSync('births-roots.json', 'utf8'));
const B = BigInt;
console.log(`births-roots.json: nanchor=${nanchor} finalN=${finalN} roots=${roots.length}`);
const mod = (v, m) => Number(((B(v) % B(m)) + B(m)) % B(m));
const nu2 = (v) => { let n = 0; let x = B(v); while ((x & 1n) === 0n) { n++; x >>= 1n; } return { j: n, q: x }; };
const gcd = (a, b) => { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) { const t = a % b; a = b; b = t; } return a; };

const byTy = { E1r: [], L3: [], Lk: [] };
for (const r of roots) byTy[r.ty].push(r);
console.log(`counts: E1r=${byTy.E1r.length} L3=${byTy.L3.length} Lk=${byTy.Lk.length} total=${roots.length}`);
console.log(`E1r share=${(100 * byTy.E1r.length / roots.length).toFixed(3)}%  L-exit share=${(100 * (byTy.L3.length + byTy.Lk.length) / roots.length).toFixed(3)}%`);

// (1) class keys on L-exit roots
const classes = new Map();
for (const r of [...byTy.L3, ...byTy.Lk]) {
  const { j, q } = nu2(r.A);
  const key = `${r.ty}|j${j}|A${mod(r.A, 144)}|q${mod(q, 144)}`;
  if (!classes.has(key)) classes.set(key, []);
  classes.get(key).push(r);
}
console.log(`\n(1) distinct 4-part class keys at 1e5 anchors: ${classes.size}`);
// (2) AP fit per class
console.log(`(2) per-class AP fit (full members): key | n | A0 | Dfit | doc-match`);
const docAP = {
  'L3|j2|A76|q19': [76, 144], 'Lk|j0|A77|q77': [77, 144], 'L3|j0|A7|q7': [583, 1152], 'Lk|j3|A8|q73': [584, 1152],
  'L3|j0|A13|q13': [9229, 18432], 'Lk|j1|A14|q7': [9230, 18432], 'L3|j4|A16|q1': [36880, 73728], 'Lk|j0|A17|q17': [36881, 73728],
};
for (const [key, list] of [...classes.entries()].sort()) {
  const As = list.map(r => B(r.A)).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const A0 = As[0];
  let D = 0n;
  for (const a of As) D = gcd(D, a - A0);
  if (D === 0n) D = 0n;
  const doc = docAP[key];
  const fitAll = As.every(a => (a - A0) % D === 0n);
  console.log(`  ${key}: n=${list.length} A0=${A0} Dfit=${D} allFit=${fitAll}${doc ? ` doc=[${doc}] ${A0 === B(doc[0]) && D === B(doc[1]) ? 'MATCH' : 'DIFFERS'}` : ''}`);
}
// (3) pairing law
const l3map = new Map(); // "sig,r2" -> A
for (const r of byTy.L3) l3map.set(`${r.sig},${r.r2}`, r.A);
let pairs = 0, lonely = 0, pairAfail = 0;
for (const r of byTy.Lk) {
  const mate = l3map.get(`${B(r.sig) - 1n},${r.r2}`);
  if (mate !== undefined) { pairs++; if (B(r.A) !== B(mate) + 1n) pairAfail++; }
  else lonely++;
}
console.log(`\n(3) pairing: Lk roots=${byTy.Lk.length} paired (L3 with sig-1,same r2)=${pairs} lonely=${lonely} A_Lk=A_L3+1 violations=${pairAfail}`);
// reverse: L3 with sig+1 mate among Lk
const lkmap = new Map();
for (const r of byTy.Lk) lkmap.set(`${r.sig},${r.r2}`, r.A);
let revPairs = 0, revLonely = 0;
for (const r of byTy.L3) { if (lkmap.has(`${B(r.sig) + 1n},${r.r2}`)) revPairs++; else revLonely++; }
console.log(`    reverse: L3 roots=${byTy.L3.length} paired=${revPairs} lonely=${revLonely} (lonely L3 = anchor-relay families?)`);

// (4) L3|j4 family
const j4 = byTy.L3.filter(r => { const { j } = nu2(r.A); return j === 4; });
console.log(`\n(4) L3 nu2=4 members at 1e5 anchors: ${j4.length}`);
for (const r of j4.slice(0, 8)) {
  const A = B(r.A), W = (A - 16n) / 4096n / 9n;
  console.log(`  sig=${r.sig} r2=${r.r2} A=${r.A}  A=9·2^12·W+16 with W=${W} (odd=${(W & 1n) === 1n}); r2-sig=${B(r.r2) - B(r.sig)}`);
}
// (5) residue collisions
const pow144 = [1, 2, 4, 8, 16, 32, 64, 128, 112, 80];
console.log(`\n(5) class residues vs 2^t mod 144 {${pow144}}:`);
const resSeen = new Map();
for (const [key, list] of classes) {
  const res = Number(key.split('|')[2].slice(1));
  resSeen.set(res, (resSeen.get(res) || 0) + list.length);
  if (pow144.includes(res)) {
    const A0 = list.map(r => B(r.A)).reduce((m, a) => (a < m ? a : m));
    // powers in this residue class: which t give 2^t = res mod 144?
    const ts = []; for (let t = 2; t < 40; t++) if (Number((1n << BigInt(t)) % 144n) === res) ts.push(t);
    console.log(`  COLLISION ${key}: residue ${res}; t with 2^t≡${res} (mod144): ${ts.join(',')} ${ts.length === 1 ? '(single power 2^' + ts[0] + '=' + (2 ** ts[0]) + ' vs min member ' + A0 + ')' : '(powers unbounded above A0)'}`);
  }
}
// (6) also verify all E1r: 3|A and b mod 6
let e1r3 = 0, e1rb = 0;
for (const r of byTy.E1r) { if (B(r.A) % 3n === 0n) e1r3++; if (B(r.b) % 6n === 2n) e1rb++; }
console.log(`\n(6) E1r at 1e5 anchors: ${byTy.E1r.length}, 3|A: ${e1r3}, b≡2 mod 6: ${e1rb}`);
// power-of-two scan of all roots
let pw = 0;
for (const r of roots) if (nu2(r.A).q === 1n) pw++;
console.log(`roots with odd part 1 (power of two): ${pw}`);
