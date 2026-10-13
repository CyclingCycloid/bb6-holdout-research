// inv2.mjs — CEGAR for the coarse invariant I1 on M1 phase configs.
// I1 = configs C with:
//   (M1) SUM(C) := sum of runs === 0 (mod 3)      [global mod-3 ledger — the moat]
//   (M2) domain: R: b>=3 ; S: y>=1 ; L: r3>=1, r2>=3 ; G: (a+1 = 2^j*q, q odd>=3)
//   (M3) head forms: G: odd(a+1)>=3 ; S even-y: odd(x+y/2+1)>=3
//   (M4) birth guards: R b even: odd(a+b/2+1)>=3 ; L r2 even: odd(sigma+r2/2+1)>=3
//        S odd-y k>=4: N even => odd(rest0 + N/2 + 2)>=3   (N = x+y+z+2)
//   (M5) E7-fix: G(a=2): b>=2, b===2 (mod 3), and if b odd: odd((3b+7)/2)>=3
// Halting forms (G a=1 or 3) violate M3 (odd(a+1)=1). Degenerate engine exits violate M2.
// Experiment: (a) trajectory subset check; (b) closure violation search over instance space.
import { readFileSync } from 'fs';

// single-step uncollapsed phase rules (verbatim from phase1.mjs / lib.mjs)
function step1(c) {
  if (c.t === 'R') { const [a, b] = c.r; return { c: { t: 'S', r: [a + 1n, b - 2n, 1n] } }; }
  if (c.t === 'S') {
    const [x, y, z, ...rest] = c.r;
    if (y >= 3n) return { c: { t: 'S', r: [x + 1n, y - 2n, z + 1n, ...rest] } };
    if (y === 2n) return { c: { t: 'G', r: [x + 1n, z + 1n, ...rest] } };
    if (y === 1n) { if (rest.length === 0) return { c: { t: 'R', r: [1n, x + z + 3n] } }; return { c: { t: 'L', r: [1n, x + z + 3n, ...rest] } }; }
    return { degenerate: 'S y=' + y };
  }
  if (c.t === 'G') {
    const [a, b, ...rest] = c.r;
    if (a >= 4n) return { c: { t: 'S', r: [1n, a - 3n, 1n, b + 1n, ...rest] } };
    if (a === 2n) return { c: { t: 'L', r: [1n, b + 1n, b + 1n, ...rest] } };
    if (a === 3n) return { halt: true };
    return { degenerate: 'G a=' + a };
  }
  if (c.t === 'L') {
    const [r1, r2, r3, ...rest] = c.r;
    if (r3 >= 2n) return { c: { t: 'L', r: [r1 + 1n, r2, r3 - 1n, ...rest] } };
    if (r3 === 1n) { if (c.r.length === 3) return { c: { t: 'R', r: [r1 + 1n, r2] } }; return { c: { t: 'S', r: [r1 + 1n, r2, ...rest] } }; }
    return { degenerate: 'L r3=' + r3 };
  }
  return { degenerate: '?' };
}

const oddPart = (v) => { let x = BigInt(v); while ((x & 1n) === 0n && x > 0n) x >>= 1n; return x; };

export function inI1(c) {
  const r = c.r.map(Number);
  const k = r.length;
  const S = r.reduce((a, b) => a + b, 0);
  if (S % 3 !== 0) return false;
  if (c.t === 'R') {
    const [a, b] = r;
    if (b < 3) return false;
    if (b % 2 === 0 && oddPart(a + b / 2 + 1) < 3n) return false;
    return true;
  }
  if (c.t === 'S') {
    const [x, y, z, ...rest] = r;
    if (y < 1) return false;
    if (y % 2 === 0) {
      const A = x + y / 2 + 1, w = z + y / 2;
      if (oddPart(A) < 3n) return false;
      // A === 3 births G(2, w): child must pass M5 (E7-fix)
      if (A === 3) {
        if (w < 2 || w % 3 !== 2) return false;
        if (w % 2 === 1 && oddPart((3 * w + 7) / 2) < 3n) return false;
      }
    } else {
      const N = x + y + z + 2;
      if (k >= 4 && N % 2 === 0 && oddPart(rest[0] + N / 2 + 2) < 3n) return false;
    }
    return true;
  }
  if (c.t === 'G') {
    const [a, b] = r;
    if (oddPart(a + 1) < 3n) return false;          // blocks a in {1,3,7,15,...}
    if (a === 2) {
      if (b < 2 || b % 3 !== 2) return false;
      if (b % 2 === 1 && oddPart((3 * b + 7) / 2) < 3n) return false;
    }
    return true;
  }
  if (c.t === 'L') {
    const [r1, r2, r3] = r;
    if (r3 < 1 || r2 < 3) return false;
    if (r2 % 2 === 0 && oddPart(r1 + r3 + r2 / 2 + 1) < 3n) return false;
    return true;
  }
  return false;
}

// ---------- (a) trajectory subset check ----------
const lib = JSON.parse(readFileSync('library.json', 'utf8')).states;
let violTraj = 0, firstViol = null;
for (const s of lib) {
  const [t, rs] = s.split(':');
  const c = { t, r: rs.split(',').map(BigInt) };
  if (!inI1(c)) { violTraj++; if (!firstViol) firstViol = s; }
}
console.log(`(a) trajectory subset: ${lib.length - violTraj}/${lib.length} in I1` + (firstViol ? `  first viol: ${firstViol}` : ''));

