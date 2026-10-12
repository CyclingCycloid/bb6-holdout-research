// tmbreak11.mjs — study how the TM<->game(del) correspondence breaks.
// For TM steps around the last match, compare tape against del(S_g) for a
// WINDOW of g values: suffix-match? longest common suffix? hamming at best offset?
import { TM } from "./tm11.mjs";
import { INIT, rightmostHash, ruleAt, applyRule, RULENAME } from "./game11.mjs";

const NFROM = parseInt(process.argv[2] || "56000", 10);
const NTO = parseInt(process.argv[3] || "58200", 10);
const GW1 = parseInt(process.argv[4] || "5450", 10);
const GW2 = parseInt(process.argv[5] || "5700", 10);

// game rightmost-# play
const gst = [INIT];
let st = INIT;
const grule = [];
for (let g = 0; g < GW2 + 50; g++) {
  const p = rightmostHash(st);
  const r = ruleAt(st, p);
  grule.push(r);
  st = applyRule(st, p, r);
  gst.push(st);
}
const del = (state) => {
  const m = "10#".repeat(80) + state + "0".repeat(60);
  const d = m.replaceAll("#", "");
  const last1 = d.lastIndexOf("1");
  return d.slice(Math.max(0, last1 - 500), last1 + 1);
};
const gdel = [];
for (let g = GW1; g <= GW2; g++) gdel[g] = del(gst[g]);

const tm = new TM();
while (tm.steps < NFROM && !tm.halted) tm.step();
let lastReport = 0;
for (let s = NFROM; s <= NTO && !tm.halted; s++) {
  tm.step();
  const c = tm.config();
  const t = c.tape;
  // best suffix match over g window
  let best = null;
  for (let g = GW1; g <= GW2; g++) {
    const d = gdel[g];
    if (d.length < t.length) continue;
    if (d.slice(-t.length) === t) { best = { g, exact: true }; break; }
    // longest common suffix
    let k = 0;
    while (k < t.length && k < d.length && t[t.length - 1 - k] === d[d.length - 1 - k]) k++;
    if (!best || k > best.lcs) best = { g, lcs: k };
  }
  if (best && (best.exact || (best.lcs >= Math.min(t.length, 20) - 0 && s - lastReport > 40))) {
    console.log(`tm ${s} state ${c.state} h=${c.head} tapelen ${t.length}: ` +
      (best.exact ? `EXACT g=${best.g}` : `lcs=${best.lcs}/${t.length} g~${best.g}`));
    lastReport = s;
  }
  if (s === NTO) {
    console.log("final tape:", t);
    console.log("del(g=5536):", gdel[5536]);
    console.log("del(g=5537):", gdel[5537]);
    console.log("del(g=5540):", gdel[5540]);
  }
}
