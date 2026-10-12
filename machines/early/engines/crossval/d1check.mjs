import { orbitStates } from './orbitgen.mjs';
const ln3 = Math.log(3);
const f = (r) => 2 / (ln3 * (r + 1) * (r + 3));
const c1 = f(0.2) / 5, c2 = f(3);
const targets = { 29: 0.3925723713, 58: 0.3947045287, 99: 0.3947263494, 199: 0.3947263753 };
let S = 0, n = -1;
for (const [a, b] of orbitStates(200)) {
    n++;
    if (n >= 1) S += (a > b ? c1 : c2) / Number(a); // add p_n for state n (state 0 included on first yield? no: skip state 0? report sums states 0..N-1)
}
// redo cleanly: sum states 0..K inclusive for K in targets, i.e. K+1 states
let S2 = 0, k = -1; const out = {};
for (const [a, b] of orbitStates(200)) {
    k++;
    S2 += (a > b ? c1 : c2) / Number(a);
    if (k === 29 || k === 58 || k === 99 || k === 199) out[k] = S2;
}
for (const [k, v] of Object.entries(out)) console.log(`S(states 0..${k}) = ${v.toFixed(10)}  table claim ${targets[k]}  diff ${(v - targets[k]).toExponential(2)}`);
