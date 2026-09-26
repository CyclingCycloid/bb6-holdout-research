// safety5.mjs — 2-adic audit of master (sym5) JSON paths. Files sym5-A-TAU-H-S.json.
// Same math as safety4 (fold w-scale into affine, automatic-safety criterion, exact
// 2-var semigroup test via ext-gcd). T0 = 2h+16 read from filename (h = field 3).
import { readFileSync, readdirSync } from 'fs';
const v2 = (x) => { if (x === 0n) return 1n << 30n; x = x < 0n ? -x : x; let c = 0n; while (x % 2n === 0n) { c++; x /= 2n; } return c; };
function extGcd(a, b) { let r0 = a, r1 = b, s0 = 1n, s1 = 0n, t0 = 0n, t1 = 1n; while (r1 !== 0n) { const q = r0 / r1; [r0, r1] = [r1, r0 - q * r1]; [s0, s1] = [s1, s0 - q * s1]; [t0, t1] = [t1, t0 - q * t1]; } return [r0, s0, t0]; }
function repr2(A, B, S) {
  if (S < 0n) return false;
  if (A === 0n && B === 0n) return S === 0n;
  if (A === 0n) return S % B === 0n;
  if (B === 0n) return S % A === 0n;
  const g = extGcd(A, B)[0]; if (S % g !== 0n) return false;
  const A2 = A / g, B2 = B / g, S2 = S / g;
  if (A2 <= 4000000n) { for (let y = 0n; y < A2; y++) { const r = S2 - B2 * y; if (r < 0n) break; if (r % A2 === 0n) return true; } return false; }
  const gg = extGcd(B2, A2)[0]; if (S2 % gg !== 0n) return false;
  const Am = A2 / gg, binv = extGcd(B2 / gg, Am)[1];
  let y0 = ((S2 / gg) % Am) * (((binv % Am) + Am) % Am) % Am;
  for (const y of [y0, y0 + Am]) { const r = S2 - B2 * y; if (r >= 0n && r % A2 === 0n) return true; }
  return false;
}
function dangerAffine(D0p, DU, DC, lo, cmin) {
  const base = D0p + DU * lo + DC * cmin;
  const g0 = DU === 0n && DC === 0n ? 0n : (DU === 0n ? DC : (DC === 0n ? DU : extGcd(DU, DC)[0]));
  if (g0 === 0n) return base > 0n && (base & (base - 1n)) === 0n ? { j: v2(base) } : null;
  const sN = v2(g0), oddg = g0 / (2n ** sN);
  let ord = 1n;
  if (oddg > 1n) { let x = 2n % oddg; while (x !== 1n) { x = x * 2n % oddg; ord++; if (ord > 4096n) return { undec: true }; } }
  const cover = Number(sN + ord + 2n);
  for (let j = 0; j <= cover; j++) {
    const p = 2n ** BigInt(j);
    if (p < base) continue;
    if ((p - D0p) % g0 !== 0n) continue;
    const S = (p - D0p) / g0 - (DU / g0) * lo - (DC / g0) * cmin;
    if (S < 0n) continue;
    if (repr2(DU / g0, DC / g0, S)) return { j };
  }
  return null;
}
function parseForm(s) {
  const mm = s.match(/^(?:(\d+)W([+-]\d+))?(?:\+)?(?:(\(-?\d+(?:\+\d+u)?(?:\+\d+c)?\))|(-?\d+))?$/);
  if (!mm) return null;
  const g = mm[1] ? BigInt(mm[1]) : 0n, e = mm[2] ? BigInt(mm[2]) : 0n;
  let d0 = 0n, du = 0n, dc = 0n;
  if (mm[3]) { const inner = mm[3].slice(1, -1); d0 = BigInt(inner.split('+')[0]); const up = inner.match(/\+(\d+)u/); if (up) du = BigInt(up[1]); const cp = inner.match(/\+(\d+)c/); if (cp) dc = BigInt(cp[1]); }
  else if (mm[4]) d0 = BigInt(mm[4]);
  return { g, e, d0, du, dc };
}
let forms = 0, auto = 0, full = 0, dang = 0, undec = 0; const dl = [];
const files = readdirSync('.').filter(x => x.startsWith('sym5-') && x.endsWith('.json'));
for (const f of files) {
  const h = BigInt(f.split('-')[3]);
  const j = JSON.parse(readFileSync(f, 'utf8'));
  for (const p of j) for (const g of (p.gs || [])) {
    const runs = g.split(',');
    const head = parseForm(runs[0]);
    if (!head) { dl.push('PARSE ' + f); dang++; continue; }
    forms++;
    let ok = false;
    for (let dk = 0; dk <= 64; dk++) {
      const k = 2n * h + 16n + head.e + BigInt(dk);
      if (k < 1n) continue;
      const D0p = head.d0 + head.g * 3n * 2n ** k + 1n, DU = head.du + head.g * 6n * 2n ** k, DC = head.dc;
      if (DU < 0n || DC < 0n) { dl.push('NEG ' + f); dang++; break; }
      const g0 = DU === 0n && DC === 0n ? 0n : (DU === 0n ? DC : (DC === 0n ? DU : extGcd(DU, DC)[0]));
      if (g0 !== 0n && v2(D0p) < v2(g0)) { ok = true; continue; }
      const res = dangerAffine(D0p, DU, DC, BigInt(p.lo || 0), BigInt(p.cmin || 0));
      if (res && res.undec) { undec++; dl.push('UNDEC ' + f); break; }
      if (res) { dang++; dl.push('DANGER ' + f + ' j=' + res.j); break; }
      full++;
    }
    if (ok) auto++;
  }
}
console.log(`safety5: files=${files.length} forms=${forms} auto-safe=${auto} full-tested=${full} dangers=${dang} undecided=${undec}`);
dl.slice(0, 8).forEach(x => console.log('  ' + x));
console.log(dang + undec === 0 ? 'MASTER PATHS 2-ADIC SAFE' : 'ISSUES FOUND');
if (dang + undec > 0) process.exit(1);
