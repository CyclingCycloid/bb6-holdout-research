import { writeFileSync } from 'fs';
// BMO10 窗口存在性普查(常数内存): 多策略深跑 + 记录所有出现过的 k-窗口
// 用法: node census2.mjs [k] [rewrites]
const K = +(process.argv[2] || 8);
const STEPS = +(process.argv[3] || 400000);
const RULES = [['#0', '1'], ['#100', '000#'], ['#110', '000#'], ['#1010', '1010##']];
function initWord() { return '10#'.repeat(30) + '0'.repeat(100); }
function activeSites(s) {
    const out = [];
    for (let i = 0; i < s.length; i++) {
        if (s[i] !== '#') continue;
        for (const r of RULES) if (s.startsWith(r[0], i)) { out.push([i, r]); break; }
    }
    return out;
}
function* windows(s) {
    for (let i = 0; i + K <= s.length; i++) yield s.substr(i, K);
}
function census(strategy, seed, seen) {
    let rng = seed;
    const rand = () => { rng = (rng * 1103515245 + 12345) & 0x7fffffff; return rng / 0x7fffffff; };
    let w = initWord().split('');
    for (let st = 0; st < STEPS; st++) {
        const s = w.join('');
        const sites = activeSites(s);
        if (!sites.length) break;
        let idx;
        if (strategy === 'right') idx = sites.length - 1;
        else if (strategy === 'left') idx = 0;
        else idx = Math.floor(rand() * sites.length);
        const [i, r] = sites[idx];
        w.splice(i, r[0].length, ...r[1].split(''));
        if (w.length > 8000) w = w.slice(w.length - 5000); // 保持有限(左侧裁剪)
        const t = w.join('');
        for (const win of windows(t)) seen.add(win);
    }
    return seen;
}
const seen = new Set();
census('right', 1, seen);
census('rand', 12345, seen);
census('rand', 777, seen);
census('left', 42, seen);
census('rand', 20260925, seen);
console.log(`k=${K} distinct windows seen: ${seen.size}`);
// 导出
writeFileSync(`windows-k${K}.json`, JSON.stringify([...seen]));
// 交叉: 哪些 8-窗口从未出现?
const A = ['0', '1', '#'];
const all = [];
for (const a of A) for (const b of A) for (const c of A) for (const d of A) for (const e of A) for (const f of A) for (const g of A) for (const h of A) all.push(a+b+c+d+e+f+g+h);
const absent = all.filter(x => !seen.has(x));
console.log(`absent: ${absent.length}`);
writeFileSync(`absent-k${K}.json`, JSON.stringify(absent));
console.log(absent.slice(0, 60).join(' '));
