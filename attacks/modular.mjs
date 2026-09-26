// P1: Modular over-approximation reachability for BMO1.
// Soundness: if the actual orbit halts, then at the halting step the residue pair
// (a mod m, b mod m) is diagonal. The over-approximation R_m (residues reachable
// from the start residue allowing BOTH branches at every step) contains all actual
// orbit residues. So if R_m ∩ Δ_m = ∅ for a single m, non-halting is PROVEN.
// We also test the pre-halt lines L1: a ≡ 5b+2, L2: b ≡ 3a+1 (mod m)
// (halting at step n>=2 requires the step-(n-1) state on L1 or L2 exactly;
//  step-1 halt is impossible: (1,2)->(3,1)).

function closureBFS(m, sx, sy, dense) {
    // returns {size, distDiag, distLine, visited} using BFS layering.
    // dense: Uint8Array(m*m) for m <= 8192, else Map.
    const N = m * m;
    const visited = dense ? new Uint8Array(N) : new Map();
    const dist = dense ? new Int32Array(N).fill(-1) : new Map();
    const idx = (x, y) => x * m + y;
    const seen = (x, y) => dense ? visited[idx(x, y)] === 1 : visited.has(idx(x, y));
    const mark = (x, y, d) => { if (dense) { visited[idx(x, y)] = 1; dist[idx(x, y)] = d; } else { visited.set(idx(x, y), 1); dist.set(idx(x, y), d); } };
    let frontier = [[sx % m, sy % m]];
    mark(sx % m, sy % m, 0);
    let distDiag = -1, distLine = -1, size = 1;
    if (sx % m === sy % m) distDiag = 0;
    const onLine = (x, y) => {
        // L1: x - 5y - 2 ≡ 0 ; L2: y - 3x - 1 ≡ 0 (mod m)
        const l1 = (((x - 5 * y - 2) % m) + m) % m === 0;
        const l2 = (((y - 3 * x - 1) % m) + m) % m === 0;
        return l1 || l2;
    };
    if (distLine < 0 && onLine(sx % m, sy % m)) distLine = 0;
    let depth = 0;
    while (frontier.length) {
        depth++;
        const next = [];
        for (const [x, y] of frontier) {
            // branch 1 (a>b): (a-b, 4b+2)
            const t1 = [(((x - y) % m) + m) % m, (4 * y + 2) % m];
            // branch 2 (a<b): (2a+1, b-a)
            const t2 = [(2 * x + 1) % m, (((y - x) % m) + m) % m];
            for (const [nx, ny] of [t1, t2]) {
                if (!seen(nx, ny)) {
                    mark(nx, ny, depth); size++;
                    if (distDiag < 0 && nx === ny) distDiag = depth;
                    if (distLine < 0 && onLine(nx, ny)) distLine = depth;
                    next.push([nx, ny]);
                }
            }
        }
        frontier = next;
        if (distDiag >= 0 && distLine >= 0) break; // both found; size not exact then
        if (size >= N) break;
    }
    return { size, distDiag, distLine, saturated: size >= N };
}

// ---- Part 1: table for m = 2..128 ----
console.log('m\t|R|\tm^2\tsat\tdistDiag\tdistLine');
for (let m = 2; m <= 128; m++) {
    const r = closureBFS(m, 1, 2, m <= 8192);
    console.log(`${m}\t${r.size}\t${m * m}\t${r.saturated ? 1 : 0}\t${r.distDiag}\t${r.distLine}`);
}

// ---- Part 2: selected larger moduli ----
const larger = [144, 216, 256, 343, 360, 384, 512, 625, 729, 1024, 1296, 2048, 2187, 2401, 3125, 4096];
console.log('\n-- larger moduli --');
for (const m of larger) {
    const t0 = Date.now();
    const r = closureBFS(m, 1, 2, m <= 8192);
    console.log(`${m}\t|R|=${r.size}/${m * m}\tsat=${r.saturated ? 1 : 0}\tdistDiag=${r.distDiag}\tdistLine=${r.distLine}\t${Date.now() - t0}ms`);
}
