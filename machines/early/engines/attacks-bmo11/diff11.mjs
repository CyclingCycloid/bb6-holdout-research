// diff11.mjs — align a mid-period TM tape against del(game words) near the
// interpolated game time; report edit distance and the alignment diff pattern.
import { TM } from "./tm11.mjs";
import { INIT, activePositions, ruleAt, applyRule, rightmostHash } from "./game11.mjs";

const tmStep = parseInt(process.argv[2] || "40000", 10);
const gLo = parseInt(process.argv[3] || "3700", 10);
const gHi = parseInt(process.argv[4] || "3950", 10);

const tm = new TM();
for (let i = 0; i < tmStep && !tm.halted; i++) tm.step();
const c = tm.config();
const tape = c.tape;
console.log(`TM step ${tmStep}: state ${c.state} head ${c.head} span [${c.lo},${c.hi}]`);
console.log("TAPE:", tape);

let st = INIT;
const hist = [st];
for (let g = 0; g < gHi; g++) { const p = rightmostHash(st); st = applyRule(st, p, ruleAt(st, p)); hist.push(st); }

function del1(state) {
  const m = ("10#".repeat(60) + state).replaceAll("#", "");
  const last1 = m.lastIndexOf("1");
  return m.slice(Math.max(0, last1 - 5000), last1 + 1);
}
function edit(a, b) { // Levenshtein
  const n = a.length, m = b.length;
  const d = Array.from({ length: n + 1 }, (_, i) => [i, ...Array(m).fill(0)]);
  for (let j = 0; j <= m; j++) d[0][j] = j;
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[n][m];
}
let best = [];
for (let g = gLo; g <= gHi; g++) {
  const d = del1(hist[g]);
  best.push([edit(tape, d), g, d]);
}
best.sort((x, y) => x[0] - y[0]);
for (const [e, g, d] of best.slice(0, 3)) {
  console.log(`g=${g} editdistance=${e} (tape len ${tape.length}, del len ${d.length})`);
  console.log("DEL :", d);
  console.log("WORD:", hist[g]);
}
