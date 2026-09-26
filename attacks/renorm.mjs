// P3b (overflow-proof): renormalized direction dynamics verification.
// All quantities in log2 domain; kIdeal computed exactly via BigInt comparisons.
const N = 40000;
let a = 1n, b = 2n;

function log2big(x) { // x>0 BigInt -> float log2, exact to ~1e-15
    const bl = x.toString(2).length;
    const m = Number(x >> BigInt(Math.max(0, bl - 54)));
    return (bl - 1) + Math.log2(m / Math.pow(2, Math.min(53, bl) - 1));
}
function kExact(u, v) { // largest j with 2^j * u <= u+v  (i.e. floor(log2((u+v)/u)))
    let j = 0; let p = u;
    while (2n * p <= u + v) { p *= 2n; j++; }
    return j;
}
let kmatch = 0, kmiss = 0; const missEx = [];
const relErrs = [];
const xlogs = [];
let minX = 2, minXAt = -1;
for (let cyc = 0; cyc < N; cyc++) {
    while (a > b) { const nx = [a - b, 4n * b + 2n]; [a, b] = nx; }
    const u = a + 1n, v = b + 1n;
    let k = 0, aa = a, bb = b;
    while (aa < bb) { const nx = [2n * aa + 1n, bb - aa]; [aa, bb] = nx; k++; }
    const kI = kExact(u, v);
    if (kI === k) kmatch++; else { kmiss++; if (missEx.length < 10) missEx.push([cyc, k, kI]); }
    const l2 = log2big(u + v) - log2big(u) - kI; // log2 mantissa x in [0,1)
    const x = Math.pow(2, l2);
    if (x < minX) { minX = x; minXAt = cyc; }
    xlogs.push(l2);
    relErrs.push([cyc, 0, k]);
    [a, b] = [aa, bb];
    if (a === b) { console.log('HALT'); process.exit(0); }
    [a, b] = [a - b, 4n * b + 2n];
    if (a === b) { console.log('HALT after T1'); process.exit(0); }
    const P = (1n << BigInt(k + 1)) - 1n, Q = (1n << BigInt(k)) - 1n;
    const uI = P * u - v, vI = -4n * Q * u + 4n * v;
    const uT = a + 1n, vT = b + 1n;
    relErrs[cyc][1] = Math.abs((log2big(vI) - log2big(uI)) - (log2big(vT) - log2big(uT)));
}
console.log(`k prediction (exact floor(log2((u+v)/u))): match=${kmatch} miss=${kmiss}`);
if (missEx.length) console.log('misses (cycle, kActual, kIdeal-exact):', JSON.stringify(missEx));
for (const [lo, hi] of [[0, 200], [1000, 1200], [5000, 5200], [20000, 20200], [39900, 40000]]) {
    const mx = relErrs.slice(lo, hi).reduce((p, e) => Math.max(p, e[1]), 0);
    console.log(`cycles ${lo}-${hi}: max |Delta log2 s'| idealized vs true = ${mx.toExponential(2)}`);
}
console.log(`mantissa x: min=${minX.toFixed(10)} at cycle ${minXAt}; 2^{min log2 x} = ${minX}`);
console.log(`min log2(x): ${Math.min(...xlogs).toFixed(6)} (halting needs log2 x = 0 exactly)`);
let ok = 0, bad = 0, maxE = 0;
for (let i = 100; i + 1 < xlogs.length; i++) {
    const x = Math.pow(2, xlogs[i]);
    const h = (3 * x - 2) / (2 - x);
    const lh = Math.log2(h);
    const e = Math.abs(lh - Math.floor(lh) - xlogs[i + 1]);
    if (e < 1e-9) ok++; else { bad++; if (e > maxE) maxE = e; }
}
console.log(`mantissa return map frac(log2 h(x)) vs next log2x: ok=${ok} bad=${bad} maxErr=${maxE.toExponential(2)} (bad => T1-run cycle intervened)`);
const buckets = new Array(20).fill(0);
for (const l of xlogs) buckets[Math.min(19, Math.floor(l * 20))]++;
console.log('log2-mantissa histogram [0,1) x20:', buckets.join(' '));
