// BMO10 因子型不变量阶梯 v4: 灵活 blocker + 收敛后三重终检
import { writeFileSync, readFileSync } from 'fs';
const RULES = [['#0', '1'], ['#100', '000#'], ['#110', '000#'], ['#1010', '1010##']];
const GOAL = ['111', '1011'];
const A = ['0', '1', '#'];
const CL = +(process.argv[2] || 6), CR = +(process.argv[3] || 6);
const MAXITER = 60;
const INIT = '10#'.repeat(40) + '0'.repeat(60);
function allWords(n) { let out = ['']; for (let i = 0; i < n; i++) { const nx = []; for (const p of out) for (const a of A) nx.push(p + a); out = nx; } return out; }
const has = (w, list) => list.some(f => w.includes(f));
const initSubs = new Set();
for (let i = 0; i < INIT.length; i++) for (let l = 1; l <= 14 && i + l <= INIT.length; l++) initSubs.add(INIT.substr(i, l));

// blocker: pre 的子串, 不在初始字中, 与被替换区 [s, s+lhs.len) 重叠, 最短
function blocker(pre, lhs) {
    const s = pre.indexOf(lhs);
    const cand = [];
    for (let a = 0; a < pre.length; a++) for (let b = a + 1; b <= pre.length; b++) {
        if (b <= s || a >= s + lhs.length) continue; // 必须与替换区重叠
        const w = pre.substring(a, b);
        if (initSubs.has(w)) continue;
        cand.push(w);
    }
    if (!cand.length) return null;
    cand.sort((x, y) => x.length - y.length);
    return cand[0];
}
const ctxL = []; for (let n = 0; n <= CL; n++) ctxL.push(...allWords(n));
const ctxR = []; for (let n = 0; n <= CR; n++) ctxR.push(...allWords(n));

let F = [...GOAL];
for (let iter = 1; iter <= MAXITER; iter++) {
    const newF = [];
    let unblock = 0;
    for (const [lhs, rhs] of RULES) {
        for (const cl of ctxL) for (const cr of ctxR) {
            const pre = cl + lhs + cr, post = cl + rhs + cr;
            if (has(pre, F) || has(pre, newF)) continue;
            if (!has(post, F)) continue;
            const w = blocker(pre, lhs);
            if (w === null) { unblock++; if (unblock < 6) console.log('  UNBLOCKABLE:', JSON.stringify({ rule: lhs, pre })); continue; }
            if (!newF.includes(w)) newF.push(w);
        }
    }
    console.log(`iter ${iter}: +${newF.length} (|F|=${F.length + newF.length}), unblockable=${unblock}, new=${JSON.stringify(newF.slice(0, 8))}`);
    F.push(...newF);
    if (newF.length === 0 && unblock === 0) {
        console.log('*** CONVERGED ***');
        F = [...new Set(F)].sort((x, y) => x.length - y.length || x.localeCompare(y));
        writeFileSync('invariant-F4.json', JSON.stringify(F));
        console.log(`|F|=${F.length}, maxLen=${Math.max(...F.map(f => f.length))}`);
        console.log(JSON.stringify(F));
        process.exit(0);
    }
    if (unblock > 0) { writeFileSync('invariant-F4-partial.json', JSON.stringify(F)); process.exit(3); }
}
console.log('cap');
