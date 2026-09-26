// BMO1 宏观轨道模拟器 (BigInt)
// A(a,b): a>b -> (a-b, 4b+2); a<b -> (2a+1, b-a); a=b -> HALT; 起点 (1,2)
// 用法:
//   node macro.mjs verify <anchors.log>     -- 与裸机锚点链逐项对照
//   node macro.mjs run <N> [outfile]        -- 迭代 N 步, 统计并落盘
import { readFileSync, writeFileSync } from 'fs';

function stepAB(a, b) {
    if (a === b) return null; // HALT
    return a > b ? [a - b, 4n * b + 2n] : [2n * a + 1n, b - a];
}

const mode = process.argv[2];
if (mode === 'verify') {
    const log = readFileSync(process.argv[3], 'utf8');
    const anc = log.trim().split('\n').filter(l => l.startsWith('ANCHOR'))
        .map(l => { const t = l.split(/\s+/); return { step: +t[1], a: +t[2], b: +t[3] }; });
    let [a, b] = [1n, 2n]; let ok = 0, bad = 0;
    for (let i = 0; i < anc.length; i++) {
        const A = Number(a), B = Number(b);
        if (anc[i].a + 1 !== A || anc[i].b - 1 !== B) {
            bad++; if (bad < 5) console.log(`MISMATCH anchor#${i + 1}@${anc[i].step}: TM f=(${anc[i].a},${anc[i].b}) vs macro A=(${A},${B})`);
        } else ok++;
        const nx = stepAB(a, b);
        if (!nx) { console.log(`macro HALT at element ${i + 1} — TM anchor @${anc[i].step}`); break; }
        [a, b] = nx;
    }
    console.log(`verify: ${ok}/${anc.length} anchors matched (f(a,b) = A(a+1,b-1)), bad=${bad}`);
} else if (mode === 'run') {
    const N = BigInt(process.argv[3]);
    const out = process.argv[4];
    let [a, b] = [1n, 2n];
    let minDiff = null, minDiffAt = -1n, minRatio = Infinity, minRatioAt = -1n;
    const topClose = [];
    const milestones = [];
    const nearDiag = [];
    const t0 = Date.now();
    let logSum = 0n, logN = 0n; // 用位数近似 ln: 每 2^k 里程碑记 bit 长度
    for (let i = 1n; i <= N; i++) {
        const nx = stepAB(a, b);
        if (!nx) { console.log(`HALT at macro step ${i}: a=b=${a}`); writeFileSync(out || '/dev/null', `HALT ${i} ${a}`); process.exit(0); }
        [a, b] = nx;
        const d = (a > b ? a - b : b - a);
        if (minDiff === null || d < minDiff) { minDiff = d; minDiffAt = i; }
        const mx = a > b ? a : b, mn = a > b ? b : a;
        const ratio = Number(mn) / Number(mx); // 只在小的时候计算精确比, 大数时用位长比
        // 近对角事件: |a-b| <= 64
        if (d <= 64n) nearDiag.push(`${i}: a-b=${a - b} (maxbits=${mx.toString(2).length})`);
        // 最近距离按 |a-b| 绝对值记录 top-10 (仅当 d 不超过当前记录时)
        if (topClose.length < 10 || d < topClose[topClose.length - 1].d) {
            topClose.push({ step: Number(i), d: d.toString(), bits: mx.toString(2).length });
            topClose.sort((x, y) => (BigInt(x.d) < BigInt(y.d) ? -1 : 1));
            if (topClose.length > 10) topClose.pop();
        }
        // 里程碑: 10^k
        const iN = Number(i);
        if (iN === 10 || iN === 100 || iN === 1000 || iN === 10000 || iN === 100000 || iN === 1000000 || iN === 3000000 || iN === 10000000 || i === N) {
            milestones.push({ step: iN, aBits: a.toString(2).length, bBits: b.toString(2).length, diffBits: d.toString(2).length, minDiffBits: minDiff.toString(2).length, minDiffAt: Number(minDiffAt), ms: Date.now() - t0 });
            console.log(JSON.stringify(milestones[milestones.length - 1]));
        }
    }
    const summary = {
        N: Number(N), ms: Date.now() - t0,
        aBits: a.toString(2).length, bBits: b.toString(2).length,
        minDiffBits: minDiff.toString(2).length, minDiffAt: Number(minDiffAt),
        topClose, nearDiagCount: nearDiag.length, nearDiagSample: nearDiag.slice(0, 40),
        driftBitsPerStep: (a.toString(2).length / Number(N)).toFixed(6),
    };
    console.log(JSON.stringify(summary, null, 1));
    if (out) writeFileSync(out, JSON.stringify({ summary, milestones }, null, 1));
} else {
    console.log('usage: node macro.mjs verify <anchors.log> | run <N> [out.json]');
}
