// Group B checks (fresh implementations).
// B1: z-identity / monovariant over 500 BigInt steps.
// B2: alpha via exact rational nested intervals (both composition orders).
// B5: modular first occurrences.
import { orbit, orbitStates } from './orbitgen.mjs';

// ---------------- B1 ----------------
{
    const N = 500;
    let pa = 1n, pb = 2n, ok1 = 0, ok2 = 0, bad1 = 0;
    for (let n = 1; n <= N; n++) {
        const s0 = pa + pb;
        const wasT1 = pa > pb;
        let na, nb;
        if (wasT1) { na = pa - pb; nb = 4n * pb + 2n; } else { na = 2n * pa + 1n; nb = pb - pa; }
        const s1 = na + nb;
        const inc = s1 - s0;
        if (!(s1 > s0)) { bad1++; console.log(`B1 FAIL: sum not increasing at n=${n}`); }
        if (wasT1) { if (inc === 2n * pb + 2n) ok1++; else { bad1++; console.log(`B1 FAIL T1 increment at n=${n}: ${inc} vs ${2n * pb + 2n}`); } }
        else       { if (inc === 1n) ok2++; else { bad1++; console.log(`B1 FAIL T2 increment at n=${n}: ${inc}`); } }
        pa = na; pb = nb;
    }
    const s500 = pa + pb;
    const z500 = 1 / Number(s500 + 1n);
    console.log(`B1: ${N} steps: sum strictly increases: ${bad1 === 0}; T1-increments ok=${ok1} (+2b+2), T2-increments ok=${ok2} (+1), failures=${bad1}`);
    console.log(`B1: z_500 = 1/(a+b+1) = ${z500.toExponential(4)} (report claims ~6.8e-36); 1/z_n = a_n+b_n+1 verified ${N}x`);
}

// ---------------- B2: alpha ----------------
{
    const N = 220;
    const S = [];
    for (const [a, b] of orbitStates(N)) S.push(a > b ? 1 : 2); // S[j] = branch of state j (0-based); s_k (1-based, per report) = S[k-1]

    // g1(y) = (3y+1)/(2y+2), g2(y) = y/2, both increasing. Exact BigInt fractions [p,q].
    const g1 = ([p, q]) => [3n * p + q, 2n * p + 2n * q];
    const g2 = ([p, q]) => [p, 2n * q];
    // y=1-x coordinate inverse branches (from team's alpha_diag.py, for the wrong-variant probe)
    const g1y = ([p, q]) => [p * 1n, 4n * q - 2n * p]; // v/(4-2v)
    const g2y = ([p, q]) => [p + q, 2n * q];           // (v+1)/2

    function intervalFormula(n) { // I_n = g_{s1}(g_{s2}(...g_{sn}((0,1)))) : apply g_{s_n} FIRST (innermost), g_{s_1} LAST
        let I = [[0n, 1n], [1n, 1n]];
        for (let k = n - 1; k >= 0; k--) { const g = S[k] === 1 ? g1 : g2; I = [g(I[0]), g(I[1])]; }
        return I;
    }
    function intervalRunning(n) { // R_n = g_{s_n}(g_{s_{n-1}}(...g_{s_1}((0,1)))) : running update, newest OUTSIDE
        let I = [[0n, 1n], [1n, 1n]];
        for (let k = 0; k < n; k++) { const g = S[k] === 1 ? g1 : g2; I = [g(I[0]), g(I[1])]; }
        return I;
    }
    function intervalRunningY(n) { // running update in y-coords (branch a>b -> g1y), team's suspected first attempt
        let I = [[0n, 1n], [1n, 1n]];
        for (let k = 0; k < n; k++) { const g = S[k] === 1 ? g1y : g2y; I = [g(I[0]), g(I[1])]; }
        return I;
    }
    const dec = (fr, digits) => { // decimal string of p/q
        const [p, q] = fr; let num = p * 10n ** BigInt(digits);
        const int = num / q; let str = int.toString().padStart(digits + 1, '0');
        return str.slice(0, 1) + '.' + str.slice(1);
    };
    const width = (I) => Number(I[1][0] * I[0][1] - I[0][0] * I[1][1]) / Number(I[0][1] * I[1][1]);
    const mid = (I) => [I[0][0] * I[1][1] + I[1][0] * I[0][1], 2n * I[0][1] * I[1][1]];

    for (const n of [60, 63, 80, 100, 120, 200]) {
        const I = intervalFormula(n);
        const w = width(I);
        console.log(`B2 formula-order  n=${n}: alpha in [${dec(I[0], 18)}, ${dec(I[1], 18)}] width=${w.toExponential(4)} log10(w)/n=${(Math.log10(w) / n).toFixed(4)}`);
    }
    {
        const I = intervalFormula(200); const m = mid(I);
        console.log(`B2 formula-order  alpha ~ ${dec(m, 20)} (claim 0.3621250257705563)`);
        const I120 = intervalFormula(120); const m120 = mid(I120);
        console.log(`B2 formula-order  alpha(120) = ${dec(m120, 20)}`);
    }
    for (const n of [63, 100, 200]) {
        const R = intervalRunning(n);
        console.log(`B2 running-order(x)  n=${n}: ~ ${dec(mid(R), 18)} width=${width(R).toExponential(3)}`);
        const Ry = intervalRunningY(n);
        console.log(`B2 running-order(y)  n=${n}: ~ ${dec(mid(Ry), 18)} width=${width(Ry).toExponential(3)}`);
    }
}

// ---------------- B5: modular ----------------
{
    const N = 100000;
    const first = {}, seq8 = [];
    let k = 0; // 0-based state index
    for (const [a, b] of orbitStates(N)) {
        if (k >= 1) { // skip initial state (1,2): a≠b anyway; record from state 1 on
            for (const M of [8n, 24n, 64n, 128n]) {
                if (first[M.toString()] === undefined && (a % M) === (b % M)) first[M.toString()] = { state1based: k + 1, state0based: k, a: a.toString(), b: b.toString() };
            }
            if (seq8.length < 8 && (a % 8n) === (b % 8n)) seq8.push(k);
        }
        k++;
    }
    console.log('B5 first occurrences of a=b (mod M), 1e5 steps (state0based follows the reports convention):');
    for (const M of ['8', '24', '64', '128']) console.log(`  M=${M}: ${JSON.stringify(first[M])}`);
    console.log(`B5 T8 sequence (0-based states): ${JSON.stringify(seq8)} (literature claims {7,11,24,44,55,...})`);
}
