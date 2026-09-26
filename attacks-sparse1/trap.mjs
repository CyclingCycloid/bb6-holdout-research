// trap.mjs — modular/residue trap test for SPARSE1 anchor map (G/S).
//
// Exact macro map on anchor states (m, k) [deco d=1 whenever deco exists; d is
// meaningless when k=0 — no deco; oracle-verified: on the reachable family a
// 2-gap never precedes a deco, so d=2 cells are structurally off-orbit]:
//
//  G (m % 3 == 1): m' = (4m+2)/3 + j[m%9][k%3] + 3*floor(k/3)
//                  k' = kk[m%9][k%3]
//     j  : {1: [0,2,5], 4: [1,4,2], 7: [3,1,3]}
//     kk : {1: [3,2,0], 4: [2,0,3], 7: [0,3,2]}
//  S (m % 3 == 2, m != 5): m' = (m+1)/3 [m%9==2], (m-5)/3 [m%9==8], (m-8)/3 [m%9==5]
//                          k' = m + k - m' + 1
//  EXCEPTION m == 5 (and mini m=1,2 handled by same S formula; m=5 deviates):
//     (5,1,k): k%3==1 -> HALT; k%3==0 -> (5,1,k+4) -> HALT next; k%3==2 -> (10,1,2) escape.
//  One-step halt cells (oracle census m<=120, k<=64 + structural classes):
//     H1 = { m%3==0 & (d==2 | k==0) }  ∪  { m in {1,2,8,14,32,50,...} & d==2 & k%3==2 }
//     (second class structurally unreachable: deco=>d=1 on orbit)
//
// PART A: exact orbit residues. Iterate the exact map with BigInt from the true
// start (m,k)=(1,2) for NSTEPS anchor steps; collect (m mod L, k mod L),
// L = lcm(1..64). For each M<=64: does the orbit residue set avoid every residue
// class that contains a halt cell? (halt classes modulo M from H1 + m=5 trap).
// If YES for some M -> modular non-halting proof. Expect NO for all.
//
// PART B: both-branch over-approximation closure on Z_M x Z_M (m,k), branch
// ambiguity = division by 3 (3 roots each) + regime ambiguity; from start
// residue; check avoidance of halt residues. Expect saturation (no avoidance).

const J  = { 1: [0n,2n,5n], 4: [1n,4n,2n], 7: [3n,1n,3n] };
const KK = { 1: [3n,2n,0n], 4: [2n,0n,3n], 7: [0n,3n,2n] };

function stepExact(m, k) { // returns [m', k'] or "HALT"
  const r = ((m % 3n) + 3n) % 3n;
  if (r === 0n) return "HALT";      // m%3==0 with no deco: halt class (verified unreachable)
  if (m === 5n) {                    // exceptional m=5
    if (k % 3n === 1n) return "HALT";
    if (k % 3n === 0n) return "HALT"; // (5,1,k=0 mod 3) -> (5,1,k+4) -> HALT
    return [10n, 2n];                // k%3==2 -> escape
  }
  if (r === 2n) {                    // S
    const m9 = ((m % 9n) + 9n) % 9n;
    let c = m9 === 2n ? 1n : m9 === 8n ? -5n : -8n; // m9==5
    const m2 = (m + c) / 3n;
    return [m2, m + k - m2 + 1n];
  }
  // G, r==1
  const m9 = ((m % 9n) + 9n) % 9n;
  const k3 = ((k % 3n) + 3n) % 3n;
  const a = (m - 1n) / 3n;
  const m2 = 4n * a + 2n + J[Number(m9)][Number(k3)] + 3n * ((k - k3) / 3n);
  return [m2, KK[Number(m9)][Number(k3)]];
}

// ---- Part A: exact orbit, residue collection ----
const NSTEPS = parseInt(process.argv[2] ?? "20000", 10);
let m = 1n, k = 2n;
const Ms = []; for (let M = 2; M <= 64; M++) Ms.push(M);
const L = 1n * 2n*3n*2n*5n*7n*2n*3n* 11n*13n*2n*17n*19n*4n*23n*5n*3n*29n*31n*2n*37n*41n*4n*43n*47n*3n*53n*59n*8n*61n; // lcm(1..64) via primes
// safer: compute lcm programmatically
function lcmAll(n) { let l = 1n; const pr = [2n,3n,5n,7n,11n,13n,17n,19n,23n,29n,31n,37n,41n,43n,47n,53n,59n,61n];
  for (const p of pr) { let q = p; while (q * p <= BigInt(n)) q *= p; l *= q; } return l; }
