// macro3.mjs — exact BigInt macro-orbit for M3 = 1RB1LA1LC0RE1LF1LD0RB0LA1RC1RE---0LD.
//
// Anchor family (D-on-0 events; verified 3904/3904 oracle cells + large spots):
//   A1(N): single 1-block N, D on fresh 0 at its left
//   A2(a,b): 1^a 0 1^b, D on fresh 0 left of a-block
//   A3(a,b): 1^a 0 0 1^b, D on LEFT cell of the 2-gap
// Map:
//   A1(N): N even -> A2(N,N/2) cost (m^3+9m^2+11m+9)/3 (m=N/2); N odd -> A3((N-1)/2,(N+1)/2)
//          cost (N+1)(N+4)/2; N=1 -> precursor w=3 -> HALT(+3)
//   A2(a,b) -> A1(2a+b) cost (a^3+6a^2+8a+9)/3
//   A3(1,b) -> precursor w=2 -> HALT(+3); A3(a,b) a even -> A2(a, b+a/2+1) cost (m^3+9m^2+5m+9)/3 (m=a/2)
//   A3(a,b) a odd -> A3((a-1)/2, b+(a+3)/2) cost (a^2+3a+4)/2
// HALT SET: A1(N) halts iff N = 2^j - 1 (Mersenne)  [a-chain all-ones -> A3(1,*) -> precursor]
//           A3(a,b) halts iff a = 2^j - 1; A2 never halts directly.
// True orbit: blank -> ... -> A1(2) at TM step 3, then the map forever.
//
// PART A: iterate exact map from A1(2) for NSTEPS anchor steps (BigInt); check halt
//         condition never fires; residue test vs Mersenne classes mod M <= 64.
// PART B: both-branch closure over Z_M with t-ambiguity + division ambiguity.

// ---- exact successor on A1(N), returns [N', cost] or "HALT" ----
function nextA1(N) { // N >= 1 BigInt
  if (N === 1n) return "HALT";
  if ((N & 1n) === 0n) {
    const m = N / 2n;
    const c1 = (m * m * m + 9n * m * m + 11n * m + 9n) / 3n; // A1 -> A2
    const c2 = (N * N * N + 6n * N * N + 8n * N + 9n) / 3n;  // A2(a=N) -> A1
    return [5n * m, c1 + c2];
  }
  // odd: A3 chain
  let a = (N - 1n) / 2n, b = (N + 1n) / 2n;
  let cost = (N + 1n) * (N + 4n) / 2n;
  while (true) {
    if (a === 1n) return "HALT"; // precursor 4 steps later
    if ((a & 1n) === 0n) {
      const m = a / 2n;
      cost += (m * m * m + 9n * m * m + 5n * m + 9n) / 3n; // A3 even
      // A2(a, b + a/2 + 1) then A1(2a + b')
      b = b + a / 2n + 1n;
      cost += (a * a * a + 6n * a * a + 8n * a + 9n) / 3n; // A2
      return [2n * a + b, cost];
    }
    cost += (a * a + 3n * a + 4n) / 2n; // A3 odd step
    b = b + (a + 3n) / 2n;
    a = (a - 1n) / 2n;
  }
}

const NSTEPS = parseInt(process.argv[2] ?? "20000", 10);

// sanity: A1 events on the real orbit (from a3_dz_1e8.log): (N, absolute TM step)
const known = [
  [2n, 3n], [5n, 32n], [9n, 86n], [16n, 239n], [40n, 2557n], [100n, 31143n],
  [250n, 434099n], [625n, 6466480n], [1094n, 18321399n],
];
let N = 2n, t = 3n; // A1(2) reached at TM step 3
let ok = 0;
const Ns = [2n];
for (let i = 0; i < NSTEPS; i++) {
  const nx = nextA1(N);
  if (nx === "HALT") { console.log(`HALT at A1-orbit step ${i}, N=${N}`); break; }
  t += nx[1];
  N = nx[0];
  Ns.push(N);
  if (ok < known.length - 1) {
    const [kN, kt] = known[ok + 1];
    if (N === kN) { if (t !== kt) { console.log(`TIME MISMATCH at N=${N}: t=${t} != ${kt}`); process.exit(1); } ok++; }
    else if (N > kN) { console.log(`ORBIT MISMATCH: passed ${kN} at N=${N}`); process.exit(1); }
  }
}
console.log(`A1-orbit: ${ok}/${known.length - 1} later real-orbit (N, absolute-step) checkpoints matched exactly`);
console.log(`after ${NSTEPS} A1-steps: alive, N has ${N.toString(2).length} bits, t ~ 2^${t.toString(2).length}`);
console.log("first 16 N:", Ns.slice(0, 16).map(x => x.toString()).join(" "));
const ratios = [];
for (let i = 1; i < Math.min(Ns.length, 4000); i++) ratios.push(Number(Ns[i] * 1000n / Ns[i - 1]) / 1000);
const avg = ratios.reduce((a, b) => a + b, 0) / ratios.length;
console.log(`mean growth ratio per A1-step over ${ratios.length} steps: ${avg.toFixed(6)} (=> per 2 steps ~${(avg).toFixed(3)}, geometric)`);

