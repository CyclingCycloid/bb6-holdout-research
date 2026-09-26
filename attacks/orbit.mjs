// Independent re-implementation of the BMO1 macro recurrence (BigInt), plus
// verification against the independently supplied A-orbit prefix and the raw-TM anchor log.
// A(a,b): a>b -> (a-b, 4b+2); a<b -> (2a+1, b-a); a=b -> HALT; start (1,2).
import { readFileSync } from 'fs';

export function stepAB(a, b) {
    if (a === b) return null;
    return a > b ? [a - b, 4n * b + 2n] : [2n * a + 1n, b - a];
}

const GIVEN_PREFIX = [
    [1, 2], [3, 1], [2, 6], [5, 4], [1, 18], [3, 17], [7, 14], [15, 7], [8, 30],
    [17, 22], [35, 5], [30, 22], [8, 90], [17, 82], [35, 65], [71, 30], [41, 122],
    [83, 81], [2, 326], [5, 324], [11, 319], [23, 308], [47, 285], [95, 238],
    [191, 143], [48, 574], [97, 526], [195, 429], [391, 234], [157, 938]
];

let [a, b] = [1n, 2n];
let ok = 0, bad = 0;
for (let i = 0; i < GIVEN_PREFIX.length; i++) {
    if (a === BigInt(GIVEN_PREFIX[i][0]) && b === BigInt(GIVEN_PREFIX[i][1])) ok++;
    else { bad++; console.log(`prefix mismatch at element ${i + 1}: got (${a},${b}) expected (${GIVEN_PREFIX[i]})`); }
    const nx = stepAB(a, b);
    if (!nx) { console.log(`HALT at element ${i + 1}`); break; }
    [a, b] = nx;
}
console.log(`prefix check: ${ok}/${GIVEN_PREFIX.length} matched, bad=${bad}`);

// Cross-check against the raw-TM anchor chain: anchor f-params (fa,fb) satisfy A-params (fa+1, fb-1).
const log = readFileSync(new URL('../sim/anchors_1e10.log', import.meta.url), 'utf8');
const anchors = log.trim().split('\n').filter(l => l.startsWith('ANCHOR'))
    .map(l => { const t = l.split(/\s+/); return { step: t[1], fa: t[2], fb: t[3] }; });
[a, b] = [1n, 2n];
let aok = 0, abad = 0;
for (let i = 0; i < anchors.length; i++) {
    if (a === BigInt(anchors[i].fa) + 1n && b === BigInt(anchors[i].fb) - 1n) aok++;
    else { abad++; if (abad < 4) console.log(`anchor mismatch #${i + 1}: macro A=(${a},${b}) anchor->A=(${BigInt(anchors[i].fa) + 1n},${BigInt(anchors[i].fb) - 1n})`); }
    const nx = stepAB(a, b);
    if (!nx) { console.log(`macro HALT at element ${i + 1} (anchor step ${anchors[i].step})`); break; }
    [a, b] = nx;
}
console.log(`anchor check: ${aok}/${anchors.length} matched, bad=${abad}`);
