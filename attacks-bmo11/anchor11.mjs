// anchor11.mjs — long-run TM<->rightmost-game anchor verification, dense.
// Plays the game to GMAX (storing states), indexes del last-16 keys densely,
// streams the TM, verifies exact tape==del matches with monotone g.
import { INIT, ruleAt, applyRule, rightmostHash } from "./game11.mjs";
import { TM } from "./tm11.mjs";

const GMAX = parseInt(process.argv[2] || "500000", 10);
const NTM = parseInt(process.argv[3] || "5200000", 10);

function delOf(state) {
  const d = ("10#".repeat(40) + state).replaceAll("#", "");
  const l = d.lastIndexOf("1");
  return d.slice(Math.max(0, l - 500), l + 1);
}

console.log("playing game to g =", GMAX, "...");
let st = INIT;
const gstates = [st];
for (let g = 0; g < GMAX; g++) {
  const p = rightmostHash(st);
  st = applyRule(st, p, ruleAt(st, p));
  gstates.push(st);
}
// index: for each g, the del-suffix D_g truncated to every length in
// [devlen, devlen+8] (the tape may include up to 8 extra pattern-del symbols
// left of the deviation); key = (length, last-16)
const idx = new Map();
const devs = new Array(gstates.length);
const gdel = new Array(gstates.length);
for (let g = 0; g <= GMAX; g++) {
  const d = gstates[g].slice(6);
  devs[g] = d;
  const D = delOf(gstates[g]);
  gdel[g] = D;
  for (let L = Math.max(16, d.length); L <= d.length + 8 && L <= D.length; L++) {
    const key = L + ":" + D.slice(-16);
    if (!idx.has(key)) idx.set(key, []);
    idx.get(key).push(g);
  }
}
console.log("game done; distinct (len,key):", idx.size);

const tm = new TM();
let gmin = 0;
const anchors = [];
for (let s = 1; s <= NTM && !tm.halted; s++) {
  tm.step();
  const c = tm.config();
  const t = c.tape;
  if (t.length < 16) continue;
  const cands = idx.get(t.length + ":" + t.slice(-16));
  if (!cands) continue;
  for (const g of cands) {
    if (g < gmin) continue;
    const D = gdel[g];
    if (D.length >= t.length && D.slice(-t.length) === t) {
      anchors.push({ s, g, state: c.state, head: c.head, len: t.length, lo: c.lo });
      gmin = g;
      break;
    }
  }
}
console.log("anchors:", anchors.length);
let prev = null;
for (const a of anchors) {
  if (prev) {
    const dr = a.g - prev.g, ds = a.s - prev.s;
    console.log(`  tm ${a.s} ${a.state} h${a.head} lo${a.lo} len${a.len} <-> g ${a.g}  (+${dr}rw/+${ds}st = ${(ds / dr).toFixed(2)} st/rw)`);
  } else console.log(`  tm ${a.s} ${a.state} h${a.head} lo${a.lo} len${a.len} <-> g ${a.g}`);
  prev = a;
}
if (tm.halted) console.log("TM HALTED at", tm.steps, "!!!");
else console.log("TM ran", NTM, "steps, no halt; final span", JSON.stringify(tm.config().lo), JSON.stringify(tm.config().hi));
