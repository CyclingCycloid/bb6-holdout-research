// BMO5 宏观系统探索器: <i,b>, a(i)=10*2^i - 1, 起点 <0,5>
//   b >= a(i): <i+1, b - a(i)>
//   b <= a(i)-2: <i, 3b+i+5>
//   b == a(i)-1: HALT
// 用法: node bmo5.mjs orbit N       -- 精确轨道统计
//       node bmo5.mjs trap          -- 双分支过近似剩余类陷阱搜索 (模 m)
import {} from 'node:process';

const mode = process.argv[2];
if (mode === 'orbit') {
    const N = +process.argv[3];
    let i = 0n, b = 5n;
    const a = (ii) => 10n * (1n << ii) - 1n;
    let minGap = null, minGapAt = null, halts = false;
    let triples = 0n, subtracts = 0n;
    const resCount = new Map(); // (i%6, b%3)
    for (let n = 0; n < N; n++) {
        const ai = a(i);
        const gap = b - (ai - 1n); // 0 = halt
        const gAbs = gap < 0n ? -gap : gap;
        if (minGap === null || gAbs < minGap) { minGap = gAbs; minGapAt = { n, i: Number(i), gap: gap.toString() }; }
        const key = `${i % 6n},${b % 3n}`;
        resCount.set(key, (resCount.get(key) || 0) + 1);
        if (b === ai - 1n) { console.log(`HALT at step ${n}, <${i},${b}>`); halts = true; break; }
        if (b >= ai) { i++; b -= ai; subtracts++; }
        else { b = 3n * b + i + 5n; triples++; }
    }
    console.log(`steps=${N} halted=${halts} i=${i} bBits=${b.toString(2).length}`);
    console.log(`minGap=${minGap} at step ${minGapAt.n} (i=${minGapAt.i}, gap=${minGapAt.gap})`);
    console.log(`triples=${triples} subtracts=${subtracts}`);
    console.log('residue counts (i%6,b%3):', JSON.stringify([...resCount.entries()].sort()));
} else if (mode === 'trap') {
    // 双分支过近似: 状态 (i mod K, b mod m); 转移: T: (i, b)->(i, 3b+i+5); S: (i,b)->(i+1, b-(10*2^i -1))
    // 停机余数: b ≡ 10*2^i - 2 (mod m) 且 i ≡ (对应) (mod K)
    // 若从 (0,5) 出发的过近似可达集不含任何停机余数 -> 证明不停机
    for (let m = 2; m <= 96; m++) {
        const ord = (() => { let o = 1, x = 2 % m; while (x !== 1 % m && o <= 4 * m) { x = (x * 2) % m; o++; } return x === 1 % m ? o : -1; })();
        if (ord < 0) continue;
        const K = (m * ord) % 4096 === 0 ? 4096 : lcm(m, ord);
        if (K > 8192) continue;
        // BFS on (i mod K, b mod m)
        const start = (0 * m + 5 % m);
        const seen = new Set([start]);
        const queue = [[0, 5 % m]];
        while (queue.length) {
            const [ii, bb] = queue.shift();
            // triple
            const t = [(ii) % K, (3 * bb + ii + 5) % m];
            // subtract
            const ai = (10 * modpow(2, ii, m) - 1) % m;
            const s = [(ii + 1) % K, ((bb - ai) % m + m) % m];
            for (const [ni, nb] of [t, s]) {
                const id = ni * m + nb;
                if (!seen.has(id)) { seen.add(id); queue.push([ni, nb]); }
            }
        }
        // halt residues: pairs (i,b): b ≡ 10*2^i - 2 (mod m)
        let haltReach = 0, haltTotal = 0;
        for (let ii = 0; ii < K; ii++) {
            const hb = ((10 * modpow(2, ii, m) - 2) % m + m) % m;
            if (seen.has(ii * m + hb)) haltReach++;
        }
        console.log(`m=${m} ord=${ord} K=${K} reachable=${seen.size}/${K * m} haltResiduesReachable=${haltReach}`);
    }
    function modpow(base, exp, mod) { let r = 1, b = base % mod; let e = exp; while (e > 0) { if (e & 1) r = (r * b) % mod; b = (b * b) % mod; e = Math.floor(e / 2); } return r; }
    function lcm(x, y) { const g = (a, b) => b ? g(b, a % b) : a; return x / g(x, y) * y; }
}
