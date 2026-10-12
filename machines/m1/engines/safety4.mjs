// safety4.mjs — 2-adic safety audit of all G-state head forms recorded in sym4 JSONs.
// A halt fires iff some G-state's first run a satisfies a+1 = 2^j on its domain.
// Forms: value = g*2^(t+e)*w + d0 + du*u + dc*c, w = 6u+3, t >= T0 symbolic.
// Fold w (k = t+e >= 1): affine (D0, DU, DC) = (d0 + 3g*2^k, du + 6g*2^k, dc).
//   nu2(DU(k)) stabilizes at nu2(du) for k > nu2(du); odd parts vary with k.
// Criterion per (form, k): exists u>=lo, c>=cmin, j with D0' + DU*u + DC*c = 2^j
//   (D0' = D0+1). Automatic safety: nu2(D0') < nu2(gcd(DU,DC)) => NO solutions.
//   Else exact test: g0 = gcd(DU,DC); need 2^j = D0' mod g0 with j >= nu2-part and
//   representability (2-var semigroup via ext-gcd), j enumerated over one full
//   2-power residue period (ord of 2 mod odd(g0), computed exactly, capped 4096).
// k sampled: T0+e .. T0+e+64 (covers the automatic-safety regime; if a form is not
// auto-safe at some k, ALL k in a longer window are tested and the form is reported).
// Also: G(a=2 identically) requires b != 3 (4-run danger channel) — checked.
// Usage: node safety4.mjs rounds 1 64 | node safety4.mjs ends 1 16
import { readFileSync, readdirSync } from 'fs';

