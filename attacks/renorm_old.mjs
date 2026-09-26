// P3b: renormalized direction dynamics — verification on the true orbit.
// Cycle starts (a<b about to run T2's). Direction s = v/u = (b+1)/(a+1).
// Idealized (affine constants dropped) branch: run length k = floor(log2(s+1))?? verify:
//   execute T2 at run-index j iff (2^{j+1}-1)u < v + j  <=>  s > 2^{j+1}-1 - j/u
//   => k = #{j>=0 : s > 2^{j+1}-1 (approx)} = floor(log2(s+1)) approx. VERIFY.
// Idealized image direction: s' = 4(s-(2^k-1))/((2^{k+1}-1)-s)   [M_k linear part]
// Decoupling: t = s+1, t = 2^k x with x in (1,2):  t' = h(x) = (3x-2)/(2-x),
//   mantissa map phi(x) = h(x)/2^{floor(log2 h(x))}, octave k' = k + floor(log2 h(x)).
// Halting during the run <=> s = 2^{i+1}-1 exactly <=> x = 1 exactly (top of octave).
// We verify: (1) k_t = floor(log2(s_t+1)) holds with vanishing exceptions,
//            (2) relative error of idealized s' vs true s' decays like O(1/u_t 2^{k_t}),
//            (3) the mantissa orbit x_t wanders in (1,2) aperiodically, min distance
//                to 1 (relative) over 40k cycles — quantifies how far from halting.
const N = 40000;
let a = 1n, b = 2n;
const topbits = (x) => { const bl = x.toString(2).length; const sh = Math.max(0, bl - 62); return [Number(x >> BigInt(sh)), sh]; };
function ratio(a, b) { // (b+1)/(a+1) as float with ~1e-15 rel precision
    const [na, sa] = topbits(a + 1n), [nb, sb] = topbits(b + 1n);
    return nb * Math.pow(2, sb) / (na * Math.pow(2, sa));
}
let kmatch = 0, kmiss = 0, missExamples = [];
const errs = []; const xvals = []; const kOf = [];
let minX = 2, minXAt = -1, minXu = 0n;
for (let cyc = 0; cyc < N; cyc++) {
    // advance to next T2-run start (a<b), i.e. skip T1-run cycles
    while (a > b) { const nx = a > b ? [a - b, 4n * b + 2n] : [2n * a + 1n, b - a]; [a, b] = nx; }
    const u = a + 1n, v = b + 1n;
    const s = ratio(a, b);
    // count actual run length k
    let k = 0, aa = a, bb = b;
    while (aa < bb) { const nx = [2n * aa + 1n, bb - aa]; [aa, bb] = nx; k++; }
    const kIdeal = Math.floor(Math.log2(s + 1));
    if (kIdeal === k) kmatch++; else { kmiss++; if (missExamples.length < 8) missExamples.push([cyc, k, kIdeal, s]); }
    // mantissa x = (s+1)/2^{floor(log2(s+1))}
    const t = s + 1, kk = Math.floor(Math.log2(t));
    const x = t / Math.pow(2, kk);
    if (x < minX && x >= 1) { minX = x; minXAt = cyc; minXu = u; }
    xvals.push(x); kOf.push(k);
    // execute the run + one T1 to reach next cycle start state (before T1-run skip)
    [a, b] = [aa, bb];
    if (a === b) { console.log('HALT'); process.exit(0); }
    [a, b] = [a - b, 4n * b + 2n]; // T1 step
    if (a === b) { console.log('HALT after T1'); process.exit(0); }
    const s2true = ratio(a, b); // direction after T1; if a>b a T1-run cycle follows, we still compare raw direction
    const kK = k;
    const sIdeal = 4 * (s - (Math.pow(2, kK) - 1)) / ((Math.pow(2, kK + 1) - 1) - s);
    const rel = Math.abs(sIdeal - s2true) / s2true;
    errs.push([cyc, rel, Number(u), kK]);
}
console.log(`run-length prediction k = floor(log2(s+1)): match=${kmatch} miss=${kmiss}`);
console.log('miss examples (cycle, kActual, kIdeal, s):', JSON.stringify(missExamples));
// relative error decay: bucket by cycle
for (const [lo, hi] of [[0, 100], [1000, 1100], [10000, 10100], [30000, 30100], [39900, 40000]]) {
    const es = errs.slice(lo, hi).map(e => e[1]);
    const mx = Math.max(...es), mn = Math.min(...es);
    console.log(`cycles ${lo}-${hi}: relErr(idealized vs true s') min=${mn.toExponential(3)} max=${mx.toExponential(3)} (u~2^${Math.log2(errs[lo][2]).toFixed(0)})`);
}
console.log(`mantissa x: min=${minX.toFixed(9)} at cycle ${minXAt} (u=${minXu})  [halting needs x=1 exactly]`);
// distribution of x
const buckets = new Array(20).fill(0);
for (const x of xvals) buckets[Math.min(19, Math.floor((x - 1) * 20))]++;
console.log('x histogram (1.0..2.0 in 20 bins):', buckets.join(' '));
// lag-1 return map structure check: is x' = phi(x) exactly?
let phOK = 0, phErr = 0, phMaxErr = 0;
for (let i = 0; i + 1 < xvals.length; i++) {
    const x = xvals[i], xp = xvals[i + 1];
    const h = (3 * x - 2) / (2 - x);
    const phi = h / Math.pow(2, Math.floor(Math.log2(h)));
    const e = Math.abs(phi - xp) / xp;
    if (e < 1e-9) phOK++; else phErr++;
    if (e > phMaxErr && i > 100) phMaxErr = e;
}
console.log(`mantissa map x'=phi(x): within-1e-9: ${phOK}, outside: ${phErr}, max rel err (after warmup): ${phMaxErr.toExponential(3)}`);
