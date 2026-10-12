// BMO10 重写博弈独立验证器: 随机策略下断言 无`1#` / 无`111` / 统计`#01`,`1011`
// 规则: #0→1; #100→000#; #110→000#; #1010→1010##
// 初始: (10#)*N + 0*M
const N = 60, M = 200, STEPS = 200000;
let w = ('10#'.repeat(N) + '0'.repeat(M)).split('');
const rules = [
    ['#0', '1'],
    ['#100', '000#'],
    ['#110', '000#'],
    ['#1010', '1010##'],
];
function applyAt(i, r) { // i = LHS 起点
    const [lhs, rhs] = r;
    w.splice(i, lhs.length, ...rhs.split(''));
}
function check(tag, step) {
    const s = w.join('');
    if (s.includes('1#')) { console.log(`VIOLATION 1# at ${tag} step ${step}`); process.exit(1); }
    if (s.includes('111')) { console.log(`VIOLATION 111 at ${tag} step ${step}`); process.exit(1); }
}
let c01 = 0, c1011 = 0, rewrites = 0;
const sitesOf = () => {
    const sites = [];
    const s = w.join('');
    for (let i = 0; i < s.length; i++) {
        if (s[i] !== '#') continue;
        for (const r of rules) if (s.startsWith(r[0], i)) { sites.push([i, r]); break; }
    }
    return sites;
};
for (let step = 0; step < STEPS; step++) {
    const sites = sitesOf();
    if (sites.length === 0) { console.log('no active sites at step', step); break; }
    const [i, r] = sites[Math.floor(Math.random() * sites.length)];
    applyAt(i, r);
    rewrites++;
    check('post', step);
    const s = w.join('');
    if (s.includes('#01')) c01++;
    if (s.includes('1011')) c1011++;
    // 保持有限: 左侧裁剪
    if (w.length > 5000) { const cut = w.length - 3000; w = w.slice(cut); }
}
console.log(`done: rewrites=${rewrites}, #01-occurrences=${c01}, 1011-occurrences=${c1011}, len=${w.length}`);
console.log('Lemma A (no 1#): HELD; Lemma B (no 111): HELD');
