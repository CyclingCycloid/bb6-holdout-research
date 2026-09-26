// 匹配 BMO1 轨道元素与 blocks.log 中的两游程构形，寻找一致的宏态编码
import { readFileSync } from 'fs';
const lines = readFileSync('blocks.log', 'utf8').split('\n').filter(l => l.startsWith('BLK'));
const entries = lines.map(l => {
    const t = l.split(/\s+/);
    const g = s => Number(t.find(x => x.startsWith(s + '='))?.split('=')[1]);
    return { step: +t[1], state: t[2], head: g('h'), r1: g('r1'), gap: g('gap'), r2: g('r2'), h1: g('h-r1s'), h2: g('h-r2s') };
});
// 生成轨道
const orbit = [[1, 2]];
for (let i = 0; i < 40; i++) {
    const [a, b] = orbit[orbit.length - 1];
    if (a === b) { console.log('HALT at element', orbit.length); break; }
    orbit.push(a > b ? [a - b, 4 * b + 2] : [2 * a + 1, b - a]);
}
// 候选编码: (a,b) -> [r1,gap,r2] 的可能解释
const encodings = {
    'gap,r2': (a, b) => e => e.gap === a && e.r2 === b,
    'r2,gap': (a, b) => e => e.r2 === a && e.gap === b,
    'r1,r2': (a, b) => e => e.r1 === a && e.r2 === b,
    'r2,r1': (a, b) => e => e.r2 === a && e.r1 === b,
    'r1-1,r2': (a, b) => e => e.r1 - 1 === a && e.r2 === b,
    'r2,r1-1': (a, b) => e => e.r2 === a && e.r1 - 1 === b,
    'gap,r1': (a, b) => e => e.gap === a && e.r1 === b,
    'r1,gap': (a, b) => e => e.r1 === a && e.gap === b,
};
for (const [name, mk] of Object.entries(encodings)) {
    let hits = 0, details = [];
    for (let n = 0; n < Math.min(orbit.length, 32); n++) {
        const [a, b] = orbit[n];
        const m = entries.filter(mk(a, b));
        if (m.length > 0) { hits++; if (n < 22) details.push(`e${n + 1}(${a},${b}):` + m.slice(0, 3).map(x => `${x.state}@${x.step}(r1=${x.r1},g=${x.gap},r2=${x.r2},h2=${x.h2})`).join(';')); }
    }
    console.log(`\n=== encoding ${name}: ${hits}/32 elements matched`);
    details.slice(0, 22).forEach(d => console.log('  ' + d));
}