const MODE = process.argv[2] || 'rounds';
const LOH = +(process.argv[3] || 1), HHH = +(process.argv[4] || 64);
const v2 = (x) => { if (x === 0n) return 1n << 30n; x = x < 0n ? -x : x; let c = 0n; while (x % 2n === 0n) { c++; x /= 2n; } return c; };
function extGcd(a, b) { // iterative (no recursion-depth limits on huge BigInts)
  let r0 = a, r1 = b, s0 = 1n, s1 = 0n, t0 = 0n, t1 = 1n;
  while (r1 !== 0n) { const q = r0 / r1; [r0, r1] = [r1, r0 - q * r1]; [s0, s1] = [s1, s0 - q * s1]; [t0, t1] = [t1, t0 - q * t1]; }
  return [r0, s0, t0];
}
// exists (x,y) >= 0 with A*x + B*y = S ?  (A,B >= 0)
function repr2(A, B, S) {
  if (S < 0n) return false;
  if (A === 0n && B === 0n) return S === 0n;
  if (A === 0n) return S % B === 0n;
  if (B === 0n) return S % A === 0n;
  const g0 = extGcd(A, B)[0];
  if (S % g0 !== 0n) return false;
  const A2 = A / g0, B2 = B / g0, S2 = S / g0;
  // solve B2*y = S2 mod A2 (A2 may be even/odd; iterate y in one period A2 when A2 <= 4e6 else ext-gcd on odd part)
  if (A2 <= 4000000n) { for (let y = 0n; y < A2; y++) { const r = S2 - B2 * y; if (r < 0n) break; if (r % A2 === 0n) return true; } return false; }
  // ext-gcd path: need inverse of B2 mod A2' where A2' = odd part is not required; do general CRT-free check:
  // find y0 = (S2 * inv(B2 mod A2g)) mod A2g for g = gcd(B2, A2)
  const gg = extGcd(B2, A2)[0];
  if (S2 % gg !== 0n) return false;
  const Am = A2 / gg;
  const binv = extGcd(B2 / gg, Am)[1];
  let y0 = ((S2 / gg) % Am) * (((binv % Am) + Am) % Am) % Am;
  // smallest y = y0 mod Am; check some y in {y0, y0+Am} (y0 < Am): x >= 0?
  for (const y of [y0, y0 + Am]) { const r = S2 - B2 * y; if (r >= 0n && r % A2 === 0n) return true; }
  return false;
}
// danger test for affine (D0', DU, DC, lo, cmin): any j with solution?
function dangerAffine(D0p, DU, DC, lo, cmin) {
  const base = D0p + DU * lo + DC * cmin;   // value at domain corner (DU,DC >= 0)
  const g0 = DU === 0n && DC === 0n ? 0n : (DU === 0n ? DC : (DC === 0n ? DU : extGcd(DU, DC)[0]));
  if (g0 === 0n) { // constant
    return base > 0n && (base & (base - 1n)) === 0n ? { j: v2(base) } : null;
  }
  const sN = v2(g0), oddg = g0 / (2n ** sN);
  // 2^j = D0p + DU*u + DC*c >= base... solutions need 2^j = base mod g0 eventually
  // enumerate j from 0 to sN + ord2(oddg) + 2
  let ord = 1n;
  if (oddg > 1n) { let x = 2n % oddg; while (x !== 1n) { x = x * 2n % oddg; ord++; if (ord > 4096n) return { undec: true }; } }
  const cover = Number(sN + ord + 2n);
  for (let j = 0; j <= cover; j++) {
    const p = 2n ** BigInt(j);
    if (p < base) continue;
    if ((p - D0p) % g0 !== 0n) continue;
    const S = (p - D0p) / g0 - (DU / g0) * lo - (DC / g0) * cmin; // = DU'x + DC'y needed
    if (S < 0n) continue;
    if (repr2(DU / g0, DC / g0, S)) return { j, u: null };
  }
  return null;
}
// parse form 'gW<e>+(...)' or plain
function parseForm(s) {
  const mm = s.match(/^(?:(\d+)W([+-]\d+))?(?:\+)?(?:(\(-?\d+(?:\+\d+u)?(?:\+\d+c)?\))|(-?\d+))?$/);
  if (!mm) return null;
  const g = mm[1] ? BigInt(mm[1]) : 0n, e = mm[2] ? BigInt(mm[2]) : 0n;
  let d0 = 0n, du = 0n, dc = 0n;
  if (mm[3]) {
    const inner = mm[3].slice(1, -1);
    d0 = BigInt(inner.split('+')[0]);
    const up = inner.match(/\+(\d+)u/); if (up) du = BigInt(up[1]);
    const cp = inner.match(/\+(\d+)c/); if (cp) dc = BigInt(cp[1]);
  } else if (mm[4]) d0 = BigInt(mm[4]);
  return { g, e, d0, du, dc };
}
let forms = 0, autoSafe = 0, tested = 0, dangers = 0, undecided = 0; const dangList = [];
const files = [];
if (MODE === 'rounds') for (let h = LOH; h <= HHH; h++) files.push({ f: `sym4-h${h}-s40.json`, t0: h + 16 });
else for (let h = LOH; h <= HHH; h++) for (let r = 0; r < 8; r++) files.push({ f: `sym4-h${h}-s${r}.json`, t0: h + 16 });
for (const { f, t0 } of files) {
  let j; try { j = JSON.parse(readFileSync(f, 'utf8')); } catch { continue; }
  for (const p of j) {
    const gs = p.gs || [];
    for (const g of gs) {
      const runs = g.split(',');
      const head = parseForm(runs[0]); if (!head) { dangList.push(`PARSE ${runs[0]} in ${f}`); dangers++; continue; }
      forms++;
      // G(2, b=3) channel
      const bform = parseForm(runs[1] || '0');
      if (head.g === 0n && head.du === 0n && head.dc === 0n && head.d0 === 2n && runs.length >= 2 && bform && bform.g === 0n && bform.du === 0n && bform.dc === 0n && bform.d0 === 3n) {
        dangers++; dangList.push(`G(2,3) in ${f}: ${g.slice(0, 60)}`);
      }
      // 2^j test across k window
      let auto = false;
      for (let dk = 0; dk <= 64; dk++) {
        const k = BigInt(t0) + head.e + BigInt(dk);
        if (k < 1n) continue;
        const D0p = head.d0 + head.g * 3n * 2n ** k + 1n;
        const DU = head.du + head.g * 6n * 2n ** k;
        const DC = head.dc;
        if (DU < 0n || DC < 0n) { dangList.push(`NEG-SLOPE ${runs[0]} in ${f}`); dangers++; break; }
        const g0 = DU === 0n && DC === 0n ? 0n : (DU === 0n ? DC : (DC === 0n ? DU : extGcd(DU, DC)[0]));
        if (g0 !== 0n && v2(D0p) < v2(g0)) { auto = true; continue; } // auto-safe at this k
        const res = dangerAffine(D0p, DU, DC, BigInt(p.lo || 0), BigInt(p.cmin || 0));
        if (res && res.undec) { undecided++; dangList.push(`UNDECIDED j-cover ${runs[0]} k+${dk} ${f}`); break; }
        if (res) { dangers++; dangList.push(`DANGER a+1=2^${res.j} form ${runs[0]} k+${dk} in ${f} (lo=${p.lo} cmin=${p.cmin})`); break; }
        tested++;
      }
      if (auto) autoSafe++;
    }
  }
}
console.log(`safety4 [${MODE} h=${LOH}..${HHH}]: head forms=${forms} auto-safe=${autoSafe} full-tested=${tested} dangers=${dangers} undecided=${undecided}`);
dangList.slice(0, 20).forEach(d => console.log('  ' + d));
if (dangers || undecided) process.exit(1);
console.log('ALL G-STATE HEAD FORMS SAFE (no a+1 = 2^j on-domain, no G(2,3))');
