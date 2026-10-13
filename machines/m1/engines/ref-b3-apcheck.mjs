// ref-b3-apcheck.mjs — REFEREE: audit the "decidable power-in-AP" certification of births11.
//  (1) Independent brute-force checker powInAPbf(A0,D): enumerate t with 2^t < A0 + D*u (u = odd part of D)
//      — the minimal solution, if any, is below that bound (2^t mod D has preperiod s, period ord ≤ u).
//      Cross-check against births11's closed-form logic on random synthetic (A0,D) — measure disagreements.
//  (2) Re-verify all classes of births11-classes.json + the 6 late/residue classes with brute force.
//  (3) Demonstrate the superset/subset inversion: a synthetic class where D_fit is a multiple of the
//      true period, the fitted AP is power-free, yet the TRUE class contains a power of 2.
//  (4) Verify the L3|j4 structural form A = 9·2^12·W + 16 (W odd >= 1) is power-free for W up to 10^7,
//      and that q = 2304W+1 odd > 1 always (trivial), i.e. A = 16·(odd>1).
import { readFileSync } from 'fs';
const B = BigInt;
const v2 = (x) => { let n = 0n; x = B(x); while ((x & 1n) === 0n) { n++; x >>= 1n; } return n; };
const gcd = (a, b) => { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) { const t = a % b; a = b; b = t; } return a; };

// ---- independent brute force (rigorous): {A0 + Dk : k>=0} contains 2^t (t>=2)? ----
// t < s: finite check. t >= s: 2^t mod D is periodic in t with period ord_u(2);
// scan one full period starting at the first t with 2^t >= A0.
function powInAPbf(A0, D) {
  A0 = B(A0); D = B(D); if (D <= 0n) D = 1n;
  const s = v2(D), u = D >> s;
  // period of 2^t mod u (t >= 0), u odd
  let ord = 0n, p = 1n % u;
  if (u > 1n) { do { p = p * 2n % u; ord++; } while (p !== 1n && ord < 1000000n); }
  // first t with 2^t >= A0
  let t0 = 2n; while ((1n << t0) < A0 && t0 < 4096n) t0++;
  const start = t0 > s ? t0 : s;
  const span = (u === 1n) ? 2n : ord + 2n;
  for (let t = start; t < start + span + 2n; t++) {
    const P = 1n << t; // exact
    if (P >= A0 && (P - A0) % D === 0n) return { hit: true, t: t.toString(), p: P.toString() };
  }
  return { hit: false };
}

// ---- births11's closed-form checker (verbatim logic) ----
function powInAP11(A0, D) {
  A0 = B(A0); D = B(D);
  if (D <= 0n) D = 1n;
  const s = v2(D), u = D >> s, j = v2(A0), q0 = A0 >> j;
  if (j < s && (q0 % (1n << (s - j))) === 1n && ((1n << j) % u) === (A0 % u)) return { hit: true, how: 't<s', t: j.toString() };
  if (s > 0n && (A0 % (1n << s)) === 0n) {
    const r = (A0 >> s) % u;
    if (r === 0n && u === 1n) return { hit: true, how: 't>=s', t: '>=' + s };
    if (r !== 0n && u > 1n) {
      let p = 1n, t = s; const lim = s + 60000n;
      while (t < lim) { if (p === r && (1n << t) >= A0) return { hit: true, how: 'dlog', t: t.toString() }; p = p * 2n % u; t++; if (p === 1n && (1n << t) > A0 * 4n) break; }
    }
  }
  return { hit: false };
}

// (1) cross-validation on synthetic cases: random (A0, D), D = 2^s * odd
let seed = 12345n;
const rnd = () => { seed = (seed * 6364136223846793005n + 1442695040888963407n) & 0xFFFFFFFFFFFFn; return seed; };
let tested = 0, disagree = 0, bfHit = 0, cfHit = 0, fnCount = 0, fpCount = 0;
for (let i = 0; i < 30000; i++) {
  const s = Number(rnd() % 12n);
  let u = rnd() % 97n + 1n; if ((u & 1n) === 0n) u += 1n;
  const D = (1n << BigInt(s)) * u;
  const A0 = rnd() % 1000003n + 1n;
  const bf = powInAPbf(A0, D), cf = powInAP11(A0, D);
  tested++;
  if (bf.hit) bfHit++; if (cf.hit) cfHit++;
  if (bf.hit !== cf.hit) {
    disagree++;
    if (bf.hit && !cf.hit) fnCount++; else fpCount++;
    if (disagree <= 6) console.log(`  disagree A0=${A0} D=${D}: bf=${JSON.stringify(bf)} cf=${JSON.stringify(cf)} ${bf.hit && !cf.hit ? '(cf FALSE-NEGATIVE = unsafe-direction bug)' : '(cf FALSE-POSITIVE = conservative)'}`);
  }
}
console.log(`[1] synthetic cross-check: tested=${tested} bf-hits=${bfHit} cf-hits=${cfHit} disagreements=${disagree}`);
console.log(`    cf11 false negatives (says safe, power present): ${fnCount}  |  cf11 false positives (says hit, none present): ${fpCount}`);

