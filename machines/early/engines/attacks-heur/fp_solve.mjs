// BMO1 heuristics - Frobenius-Perron invariant density, numerical.
// Map on r=b/a:  Phi(r) = 4r/(1-r)  (r<1)   [branch a>b: (a,b)->(a-b,4b+2)]
//                Phi(r) = (r-1)/2    (r>1)   [branch a<b: (a,b)->(2a+1,b-a)]
// Cross-ratio coordinate w = (r+1)/(r+3) in (1/3,1):
//   r<1 <=> w<1/2:  w' = 4w - 1        (image: (1/3,1) full)
//   r>1 <=> w>1/2:  w' = w/(2-w)       (image: (1/3,1) full)
// Exact invariant density:  g(w) = 1/(w ln3)  <=>  f(r) = (2/ln3)/((r+1)(r+3)).
//
// Two independent numerical attacks:
//  (a) direct discretized FP operator in w-space (density push with linear interp):
//      g_{k+1}(y) = g_k((y+1)/4)/4 + g_k(2y/(1+y)) * (1+y)^2/2
//  (b) Ulam method on r-space with 10^4 log-spaced bins over [2^-40, 2^40].
// Both started from several different initial densities -> same fixed point.
import { writeFileSync } from 'node:fs';

const LN3 = Math.log(3);
const report = {};

// ---------- (a) w-space direct FP ----------
{
  const N = 10000, LO = 1 / 3, HI = 1, dx = (HI - LO) / N;
  const centers = i => LO + (i + 0.5) * dx;
  const analytic = new Float64Array(N);
  for (let i = 0; i < N; i++) analytic[i] = 1 / (centers(i) * LN3);
  // analytic mass (should be 1)
  let amass = 0; for (let i = 0; i < N; i++) amass += analytic[i] * dx;

  const interp = (g, x) => {
    const t = (x - LO) / dx; if (t <= 0) return g[0]; if (t >= N - 1) return g[N - 1];
    const i = Math.floor(t); return g[i] + (g[i + 1] - g[i]) * (t - i);
  };
  const run = g0name => {
    const g = new Float64Array(N);
    for (let i = 0; i < N; i++)
      g[i] = g0name === 'uniform' ? 1 / (HI - LO)
           : g0name === 'left' ? (centers(i) < 0.45 ? 2.5 : 0.005)
           : (centers(i) > 0.8 ? 3 : 0.05);
    let it = 0, l1 = 0;
    for (it = 0; it < 5000; it++) {
      const nx = new Float64Array(N);
      let mass = 0;
      for (let i = 0; i < N; i++) {
        const y = centers(i);
        nx[i] = interp(g, (y + 1) / 4) / 4 + interp(g, 2 * y / (1 + y)) * 2 / ((1 + y) * (1 + y));
        mass += nx[i] * dx;
      }
      for (let i = 0; i < N; i++) nx[i] /= mass;          // renormalize (kills eigenvalue-1 drift)
      l1 = 0; for (let i = 0; i < N; i++) l1 += Math.abs(nx[i] - g[i]) * dx;
      g.set(nx);
      if (l1 < 1e-14) { it++; break; }
    }
    let linf = 0; for (let i = 0; i < N; i++) linf = Math.max(linf, Math.abs(g[i] - analytic[i]));
    let l1a = 0; for (let i = 0; i < N; i++) l1a += Math.abs(g[i] - analytic[i]) * dx;
    return { iterations: it, final_l1_step: l1, linf_vs_analytic: linf, l1_vs_analytic: l1a, g };
  };
  const A = run('uniform'), B = run('left'), Cc = run('right');
  report.w_space_fp = {
    N, analytic_mass: amass,
    from_uniform: { iters: A.iterations, linf: A.linf_vs_analytic, l1: A.l1_vs_analytic },
    from_left:     { iters: B.iterations, linf: B.linf_vs_analytic, l1: B.l1_vs_analytic },
    from_right:    { iters: Cc.iterations, linf: Cc.linf_vs_analytic, l1: Cc.l1_vs_analytic },
  };
  // table: fixed point vs analytic at selected w (bin-averaged)
  const table = [];
  for (const w of [0.34, 0.4, 0.45, 0.5, 0.55, 0.6, 0.7, 0.8, 0.9, 0.99]) {
    const i = Math.min(N - 1, Math.max(0, Math.floor((w - LO) / dx)));
    table.push({ w, fixed_point: A.g[i], analytic_1_over_wln3: analytic[i] });
  }
  report.w_space_fp.table = table;
}

