// P4b: Exact forward census on a small box + cross-validation of backward maps.
// For all 1<=a,b<=B: iterate A-recurrence with BigInt until halt or max(a,b) > ESCAPE.
// Escape does NOT prove non-halting; we classify: HALT(step) or ESCAPED.
// Cross-check against the backward BFS census: every HALT point must appear in the
// backward tree (halt value z <= 4e6 covered there for B small).
const B = 512, ESCAPE_BITS = 220;
let halt = 0, escaped = 0, maxStep = 0;
const halters = [];
for (let a0 = 1; a0 <= B; a0++) for (let b0 = 1; b0 <= B; b0++) {
    let a = BigInt(a0), b = BigInt(b0), n = 0;
    while (true) {
        if (a === b) { halt++; maxStep = Math.max(maxStep, n); if (halters.length < 100000) halters.push([a0, b0, n, a.toString()]); break; }
        const nx = a > b ? [a - b, 4n * b + 2n] : [2n * a + 1n, b - a];
        [a, b] = nx; n++;
        const bits = a > b ? a.toString(2).length : b.toString(2).length;
        if (bits > ESCAPE_BITS) { escaped++; break; }
    }
}
console.log(`box ${B}x${B}: HALT=${halt} ESCAPED=${escaped} (of ${B * B}) maxHaltStep=${maxStep}`);
console.log(`fraction halting: ${(halt / (B * B)).toFixed(4)}`);

// self-test of inverse maps: for random halting points, walk back to diagonal
function backStep(a, b) { // returns list of preimages
    const out = [];
    if (b % 4n === 2n && b >= 6n) { const y = (b - 2n) / 4n; out.push([a + y, y]); }
    if (a % 2n === 1n && b >= 1n) { const x = (a - 1n) / 2n; out.push([x, b + x]); }
    return out;
}
let backOK = 0, backBAD = 0;
for (const [a0, b0] of halters.slice(0, 5000)) {
    let a = BigInt(a0), b = BigInt(b0), guard = 0;
    while (a !== b && guard++ < 10000) {
        const pres = backStep(a, b).filter(([x, y]) => {
            if (x === y) return false; // would be a halting preimage: not on a halting path unless x==y.. keep it simple
            return x > y ? [x - y, 4n * y + 2n] : (x < y ? [2n * x + 1n, y - x] : null);
        });
        // verify: at least one preimage maps forward to (a,b)
        const good = pres.filter(([x, y]) => {
            const f = x > y ? [x - y, 4n * y + 2n] : [2n * x + 1n, y - x];
            return f[0] === a && f[1] === b;
        });
        if (good.length === 0) { backBAD++; break; }
        // choose the preimage (a halting point's orbit: the true predecessor) - walk greedily toward diagonal
        // a+b decreases going forward, so predecessor has smaller.. actually predecessor has SMALLER a+b except T1 pre grows it.
        // pick the preimage that eventually reaches diagonal: test each by forward sim to halt
        let chosen = null;
        for (const [x, y] of good) {
            let px = x, py = y, g2 = 0, hits = false;
            while (g2++ < 400) {
                if (px === py) { hits = true; break; }
                const f = px > py ? [px - py, 4n * py + 2n] : [2n * px + 1n, py - px];
                [px, py] = f;
            }
            if (hits) { chosen = [x, y]; break; }
        }
        if (!chosen) { backBAD++; break; }
        backOK++;
        [a, b] = chosen;
    }
    if (a !== b && guard >= 10000) backBAD++;
}
console.log(`inverse-map round-trip on halting paths: ok=${backOK} bad=${backBAD}`);

// near-miss relation: which neighbors of orbit near-misses (5,4) and (83,81) halt?
for (const [cx, cy] of [[5, 4], [83, 81]]) {
    console.log(`halting neighbors of (${cx},${cy}) within +-2:`);
    for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) {
        const a0 = cx + dx, b0 = cy + dy;
        if (a0 < 1 || b0 < 1) continue;
        let a = BigInt(a0), b = BigInt(b0), n = 0, res = 'ESC';
        while (n < 3000) {
            if (a === b) { res = `HALT@${n}`; break; }
            const nx = a > b ? [a - b, 4n * b + 2n] : [2n * a + 1n, b - a];
            [a, b] = nx; n++;
            if (a.toString(2).length > 200) break;
        }
        if (res !== 'ESC') console.log(`  (${a0},${b0}): ${res}`);
    }
}
