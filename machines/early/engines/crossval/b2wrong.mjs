// Probe: which "wrong" alpha construction yields the team's reported wrong value 0.3136877116290085?
import { orbitStates } from './orbitgen.mjs';

const N = 200;
const S = [];
for (const [a, b] of orbitStates(N)) S.push(a > b ? 1 : 2);

const g1 = ([p, q]) => [3n * p + q, 2n * p + 2n * q];
const g2 = ([p, q]) => [p, 2n * q];
const g1y = ([p, q]) => [p, 4n * q - 2n * p]; // v/(4-2v)
const g2y = ([p, q]) => [p + q, 2n * q];      // (v+1)/2

const mk = (f1, f2, swap, running) => (n) => {
    let I = [[0n, 1n], [1n, 1n]];
    const apply = (k) => { const one = S[k] === 1; const use1 = swap ? !one : one; const g = use1 ? f1 : f2; I = [g(I[0]), g(I[1])]; };
    if (running) for (let k = 0; k < n; k++) apply(k);
    else for (let k = n - 1; k >= 0; k--) apply(k);
    return I;
};
const dec = (fr, digits) => { const [p, q] = fr; const int = p * 10n ** BigInt(digits) / q; let str = int.toString().padStart(digits + 1, '0'); return str.slice(0, 1) + '.' + str.slice(1); };
const mid = (I) => [I[0][0] * I[1][1] + I[1][0] * I[0][1], 2n * I[0][1] * I[1][1]];

const variants = {
    'formula x correct ': mk(g1, g2, false, false),
    'formula x swapped ': mk(g1, g2, true, false),
    'formula y correct ': mk(g1y, g2y, false, false),
    'formula y swapped ': mk(g1y, g2y, true, false),
    'running x correct ': mk(g1, g2, false, true),
    'running x swapped ': mk(g1, g2, true, true),
    'running y swapped ': mk(g1y, g2y, true, true),
};
for (const [name, fn] of Object.entries(variants)) {
    console.log(`${name} n=63: ${dec(mid(fn(63)), 16)}   n=120: ${dec(mid(fn(120)), 16)}`);
}
console.log('target wrong value: 0.3136877116290085 (from team alpha_diag.py "mine" line)');
