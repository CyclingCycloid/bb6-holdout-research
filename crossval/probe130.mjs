import { orbitStates } from './orbitgen.mjs';
const g1 = ([p, q]) => [3n*p + q, 2n*p + 2n*q];
const g2 = ([p, q]) => [p, 2n*q];
let I = [[0n,1n],[1n,1n]];
let k = 0;
for (const [a,b] of orbitStates(200)) {
    const g = (a > b) ? g1 : g2;
    I = [g(I[0]), g(I[1])];
    k++;
    const m = Number(I[0][0]*I[1][1] + I[1][0]*I[0][1]) / Number(2n*I[0][1]*I[1][1]);
    if (k >= 125 && k <= 135) console.log(`n=${k}: running-x mid = ${m.toFixed(16)}`);
}