const Lr = lcmAll(64);
const seen = new Set();
const mvals = [];
let halted = false;
for (let i = 0; i < NSTEPS; i++) {
  seen.add((((m % Lr) + Lr) % Lr).toString() + "," + ((((k % Lr) + Lr) % Lr).toString()));
  if (i < 60) mvals.push(m);
  const nx = stepExact(m, k);
  if (nx === "HALT") { console.log(`ORBIT HALTS at anchor step ${i} (m=${m}, k=${k})`); halted = true; break; }
  [m, k] = nx;
}
console.log(`exact orbit: ${halted ? "HALTED" : "alive"} after ${NSTEPS} anchor steps; |residue states mod lcm(1..64)| = ${seen.size}`);

// halt residue classes mod M (from H1 + m=5 trap; over-approximation of halt set residues)
function haltResidues(M) {
  const H = new Set(); // "m,k"
  for (let mm = 0; mm < M; mm++) for (let kk = 0; kk < M; kk++) {
    const m3 = mm % 3, k3 = kk % 3;
    if (m3 === 0 && (kk === 0 || true)) { /* m%3==0: d=2 any k halts; d=1 k=0 halts; mark only kk==0 and treat d=2-class separately (structurally off-orbit) */ }
  }
  // orbit only has deco=>d=1, so relevant halt residues:
  // (i) m%3==0 && k==0 ; (ii) m==5 residue: k%3 in {0,1}
  for (let mm = 0; mm < M; mm++) if (mm % 3 === 0) H.add(mm + ",0");
  for (let kk = 0; kk < M; kk++) if (kk % 3 !== 2) H.add((5 % M) + "," + kk);
  return H;
}

// orbit residues per M, intersect with halt residues
let separating = [];
for (const M of Ms) {
  const H = haltResidues(M);
  let hit = null;
  for (const s of seen) {
    const [ms, ks] = s.split(",").map(BigInt);
    const key = (Number(ms % BigInt(M))) + "," + (Number(ks % BigInt(M)));
    if (H.has(key)) { hit = key; break; }
  }
  if (!hit) separating.push(M);
}
console.log("Part A (exact-orbit residues vs on-orbit halt classes): separating moduli M<=64:", separating.length ? separating.join(",") : "NONE — every M<=64 collides");

// ---- Part B: both-branch closure over Z_M^2 ----
function bothBranch(M) {
  // states (m,k) in Z_M^2; transitions: G-branch (if any rep has m%3==1... take
  // both regimes as branches when representatives exist) with division ambiguity
  // (3 roots of 3x=rhs), S-branch similarly; halt marks: m%3==0&k==0, m==5&k%3!=2
  const N = M * M;
  const startM = 1 % M, startK = 2 % M;
  const cur = new Uint8Array(N); cur[startM * M + startK] = 1;
  const frontier = [startM * M + startK];
  const haltHit = [];
  let steps = 0;
  while (frontier.length && steps < 50 * N) {
    const nxt = [];
    for (const idx of frontier) {
      const mm = Math.floor(idx / M), kk = idx % M;
      // halt classes (over-approximation: use m mod 3 info if M%3==0 else any)
      if (M % 3 === 0 && mm % 3 === 0 && kk === 0) { haltHit.push([mm, kk]); }
      if (M % 3 === 0 && M > 5 && mm === 5 % M && kk % 3 !== 2) { haltHit.push([mm, kk]); }
      const outs = [];
      // G branch (division ambiguity: 3m' = 4m+2+j+3(k-k%3) mod M)
      for (const r9 of [1, 4, 7]) for (const k3 of [0, 1, 2]) {
        const rhs = (4 * mm + 2 + Number(J[r9][k3]) + 3 * (kk - k3)) % M;
        // roots of 3x = rhs mod M (may be none)
        for (let x = 0; x < M; x++) if ((3 * x - rhs) % M === 0) outs.push([x, Number(KK[r9][k3]) % M]);
      }
      // S branch: 3m' = m+c, k' = m+k-m'+1
      for (const c of [1, -5, -8]) {
        const rhs = (mm + c) % M;
        for (let x = 0; x < M; x++) if ((3 * x - rhs) % M === 0) outs.push([x, (mm + kk - x + 1) % M]);
      }
      for (const [om, ok] of outs) {
        const j = om * M + ok;
        if (!cur[j]) { cur[j] = 1; nxt.push(j); }
      }
    }
    frontier.length = 0; frontier.push(...nxt); steps++;
    if (haltHit.length) break;
  }
  return { closed: !frontier.length, size: cur.reduce((a, b) => a + b, 0), N, haltHit: haltHit.slice(0, 3) };
}
let sepB = [];
for (const M of Ms) {
  const r = bothBranch(M);
  if (r.haltHit.length === 0) sepB.push(M);
}
console.log("Part B (both-branch closure): moduli M<=64 avoiding halt residues:", sepB.length ? sepB.join(",") : "NONE — closure hits halt residues for every M<=64");

// ---- growth stats from the exact orbit ----
console.log("first 40 anchor m values:", mvals.slice(0, 40).map(String).join(" "));