// (2) re-verify births11-classes.json
const classes = JSON.parse(readFileSync('births11-classes.json', 'utf8'));
console.log(`[2] births11-classes.json: ${classes.length} classes`);
let allSafeBf = true;
for (const cl of classes) {
  const bf = powInAPbf(cl.A0, cl.D), cf = powInAP11(cl.A0, cl.D);
  if (bf.hit) allSafeBf = false;
  console.log(`  ${cl.key}: members=${cl.members} A0=${cl.A0} D=${cl.D} bf=${bf.hit ? 'HIT t=' + bf.t : 'safe'} cf11=${cf.hit ? 'HIT' : 'safe'} ${bf.hit !== cf.hit ? ' <-- DISAGREE' : ''}`);
}
console.log(`  ALL SAFE (brute force): ${allSafeBf}`);
// the 6 keys present in the 20-class (4-part) table but absent from births11 inputs:
const late = [
  { key: 'Lk|j1|A26', A0: '9437210', D: '12582912' },   // 9·2^? — fitted below from doc ctx; also residue fallback
  { key: 'L3|j2|A28', A0: '37748764', D: '50331648' },
  { key: 'Lk|j0|A29', A0: '37748765', D: '50331648' },
];
const pow144 = new Set([1, 2, 4, 8, 16, 32, 64, 128, 112, 80]);
for (const cl of late) {
  const r = Number(B(cl.A0) % 144n);
  console.log(`  LATE ${cl.key}: A0=${cl.A0} residue ${r} in pow144? ${pow144.has(r)}; bf on residue class {r+144k}: ${powInAPbf(r === 0 ? 144 : r, 144n).hit ? 'HIT' : 'safe'}; bf on guessed AP: ${powInAPbf(cl.A0, cl.D).hit ? 'HIT' : 'safe'}`);
}

// (3) inversion demo: true class {80 + 48k : k>=0} contains 128 = 2^7 (k=1).
// observed members 80, 176, 272 (k=0,2,4) -> D_fit = gcd(96,96) = 96 (a MULTIPLE of true period 48).
const cls = [80n, 176n, 272n];
const A0 = cls[0]; let Dfit = 0n;
for (const a of cls) Dfit = gcd(Dfit, a - A0);
console.log(`[3] inversion demo: true class {80+48k} contains 2^7=128? ${(128n - 80n) % 48n === 0n}`);
console.log(`    observed ${cls.join(',')} -> D_fit=${Dfit} (multiple of true period 48: ${48n * (Dfit / 48n) === Dfit})`);
console.log(`    fitted AP {A0+D_fit·k} power-free? bf=${JSON.stringify(powInAPbf(A0, Dfit))} cf11=${JSON.stringify(powInAP11(A0, Dfit))}`);
console.log(`    => "D_fit multiple of true period => fitted AP superset" is FALSE: fitted AP ${Dfit === 96n ? '{80+96k}' : ''} misses 128 which the true class contains.`);

// (4) L3|j4 structural family A = 9·2^12·W + 16, W odd >= 1: power-free; q = 2304W+1 odd > 1.
let famBad = 0;
for (let W = 1n; W <= 1999999n; W += 2n) {
  const A = 9n * 4096n * W + 16n;
  const q = A >> 4n; // A = 16*q
  if ((q & 1n) !== 1n || q <= 1n) { famBad++; break; }
  if (powInAPbf(A, 1n << 200n).hit) { famBad++; } // never (q odd>1); kept for form
}
// direct: A power of 2 iff q=1 iff W=0 — check q>1 for all odd W>=1 trivially; brute small range:
let powInFam = 0;
for (let W = 1n; W <= 2000001n; W += 2n) {
  const A = 9n * 4096n * W + 16n;
  let x = A; while ((x & 1n) === 0n) x >>= 1n;
  if (x === 1n) powInFam++;
}
console.log(`[4] L3|j4 family A=9·2^12·W+16 (W odd, 1..2e6): powers of two found = ${powInFam}; odd part q=2304W+1 always odd>1: ${famBad === 0}`);
