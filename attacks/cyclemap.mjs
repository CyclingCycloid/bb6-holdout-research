// P3: exact cycle-map analysis.
// A "cycle" = maximal run of k>=1 steps of a<b (T2) followed by exactly ONE step of a>b (T1),
// starting from a state with a<b. Claim (derived by hand):
//   with u=a+1, v=b+1:  (u,v) -> M_k (u,v)^T + c_k,
//   M_k = [[2^{k+1}-1, -1], [-4(2^k-1), 4]],  c_k = (1-k, 4k-1)
// We VERIFY this on the true orbit for every cycle (BigInt exact), and then
// analyze: eigenvalues of M_k, the Möbius action on ratio, per-cycle growth.
// Also handle cycles that END in a run of T1 steps (j>1 consecutive T1s):
//   j consecutive T1 steps: (a,b) -> (a - j b - s_j, 4^j b + 2(4^j-1)/3) with s_j = sum 4^i*... derived numerically instead.

const N = parseInt(process.argv[2] || '200000');
let a = 1n, b = 2n;

// eigen of 2x2 matrix
function eig([[p, q], [r, s]]) {
    const tr = p + s, det = p * s - q * r, disc = tr * tr / 4 - det;
    if (disc < 0) return { complex: true, absDet: Math.sqrt(det) };
    const l1 = tr / 2 + Math.sqrt(disc), l2 = tr / 2 - Math.sqrt(disc);
    return { l1, l2 };
}

let cycles = 0, mismatches = 0;
const kCount = new Map();
const growthLog = [];   // (k, log2 lambda1, actual log2 growth of v per cycle) -- actual measured on top bits
let vPrevBits = 2;
const t0 = Date.now();
while (cycles < 40000) {
    // start of cycle: a<b (T2 run) -- if a>b at cycle start, it's a T1-run cycle; handle generally below
    if (a > b) {
        // pure T1 run: consume T1 steps until a<b or halt
        let j = 0, a0 = a, b0 = b;
        while (a > b) { const nx = [a - b, 4n * b + 2n]; [a, b] = nx; j++; if (a === b) { console.log('HALT'); process.exit(0); } }
        // verify affine formula for j consecutive T1s: b_j = 4^j b0 + 2*(4^j-1)/3, a_j = a0 - j*b0 - (2/3)(4^{j-1}-1)... just record j
        cycles++;
        kCount.set('T1x' + j, (kCount.get('T1x' + j) || 0) + 1);
        continue;
    }
    // T2 run + single T1
    let k = 0, u0 = a + 1n, v0 = b + 1n;
    while (a < b) { const nx = [2n * a + 1n, b - a]; [a, b] = nx; k++; }
    if (a === b) { console.log(`HALT after k=${k} T2 steps`); process.exit(0); }
    // now a>b: one T1 step
    const nx = [a - b, 4n * b + 2n];
    [a, b] = nx;
    if (a === b) { console.log(`HALT at cycle end k=${k}`); process.exit(0); }
    // verify formula
    const P = 1n << BigInt(k + 1), Q = 1n << BigInt(k);
    const uPred = (P - 1n) * u0 - v0 + (1n - BigInt(k));
    const vPred = -4n * (Q - 1n) * u0 + 4n * v0 + (4n * BigInt(k) - 1n);
    if (uPred !== a + 1n || vPred !== b + 1n) {
        mismatches++;
        if (mismatches < 3) console.log(`CYCLE FORMULA MISMATCH k=${k}: pred (${uPred - 1n},${vPred - 1n}) actual (${a},${b})`);
    }
    cycles++;
    kCount.set(k, (kCount.get(k) || 0) + 1);
    if (cycles % 4000 === 0) {
        const bits = b.toString(2).length;
        growthLog.push([cycles, k, (bits - vPrevBits), bits]);
        vPrevBits = bits;
    }
}
console.log(`cycles=${cycles} formulaMismatches=${mismatches} ms=${Date.now() - t0}`);
console.log('k-histogram:', [...kCount.entries()].sort((x, y) => (typeof x[0] === 'string' ? 99 : x[0]) - (typeof y[0] === 'string' ? 99 : y[0])).map(([k, c]) => `${k}:${c}`).join(' '));
console.log('sample per-cycle v-growth (bits):', growthLog.slice(0, 8).map(g => `cyc${g[0]}(k=${g[1]}):+${g[2]}bits`).join(' '));

// eigen analysis of M_k for k=1..17
console.log('\nk\tlambda1(M_k)\tlog2(l1)\tlog2(det)/2\tdominant eigvec slope v/u');
for (let k = 1; k <= 17; k++) {
    const P = Math.pow(2, k + 1) - 1, Q = Math.pow(2, k);
    const M = [[P, -1], [-4 * (Q - 1), 4]];
    const e = eig(M);
    const tr = P + 4, det = 4 * P - 4 * (Q - 1);
    // dominant eigenvector: (M - l1 I) x = 0: x = (1, (P - l1)) or ((l1-4), -4(Q-1)) -> slope y/x = (l1 - P)/(-1)?? compute: rows: P x - y = l1 x => y = (P - l1) x
    const slope = P - e.l1; // v/u ratio of eigenvector
    console.log(`${k}\t${e.l1.toFixed(6)}\t${(Math.log2(e.l1)).toFixed(4)}\t${(Math.log2(det) / 2).toFixed(4)}\t${slope.toFixed(6)}`);
}

// Average growth per cycle from histogram weights vs. empirical 0.2178 bits/step
let sumW = 0, sumSteps = 0, sumLog2Growth = 0;
for (const [k, c] of kCount) {
    if (typeof k !== 'number') continue;
    const P = Math.pow(2, k + 1) - 1, Q = Math.pow(2, k);
    const M = [[P, -1], [-4 * (Q - 1), 4]];
    const e = eig(M);
    sumW += c; sumSteps += c * (k + 1);
    sumLog2Growth += c * Math.log2(e.l1);
}
console.log(`\nweighted mean log2(lambda1) per cycle = ${(sumLog2Growth / sumW).toFixed(4)}`);
console.log(`mean steps per cycle = ${(sumSteps / sumW).toFixed(4)}`);
console.log(`implied bits/step = ${(sumLog2Growth / sumSteps).toFixed(5)} (empirical: 0.2178)`);
