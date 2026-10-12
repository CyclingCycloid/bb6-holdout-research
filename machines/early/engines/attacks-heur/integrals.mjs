// BMO1 heuristic analysis - exact/numerical integrals under the invariant density.
//
// Map on r=b/a (deterministic large-a,b limit of the integer recurrence):
//   branch a>b (r<1): (a,b)->(a-b,4b+2)  => r' = (4b+2)/(a-b) -> 4r/(1-r)
//   branch a<b (r>1): (a,b)->(2a+1,b-a)  => r' = (b-a)/(2a+1) -> (r-1)/2
// Frobenius-Perron: f(y) = 4/(y+4)^2 f(y/(y+4)) + 2 f(2y+1).
// Exact fixed point: f(r) = C/((r+1)(r+3)); int_0^inf dr/((r+1)(r+3)) = (ln3)/2 => C = 2/ln3.
//   (Math.SE 4939082 quotes C = 2 ln3, whose total mass is (ln3)^2 ~ 1.2069 - right shape,
//    wrong constant; expectations normalize, so their growth constant can still be right.)
// Cross-ratio w = (r+1)/(r+3) in (1/3,1): f(r)dr = dw/(w ln3); map becomes
//   w<1/2: w' = 4w-1;  w>1/2: w' = w/(2-w);  invariant density g(w) = 1/(w ln3).
// Log-singular integrands (ln(1-r) at r=1 etc.) are handled with u = e^{-x} substitution:
//   int_0^1 ln^k(u) f(1-u) du = int_0^inf x^k e^{-x} f(1-e^{-x}) dx  (smooth, decaying).
import { writeFileSync } from 'node:fs';

const LN2 = Math.log(2), LN3 = Math.log(3);
const C = 2 / LN3;
const f = r => C / ((r + 1) * (r + 3));
const F = r => Math.log(3 * (r + 1) / (r + 3)) / LN3;
const Finv = p => 3 * (Math.pow(3, p) - 1) / (3 - Math.pow(3, p));
const rOf = w => (3 * w - 1) / (1 - w);

function Li2(x) {
  if (x <= 0.5) {
    let s = 0, term = 1;
    for (let k = 1; k < 300; k++) { term *= x; const add = term / (k * k); s += add; if (add < 1e-20 * Math.abs(s)) break; }
    return s;
  }
  return Math.PI * Math.PI / 6 - Math.log(x) * Math.log(1 - x) - Li2(1 - x);
}
function simpson(g, a, b, n) {
  const h = (b - a) / n; let s = g(a) + g(b);
  for (let i = 1; i < n; i++) s += g(a + i * h) * (i % 2 ? 4 : 2);
  return s * h / 3;
}
function adapt(g, a, b, tol = 1e-13) {
  let n = 64, prev = simpson(g, a, b, n);
  for (let it = 0; it < 30; it++) {
    n *= 2; const cur = simpson(g, a, b, n);
    if (!Number.isFinite(cur)) return NaN;
    if (Math.abs(cur - prev) < tol * Math.max(1, Math.abs(cur))) return cur;
    prev = cur;
  }
  return prev;
}

const out = {};

// FP residual of the exact fixed point (pointwise functional equation)
{
  let mx = 0; const rows = [];
  for (const y of [0.05, 1 / 5, 0.5, 1, 2, 3, 10, 100, 1e4]) {
    const lhs = f(y), rhs = 4 / (y + 4) ** 2 * f(y / (y + 4)) + 2 * f(2 * y + 1);
    rows.push({ y: +y.toFixed(6), lhs, rhs }); mx = Math.max(mx, Math.abs(lhs - rhs));
  }
  out.fp_residual = rows; out.fp_residual_max = mx;
}

const P1 = Math.log(1.5) / LN3;                    // P(r<1), exact
const intW = (I, lo, hi) => adapt(w => I(rOf(w)) / (w * LN3), lo, hi);

