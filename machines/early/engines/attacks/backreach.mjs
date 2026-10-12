// P1 part 2: B_m = set of residue pairs that can REACH a diagonal pair (z,z) mod m
// allowing both branches (backward over-approximation; = complement characterization
// of "safe" residues). If some actual orbit element's residue lies OUTSIDE B_m,
// the tail from that element can never halt => machine never halts.
// For odd m the inverse maps are single-valued:
//   f1^{-1}(u,v): y = (v-2)*inv4, x = u + y        [T1(x,y)=(x-y,4y+2)=(u,v)]
//   f2^{-1}(u,v): x = (u-1)*inv2, y = v + x        [T2(x,y)=(2x+1,y-x)=(u,v)]
// For even m, 4y≡v-2 (mod m) may have 0 or several solutions -> relation.

import { readFileSync } from 'fs';

function forwardClosure(m) {
    const N = m * m;
    const seen = new Uint8Array(N);
    const q = [[1 % m, 2 % m]];
    seen[1 % m * m + 2 % m] = 1;
    while (q.length) {
        const [x, y] = q.pop();
        for (const [nx, ny] of [
            [(((x - y) % m) + m) % m, (4 * y + 2) % m],
            [(2 * x + 1) % m, (((y - x) % m) + m) % m],
        ]) {
            const id = nx * m + ny;
            if (!seen[id]) { seen[id] = 1; q.push([nx, ny]); }
        }
    }
    return seen;
}

function backwardClosure(m) {
    const N = m * m;
    const seen = new Uint8Array(N);
    const q = [];
    for (let z = 0; z < m; z++) { seen[z * m + z] = 1; q.push([z, z]); }
    while (q.length) {
        const [u, v] = q.pop();
        // preimages under T1: solve 4y ≡ v-2 (mod m), x ≡ u+y
        const c = (((v - 2) % m) + m) % m;
        const g = gcd(4 % m === 0 ? m : 4, m); // gcd(4,m)
        if (c % g === 0) {
            // solutions y = y0 + t*(m/g), t=0..g-1
            const mg = m / g;
            const inv = invMod((4 / g) % mg, mg);
            const y0 = ((c / g) % mg) * inv % mg;
            for (let t = 0; t < g; t++) {
                const y = (y0 + t * mg) % m;
                const x = (u + y) % m;
                const id = x * m + y;
                if (!seen[id]) { seen[id] = 1; q.push([x, y]); }
            }
        }
        // preimages under T2: solve 2x ≡ u-1 (mod m), y ≡ v + x
        const c2 = (((u - 1) % m) + m) % m;
        const g2 = gcd(2, m);
        if (c2 % g2 === 0) {
            const mg2 = m / g2;
            const inv2 = invMod((2 / g2) % mg2, mg2);
            const x0 = ((c2 / g2) % mg2) * inv2 % mg2;
            for (let t = 0; t < g2; t++) {
                const x = (x0 + t * mg2) % m;
                const y = (v + x) % m;
                const id = x * m + y;
                if (!seen[id]) { seen[id] = 1; q.push([x, y]); }
            }
        }
    }
    return seen;
}

function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a || 1; }
function invMod(a, mo) { a %= mo; for (let x = 1; x < mo; x++) if ((a * x) % mo === 1) return x; return 0; }

console.log('m\t|R|\t|B|\tR⊆B?\t|R\\B|\t(start (1,2)∈B?)');
const safeByM = new Map();
for (let m = 2; m <= 256; m++) {
    const R = forwardClosure(m);
    const B = backwardClosure(m);
    let rcount = 0, bcount = 0, rNotB = 0;
    for (let i = 0; i < m * m; i++) {
        if (R[i]) rcount++;
        if (B[i]) bcount++;
        if (R[i] && !B[i]) rNotB++;
    }
    const startInB = B[1 % m * m + 2 % m];
    if (rNotB > 0 || !startInB || m <= 16 || [24, 32, 48, 64, 53, 11, 128, 256].includes(m))
        console.log(`${m}\t${rcount}\t${bcount}\t${rNotB === 0 ? 'yes' : 'NO'}\t${rNotB}\t${startInB ? 'yes' : 'no'}`);
    if (rNotB > 0) safeByM.set(m, rNotB);
}
console.log('moduli with R\\B nonempty:', [...safeByM.entries()].map(([m, c]) => `${m}:${c}`).join(' ') || 'NONE');
