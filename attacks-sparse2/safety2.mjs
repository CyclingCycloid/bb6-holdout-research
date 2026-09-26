// safety2.mjs — 2-adic safety + class/growth audit of all sym2-m<m>.json derivations.
//
// SAFETY (no halt): halt fires iff some G-state has a = 2^j - 1 (j>=2), i.e. a+1 = 2^j.
//  Halving-chain states (before Phi) are covered by the separate lemma: a_i + 1 = 2^i * w,
//  w ≡ 3 mod 6 => 3 | a_i+1... (a_i+1 = 2^i*w has odd factor w>1) => never a power of 2.
//  Here: for every recorded G-state run form (c0 + c1*u) on its owning domain:
//   - pinned paths (u=k): check (c0+1)+c1*k != 2^j directly.
//   - generic paths (u >= lo, all integers): solutions of 2^j ≡ c0+1 (mod c1) via the
//     eventually-periodic residue set {2^j mod c1}; each solution u must be < lo (else DANGER).
//   - first run additionally never instantiates to 3 with... (subsumed: a=3 <=> a+1=4=2^2).
//   - if a == 2 identically (c1=0, c0=2): the 4-run danger channel needs b != 3: check
//     second run form never equals 3 on the domain.
//  Well-formedness (no DEGEN) is inherent: every path outcome is ANCHOR (walk completed);
//  assert that too.
//
// CLASS/GROWTH: landing n' = d0 + d1*u with d1 = 6*2^m exactly, d0 ≡ 3 mod 6, and
//  delta = n' - n = (d0 - 3*2^m + 3) >= 6.  (n = 2^m*w - 3 = (3*2^m - 3) + 6*2^m*u.)
//
// Usage: node safety2.mjs MLO MHI
import { readFileSync } from 'fs';
const MLO = +(process.argv[2] || 1), MHI = +(process.argv[3] || 80);

function parseForm(s) {
  const m = s.match(/^\((\d+)\+(\d+)u\)$/); if (m) return [BigInt(m[1]), BigInt(m[2])];
  return [BigInt(s), 0n];
}
const v2 = (x) => { x = x < 0n ? -x : x; let c = 0n; while (x % 2n === 0n) { c++; x /= 2n; } return c; };
// residues {2^j mod c1} for j in [0, cover) where cover = nu2(c1) + multiplicative order of 2 mod odd part (+2 safety)
function pow2Residues(c1) {
  const s = v2(c1), odd = c1 / (2n ** s);
  let ord = 1n; if (odd > 1n) { let x = 2n % odd; while (x !== 1n) { x = x * 2n % odd; ord++; if (ord > 4096n) return null; } }
  const cover = Number(s + ord + 2n);
  const res = new Map(); // residue -> min j
  let cur = 1n;
  for (let j = 0; j < cover; j++) { if (!res.has(cur)) res.set(cur, j); cur = cur * 2n % c1; }
  return res;
}
function ownsU(path, u) {
  let cur = BigInt(u), ok = true;
  for (const s of path.subs) {
    if (typeof s === 'object') { if (BigInt(s.u) !== cur) return false; cur = 0n; }
    else { if ((cur % 2n) !== BigInt(s)) { ok = false; break; } cur /= 2n; }
  }
  return ok && cur >= BigInt(path.lo);
}
// is there u in [lo, inf) with (c0+1)+c1*u = 2^j ?  return null or {u,j}
function dangerSolution(c0, c1, lo) {
  if (c1 === 0n) { let v = c0 + 1n; return v > 0n && (v & (v - 1n)) === 0n ? { u: null, j: v2(v) } : null; }
  if (c1 < 0n) return { u: 'neg-slope' };
  const res = pow2Residues(c1);
  if (res === null) return { u: 'order-too-big' };
  const t = ((c0 + 1n) % c1 + c1) % c1;
  if (!res.has(t)) return null;
  const j0 = res.get(t);
  // residues repeat with period ord from j >= nu2(c1); find ALL j with this residue, take min u
  const s = v2(c1), odd = c1 / (2n ** s);
  let ord = 1n; if (odd > 1n) { let x = 2n % odd; while (x !== 1n) { x = x * 2n % odd; ord++; } }
  let best = null;
  for (let dj = 0n; dj <= ord + 2n; dj++) {
    for (const jbase of [BigInt(j0)]) {
      const j = jbase + dj * 1n; // try j0, j0+1, ... within cover handled by residue map periodicity
    }
    break;
  }
  // simpler: iterate j from 0 to s+ord+2; for each with matching residue compute u
  for (let j = 0; j <= Number(s + ord + 2n); j++) {
    const p = 2n ** BigInt(j);
    if (p % c1 === t) {
      if (p <= c0 + 1n) continue;
      if ((p - c0 - 1n) % c1 !== 0n) continue;
      const u = (p - c0 - 1n) / c1;
      if (u >= BigInt(lo)) { if (best === null || u < best.u) best = { u, j }; }
    }
  }
  return best;
}

