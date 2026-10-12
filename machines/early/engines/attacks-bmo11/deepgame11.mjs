// deepgame11.mjs — lean rightmost-# play; record del(S_g) (bounded suffix,
// last 250 chars ending at last 1) for g in given windows.
// Usage: node deepgame11.mjs <gmax> <win1lo,win1hi;win2lo,win2hi;...> <outfile>
import { INIT, rightmostHash, ruleAt, applyRule } from "./game11.mjs";
import fs from "fs";

const GMAX = parseInt(process.argv[2], 10);
const windows = process.argv[3].split(";").map(w => w.split(",").map(Number));
const OUT = process.argv[4];

const inWin = (g) => windows.some(([a, b]) => g >= a && g <= b);
let st = INIT;
const out = fs.createWriteStream(OUT);
if (inWin(0)) out.write(`0\t${del(st)}\n`);
const t0 = Date.now();
for (let g = 1; g <= GMAX; g++) {
  const p = rightmostHash(st);
  st = applyRule(st, p, ruleAt(st, p));
  if (inWin(g)) out.write(`${g}\t${del(st)}\n`);
  if (g % 2000000 === 0) console.log(`g=${g} len=${st.length} ${((Date.now() - t0) / 1000 | 0)}s`);
}
out.end();
console.log("done", GMAX);

function del(state) {
  const m = "10#".repeat(80) + state + "0".repeat(60);
  const d = m.replaceAll("#", "");
  const last1 = d.lastIndexOf("1");
  return d.slice(Math.max(0, last1 - 250), last1 + 1);
}
