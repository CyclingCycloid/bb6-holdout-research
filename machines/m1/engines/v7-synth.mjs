// v7-synth.mjs — §v7 decisive experiment (v2): synthetic class-member extraction at constructed
// anchors n = 2^a·w − 3. Full geometry of every q≡1 (mod 144) root birth (the dangerous-key set),
// drift-law identification, parity-kill assertion table.
// Usage: node v7-synth.mjs AMIN AMAX [wlist]
import { stepFastB } from './bstep.mjs';

const AMIN = Number(process.argv[2] ?? 13);
const AMAX = Number(process.argv[3] ?? 80);
const WS = (process.argv[4] ?? '3,9,15,21,27,33').split(',').map(Number);
const B = BigInt;
const nu2 = (v) => { let n = 0n; let x = B(v); while ((x & 1n) === 0n) { n++; x >>= 1n; } return { j: n, q: x }; };
const mod = (v, m) => Number(((B(v) % B(m)) + B(m)) % B(m));

function walk(n) {
  let c = { t: 'R', r: [n, n] }, prevT = 'START', prevC = null;
  const births = [];
  for (let it = 0; it < 5000000; it++) {
    if (c.t === 'S' && (c.r[1] & 1n) === 0n) {
      const A = c.r[0] + c.r[1] / 2n + 1n;
      let ty = null, sig = null, r2 = null;
      if (prevT === 'L') { ty = 'Lk'; sig = prevC.r[0] + prevC.r[2]; r2 = prevC.r[1]; }
      else if (prevT === 'R') { ty = prevC.r[0] === 1n ? 'E1r' : 'L3'; sig = prevC.r[0]; r2 = prevC.r[1]; }
      if (ty) births.push({ ty, sig, r2, A });
    }
    prevT = c.t; prevC = c;
    const st = stepFastB(c);
    if (st.degenerate || st.halt) return { births, end: st.degenerate || 'HALT' };
    c = st.c;
    if (c.t === 'R' && c.r[0] === c.r[1] && c.r[0] >= 2n) return { births, landing: c.r[0] };
  }
  return { births, end: 'CAP' };
}

// family recognizers (drift law): express (A, sig, r2-sig) in the form  A = c2·w + c0, sig = s2·w + s0
function classify(b, w) {
  const d = b.r2 - b.sig;
  if (b.A === 3n * (1n << 12n) * B(w) + 16n && b.sig === (1n << 13n) * B(w) && d === 30n) return 'F13';
  if (b.A === 3n * (1n << 25n) * B(w) + 32n && b.sig === (1n << 26n) * B(w) + 1n && d === 59n) return 'F26';
  return `OTHER`;
}

let fails = 0, q1tot = 0, allBirths = 0;
const famCount = { F13: 0, F26: 0, OTHER: 0 };
const otherRecs = [];
const newLKeys = new Map();
const knownKeys = new Set(['L3|j2|A76|q19','Lk|j0|A77|q77','L3|j2|A76|q55','L3|j2|A76|q91','L3|j2|A76|q127',
  'L3|j0|A7|q7','Lk|j3|A8|q73','L3|j0|A13|q13','Lk|j1|A14|q7','L3|j4|A16|q1','L3|j0|A77|q77','Lk|j0|A17|q17',
  'L3|j0|A29|q29','L3|j0|A125|q125','L3|j0|A19|q19','Lk|j2|A20|q5','L3|j0|A25|q25','Lk|j1|A26|q13',
  'L3|j2|A28|q7','Lk|j0|A29|q29','Lk|j5|A32|q1']);
const rows = [];
for (let a = AMIN; a <= AMAX; a++) {
  for (const w of WS) {
    const n = (1n << B(a)) * B(w) - 3n;
    const r = walk(n);
    if (r.end) { console.log(`a=${a} w=${w} END=${r.end} FAIL`); fails++; continue; }
    const cls = mod(r.landing, 6) === 3, grow = r.landing >= n + 6n;
    let powOK = true, e1rOK = true, parityOK = true;
    for (const b of r.births) {
      allBirths++;
      const { j, q } = nu2(b.A);
      if (q === 1n) powOK = false;
      if (b.ty === 'E1r' && b.A % 3n !== 0n) e1rOK = false;
      if (b.ty !== 'E1r') {
        const key = `${b.ty}|j${j}|A${mod(b.A,144)}|q${mod(q,144)}`;
        if (!knownKeys.has(key) && !newLKeys.has(key)) newLKeys.set(key, `a=${a} w=${w}`);
        if (mod(q, 144) === 1) {
          q1tot++;
          const f = classify(b, w);
          famCount[f === 'OTHER' ? 'OTHER' : f]++;
          // THE PARITY KILL itself: odd part q is odd (automatic) and > 1
          if (!((q & 1n) === 1n && q > 1n)) parityOK = false;
          if (f === 'OTHER' || a <= 40) {
            const rec = `a=${a} w=${w} ${b.ty} sig=${b.sig} r2=${b.r2} d=${b.r2-b.sig} A=${b.A} j=${j} q=${q} fam=${f}`;
            if (f === 'OTHER') otherRecs.push(rec);
            rows.push(rec);
          }
        }
      }
    }
    if (!powOK || !e1rOK || !parityOK || !cls || !grow) fails++;
  }
}
console.log(`== v7-synth v2: a=${AMIN}..${AMAX}, w=[${WS}], walks=${(AMAX-AMIN+1)*WS.length}, root births=${allBirths} ==`);
console.log(`q≡1(mod144) L-births: ${q1tot}  [F13=${famCount.F13} F26=${famCount.F26} OTHER=${famCount.OTHER}]`);
console.log('-- all q≡1 births with a≤40, and every OTHER-classified birth (any a): --');
for (const s of rows) console.log('  ' + s);
console.log(`-- parity kill on every q≡1 birth: odd part odd and >1: ${fails === 0 ? 'ALL PASS (see fail count)' : 'see failures'} --`);
console.log(`new L-keys beyond {20 observed + Lk|j5|A32|q1}: ${[...newLKeys.keys()].filter(k=>k!=='Lk|j5|A32|q1').length}`);
for (const [k, v] of newLKeys) if (k !== 'Lk|j5|A32|q1') console.log(`  ${k}  first at ${v}`);
console.log(fails === 0 ? 'ALL ASSERTIONS PASS (0 power births, E1r 3|A all, parity kill all, class+growth all)' : `FAILURES: ${fails}`);
