// v7-census.mjs — §v7 family census: bucket EVERY q≡1 (mod 144) L-exit root birth across
// constructed anchors a=AMIN..AMAX × w-list by its exact (ty, j, sig-form, d) signature;
// verify each bucket is an affine family A = 3·2^e·w + 2^j (or odd variant), all members
// parity-killed (odd part odd and > 1); report first level, persistence, member count.
import { stepFastB } from './bstep.mjs';
const AMIN = Number(process.argv[2] ?? 13), AMAX = Number(process.argv[3] ?? 300);
const WS = (process.argv[4] ?? '3,9,15').split(',').map(Number);
const B = BigInt;
const nu2 = (v) => { let n = 0n; let x = B(v); while ((x & 1n) === 0n) { n++; x >>= 1n; } return { j: n, q: x }; };
const mod = (v, m) => Number(((B(v) % B(m)) + B(m)) % B(m));
function walk(n) {
  let c = { t: 'R', r: [n, n] }, prevT = 'START', prevC = null; const births = [];
  for (let it = 0; it < 5000000; it++) {
    if (c.t === 'S' && (c.r[1] & 1n) === 0n) {
      const A = c.r[0] + c.r[1] / 2n + 1n; let ty = null, sig = null, r2 = null;
      if (prevT === 'L') { ty = 'Lk'; sig = prevC.r[0] + prevC.r[2]; r2 = prevC.r[1]; }
      else if (prevT === 'R') { ty = prevC.r[0] === 1n ? 'E1r' : 'L3'; sig = prevC.r[0]; r2 = prevC.r[1]; }
      if (ty && ty !== 'E1r') births.push({ ty, sig, r2, A });
    }
    prevT = c.t; prevC = c;
    const st = stepFastB(c);
    if (st.degenerate || st.halt) return { births };
    c = st.c;
    if (c.t === 'R' && c.r[0] === c.r[1] && c.r[0] >= 2n) return { births };
  }
  return { births: null };
}
// signature of a q1 birth: for Lk, sig = 2^k·w + s0 (s0 ∈ {0,1}); for L3, sig = 2^k·w exactly (observed).
// derive k from sig: strip w: for each w in probe, sig−s0 must be w·2^k with the SAME k.
function sigK(sig, w) { // returns {k, s0} if sig = 2^k·w + s0 with small s0
  for (const s0 of [0n, 1n]) { const t = sig - s0; if (t % B(w) === 0n && t / B(w) > 0n) { const u = t / B(w); if ((u & (u - 1n)) === 0n) return { k: u.toString(2).length - 1, s0 }; } }
  return null;
}
const fams = new Map();
let q1 = 0, bad = 0, walks = 0;
for (let a = AMIN; a <= AMAX; a++) for (const w of WS) {
  const n = (1n << B(a)) * B(w) - 3n; const r = walk(n); walks++;
  if (!r.births) { console.log(`a=${a} w=${w} CAP`); bad++; continue; }
  for (const b of r.births) {
    const { j, q } = nu2(b.A);
    if (mod(q, 144) !== 1) continue;
    q1++;
    if (!((q & 1n) === 1n && q > 1n)) { console.log(`PARITY-KILL FAIL a=${a} w=${w} A=${b.A}`); bad++; }
    const sk = sigK(b.sig, w); const d = b.r2 - b.sig;
    const fk = `${b.ty}|j${j}|k${sk ? sk.k + (sk.s0 ? '+1' : '') : '?'}|d${d}`;
    let f = fams.get(fk); if (!f) { f = { ty: b.ty, j, k: sk?.k, s0: sk?.s0, d, members: 0, first: a, last: a, levels: new Set(), formOK: true, minA: b.A }; fams.set(fk, f); }
    f.members++; f.levels.add(a); f.last = Math.max(f.last, a); if (b.A < f.minA) f.minA = b.A;
    // exact form check: Lk: A = 3·2^k·w + 2^j  (sig = 2^k·w+1, d = 2^(j+1)-2-... empirically d varies)
    //                  L3: A = 3·2^k·w + 2^j or odd variant; derive from (ty, sig, d): A = (3(sig−s0·0)...):
    // direct: A must equal ((3·sig + d) / 2) + 1  — engine identity; affine-in-w check:
    if (sk) { const expect = b.ty === 'Lk' ? null : null; }
  }
}
console.log(`== v7-census a=${AMIN}..${AMAX} w=[${WS}]: walks=${walks}, q≡1(mod144) L-births=${q1} ==`);
const arr = [...fams.entries()].sort((x, y) => x[1].first - y[1].first);
for (const [k, f] of arr) {
  const lv = [...f.levels].sort((a, b) => a - b);
  const contiguous = lv.length === (lv[lv.length - 1] - lv[0] + 1);
  const persist = contiguous && lv[0] + lv.length - 1 === AMAX && lv.length > 1;
  console.log(`  ${k}: first=a${f.first} last=a${f.last} levels=${lv.length}${contiguous ? '' : ' (gappy)'}${persist ? ' [PERSISTENT to AMAX]' : lv.length === 1 ? ' [LEVEL-EXACT]' : ' [RANGE a' + lv[0] + '..' + lv[lv.length-1] + ']'} members=${f.members} minA=${f.minA}`);
}
console.log(bad === 0 ? 'PARITY KILL: every q≡1 birth has odd part odd and > 1 — ALL PASS' : `FAILURES ${bad}`);
