function bl(x){return x.toString(2).length;}
// P3c: quantitative close-call analysis.
// For every cycle start, compute the relative distance of (u,v)=(a+1,b+1) to every
// halting line reachable from it, and track the minimum over the whole run.
// T2 side: halt at run index i (1<=i<=k) iff v = (2^{i+1}-1)u - i.
// T1 side: iterate (u,v) -> (u-v+1, 4v-1) symbolically; halt at T1-step j iff u_j = v_j.
// Relative distance = |numerator deficit| / (coefficient * scale).
const N = parseInt(process.argv[2] || '300000');
let a = 1n, b = 2n;
// T1 halting lines: u = A_j v - B_j for j=1..8 (beyond that coefficients exceed any state)
const T1lines = [];
{ let u = [1n, 0n, 0n], v = [0n, 1n, 0n]; // affine triples (cu, cv, const): value = cu*u + cv*v + const
  for (let j = 1; j <= 10; j++) {
    // one T1 step: (u,v) -> (u - v + 1, 4v - 1)
    const nu = [u[0], u[1] - v[1], u[2] - v[2] + 1n];
    const nv = [0n, 4n * v[1], 4n * v[2] - 1n];
    u = nu; v = nv;
    // halt at this step: u[0]*U + u[1]*V + u[2] = v[0]*U + v[1]*V + v[2]
    // => (u[0]-v[0])U + (u[1]-v[1])V + (u[2]-v[2]) = 0
    T1lines.push([u[0] - v[0], u[1] - v[1], u[2] - v[2], j]);
  }
}
function log2big(x) { // x>0 BigInt -> float log2
    if (x === 0n) return -1e9;
    const neg = x < 0n; if (neg) x = -x;
    const bl = x.toString(2).length;
    const m = Number(x >> BigInt(Math.max(0, bl - 54)));
    const v = (bl - 1) + Math.log2(m / Math.pow(2, Math.min(53, bl) - 1));
    return neg ? -v - 1e15 : v; // negative: flag huge (won't be a min anyway if we use abs)
}
let closest = []; // {side, idx, rd (log2 relative distance), bits}
function pushClose(side, idx, num, den, bits) {
    const l = Math.abs(log2big(num) === -1e9 ? -1e9 : log2big(num) - log2big(den));
    closest.push({ side, idx, rd: l, bits });
}
let steps = 0;
while (steps < N) {
    // T2-run start
    while (a > b) {
        // T1-run start: check T1 halting lines
        const u = a + 1n, v = b + 1n;
        for (const [cu, cv, cc, j] of T1lines) {
            const val = cu * u + cv * v + cc;
            const den = (cu < 0n ? -cu : cu) * u + (cv < 0n ? -cv : cv) * v;
            if (val === 0n) { console.log(`HALT via T1-run j=${j}`); process.exit(0); }
            pushClose('T1', j, val, den, bl(u));
        }
        const nx = [a - b, 4n * b + 2n]; [a, b] = nx; steps++;
        if (a === b) { console.log(`HALT step ${steps}`); process.exit(0); }
        if (steps >= N) break;
    }
    if (steps >= N) break;
    // now a<b: T2-run start; k = run length
    const u = a + 1n, v = b + 1n;
    let k = 0, aa = a, bb = b;
    while (aa < bb) { const nx = [2n * aa + 1n, bb - aa]; [aa, bb] = nx; k++; }
    for (let i = 1; i <= k; i++) {
        const coef = (1n << BigInt(i + 1)) - 1n;
        const val = v - coef * u + BigInt(i); // = 0 exactly on halting line
        if (val === 0n) { console.log(`HALT via T2-run i=${i}`); process.exit(0); }
        pushClose('T2', i, val, coef * u, bl(u));
    }
    // execute run
    [a, b] = [aa, bb]; steps += k;
    if (a === b) { console.log(`HALT step ${steps}`); process.exit(0); }
    const nx = [a - b, 4n * b + 2n]; [a, b] = nx; steps++;
    if (a === b) { console.log(`HALT step ${steps}`); process.exit(0); }
}
closest.sort((x, y) => x.rd - y.rd);
console.log(`closest approaches to halting lines over ${N} steps (relative distance):`);
closest = closest.filter(c=>Math.abs(c.rd)<1e8); for (const c of closest.slice(0, 15)) console.log(`  ${c.side} i/j=${c.idx}: relDist=2^${Math.log2(c.rd).toFixed(1)} (u~2^${c.bits})`);
console.log('NOTE: |a-b| at the near-miss states equals |val| on the corresponding line (up to factor).');
