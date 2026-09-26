// roundlaw.mjs — numeric cross-verification of the landmark round law (bstep BigInt engine).
// For each h-class: alpha = 2^(h+1)(3c+rho)+2^h-1 (nu2(alpha+1)=h, alpha=1 mod 6),
// landmark L(alpha,t;slack) -> walk stepFastB -> first next landmark must be
// (alpha + dAlpha(h), t + dt(h)) per the sym4 table. >=200 instantiations per class,
// t/m sampled in 1001..1200 and beyond. Also asserts: no halt/degen between landmarks.
// Usage: node roundlaw.mjs HMAX [PERCLASS]
import { stepFastB } from './bstep.mjs';
import { readFileSync } from 'fs';

const HMAX = +(process.argv[2] || 12);
const PER = +(process.argv[3] || 200);
const v2 = (x) => { x = x < 0n ? -x : x; let c = 0n; while (x % 2n === 0n) { c++; x /= 2n; } return c; };
const rhoOf = (h) => [0n, 1n, 2n].find(r => ((2n ** BigInt(h + 1) * r + 2n ** BigInt(h) - 1n) % 6n + 6n) % 6n === 1n);

// landmark detector on a numeric G-state (must be a valid family member):
// runs[0]=alpha+3*2^(t-3)w, runs[1]=alpha-1+5*2^(t-3)w, runs[2..]=2^t w ... final 2^(t+r+1)w-1
function detect(runs, w) {
  if (runs.length < 3) return null;
  const a = runs[0], b = runs[1], c3 = runs[2];
  if (c3 % w !== 0n) return null;
  const t = v2(c3 / w); if ((c3 / w >> t) !== 1n || t < 4n) return null;
  const E = [1n]; for (let i = 1n; i <= t; i++) E.push(0n); // placeholder
  const sub3 = 3n * 2n ** (t - 3n) * w;
  if (a < sub3) return null;
  const alpha = a - sub3;
  if (((alpha % 6n) + 6n) % 6n !== 1n || alpha > 10n**30n) return null;
  const subB = (alpha - 1n) + 5n * 2n ** (t - 3n) * w;
  if (b !== subB) return null;
  // tail pure
  for (let i = 2; i + 1 < runs.length; i++) if (runs[i] !== 2n ** (t + BigInt(i - 2)) * w) return null;
  const last = runs[runs.length - 1];
  if (last !== 2n ** (t + BigInt(runs.length - 3)) * w - 1n) return null;
  return { alpha, t };
}

// walk from a constructed landmark; return {next landmark, halted}
function walkRound(alpha, t, w, slack) {
  const E = 2n ** (t - 3n) * w;
  const runs = [alpha + 3n * E, (alpha - 1n) + 5n * E];
  for (let j = 0n; j <= slack; j++) runs.push(2n ** (t + j) * w);
  runs.push(2n ** (t + slack + 1n) * w - 1n);
  let c = { t: 'G', r: runs };
  for (let it = 0; it < 500000; it++) {
    if (c.t === 'G' && it > 0) { const lm = detect(c.r, w); if (lm) return { lm, steps: it }; }
    const st = stepFastB(c);
    if (st.degenerate) return { deg: st.degenerate };
    if (st.halt) return { halt: true };
    c = st.c;
    if (c.t === 'R' && c.r[0] === c.r[1]) return { anchor: c.r[0] };
  }
  return { cap: true };
}

// load sym4 table
const table = new Map();
for (const line of readFileSync('sym4-table.txt', 'utf8').split('\n')) {
  const m = line.match(/h=(\d+).*NEXT da=(\d+) dt=(\d+)/);
  if (m) table.set(+m[1], [BigInt(m[2]), +m[3]]);
}
let totOk = 0, totBad = 0; const bads = [];
for (let h = 1; h <= HMAX; h++) {
  const rho = rhoOf(h);
  const law = table.get(h);
  let ok = 0;
  const N = PER;
  for (let i = 0; i < N; i++) {
    const c = BigInt(i % 25);                    // c in 0..24
    const u = BigInt(Math.floor(i / 25) % 8);    // u in 0..7 (w = 6u+3)
    const tIdx = Math.floor(i / 200);
    const t = BigInt(1001 + (i * 7919) % 199 + tIdx * 137); // t in ~1001..1200+, varies
    const slack = 40n;
    const alpha = 2n ** BigInt(h + 1) * (3n * c + rho) + 2n ** BigInt(h) - 1n;
    const w = 6n * u + 3n;
    if (t < BigInt(h + 17)) continue;
    const r = walkRound(alpha, t, w, slack);
    if (!r.lm) { bads.push(`h=${h} i=${i} no-landmark (${r.deg || r.halt || r.anchor || r.cap})`); totBad++; continue; }
    const [da, dt] = law;
    if (r.lm.alpha !== alpha + da || r.lm.t !== t + BigInt(dt)) {
      bads.push(`h=${h} i=${i} t=${t} c=${c} u=${u}: got (dA=${r.lm.alpha - alpha},dt=${r.lm.t - t}) want (${da},${dt})`); totBad++; continue;
    }
    ok++;
  }
  totOk += ok;
  if (h <= 16 || h % 16 === 0) console.log(`h=${h}: ${ok}/${N} ok (law ${law ? law.join(',') : '?'})`);
}
console.log(`TOTAL: ${totOk} ok, ${totBad} bad`);
if (bads.length) { bads.slice(0, 30).forEach(b => console.log('  ' + b)); process.exit(1); }
console.log('ROUND LAW NUMERICALLY VERIFIED');
