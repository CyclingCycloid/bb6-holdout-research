// random11.mjs — deep random-order play; empirical checks + corpus for oracle.
// Usage: node random11.mjs <steps> <seeds> [corpusFile]
import { INIT, activePositions, ruleAt, applyRule, isGoal, phaseOf, window, tail5 } from "./game11.mjs";
import fs from "fs";

const steps = parseInt(process.argv[2] || "1000000", 10);
const seeds = parseInt(process.argv[3] || "8", 10);
const corpusFile = process.argv[4];
let corpusStream = corpusFile ? fs.createWriteStream(corpusFile) : null;

const patTailSeen = new Map();
let ever111 = 0, everHash10111 = false, nearMiss = 0, ever1h01 = 0, everGoal = false;
for (let s = 0; s < seeds; s++) {
  let rng = (0x9e3779b9 ^ (s * 2654435761)) >>> 0;
  const rand = () => {
    rng ^= rng << 13; rng >>>= 0; rng ^= rng >> 17; rng >>>= 0; rng ^= rng << 5; rng >>>= 0;
    return rng / 4294967296;
  };
  let st = INIT;
  let minLen = 1e9, maxLen = 0, maxHashes = 0, restarts = 0;
  const t0 = Date.now();
  for (let i = 0; i < steps; i++) {
    const ap = activePositions(st);
    if (ap.length === 0) { console.log("seed", s, "DEAD END (no active #) at step", i, st); break; }
    if (isGoal(st)) { console.log("seed", s, "GOAL at step", i, st); everGoal = true; break; }
    if (st.includes("#10111")) { console.log("seed", s, "step", i, "CONTAINS #10111:", st.slice(-80)); everHash10111 = true; break; }
    if (st.includes("111")) { if (ever111 === 0) { const k = st.indexOf("111"); console.log("seed", s, "first 111 at step", i, "context:", st.slice(Math.max(0, k - 12), k + 15)); } ever111++; }
    if (st.includes("#10110")) nearMiss++;
    if (st.includes("1#01")) ever1h01++;
    const p = ap[Math.floor(rand() * ap.length)];
    st = applyRule(st, p, ruleAt(st, p));
    if (st.length > 4000) { restarts++; st = INIT; continue; }
    const L = st.length;
    if (L < minLen) minLen = L;
    if (L > maxLen) maxLen = L;
    let h = 0; for (const c of st) if (c === "#") h++;
    if (h > maxHashes) maxHashes = h;
    // record tail-head after rightmost #
    const th = tail5(st);
    patTailSeen.set(th, (patTailSeen.get(th) || 0) + 1);
    if (corpusStream && i % 97 === 0) corpusStream.write(st + "\n");
    if (i % 200000 === 0) console.log(`  seed ${s} step ${i} len ${st.length} 111soFar ${ever111} nearMiss ${nearMiss} t=${((Date.now() - t0) / 1000).toFixed(1)}s`);
  }
  console.log(`seed ${s}: ${steps} steps done, len range [${minLen},${maxLen}], max# ${maxHashes}, ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}
if (corpusStream) corpusStream.end();
console.log("111 occurrences:", ever111, " 1#01 occurrences:", ever1h01, " goal:", everGoal);
console.log("distinct tail-heads:", patTailSeen.size);
const sorted = [...patTailSeen.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40);
console.log("top tail-heads:", JSON.stringify(sorted.map(x => x[0])));
console.log("tail-heads containing 111:", JSON.stringify([...patTailSeen.keys()].filter(t => t.includes("111"))));
