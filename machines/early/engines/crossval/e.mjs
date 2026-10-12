// E2: check formal-reduction.md section 4's first-30-pairs list against my own recurrence iteration.
import { orbit } from './orbitgen.mjs';

const claimed = [
    [1, 2], [3, 1], [2, 6], [5, 4], [1, 18], [3, 17], [7, 14], [15, 7], [8, 30], [17, 22],
    [35, 5], [30, 22], [8, 90], [17, 82], [35, 65], [71, 30], [41, 122], [83, 81], [2, 326], [5, 324],
    [11, 319], [23, 308], [47, 285], [95, 238], [191, 143], [48, 574], [97, 526], [195, 429], [391, 234], [157, 938],
];
let bad = 0, i = 0;
for (const [a, b, n] of orbit(30)) {
    if (a !== BigInt(claimed[i][0]) || b !== BigInt(claimed[i][1])) {
        bad++;
        console.log(`E2 MISMATCH at n=${n}: mine (${a},${b}) vs formal-reduction (${claimed[i][0]},${claimed[i][1]})`);
    }
    i++;
}
console.log(`E2: formal-reduction.md section-4 prefix: ${i - bad}/30 pairs match my fresh iteration, mismatches=${bad}`);

// E1b: run my own macro-vs-anchor conjugation check on their 1e11 anchor log (f(a,b) = A(a+1,b-1)).
import { readFileSync } from 'fs';
{
    const log = readFileSync('../sim/anchors_1e11.log', 'utf8');
    const anc = log.trim().split(/\r?\n/).filter(l => l.startsWith('ANCHOR')).map(l => { const t = l.trim().split(/\s+/); return { step: BigInt(t[1]), a: BigInt(t[2]), b: BigInt(t[3]) }; });
    let [a, b] = [1n, 2n], ok = 0, bad2 = 0;
    for (let i = 0; i < anc.length; i++) {
        if (anc[i].a + 1n !== a || anc[i].b - 1n !== b) { bad2++; if (bad2 < 5) console.log(`E1b MISMATCH anchor#${i + 1}@${anc[i].step}: log f=(${anc[i].a},${anc[i].b}) vs my macro A=(${a},${b})`); }
        else ok++;
        // advance macro by one step
        if (a === b) { console.log('macro halted'); break; }
        if (a > b) { const a2 = a - b, b2 = 4n * b + 2n; a = a2; b = b2; } else { const a2 = 2n * a + 1n, b2 = b - a; a = a2; b = b2; }
    }
    console.log(`E1b: my fresh macro orbit vs their 66-line (65 ANCHOR) 1e11 log: ${ok}/${anc.length} anchors match, bad=${bad2}; last anchor f(${anc[anc.length - 1].a},${anc[anc.length - 1].b})@${anc[anc.length - 1].step}`);
    // also verify consecutive anchor-recurrence in THEIR log with the f-form recurrence
    let t2ok = 0, t2bad = 0;
    for (let i = 1; i < anc.length; i++) {
        const [a1, b1] = [anc[i - 1].a, anc[i - 1].b], [a2, b2] = [anc[i].a, anc[i].b];
        let pa, pb;
        if (b1 === a1 + 2n) { t2bad++; continue; }
        if (b1 < a1 + 2n) { pa = a1 - b1 + 1n; pb = 4n * b1 - 1n; } else { pa = 2n * a1 + 2n; pb = b1 - a1 - 1n; }
        if (pa === a2 && pb === b2) t2ok++; else t2bad++;
    }
    console.log(`E1b: f-recurrence on consecutive anchors of their log: ${t2ok}/${anc.length - 1} OK, ${t2bad} bad`);
}
