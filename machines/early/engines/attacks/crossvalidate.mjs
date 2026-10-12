// P4b2: clean cross-validation.
// For a sample of forward-census halting points (a0,b0) with halt value z:
// build the COMPLETE backward tree of (z,z) (with a node cap; trees are small)
// and check (a0,b0) appears. Also verify inverse-map formulas by forward application.
const B = 512, ESCAPE_BITS = 220;
const halters = [];
for (let a0 = 1; a0 <= B; a0++) for (let b0 = 1; b0 <= B; b0++) {
    let a = BigInt(a0), b = BigInt(b0), n = 0;
    while (true) {
        if (a === b) { halters.push([a0, b0, n, a]); break; }
        const nx = a > b ? [a - b, 4n * b + 2n] : [2n * a + 1n, b - a];
        [a, b] = nx; n++;
        if ((a > b ? a : b).toString(2).length > ESCAPE_BITS) break;
    }
}
console.log(`halters in box: ${halters.length}`);

function fwd(x, y) { return x > y ? [x - y, 4n * y + 2n] : [2n * x + 1n, y - x]; }

// complete backward tree of seed (z,z): BFS until exhaustion; assert at every expansion
// that applying the forward map to the preimage returns the child (round-trip proof).
function backwardTree(z) {
    const seen = new Map(); // key "a,b" -> depth
    let frontier = [[z, z, 0]];
    seen.set(`${z},${z}`, 0);
    while (frontier.length) {
        const nf = [];
        for (const [a, b, d] of frontier) {
            const pres = [];
            if (b % 4n === 2n && b >= 6n) { const y = (b - 2n) / 4n; pres.push([a + y, y]); }
            if (a % 2n === 1n && b >= 1n && a >= 1n) { const x = (a - 1n) / 2n; pres.push([x, b + x]); }
            for (const [x, y] of pres) {
                const f = fwd(x, y); // x==y impossible here? if x==y then fwd undefined; check
                if (x === y) continue; // diagonal preimage: means halting earlier; skip (tree from seed z only)
                if (f[0] !== a || f[1] !== b) throw new Error(`inverse formula BROKEN at (${x},${y})->(${a},${b})`);
                const k = `${x},${y}`;
                if (!seen.has(k) && d + 1 < 4000) { seen.set(k, d + 1); nf.push([x, y, d + 1]); }
            }
        }
        frontier = nf;
        if (seen.size > 200000) break; // safety cap
    }
    return seen;
}

let checked = 0, missing = 0, maxTree = 0;
for (const [a0, b0, n, z] of halters) {
    const tree = backwardTree(z);
    maxTree = Math.max(maxTree, tree.size);
    if (!tree.has(`${a0},${b0}`)) { missing++; if (missing < 5) console.log(`MISSING from backward tree: (${a0},${b0}) halt@${n} z=${z}`); }
    checked++;
}
console.log(`cross-validation: checked=${checked} missing=${missing} maxTreeSize=${maxTree}`);
console.log(`inverse formulas verified by round-trip on every expansion of ${checked} trees`);

// depth histogram of halters
const hist = new Map();
for (const [, , n] of halters) hist.set(n, (hist.get(n) || 0) + 1);
console.log('halt-depth histogram (box 512):', [...hist.entries()].sort((x, y) => x[0] - y[0]).map(([d, c]) => `${d}:${c}`).join(' '));