// E[Delta ln a]: closed form + u=e^{-x} substitution check
//   E = int_0^1 ln(1-r) f dr + ln2 P(r>1)
//   int_0^1 ln(1-r)/((r+1)(r+3)) dr = (1/2)(Li2(1/4) - Li2(1/2))
const g_closed = LN2 * (1 - P1) + (Li2(0.25) - Li2(0.5)) / LN3;
const g_a_sub = adapt(x => -x * Math.exp(-x) * C / ((2 - Math.exp(-x)) * (4 - Math.exp(-x))), 0, 80) + LN2 * (1 - P1);
// E[Delta ln b]: = ln4 P(r<1) + int_1^inf ln(1-1/r) f dr
//   int_1^inf ... = (C/2)(Li2(1/2) - Li2(3/4))   [via r=1/x and int ln x/(a-x) = -Li2(1/a)]
const g_b_closed = Math.log(4) * P1 + (Li2(0.5) - Li2(0.75)) / LN3;
// r = 1/(1-e^{-x}) maps x:0->inf to r:inf->1+; dr flips sign; ln(1-1/r) = -x
const g_b_sub = adapt(x => -x * Math.exp(-x) * C / (((1 / (1 - Math.exp(-x))) + 1) * ((1 / (1 - Math.exp(-x))) + 3)) / (1 - Math.exp(-x)) ** 2, 0, 80) + Math.log(4) * P1;
// E[Delta ln max] - all pieces non-singular in w
const g_max = intW(r => Math.log(1 - r), 1 / 3, 3 / 8)
            + intW(r => Math.log(4 * r), 3 / 8, 1 / 2)
            + intW(r => Math.log(2 / r), 1 / 2, 2 / 3)
            + intW(r => Math.log(1 - 1 / r), 2 / 3, 1);
// E[(Delta ln a)^2]: u=e^{-x} for the r<1 part
const E2_sub = adapt(x => x * x * Math.exp(-x) * C / ((2 - Math.exp(-x)) * (4 - Math.exp(-x))), 0, 80) + LN2 * LN2 * (1 - P1);
out.growth = {
  P_r_lt_1: P1, P_r_lt_1_num: intW(() => 1, 1 / 3, 1 / 2),
  Li2_1_4: Li2(0.25), Li2_1_2: Li2(0.5), Li2_3_4: Li2(0.75),
  g_lna_closed: g_closed, g_lna_subst: g_a_sub,
  g_lnb_closed: g_b_closed, g_lnb_subst: g_b_sub,
  g_lnmax_w: g_max,
  g_bits: g_closed / LN2,
  claimed_0_15097694: 0.15097694, abs_err_vs_claim: Math.abs(g_closed - 0.15097694),
  claimed_bits: 0.15097694 / LN2, setup_measured_bits: 0.2178,
  var_dlna: E2_sub - g_closed ** 2, sigma_dlna: Math.sqrt(E2_sub - g_closed ** 2),
  naive_tail_mult: 1 / (1 - Math.exp(-g_closed)),
  fluct_tail_mult: 1 / (1 - Math.exp(-(g_closed - (E2_sub - g_closed ** 2) / 2))),
};

// relative difference delta = |a-b|/max: E[delta], and P(delta<eps) ~ 2 f(1) eps
const E_delta = intW(r => (1 - r), 1 / 3, 1 / 2) + intW(r => (1 - 1 / r), 1 / 2, 1);
out.delta = { E_delta, f_at_1: f(1), per_step_P_delta_lt_eps: 2 * f(1),
  E_min_delta_over_n: 1 / (2 * f(1)), equals_2ln3: 2 * LN3 };

// hitting constants
const f15 = f(1 / 5), f3 = f(3), kappa = f15 / 5 + f3;
const log10Tail = N => Math.log10(kappa) - Math.log10(1 - Math.exp(-g_closed)) - (g_closed / LN2) * N * Math.log10(2);
out.hitting = {
  f_at_1_5: f15, f_at_3: f3,
  kappa_branch1: f15 / 5, kappa_branch2: f3,
  kappa, kappa_closed_3_over_16ln3: 3 / (16 * LN3),
  P_r_lt_1_5: F(1 / 5), P_r_gt_3: 1 - F(3),
  log10_P_halt_after_N_steps: { N59: log10Tail(59), N1e6: log10Tail(1e6), N4p6e6_1Mbits: log10Tail(1e6 / 0.21783) },
};
out.quantiles_theory = {};
for (const p of [0.01, 0.05, 0.25, 0.5, 0.75, 0.95, 0.99]) out.quantiles_theory[p] = Finv(p);
out.normalization = { C_correct: C, C_claimed: 2 * LN3, mass_claimed: 2 * LN3 * LN3 / 2, mass_correct: 1 };

writeFileSync(new URL('./integrals.json', import.meta.url), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
