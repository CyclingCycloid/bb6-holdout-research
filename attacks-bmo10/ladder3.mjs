// BMO10 因子型不变量阶梯 v3 (完整组合不变量: F ⊇ GOAL, 封闭 = pre 无 F ⟹ post 无 F)
import { writeFileSync } from 'fs';
const RULES = [['#0', '1'], ['#100', '000#'], ['#110', '000#'], ['#1010', '1010##']];
const GOAL = ['111', '1011'];
const A = ['0', '1', '#'];
const CL = +(process.argv[2] || 7), CR = +(process.argv[3] || 7);
const MAXITER = 60;
const INIT = '10#'.repeat(40) + '0'.repeat(60);
function allWords(n) { let out = ['']; for (let i = 0; i < n; i++) { const nx = []; for (const p of out) for (const a of A) nx.push(p + a); out = nx; } return out; }
const has = (w, list) => list.some(f => w.includes(f));
const initSubs = new Set();
for (let i = 0; i < INIT.length; i++) for (let l = 1; l <= 12 && i + l <= INIT.length; l++) initSubs.add(INIT.substr(i, l));
function blocker(pre, lhs) {
    const s = pre.indexOf(lhs);
    for (let len = lhs.length; len <= pre.length; len++) {
        const a0 = s - (len - lhs.length);
        if (a0 < 0) continue;
        const w = pre.substr(a0, len);
        if (!initSubs.has(w)) return w;
    }
    return null;
}
const ctxL = []; for (let n = 0; n <= CL; n++) ctxL.push(...allWords(n));
const ctxR = []; for (let n = 0; n <= CR; n++) ctxR.push(...allWords(n));
console.log(`contexts: L=${ctxL.length} R=${ctxR.length}`);

let F = [...GOAL];
for (let iter = 1; iter <= MAXITER; iter++) {
    const newF = [];
    let unblockable = 0;
    for (const [lhs, rhs] of RULES) {
        for (const cl of ctxL) for (const cr of ctxR) {
            const pre = cl + lhs + cr, post = cl + rhs + cr;
            if (has(pre, F) || has(pre, newF)) continue;
            if (!has(post, F)) continue; // post 违反 F (含 GOAL 与新增 blocker)
            const w = blocker(pre, lhs);
            if (w === null || has(w, F)) { unblockable++; continue; }
            if (!newF.includes(w)) newF.push(w);
        }
    }
    console.log(`iter ${iter}: +${newF.length} (|F|=${F.length + newF.length}), unblockable=${unblockable}`);
    F.push(...newF);
    if (newF.length === 0 && unblockable === 0) {
        console.log('*** CONVERGED ***');
        F.sort((x, y) => x.length - y.length || x.localeCompare(y));
        writeFileSync('invariant-F3.json', JSON.stringify(F));
        console.log('F =', JSON.stringify(F));
        process.exit(0);
    }
    if (unblockable > 0) { console.log('UNBLOCKABLE at iter', iter); writeFileSync('invariant-F3-partial.json', JSON.stringify(F)); process.exit(3); }
}
console.log('iteration cap hit; |F| =', F.length);
