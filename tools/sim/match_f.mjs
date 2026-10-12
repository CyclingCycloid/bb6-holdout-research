// 在转储中暴力搜索 f 轨道锚点：逐位前缀校验
import { readFileSync } from 'fs';
const lines = readFileSync('dump1200.txt', 'utf8').trim().split('\n');
const frames = lines.map(l => {
    const t = l.split(/\s+/);
    const step = +t[1], state = t[2], head = +t[3], lo = +t[4].slice(1);
    const first = +t[5]; const rl = t.slice(6).map(Number);
    const bits = [];
    let cur = first;
    for (const r of rl) { for (let i = 0; i < r; i++) bits.push(cur); cur = 1 - cur; }
    const cell = p => (p < lo || p >= lo + bits.length) ? 0 : bits[p - lo];
    return { step, state, head, cell };
});
const forb = [[0, 3]];
for (let i = 0; i < 30; i++) {
    const [a, b] = forb[forb.length - 1];
    if (b < a + 2) forb.push([a - b + 1, 4 * b - 1]);
    else if (b > a + 2) forb.push([2 * a + 2, b - a - 1]);
    else { console.log('f-HALT at element', forb.length); break; }
}
console.log('f-orbit[0..12]:', JSON.stringify(forb.slice(0, 12)));
// matchesAt(fr, p, str): 纸带从 p 起恰为 str，且之后全 0（右边界干净）
function matchesAt(fr, p, str) {
    for (let i = 0; i < str.length; i++) if (fr.cell(p + i) !== +str[i]) return false;
    for (let i = str.length; i < str.length + 2; i++) if (fr.cell(p + i) !== 0) return false;
    return true;
}
// 也要求左侧全 0 到头位置前?
function leftClean(fr, p) {
    for (let i = 1; i <= 2; i++) if (fr.cell(p - i) !== 0) return false;
    return true;
}
const pat = (a, b, sep) => ('10').repeat(a) + sep + '1'.repeat(b);
const LIM = 20;
const conventions = {
    'D on (10)^a 1^b start, clean': (f, fr) => fr.state === 'D' && matchesAt(fr, fr.head, pat(f[0], f[1], '')) && leftClean(fr, fr.head),
    'D on (10)^a 1^b start (no left req)': (f, fr) => fr.state === 'D' && matchesAt(fr, fr.head, pat(f[0], f[1], '')),
    'D left of block in (10)^a 0 1^b': (f, fr) => fr.state === 'D' && fr.cell(fr.head) === 0 && matchesAt(fr, fr.head - 2 * f[0], pat(f[0], f[1], '0')),
    'E right of (10)^a 1^b': (f, fr) => fr.state === 'E' && fr.cell(fr.head) === 0 && fr.cell(fr.head - 1) === 1 && matchesAt(fr, fr.head - 2 * f[0] - f[1], pat(f[0], f[1], '')),
    'any state on (10)^a 1^b start': (f, fr) => matchesAt(fr, fr.head, pat(f[0], f[1], '')) && leftClean(fr, fr.head),
    'any state, pattern ends at right edge': (f, fr) => matchesAt(fr, fr.head, pat(f[0], f[1], '')),
};
for (const [name, test] of Object.entries(conventions)) {
    let idx = 0; const seq = [];
    for (const fr of frames) {
        if (idx >= Math.min(forb.length, LIM)) break;
        if (test(forb[idx], fr)) { seq.push(`e${idx + 1}(${forb[idx]}):${fr.state}@${fr.step}`); idx++; }
    }
    console.log(`\n=== ${name}: matched ${idx}/${Math.min(forb.length, LIM)} in order`);
    if (idx >= 2) console.log('   ' + seq.join(' '));
}
