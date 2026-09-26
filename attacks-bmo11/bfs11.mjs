// bfs11.mjs — exhaustive BFS over all rewrite strategies from the initial word.
// Usage: node bfs11.mjs <maxDepth> [corpusFile] [corpusMaxDepth]
// - canonical states, dedup via Set
// - goal check on every state
// - per-state tallies: contains 111? 1#01? max run lengths, |S| distribution
// - optional corpus dump (all states up to corpusMaxDepth) for the invariant oracle
import { INIT, successors, isGoal, tail5, phaseOf } from "./game11.mjs";
import fs from "fs";

const maxDepth = parseInt(process.argv[2] || "60", 10);
const corpusFile = process.argv[3];
const corpusMaxDepth = process.argv[4] ? parseInt(process.argv[4], 10) : maxDepth;

const t0 = Date.now();
let visited = new Set([INIT]);
let frontier = [INIT];
let corpus = null, corpusStream = null;
if (corpusFile) { corpusStream = fs.createWriteStream(corpusFile); corpusStream.write(INIT + "\n"); }
let total = 1, maxLen = INIT.length, goal = null;
const tally = { n111: 0, n1h01: 0 };
for (let d = 1; d <= maxDepth && frontier.length; d++) {
  const next = [];
  for (const st of frontier) {
    for (const [ns] of successors(st)) {
      if (visited.has(ns)) continue;
      visited.add(ns);
      total++;
      if (ns.length > maxLen) maxLen = ns.length;
      if (ns.includes("111")) tally.n111++;
      if (ns.includes("1#01")) tally.n1h01++;
      if (isGoal(ns)) { goal = { d, ns }; console.log("GOAL FOUND depth", d, ns); }
      next.push(ns);
      if (corpusStream && d <= corpusMaxDepth) corpusStream.write(ns + "\n");
    }
  }
  frontier = next;
  if (d % 5 === 0 || d === maxDepth || frontier.length === 0)
    console.log(`depth ${d}: visited ${total} (frontier ${frontier.length}), maxlen ${maxLen}, 111:${tally.n111} 1#01:${tally.n1h01}, ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}
if (corpusStream) corpusStream.end();
console.log(`BFS DONE depth ${maxDepth}: total states ${total}, maxlen ${maxLen}, 111-count ${tally.n111}, 1#01-count ${tally.n1h01}, goal ${goal ? JSON.stringify(goal) : "none"}, ${(Date.now() - t0) / 1000 | 0}s`);
// memory report
console.log("heapUsed MB:", (process.memoryUsage().heapUsed / 1048576) | 0);
