// fam1.mjs — dump landmark G-states in relative form (gamma, delta, e): run = gamma*2^(t+e)*w + delta,
// where t = nu2(third-run w-coeff) is the state's tail-head exponent.
// Also emit the round-step pairs (consecutive odd-landmarks) with their (alpha, t, h, Delta-t).
import { readFileSync, writeFileSync } from 'fs';
function parseForm(s) {
  const m = s.match(/^\((\d+)\+(\d+)u\)$/); if (m) return [BigInt(m[1]), BigInt(m[2])];
  return [BigInt(s), 0n];
}
const v2 = (x) => { x = x < 0n ? -x : x; let c = 0n; while (x % 2n === 0n) { c++; x /= 2n; } return c; };
const M = +(process.argv[2] || 80);
const paths = JSON.parse(readFileSync(`sym2-m${M}.json`, 'utf8'));
const path = paths.find(q => q.subs.length === 0 && q.lo <= 1) || paths.find(q => q.subs.length === 0);
const out = [];
// u-coords -> w-coords: value = c0 + c1*u = (c0 - c1/2) + (c1/6)*w
const landmarks = [];
path.gstates.forEach((g, i) => {
  const runs = g.split(',').map(parseForm);
  const wform = runs.map(([c0, c1]) => {
    if (c1 === 0n) return { gam: 0n, del: c0, e: null, const: c0 };
    const beta = c1 / 6n; // w-slope
    const alpha = c0 - c1 / 2n; // w-const
    return { gam: beta, del: alpha, e: null, beta, alpha };
  });
  // t = v2 of third run's beta
  let t = null, rel = null;
  if (runs.length > 2) {
    const [, c1_3] = runs[2];
    if (c1_3 !== 0n) {
      const beta3 = c1_3 / 6n;
      t = v2(beta3);
      rel = wform.map(f => f.gam === 0n ? `${f.del}` : `${f.gam / 2n ** (t + (f.e = v2(f.gam) - t))}*2^(t${v2(f.gam) - t >= 0n ? '+' : ''}${v2(f.gam) - t})*w + ${f.del} [gam=${f.gam} del=${f.del}]`);
    }
  }
  const aOdd = runs[0][1] === 0n ? runs[0][0] % 2n === 1n : (runs[0][0] + runs[0][1]) % 2n === 1n; // parity at u=1: c0+c1... u>=1 free parity; use w-odd: parity = alpha+beta
  const [a0, a1] = runs[0];
  const alphaA = a1 === 0n ? a0 : a0 - a1 / 2n, betaA = a1 === 0n ? 0n : a1 / 6n;
  const aParW = (alphaA + betaA) % 2n; // w odd
  if (t !== null && betaA !== 0n && v2(betaA) === t - 3n && (alphaA % 6n + 6n) % 6n === 1n) {
    landmarks.push({ i, alpha: alphaA, t, h: v2(alphaA + 1n), tail3: rel[2] });
  }
  if (runs.length <= 6 || (landmarks.length && i >= landmarks[landmarks.length - 1].i && i <= landmarks[landmarks.length - 1].i + 8)) {
    out.push(`${i}: parW=${aParW} a-wform=${alphaA >= 0n ? '' : '-'}${alphaA < 0n ? -alphaA : alphaA}+${betaA}w k=${runs.length}` + (t !== null ? ` t=${t}` : '') + (rel ? ` | ${rel.slice(0, 4).join(' ; ')}` : ''));
  }
});
out.push('--- odd landmarks (a = alpha + 3*2^t*w, alpha=1 mod 6):');
landmarks.forEach(L => out.push(`  g${L.i}: alpha=${L.alpha} t=${L.t} h=nu2(alpha+1)=${L.h} tail3=${L.tail3}`));
for (let i = 1; i < landmarks.length; i++) {
  out.push(`  round ${landmarks[i - 1].i}->${landmarks[i].i}: dAlpha=${landmarks[i].alpha - landmarks[i - 1].alpha} dt=${landmarks[i].t - landmarks[i - 1].t} h=${landmarks[i - 1].h}`);
}
writeFileSync('fam1.out', out.join('\n'));
console.log(out.slice(-40).join('\n'));
console.log('(full -> fam1.out)');
