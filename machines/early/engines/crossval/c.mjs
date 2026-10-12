// Group C checks (fresh implementations, BigInt).
// C1: strict monovariant a+b (+1 under a<b/T2; +2b+2 under a>b/T1) over 1e5 steps.
// C2: L3 invariant [b = 2 mod 4] or [a odd] for every state n>=1; halt-value consequence.
// C4: cycle maps: k consecutive T2 steps + one T1 step acts affinely on (u,v)=(a+1,b+1)
//     with M_k = [[2^{k+1}-1,-1],[-4(2^k-1),4]] + c=(1-k, 4k-1); and k = floor(log2((a+b+2)/(a+1))).
import { orbitStates } from './orbitgen.mjs';

const N = 100000;
const states = [];
for (const [a, b] of orbitStates(N)) states.push([a, b]);
console.log(`orbit: ${states.length} states generated (n=0..${states.length - 1}, 0-based)`);

// ---------------- C1 ----------------
{
    let bad = 0, nT1 = 0, nT2 = 0;
    for (let n = 0; n + 1 < states.length; n++) {
        const [a, b] = states[n];
        const [a2, b2] = states[n + 1];
        const s = a + b, s2 = a2 + b2;
        if (a > b) { // T1
            nT1++;
            if (!(s2 === s + 2n * b + 2n && a2 === a - b && b2 === 4n * b + 2n)) { bad++; if (bad < 5) console.log(`C1 FAIL at state ${n}: (${a},${b})`); }
        } else {     // T2
            nT2++;
            if (!(s2 === s + 1n && a2 === 2n * a + 1n && b2 === b - a)) { bad++; if (bad < 5) console.log(`C1 FAIL at state ${n}: (${a},${b})`); }
        }
        if (!(s2 > s)) { bad++; console.log(`C1 FAIL: sum not increasing at ${n}`); }
    }
    console.log(`C1: ${states.length - 1} transitions: T1=${nT1} (sum +2b+2), T2=${nT2} (sum +1), failures=${bad}`);
    // algebra: T2: (2a+1)+(b-a)=a+b+1. T1: (a-b)+(4b+2)=a+3b+2=(a+b)+(2b+2). Checked symbolically above.
}

// ---------------- C2 ----------------
{
    let bad = 0;
    for (let n = 1; n < states.length; n++) { // every state n >= 1 (0-based: states 1..N)
        const [a, b] = states[n];
        if (!((b % 4n === 2n) || (a % 2n === 1n))) { bad++; if (bad < 5) console.log(`C2 FAIL at state ${n}: (${a},${b})`); }
    }
    // state 0 = (1,2): b=2 = 2 mod 4 OK too
    console.log(`C2: states 1..${states.length - 1} checked (n>=1): [b=2 mod 4 or a odd] failures=${bad}`);
    console.log(`C2: hence any halt state (z,z) reached at n>=1 has z odd or z=2 mod 4 => z != 0 mod 4 (logic: halt state is an orbit state)`);
}

// ---------------- C4 ----------------
{
    // parse cycles: start at a state with a<b (following a T1 or the orbit start);
    // k = number of consecutive T2 steps; the cycle ends with the one T1 step after them.
    const cycles = [];
    let idx = 0;
    while (cycles.length < 2000 && idx < states.length - 1) {
        const [a, b] = states[idx];
        if (a >= b) { idx++; continue; }
        let k = 0, j = idx;
        while (j < states.length && states[j][0] < states[j][1]) { k++; j++; }
        if (idx + k + 1 >= states.length) break; // need the post-T1 state
        const [A, B] = states[idx];
        const [A3, B3] = states[idx + k + 1]; // k T2 steps then 1 T1 step
        cycles.push({ k, A, B, A3, B3 });
        idx = idx + k + 1;
    }
    let okMap = 0, okK = 0, badMap = 0, badK = 0;
    const kHist = {};
    for (const c of cycles) {
        const { k, A, B, A3, B3 } = c;
        const u = A + 1n, v = B + 1n;
        const P = 1n << BigInt(k + 1), Q = 1n << BigInt(k);
        const up = (P - 1n) * u - v + (1n - BigInt(k));
        const vp = -4n * (Q - 1n) * u + 4n * v + (4n * BigInt(k) - 1n);
        if (up === A3 + 1n && vp === B3 + 1n) okMap++; else { badMap++; if (badMap < 4) console.log(`C4 MAP FAIL k=${k} (${A},${B})->(${A3},${B3}) predicted (${up - 1n},${vp - 1n})`); }
        // k = floor(log2((a+b+2)/(a+1))): 2^k*(a+1) <= a+b+2 < 2^{k+1}*(a+1)
        const lhs = Q * u, mid = A + B + 2n, rhs = P * u;
        if (lhs <= mid && mid < rhs) okK++; else { badK++; if (badK < 4) console.log(`C4 K FAIL k=${k} at (${A},${B}): 2^k*u=${lhs} <= u+v=${mid} < 2^(k+1)*u=${rhs} failed`); }
        kHist[k] = (kHist[k] || 0) + 1;
    }
    console.log(`C4: ${cycles.length} cycles: affine map exact ${okMap}/${cycles.length} (bad ${badMap}); k-formula exact ${okK}/${cycles.length} (bad ${badK})`);
    console.log(`C4: k histogram (first cycles): ${JSON.stringify(Object.entries(kHist).slice(0, 12))}`);
}
