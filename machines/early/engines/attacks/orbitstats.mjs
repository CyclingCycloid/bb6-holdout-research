// P2: orbit statistics + monovariant tests over N macro steps (BigInt).
// Collects: record minima of |a-b|, v2(a-b) histogram, branch run lengths,
// growth rate, ratio excursions, spread-at-T1 monotonicity violations,
// and verifies the a+b strict-increase monovariant.
const N = parseInt(process.argv[2] || '300000');
let a = 1n, b = 2n;
let minDiff = null, minDiffEvents = [];
const v2hist = new Map();       // v2(a-b) histogram (v2(odd)=0)
let runT2 = 0; const kHist = new Map();   // run lengths of consecutive a<b steps
const runs = [];                // full k-sequence (first 100000 cycles)
const spreadAtT1 = [];          // |a-b| right AFTER each T1 (a>b) step
let t1count = 0, t2count = 0;
let sumInc = 0;                 // for monovariant a+b check
const t0 = Date.now();
let lastBits = 0, lastStep = 0; const growth = [];
const logRatioHist = new Map(); // log2(a/b) bucketed (signed)
const nearDiag = [];
for (let i = 1; i <= N; i++) {
    const s = a + b;
    let nx;
    if (a === b) { console.log(`HALT step ${i}`); process.exit(0); }
    if (a > b) { nx = [a - b, 4n * b + 2n]; t1count++; runT2 && (kHist.set(runT2, (kHist.get(runT2) || 0) + 1), runs.push(runT2), runT2 = 0); }
    else { nx = [2n * a + 1n, b - a]; t2count++; runT2++; }
    const s2 = nx[0] + nx[1];
    if (s2 <= s) { console.log(`MONOVARIANT VIOLATION at step ${i}`); process.exit(1); }
    [a, b] = nx;
    const d = a > b ? a - b : b - a;
    if (minDiff === null || d < minDiff) { minDiff = d; minDiffEvents.push([i, d.toString(), (a > b ? a : b).toString(2).length]); }
    if (d < 64n) nearDiag.push([i, (a - b).toString(), (a > b ? a : b).toString(2).length]);
    // v2(a-b)
    let dd = a - b, v = 0;
    if (dd < 0n) dd = -dd;
    if (dd === 0n) v = 999;
    else { let m = dd & 0xffffffffffffn; if (m === 0n) { v = 48; let q = dd >> 48n; while ((q & 1n) === 0n) { q >>= 1n; v++; } } else { while ((m & 1n) === 0n) { m >>= 1n; v++; } } }
    v2hist.set(v, (v2hist.get(v) || 0) + 1);
    if (a > b) spreadAtT1.push(d); // state right after a T1 step has a>b (since a'=a-b, b'=4b+2 -> a'>b iff a>5b+2, else a'<b). Actually record spread at states following T1:
    // milestones
    if (i === 1000 || i === 10000 || i === 50000 || i === 100000 || i === 200000 || i === N) {
        const bits = (a > b ? a : b).toString(2).length;
        growth.push([i, bits, (bits / i).toFixed(5)]);
        console.log(JSON.stringify({ step: i, aBits: (a.toString(2).length), bBits: (b.toString(2).length), diffBits: d.toString(2).length, bitsPerStep: (bits / i).toFixed(5), ms: Date.now() - t0 }));
    }
}
// spread-at-T1 monotonicity: how often does the spread after a T1 step drop below the running max seen in the last W T1-steps?
let viol = 0, tot = 0;
for (let j = 1; j < spreadAtT1.length; j++) {
    tot++;
    if (spreadAtT1[j] < spreadAtT1[j - 1]) viol++;
}
const ks = [...kHist.entries()].sort((x, y) => x[0] - y[0]);
const v2s = [...v2hist.entries()].sort((x, y) => x[0] - y[0]).slice(0, 25);
console.log(JSON.stringify({
    N, ms: Date.now() - t0, t1: t1count, t2: t2count,
    minDiffEvents: minDiffEvents.slice(0, 30),
    nearDiagCount: nearDiag.length, nearDiagSample: nearDiag.slice(0, 25),
    kHist: ks.slice(0, 30), kMax: ks[ks.length - 1],
    v2histFirst: v2s,
    spreadT1MonotoneViolations: viol, spreadT1Total: tot,
    runsFirst80: runs.slice(0, 80),
}, null, 1));
// save k-sequence and spread bit-length sequence for further analysis
const fs = await import('fs');
fs.writeFileSync('kseq.txt', runs.join(' '));
fs.writeFileSync('spreadT1bits.txt', spreadAtT1.map(x => x.toString(2).length).join(' '));
console.log('wrote kseq.txt (' + runs.length + ' cycles), spreadT1bits.txt (' + spreadAtT1.length + ')');