let nForms = 0, nG = 0, dangers = [], notAnchor = [], i6bad = [];
let clsBad = [], grwBad = [];
for (let m = MLO; m <= MHI; m++) {
  const paths = JSON.parse(readFileSync(`sym2-m${m}.json`, 'utf8'));
  for (const p of paths) {
    if (!p.outcome.startsWith('ANCHOR')) { notAnchor.push(`m=${m} ${p.outcome}`); continue; }
    // domain of this path: pinned single u, or u >= lo with parity constraints — approximate
    // the domain by: pinned => {k}; else all u >= lo (bits recorded but treat coarsely: check
    // both the bit-constrained solution test and, for rigor, test any solution u >= lo).
    const pinned = p.subs.length && typeof p.subs[0] === 'object';
    const dom = pinned ? [BigInt(p.subs[0].u)] : null;
    for (const g of p.gstates) {
      const runs = g.split(',').map(parseForm);
      nG++;
      for (const [c0, c1] of runs) { nForms++; if (c1 % 6n !== 0n) i6bad.push(`m=${m} c1=${c1}`); }
      const [a0, a1] = runs[0];
      // a+1 = 2^j check
      if (pinned) {
        const val = a0 + a1 * dom[0] + 1n;
        if (val > 0n && (val & (val - 1n)) === 0n) dangers.push(`m=${m} u=${dom[0]} a+1=${val} POWER2`);
      } else {
        const sol = dangerSolution(a0, a1, p.lo);
        if (sol) dangers.push(`m=${m} lo=${p.lo} a-form (${a0}+${a1}u) solution u=${sol.u} j=${sol.j}`);
      }
      // a==2 identically -> b!=3
      if (a1 === 0n && a0 === 2n && runs.length >= 2) {
        const [b0, b1] = runs[1];
        if (pinned) { if (b0 + b1 * dom[0] === 3n) dangers.push(`m=${m} u=${dom[0]} G(2,3)`); }
        else {
          if (b1 === 0n && b0 === 3n) dangers.push(`m=${m} G(2,3) identically`);
          else if (b1 > 0n) { const uu = (3n - b0) / b1; if (Number.isInteger(uu) && uu >= BigInt(p.lo)) dangers.push(`m=${m} b=3 at u=${uu}`); }
        }
      }
    }
    // class + growth on landing
    const mm = p.outcome.match(/^ANCHOR n'=\((\d+)\+(\d+)u\)$/);
    const mc = p.outcome.match(/^ANCHOR n'=(\d+)$/);
    const d0 = mm ? BigInt(mm[1]) : BigInt(mc[1]), d1 = mm ? BigInt(mm[2]) : 0n;
    if (!pinned && mm && d1 !== 6n * 2n ** BigInt(m)) clsBad.push(`m=${m} slope ${d1} != 6*2^m`);
    if (((d0 % 6n) + 6n) % 6n !== 3n) clsBad.push(`m=${m} d0=${d0} not 3 mod 6`);
    const delta = d0 - 3n * 2n ** BigInt(m) + 3n;
    if (pinned) { /* u=0 path: n = 2^m*3-3, n' = d0: delta same formula */ }
    if (delta < 6n) grwBad.push(`m=${m} delta=${delta} < 6`);
  }
}
console.log(`safety2 m=${MLO}..${MHI}: G-states=${nG} run-forms=${nForms}`);
console.log(`  I6 (6|c1) violations: ${i6bad.length}`);
console.log(`  power-of-2 dangers: ${dangers.length}`); dangers.slice(0, 20).forEach(d => console.log('   ' + d));
console.log(`  non-ANCHOR outcomes: ${notAnchor.length}`); notAnchor.slice(0, 5).forEach(d => console.log('   ' + d));
console.log(`  class violations: ${clsBad.length}`); clsBad.slice(0, 10).forEach(d => console.log('   ' + d));
console.log(`  growth violations: ${grwBad.length}`); grwBad.slice(0, 10).forEach(d => console.log('   ' + d));
if (dangers.length || notAnchor.length || clsBad.length || grwBad.length || i6bad.length) process.exit(1);
console.log('ALL SAFE + CLASS + GROWTH OK');
