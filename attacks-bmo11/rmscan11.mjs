// rmscan11.mjs — rightmost-# strategy deep scan + del-anchor map for the TM aligner.
// Checks: goal, "#10111" anywhere, "10111" anywhere, "111" anywhere; records
// del-suffixes every SAMPLE g for anchor matching; prints periodic stats.
import { INIT, activePositions, ruleAt, applyRule, rightmostHash, isGoal, tail5 } from "./game11.mjs";
import fs from "fs";

const N = parseInt(process.argv[2] || "2000000", 10);
const SAMPLE = parseInt(process.argv[3] || "50", 10);
const delMapFile = process.argv[4];

let st = INIT;
let seen10111 = 0, seenHash10111 = 0, seen111 = 0, goal = false;
const ruleCount = [0, 0, 0, 0, 0];
const tails = new Map();
const delKeys = new Map(); // last-16 of del -> [g]
let out = delMapFile ? fs.createWriteStream(delMapFile) : null;
const t0 = Date.now();
for (let g = 1; g <= N; g++) {
  const p = rightmostHash(st);
  const r = ruleAt(st, p);
  ruleCount[r]++;
  st = applyRule(st, p, r);
  if (st.includes("#10111")) { seenHash10111++; if (seenHash10111 === 1) console.log("FIRST #10111 at g", g, st.slice(-60)); }
  if (st.includes("10111")) { seen10111++; if (seen10111 === 1) console.log("FIRST 10111 at g", g, st.slice(-60)); }
  if (st.includes("111")) { seen111++; if (seen111 === 1) console.log("FIRST 111 at g", g, st.slice(-60)); }
  const th = tail5(st);
  tails.set(th, (tails.get(th) || 0) + 1);
  if (g % SAMPLE === 0) {
    const m = "10#".repeat(40) + st;
    const d = m.replaceAll("#", "");
    const l = d.lastIndexOf("1");
    const suf = d.slice(Math.max(0, l - 300), l + 1);
    const key = suf.slice(-16);
    if (!delKeys.has(key)) delKeys.set(key, []);
    delKeys.get(key).push(g);
    if (out && g % (SAMPLE * 20) === 0) out.write(g + " " + suf + "\n");
  }
  if (g % 200000 === 0) console.log(`g=${g} len=${st.length} rules=${ruleCount} 10111:${seen10111} #10111:${seenHash10111} 111:${seen111} t=${((Date.now() - t0) / 1000).toFixed(0)}s`);
  if (isGoal(st)) { console.log("GOAL at g", g); goal = true; break; }
}
if (out) out.end();
console.log(`DONE g=${N}: goal=${goal} 10111-count=${seen10111} #10111-count=${seenHash10111} 111-count=${seen111}`);
console.log("rules fired:", ruleCount, " distinct tails:", tails.size);
console.log("tail-heads seen:", JSON.stringify([...tails.keys()]));
fs.writeFileSync("rm-delkeys.json", JSON.stringify([...delKeys.entries()]));
