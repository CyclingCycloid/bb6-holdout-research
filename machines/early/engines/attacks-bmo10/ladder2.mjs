// BMO10 因子型不变量阶梯 v2: blocker = 包含 LHS 且不是初始字子串的最短 pre 子串
import { writeFileSync } from 'fs';
const RULES = [['#0', '1'], ['#100', '000#'], ['#110', '000#'], ['#1010', '1010##']];
const GOAL = ['111', '1011'];
const A = ['0', '1', '#'];
const CL = +(process.argv[2] || 7), CR = +(process.argv[3] || 7);
const MAXITER = 40;
const INIT = '10#'.repeat(40) + '0'.repeat(60); // 足够长的初始字代表 (其子串集合已饱和: 周期部分+右零区)
function allWords(n) { let out = ['']; for (let i = 0; i < n; i++) { const nx = []; for (const p of out) for (const a of A) nx.push(p + a); out = nx; } return out; }
const has = (w, list) => list.some(f => w.includes(f));
const initSubs = new Set();
for (let i = 0; i < INIT.length; i++) for (let l = 1; l <= 12 && i + l <= INIT.length; l++) initSubs.add(INIT.substr(i, l));

// blocker: pre 中包含 LHS 的最短子串 w, w ∉ initSubs; 若 pre 的含 LHS 子串全在初始字中, 返回 null(此反例不可由因子禁串堵住)
function blocker(pre, lhs) {
    const s = pre.indexOf(lhs);
    for (let len = lhs.length; len <= pre.length; len++) {
        for (let a = Math.max(0, s - (len - lhs.length)); a >= 0 && a + len <= pre.length && s >= a; a = Math.max(0, a - 1)) {
            const w = pre.substr(a, len);
            if (!w.includes(lhs)) continue;
            if (!initSubs.has(w)) return w;
            break; // 该长度下最左含 LHS 窗口在初始字中, 尝试更右? 简化: 该长度只试最左对齐
        }
    }
    return null;
}
const ctxL = []; for (let n = 0; n <= CL; n++) ctxL.push(...allWords(n));
const ctxR = []; for (let n = 0; n <= CR; n++) ctxR.push(...allWords(n));
console.log(`contexts: L=${ctxL.length} R=${ctxR.length}, initSubs=${initSubs.size}`);

let F = [];
for (let iter = 1; iter <= MAXITER; iter++) {
    const newF = [];
    let unblockable = 0;
    for (const [lhs, rhs] of RULES) {
        for (const cl of ctxL) for (const cr of ctxR) {
            const pre = cl + lhs + cr, post = cl + rhs + cr;
            if (has(pre, GOAL) || has(pre, F) || has(pre, newF)) continue;
            if (!has(post, GOAL)) continue;
            const w = blocker(pre, lhs);
            if (w === null) { unblockable++; continue; }
            if (!F.includes(w) && !newF.includes(w)) newF.push(w);
        }
    }
    console.log(`iter ${iter}: +${newF.length} blockers (|F|=${F.length + newF.length}), unblockable-contexts=${unblockable}`);
    F.push(...newF);
    if (newF.length === 0 && unblockable === 0) {
        console.log('*** CONVERGED with zero unblockable contexts ***');
        writeFileSync('invariant-F2.json', JSON.stringify(F.sort((x, y) => x.length - y.length || x.localeCompare(y))));
        console.log('F =', JSON.stringify(F));
        process.exit(0);
    }
    if (unblockable > 0) { console.log('UNBLOCKABLE contexts exist at iter', iter, '— factorial invariant of this length fails'); writeFileSync('invariant-F2-partial.json', JSON.stringify(F)); process.exit(3); }
}
console.log('iteration cap hit');
