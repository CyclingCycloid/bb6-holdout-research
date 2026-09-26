// BMO10 因子型不变量阶梯精化 (fixpoint)
// 目标 G: 无 111, 无 1011  =>  最右 # 恒活 => 博弈答案 NO
// 算法: F := {} ; repeat:
//   对每条规则与每个上下文 (左 C_L 符号 + LHS + 右 C_R 符号):
//     pre = ctx_l + LHS + ctx_r; post = ctx_l + RHS + ctx_r
//     若 pre 不含 F 成员且不含 G 违规, 但 post 含 G 违规:
//        取 pre 中覆盖接缝的最短"责任窗口" w (长度 ≤ C_L+len(LHS)+C_R, 且 w 不是 RHS+ctx 的一部分...简单取法: 整个 pre 的接缝±d 窗口)
//        F := F ∪ {w}
// 直到无新增 (收敛 => 定理) 或迭代超限
// 收敛后验证: 初始字不含 F。
import { writeFileSync } from 'fs';
const RULES = [['#0', '1'], ['#100', '000#'], ['#110', '000#'], ['#1010', '1010##']];
const GOAL = ['111', '1011'];
const CL = +(process.argv[2] || 7), CR = +(process.argv[3] || 7);
const MAXITER = 30;
const A = ['0', '1', '#'];
function allWords(n) { let out = ['']; for (let i = 0; i < n; i++) { const nx = []; for (const p of out) for (const a of A) nx.push(p + a); out = nx; } return out; }
const has = (w, list) => list.some(f => w.includes(f));

// 责任窗口: pre 中包含接缝(LHS 起始位置)的极短子串, 使得禁止它能阻止此反例:
// 取包含 [max(0,seamStart-3), seamStart+len(LHS)+3) 的窗口, 再最小化: 尝试从两端收缩, 保持"post 的违规仍由该窗口的 pre 内容决定"——
// 简化可靠取法: 取 pre 的子串 w = pre.slice(a,b) 其中 a ∈ 接缝左侧 0..4, b ∈ 接缝右侧 0..4, 选最短的 w 使得 w 包含 LHS 整体与接缝两侧各至少1符号(若可能)。
function blocker(pre, lhsLen, rhsLen) {
    // seam 在 pre 中的位置 = CL... 不, pre = ctxl+LHS+ctxr; LHS 起始 = ctxl.length
    const s = CL; // 上下文定长生成时使用; 但我们枚举变长, 故由调用者传
    return null;
}
// 用变长上下文, 记录结构化 pre 以便取窗口
const ctxL = []; for (let n = 0; n <= CL; n++) ctxL.push(...allWords(n));
const ctxR = []; for (let n = 0; n <= CR; n++) ctxR.push(...allWords(n));
console.log(`contexts: L=${ctxL.length} R=${ctxR.length}`);

let F = [];
for (let iter = 1; iter <= MAXITER; iter++) {
    let added = 0;
    const newF = [];
    for (const [lhs, rhs] of RULES) {
        for (const cl of ctxL) for (const cr of ctxR) {
            const pre = cl + lhs + cr, post = cl + rhs + cr;
            if (has(pre, GOAL) || has(pre, F) || has(pre, newF)) continue;
            if (!has(post, GOAL)) continue;
            // 找责任窗口: 从接缝向两侧扩展到刚好覆盖 pre 中与 post 差异影响区的最小窗口
            // 差异区: pre 中 [cl.length, cl.length+lhs.length) 被 rhs 替换; post 的违规必跨越接缝或落在 rhs 内(不可能, rhs 无 111/1011? 验证过)
            // 所以违规跨接缝: 取窗口 = pre.slice(max(0,cl.length-4), min(pre.length, cl.length+lhs.length+4))
            const a = Math.max(0, cl.length - 4), b = Math.min(pre.length, cl.length + lhs.length + 4);
            const w = pre.slice(a, b);
            // 最小化: 从两端收缩, 保持 w 仍含 LHS 且长度>lhs.length
            let wa = a, wb = b;
            while (wb - wa > lhs.length + 1 && pre.slice(wa + 1, wb).includes(lhs)) wa++;
            while (wb - wa > lhs.length + 1 && pre.slice(wa, wb - 1).includes(lhs)) wb--;
            const wmin = pre.slice(wa, wb);
            if (!F.includes(wmin) && !newF.includes(wmin)) { newF.push(wmin); added++; }
        }
    }
    console.log(`iter ${iter}: +${added} blockers (|F|=${F.length + newF.length})`);
    F.push(...newF);
    if (added === 0) {
        console.log('CONVERGED.');
        // 初始字检查
        const init = '10#'.repeat(10) + '0'.repeat(20);
        const bad = F.filter(f => init.includes(f));
        console.log(`initial-word violations by F: ${bad.length} ${bad.slice(0, 5).join(',')}`);
        writeFileSync('invariant-F.json', JSON.stringify(F.sort((x, y) => x.length - y.length)));
        console.log(`F sizes: ${F.length}, max len ${Math.max(...F.map(f => f.length))}`);
        process.exit(bad.length ? 2 : 0);
    }
}
console.log('DID NOT CONVERGE within iteration cap; |F| =', F.length);
writeFileSync('invariant-F-partial.json', JSON.stringify(F.sort((x, y) => x.length - y.length)));
