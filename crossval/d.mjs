// Group D checks (fresh BigInt orbit + float accumulation).
// D1: realized hitting sum S = sum_n p_n with p_n = (f(1/5)/5)/a_n on branch a>b (T1),
//     f(3)/a_n on branch a<b (T2), f(r)=2/(ln3(r+1)(r+3))  [attack-heuristics.md 3.2/3.3 actual formula]
//     Also compute the TASK-restated (wrong) formula sum kappa/a_n with kappa=3/(16 ln3).
// D2: |a-b| <= 64 events.
// D3: empirical fraction of a>b steps vs P(r<1)=ln(3/2)/ln3.
import { orbitStates } from './orbitgen.mjs';

const N = 100000;
const states = [];
for (const [a, b] of orbitStates(N)) states.push([a, b]);

const ln3 = Math.log(3);
const f = (r) => 2 / (ln3 * (r + 1) * (r + 3));
const c1 = f(0.2) / 5;          // branch-1 coefficient (a>b): 5/(48 ln3)
const c2 = f(3);                // branch-2 coefficient (a<b): 1/(12 ln3)
const kappa = c1 + c2;          // = 3/(16 ln3)
console.log(`D1 coefficients: c1 = f(1/5)/5 = ${c1.toFixed(9)} (claim 0.09481659), c2 = f(3) = ${c2.toFixed(9)} (claim 0.07585327), kappa = c1+c2 = ${kappa.toFixed(9)} (claim 3/(16 ln3) = ${3 / (16 * ln3)})`);

// D1: S(N) over 0-based states n=0..N
let S = 0; const Spartial = {};
let Snaive = 0; const SpartialNaive = {};
let nT1 = 0;
for (let n = 0; n < states.length; n++) {
    const [a, b] = states[n];
    const an = Number(a);
    if (a > b) { S += c1 / an; Snaive += kappa / an; nT1++; } else { S += c2 / an; Snaive += kappa / an; }
    if (n === 30 || n === 59 || n === 100 || n === 200 || n === 1000) { Spartial[n] = S; SpartialNaive[n] = Snaive; }
}
console.log('D1 report-formula S(N) (states 0..N):');
for (const [k, v] of Object.entries(Spartial)) console.log(`   through state ${k}: S = ${v.toFixed(10)}`);
console.log(`D1 S(1e5) = ${S.toFixed(10)}  (claim S(inf) = 0.3947263753; S30/S = ${(Spartial[30] / S).toFixed(4)} vs claimed 99.4%)`);
console.log(`D1 task-restated formula sum kappa/a_n = ${Snaive.toFixed(6)}  (kappa applied to ALL steps; NOT the report's formula)`);
console.log(`D1 claim check: S(30) = ${Spartial[30].toFixed(10)} vs table 0.3925723713; S(59) = ${Spartial[59].toFixed(10)} vs 0.3947045287; S(100) = ${Spartial[100].toFixed(10)} vs 0.3947263494; S(200) = ${Spartial[200].toFixed(10)} vs 0.3947263753`);

// D2: |a-b| <= 64
{
    const evts = [];
    for (let n = 0; n < states.length; n++) {
        const [a, b] = states[n];
        const d = a > b ? a - b : b - a;
        if (d <= 64n) evts.push({ n0: n, n1: n + 1, d: Number(d) });
    }
    console.log(`D2: |a-b| <= 64 events in ${states.length} states: count = ${evts.length}, last at 0-based state ${evts.length ? evts[evts.length - 1].n0 : -1} (1-based ${evts.length ? evts[evts.length - 1].n1 : -1})`);
    console.log(`D2: events (0-based state, d): ${JSON.stringify(evts.map(e => [e.n0, e.d]))}`);
}

// D3: branch fraction
{
    console.log(`D3: fraction of a>b (T1) states over ${states.length}: ${nT1 / states.length} (theory P(r<1) = ${(Math.log(1.5) / ln3).toFixed(6)}; expected within 0.369 +/- 0.005)`);
}
