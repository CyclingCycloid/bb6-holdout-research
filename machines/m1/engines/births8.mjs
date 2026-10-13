// births8.mjs — final certification: per-class AP fit + decidable power-containment check.
// Class key = (ty, j, A mod 144, q mod 144). For each: collect As (cap 300), fit AP (A0, D) via
// gcd of (A - A0) over samples, verify ALL subsequent members fit (streaming), and decide
// whether any 2^t (t>=2) lies in the AP {A0 + Dk, k>=0}: exists iff 2^t ≡ A0 (mod D) solvable
// with 2^t >= A0... (2^t ≡ A0 mod D and 2^t >= A0 minimal member check).
// Usage: node births8.mjs NANCH
import { stepFastB } from './bstep.mjs';
import { writeFileSync } from 'fs';
const NANCH = Number(process.argv[2] ?? 10000000);
const B = BigInt;
const nu2 = (v) => { let n = 0; let x = B(v); while ((x & 1n) === 0n) { n++; x >>= 1n; } return { j: n, q: x }; };
const mod = (v, m) => Number(((B(v) % B(m)) + B(m)) % B(m));

function powInAP(A0, D) { // does {A0 + Dk : k>=0} contain 2^t, t>=2 ?
  // 2^t ≡ A0 (mod D) with 2^t >= A0 (k>=0). D > 0.
  // solve by enumerating t mod period: 2^t mod D is eventually periodic with period ord; preperiod = nu2(D).
  const v2D = (x) => { let n = 0; while ((x & 1n) === 0n) { n++; x >>= 1n; } return n; };
  const s = v2D(D);
  const A0m = ((A0 % D) + D) % D;
  // t >= s: 2^t ≡ 0 mod 2^s — need A0m ≡ 0 mod 2^s
  if (s > 0 && A0m % (1n << BigInt(s)) === 0n) {
    // need 2^t ≡ A0m mod D for some t >= s: (A0m / 2^s) ≡ 2^(t-s) mod (D / 2^s) — D/2^s odd part u
    const u = D >> BigInt(s);
    if (u === 1n) return { hit: true, t: '>=s', note: 'A0 ≡ 0 mod 2^s with odd part 1' };
    // discrete log of (A0m/2^s mod u) base 2 mod u — u may not be coprime to A0m/2^s... u odd; A0m/2^s must be unit mod u
    const r = (A0m >> BigInt(s)) % u;
    if (r !== 0n) {
      let p = 1n, t = 0n; const seen = new Map();
      while (!seen.has(p.toString())) { seen.set(p.toString(), t); if (p === r % u) { /* found t0 = t (relative) */ }
        p = p * 2n % u; t++; if (t > 100000n) break; }
      if (p === r % u || seen.has(r.toString())) {
        // need 2^t >= A0 for the smallest such t; check a few periods
        // smallest absolute t with 2^t ≡ A0 (mod D): t = s + (dlog) possibly + multiples of ord
        // find dlog:
        let pp = 1n % u, tt = 0n;
        while (pp !== r % u && tt <= 100000n) { pp = pp * 2n % u; tt++; }
        if (pp === r % u) {
          let tAbs = BigInt(s) + tt;
          const ord = (() => { let o = 0n, q2 = 1n % u; do { q2 = q2 * 2n % u; o++; } while (q2 !== 1n && o < 100000n); return o; })();
          // smallest tAbs >= s with tAbs ≡ s+tt mod ord and 2^tAbs >= A0 — try candidates
          for (let c = tAbs; c < tAbs + 4n * ord + 200n; c += ord) { if ((1n << c) >= A0) return { hit: true, t: c.toString(), note: 'CRT sol t>=s' }; }
        }
      }
    }
  }
  // t < s: t = nu2(A0m) (must be < s), then A0m/2^t ≡ 1 mod 2^(s-t) AND mod u: 2^t ≡ A0m mod u
  const jA = v2D(A0m);
  if (jA < s) {
    const q0 = A0m >> BigInt(jA);
    const ok2 = (q0 % (1n << BigInt(s - jA))) === 1n;
    // mod u: 2^jA ≡ A0m mod u
    const u = D >> BigInt(s);
    const oku = u === 1n || ((1n << BigInt(jA)) % u) === (A0m % u);
    if (ok2 && oku) { const t = BigInt(jA); if ((1n << t) >= A0 || A0 <= (1n << t)) return { hit: true, t: t.toString(), note: 't<s path' }; }
  }
  return { hit: false };
}

let n = 3n;
const classes = new Map(); // key -> {As: [], A0, D, verified, count}
let bad = 0;
outer:
for (let k = 0; k < NANCH; k++) {
  let c = { t: 'R', r: [n, n] };
  let prevT = 'START', prevC = null;
  for (let it = 0; it < 9000000; it++) {
    if (c.t === 'S' && (c.r[1] & 1n) === 0n) {
      const A = c.r[0] + c.r[1] / 2n + 1n;
      if (prevT === 'L' || (prevT === 'R' && prevC.r[0] !== 1n)) {
        const ty = prevT === 'L' ? 'Lk' : 'L3';
        const { j, q } = nu2(A);
        if (q === 1n) { console.log(`!!! POWER BIRTH A=${A} ty=${ty} anchor=${k}`); bad++; }
        const key = `${ty}|j${j}|A${mod(A, 144)}|q${mod(q, 144)}`;
        let e = classes.get(key);
        if (!e) { e = { As: [], A0: null, D: null, count: 0, viol: 0 }; classes.set(key, e); }
        e.count++;
        if (e.As.length < 300) e.As.push(A);
      }
    }
    prevT = c.t; prevC = c;
    const st = stepFastB(c);
    if (st.degenerate || st.halt) { console.log('END', st.degenerate || 'HALT'); break outer; }
    c = st.c;
    if (c.t === 'R' && c.r[0] === c.r[1] && c.r[0] >= 2n) break;
  }
  n = c.r[0];
}
// fit AP per class: A0 = min As; D = gcd of differences (should stabilize > 0)
console.log(`DONE anchors=${NANCH} finalN=${n} bad=${bad} classes=${classes.size}`);
const out = [];
for (const [key, e] of classes) {
  const As = e.As.map(B);
  const A0 = As.reduce((m, a) => (a < m ? a : m));
  let D = 0n;
  for (const a of As) D = gcd(D, a - A0);
  if (D === 0n) D = 1n; // single member
  const allFit = As.every(a => (a - A0) % D === 0n);
  const chk = powInAP(A0, D);
  const minq = nu2(A0).q;
  out.push({ key, count: e.count, A0: A0.toString(), D: D.toString(), nu2A0: nu2(A0).j, q0: minq.toString(), allFit, pow: chk });
  console.log(`${key}: n=${e.count} A0=${A0} D=${D} j0=${nu2(A0).j} q0=${minq} allFit=${allFit} POW-IN-AP=${chk.hit}${chk.hit ? ' t=' + chk.t : ''}`);
}
function gcd(a, b) { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) { const t = a % b; a = b; b = t; } return a; }
writeFileSync('births8-classes.json', JSON.stringify(out, null, 1));
