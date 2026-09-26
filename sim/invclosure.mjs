// BMO10 不变量封闭性独立验证器
// 用法: node invclosure.mjs <禁忌子串列表(逗号分隔)> [左上下文长] [右上下文长]
// 原理: 对每条规则 R: lhs→rhs, 枚举所有嵌入 (左 L 个符号 + rhs + 右 R 个符号),
//       检查: 若嵌入前的完整词 (左 + lhs + 右) 满足不变量(不含禁忌子串),
//             则嵌入后的完整词 (左 + rhs + 右) 也满足。
//       左右上下文符号集 = {0,1,#}; 默认 L=R=6 (覆盖所有跨度≤6的跨界模式)。
const BMO10_RULES = [
    ['#0', '1'],
    ['#100', '000#'],
    ['#110', '000#'],
    ['#1010', '1010##'],
];
const BMO11_RULES = [
    ['#0', '1'],
    ['#100', '010#'],
    ['#1010', '1010##'],
    ['#10110', '10101'],
    ['#11', '10'],
];

const args = process.argv.slice(2);
const forbidden = args[0].split(',');
const L = args[1] ? +args[1] : 6;
const R = args[2] ? +args[2] : 6;
const A = ['0', '1', '#'];

function ok(word) { for (const f of forbidden) if (word.includes(f)) return false; return true; }

function checkRules(rules, name) {
    let bad = 0, checked = 0;
    for (const [lhs, rhs] of rules) {
        // 枚举左上下文 (长 L) 与右上下文 (长 R)
        const leftCtxs = [];
        for (let n = 0; n <= L; n++) {
            const combos = Array.from({ length: Math.pow(3, n) }, (_, x) => {
                let s = ''; for (let i = 0; i < n; i++) s += A[x % 3], x = Math.floor(x / 3); return s;
            });
            leftCtxs.push(...combos);
        }
        const rightCtxs = [];
        for (let n = 0; n <= R; n++) {
            const combos = Array.from({ length: Math.pow(3, n) }, (_, x) => {
                let s = ''; for (let i = 0; i < n; i++) s = A[x % 3], x = Math.floor(x / 3); return s;
            });
            rightCtxs.push(...combos);
        }
        for (const lc of leftCtxs) for (const rc of rightCtxs) {
            const before = lc + lhs + rc;
            const after = lc + rhs + rc;
            checked++;
            if (ok(before) && !ok(after)) {
                bad++;
                if (bad <= 12) console.log(`${name} COUNTEREXAMPLE [${lhs}→${rhs}] ctx lc="${lc}" rc="${rc}": before="${before}" after="${after}"`);
            }
        }
    }
    console.log(`${name}: ${forbidden.length} forbidden patterns, L=R=${L}: ${checked} embeddings checked, ${bad} counterexamples`);
    return bad;
}

const bad1 = checkRules(BMO10_RULES, 'BMO10');
const bad2 = checkRules(BMO11_RULES, 'BMO11');
process.exit((bad1 + bad2) > 0 ? 1 : 0);