// halt condition: N + 1 a power of 2? (equivalently N = 2^j - 1)
function isPow2(x) { return x > 0n && (x & (x - 1n)) === 0n; }
let hit = Ns.some(isPow2.bind(null) ? () => false : (x) => isPow2(x + 1n));
console.log(`halt condition (N = Mersenne) ever fired in ${Ns.length} A1-steps: ${hit}`);

// ---- Part A: residue separation vs Mersenne classes ----
// orbit residues mod M vs {(2^j - 1) mod M : j >= 1} (eventually periodic)
function mersenneResidues(M) {
  const s = new Set();
  let p = 2n % BigInt(M);
  for (let j = 0; j < 2 * M + 2; j++) { s.add((p - 1n + BigInt(M)) % BigInt(M)); p = (p * 2n) % BigInt(M); }
  return s;
}
const sepA = [];
for (let M = 2; M <= 64; M++) {
  const H = mersenneResidues(M);
  let coll = false;
  for (const x of Ns) { if (H.has(x % BigInt(M))) { coll = true; break; } }
  if (!coll) sepA.push(M);
}
console.log("Part A (exact orbit vs Mersenne residues): separating M<=64:", sepA.length ? sepA.join(",") : "NONE");

// ---- Part B: both-branch closure on Z_M ----
// True over-approximation: from residue r (mod M), allow EVERY successor branch that
// SOME integer N ≡ r (mod M) realizes:
//  * even N (parity known iff M even): N' = 5(N/2); z = N/2 mod M ranges over ALL
//    roots of 2z ≡ r (mod M)  (unique if M odd; r/2 or r/2+M/2 if M even, r even).
//  * odd N with trailing-ones t of (N-1)/2 (t >= 0): realizability requires
//    N ≡ 2^{t+1}-1 (mod 2^{t+2}) compatible with r (mod M); we drop the
//    compatibility test (adds spurious branches — still a super-set) but must
//    include ALL t values: for t+2 > v2(M)+ord(2 mod odd part) the branch values
//    repeat mod M, so t up to TMAX covers everything.
//    Branch: 2^{t+2} N' = (2^{t+2}+3)(N+1) + t*2^{t+2} - 3*2^{t+1} =: R
//    N' ranges over roots of 2^{t+2} x ≡ R (mod M).
// Halt residues: Mersenne classes {(2^j - 1) mod M}.
function bothBranch(M, TMAX) {
  const BM = BigInt(M);
  const H = mersenneResidues(M);
  const cur = new Set([2n % BM]);
  let grew = true, rounds = 0;
  while (grew && rounds < 100) {
    grew = false; rounds++;
    const nxt = new Set(cur);
    for (const r of cur) {
      const evenPossible = (M % 2 === 1) || (r % 2n === 0n);
      const oddPossible  = (M % 2 === 1) || (r % 2n === 1n);
      if (evenPossible) {
        // roots of 2z = r mod M
        for (let z = 0n; z < BM; z++) if ((2n * z - r) % BM === 0n) nxt.add((5n * z) % BM);
      }
      if (oddPossible) {
        for (let t = 0; t <= TMAX; t++) {
          const p2 = 1n << BigInt(t + 2);
          const R = ((p2 + 3n) * (r + 1n) + p2 * BigInt(t) - 3n * (1n << BigInt(t + 1))) % BM;
          for (let x = 0n; x < BM; x++) if ((p2 * x - R) % BM === 0n) nxt.add(x);
        }
      }
    }
    if (nxt.size > cur.size) { cur.clear(); for (const v of nxt) cur.add(v); grew = true; }
  }
  let collide = false;
  for (const r of cur) if (H.has(r)) { collide = true; break; }
  return { size: cur.size, collide };
}
const sepB = [];
for (let M = 2; M <= 64; M++) {
  const r = bothBranch(M, 24);
  if (!r.collide) sepB.push(M);
}
console.log("Part B (both-branch closure, full t range): separating M<=64:", sepB.length ? sepB.join(",") : "NONE");