// ---------- (b) r-space Ulam, 10^4 log bins ----------
{
  const N = 10000, LOGMIN = -40, LOGMAX = 40;
  const bw = (LOGMAX - LOGMIN) / N;
  const rbin = r => {                                     // r>0 -> bin index (float-safe)
    const l = Math.log2(r);
    return Math.min(N - 1, Math.max(0, Math.floor((l - LOGMIN) / bw)));
  };
  const Phi = r => r < 1 ? 4 * r / (1 - r) : (r - 1) / 2;
  const analyticBin = i => {                              // mass of f in bin i
    const r1 = Math.pow(2, LOGMIN + i * bw), r2 = Math.pow(2, LOGMIN + (i + 1) * bw);
    const C = 2 / LN3, F = r => Math.log(3 * (r + 1) / (r + 3)) / LN3;
    return F(r2) - F(r1);
  };
  const run = mode => {
    const g = new Float64Array(N);
    for (let i = 0; i < N; i++) g[i] = mode === 'uniform' ? 1 / N
      : mode === 'lowr' ? (Math.pow(2, LOGMIN + (i + 0.5) * bw) < 0.5 ? 2 / N : 0.2 / N)
      : (Math.pow(2, LOGMIN + (i + 0.5) * bw) > 2 ? 2 / N : 0.2 / N);
    const SUB = 8;                                        // subsamples per bin
    let it = 0, l1 = 0;
    for (it = 0; it < 20000; it++) {
      const nx = new Float64Array(N);
      for (let i = 0; i < N; i++) {
        const r0 = Math.pow(2, LOGMIN + i * bw), r1 = Math.pow(2, LOGMIN + (i + 1) * bw);
        const w = g[i] / SUB;
        for (let s = 0; s < SUB; s++) {
          const r = r0 * Math.pow(r1 / r0, (s + 0.5) / SUB);
          nx[rbin(Phi(r))] += w;
        }
      }
      l1 = 0; for (let i = 0; i < N; i++) l1 += Math.abs(nx[i] - g[i]);
      g.set(nx);
      if (l1 < 1e-12) { it++; break; }
    }
    // compare with analytic masses
    let l1c = 0, chi2 = 0, linfRel = 0;
    for (let i = 0; i < N; i++) {
      const a = analyticBin(i);
      l1c += Math.abs(g[i] - a);
      if (a > 1e-9) { chi2 += (g[i] - a) ** 2 / a; linfRel = Math.max(linfRel, Math.abs(g[i] - a) / a); }
    }
    return { iterations: it, final_l1_step: l1, l1_vs_analytic: l1c, chi2_vs_analytic: chi2, linfRel, g };
  };
  const U = run('uniform'), V = run('lowr'), W = run('highr');
  report.r_space_ulam = {
    N, range: '[2^-40, 2^40], log-spaced', subsamples: 8,
    from_uniform: { iters: U.iterations, l1: U.l1_vs_analytic, chi2: U.chi2_vs_analytic },
    from_lowr:    { iters: V.iterations, l1: V.l1_vs_analytic, chi2: V.chi2_vs_analytic },
    from_highr:   { iters: W.iterations, l1: W.l1_vs_analytic, chi2: W.chi2_vs_analytic },
    table: [0.05, 0.1111, 0.2, 1 / 5, 0.5, 1, 2, 3, 5, 10, 100, 1e4].map(r => {
      const i = rbin(r);
      return { r, bin_mass_fixed_point: U.g[i], bin_mass_analytic: analyticBin(i) };
    }),
  };
}

writeFileSync(new URL('./fp_solve.json', import.meta.url), JSON.stringify(report, null, 1));
console.log(JSON.stringify(report, null, 1));