// ---------- (b) closure violation search ----------
// Enumerate instances covering residues mod 12 AND 2-adic variety, deeper tails.
function* vals(max) { for (let v = 1; v <= max; v++) yield v; }
let violCount = 0; const violExamples = []; const violKind = {};
function checkClosure(c, label) {
  if (!inI1(c)) return;
  const st = step1(c);
  if (st.halt) { violCount++; violKind.HALT = (violKind.HALT || 0) + 1; if (violExamples.length < 30) violExamples.push(`${label} -> HALT`); return; }
  if (st.degenerate) { violCount++; violKind.DEG = (violKind.DEG || 0) + 1; if (violExamples.length < 30) violExamples.push(`${label} -> DEG ${st.degenerate}`); return; }
  if (!inI1(st.c)) {
    violCount++;
    const why = st.c.t;
    violKind[why] = (violKind[why] || 0) + 1;
    if (violExamples.length < 40) violExamples.push(`${label} -> ${st.c.t}[${st.c.r.join(',')}]`);
  }
}
// R instances (with 2-adic aligned b: b/2+a+1 = 2^t patterns)
const rB = new Set(); for (let b = 3; b <= 42; b++) rB.add(b); for (const t of [1, 2, 3, 4, 5, 6]) for (const a of [1, 2, 5, 11]) rB.add(2 ** t - a - 1 + 2 * 1); // placeholder
for (const a of vals(26)) for (const b of vals(42)) checkClosure({ t: 'R', r: [BigInt(a), BigInt(b)] }, `R(${a},${b})`);
// extra 2-adic aligned R: a + b/2 + 1 = 2^t
for (const t of [2, 3, 4, 5, 6, 7]) for (const a of [1, 2, 5, 11, 17]) { const b = 2 * (2 ** t - a - 1); if (b >= 3 && b <= 300) checkClosure({ t: 'R', r: [BigInt(a), BigInt(b)] }, `R2ad(${a},${b})`); }
// S instances k=3..6
for (const x of vals(14)) for (const y of vals(16)) for (const z of vals(14)) {
  checkClosure({ t: 'S', r: [BigInt(x), BigInt(y), BigInt(z)] }, `S3(${x},${y},${z})`);
  for (const w1 of [1, 2, 3, 5, 8, 11, 16]) {
    checkClosure({ t: 'S', r: [BigInt(x), BigInt(y), BigInt(z), BigInt(w1)] }, `S4(${x},${y},${z},${w1})`);
    for (const w2 of [1, 3, 7]) {
      checkClosure({ t: 'S', r: [BigInt(x), BigInt(y), BigInt(z), BigInt(w1), BigInt(w2)] }, `S5`);
      checkClosure({ t: 'S', r: [BigInt(x), BigInt(y), BigInt(z), BigInt(w1), BigInt(w2), BigInt(2 * w1)] }, `S6`);
    }
  }
}
// G instances: heads with a+1 = 2^j*q variety
const heads = [];
for (let t = 0; t <= 6; t++) for (const q of [3n, 5n, 7n, 9n, 11n, 13n, 15n, 19n, 21n]) heads.push(2n ** BigInt(t) * q - 1n);
for (const a of heads) for (const b of vals(20)) {
  checkClosure({ t: 'G', r: [a, BigInt(b)] }, `G2(${a},${b})`);
  for (const w of [1, 5, 11]) {
    checkClosure({ t: 'G', r: [a, BigInt(b), BigInt(w)] }, `G3(${a},${b},${w})`);
    checkClosure({ t: 'G', r: [a, BigInt(b), BigInt(w), BigInt(w * 2)] }, `G4`);
  }
}
// L instances
for (const r1 of vals(14)) for (const r2 of vals(20)) for (const r3 of vals(14)) {
  checkClosure({ t: 'L', r: [BigInt(r1), BigInt(r2), BigInt(r3)] }, `L3(${r1},${r2},${r3})`);
  for (const w of [1, 5, 11]) checkClosure({ t: 'L', r: [BigInt(r1), BigInt(r2), BigInt(r3), BigInt(w)] }, `L4`);
}
// 2-adic aligned L: sigma + r2/2 + 1 = 2^t  (r2 even)
for (const t of [2, 3, 4, 5, 6]) for (const sig of [1, 4, 7, 10, 13]) for (const r2h of [3, 9, 15]) {
  const r2 = 2 * (2 ** t - sig - 1); if (r2 >= 6 && r2 <= 200) {
    const r3 = sig - 1 > 0 ? sig - 1 : sig + 11; // r1 = 1
    checkClosure({ t: 'L', r: [1n, BigInt(r2), BigInt(r3)] }, `L2ad(${r2},${r3})`);
    for (const w of [1, 5, 11]) checkClosure({ t: 'L', r: [1n, BigInt(r2), BigInt(r3), BigInt(w)] }, `L2ad4`);
  }
}
console.log(`(b) closure violations found: ${violCount}`);
console.log('kinds:', JSON.stringify(violKind));
for (const e of violExamples.slice(0, 40)) console.log('   ' + e);
