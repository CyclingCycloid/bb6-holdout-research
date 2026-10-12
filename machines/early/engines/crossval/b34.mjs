// B3: invariant density checks; B4: drift. Pure float math, fresh implementation.
// Density f(r) = 2/(ln3 (r+1)(r+3)) on r=b/a. FP: f(y) = 4/(y+4)^2 f(y/(y+4)) + 2 f(2y+1).
{
    const ln3 = Math.log(3), ln2 = Math.log(2);
    const f = (r) => 2 / (ln3 * (r + 1) * (r + 3));

    // ---- B3a: normalization integral in u-coordinate (u=(r+1)/(r+3) in (1/3,1), f dr = du/(u ln3)) ----
    const simpson = (g, A, B, n) => { // composite Simpson (n even)
        const h = (B - A) / n; let s = g(A) + g(B);
        for (let i = 1; i < n; i++) s += g(A + i * h) * (i % 2 ? 4 : 2);
        return s * h / 3;
    };
    const eps = 1e-12;
    const part = simpson((u) => 1 / (u * ln3), 1 / 3, 1 - eps, 2000000);
    const tail = Math.log(1 / (1 - eps)) / ln3; // integral of 1/(u ln3) on [1-eps, 1)
    console.log(`B3: integral of f over (0,inf) = ${(part + tail).toFixed(12)}  (claim: 1; error ${(part + tail - 1).toExponential(2)})`);

    // ---- B3b: FP pointwise residual at 20 seeded random y ----
    let s2 = 123456789;
    const rand = () => { s2 = (1103515245 * s2 + 12345) & 0x7fffffff; return s2 / 0x7fffffff; };
    let maxRes = 0, maxAt = 0;
    for (let i = 0; i < 20; i++) {
        const y = Math.pow(10, -2 + 4 * rand()); // y in (0.01, 100)
        const lhs = f(y);
        const rhs = 4 / ((y + 4) * (y + 4)) * f(y / (y + 4)) + 2 * f(2 * y + 1);
        const res = Math.abs(lhs - rhs);
        if (res > maxRes) { maxRes = res; maxAt = y; }
    }
    console.log(`B3: FP residual max over 20 random y = ${maxRes.toExponential(3)} at y=${maxAt.toFixed(4)} (claim < 1e-12; reports got 5.6e-17)`);

    // ---- B4: drift E[Delta ln a] = int_0^1 f(r) ln(1-r) dr + ln2 * P(r>1) ----
    // u-coordinate: r in (0,1) <-> u in (1/3, 1/2); 1-r = 2(1-2u)/(1-u); f dr = du/(u ln3)
    // substitute s=1-2u in (0,1/3), then s = t^2 to kill the ln s singularity at s=0.
    const intg = (t) => t === 0 ? 0 : 2 * t * (2 * Math.log(2) + 2 * Math.log(t) - Math.log(1 + t * t)) / ((1 - t * t) * ln3);
    const int0 = simpson(intg, 0, Math.sqrt(1 / 3), 2000000);
    const Pgt1 = 1 - Math.log(1.5) / ln3;
    const drift = int0 + ln2 * Pgt1;
    console.log(`B4: quadrature drift = ${drift.toFixed(10)} (claim 0.1509769445, diff ${(drift - 0.1509769445).toExponential(2)})`);

    // closed form cross-check: (-pi^2/12 + 1.5 ln^2 2 + Li2(1/4))/ln3
    let Li2q = 0; for (let k = 1; k < 80; k++) Li2q += Math.pow(0.25, k) / (k * k);
    const closed = (-Math.PI * Math.PI / 12 + 1.5 * ln2 * ln2 + Li2q) / ln3;
    console.log(`B4: closed form      = ${closed.toFixed(10)}  [Li2(1/4)=${Li2q.toFixed(12)}]`);
    console.log(`B3/D3: P(r<1) = ln(3/2)/ln3 = ${(Math.log(1.5) / ln3).toFixed(9)} (claim 0.369070)`);
}
