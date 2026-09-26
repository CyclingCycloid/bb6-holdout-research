// align11.mjs — decode the TM<->game correspondence.
// Plays the game's rightmost-# strategy, computes del(word) (word with #s
// deleted), and searches TM configurations whose tape matches (right-aligned
// at last 1), enforcing time-monotone game indices.
import { INIT, activePositions, ruleAt, applyRule, rightmostHash, isGoal, phaseOf } from "./game11.mjs";
import { TM } from "./tm11.mjs";

const NGAME = parseInt(process.argv[2] || "6000", 10);   // game rewrites
const NTM = parseInt(process.argv[3] || "200000", 10);   // TM steps
const EVERY = parseInt(process.argv[4] || "1", 10);      // TM config sampling

// ---- game side
const gstates = [INIT];
let st = INIT, gfired = [];
for (let g = 0; g < NGAME; g++) {
  const p = rightmostHash(st);
  const ap = activePositions(st);
  if (!ap.includes(p)) { console.log("game: rightmost # inactive at g =", g); break; }
  const r = ruleAt(st, p);
  gfired.push(r);
  st = applyRule(st, p, r);
  gstates.push(st);
}
console.log("game states:", gstates.length);

// del(word): materialize pattern on the left, delete '#'
function delWord(state) {
  const m = "10#".repeat(80) + state + "0".repeat(60);
  const d = m.replaceAll("#", "");
  const last1 = d.lastIndexOf("1");
  return d.slice(Math.max(0, last1 - 4000), last1 + 1); // bounded suffix ending at last 1
}
const gdel = gstates.map(delWord);
const gdelByKey = new Map(); // last-12-chars -> [gi,...]
for (let i = 0; i < gdel.length; i++) {
  const k = gdel[i].slice(-12);
  if (!gdelByKey.has(k)) gdelByKey.set(k, []);
  gdelByKey.get(k).push(i);
}

// ---- TM side
const tm = new TM();
let gmin = 0; // monotone pointer
const matches = [];
let lastMatch = null;
for (let s = 1; s <= NTM && !tm.halted; s++) {
  tm.step();
  if (s % EVERY !== 0) continue;
  const c = tm.config();
  const t = c.tape;
  if (t.length < 12) continue;
  const cands = gdelByKey.get(t.slice(-12)) || [];
  for (const gi of cands) {
    if (gi < gmin) continue;
    const d = gdel[gi];
    if (d.length >= t.length && d.slice(-t.length) === t) {
      matches.push({ s, gi, state: c.state, head: c.head, len: t.length });
      gmin = gi; // enforce weak monotonicity
      lastMatch = { s, gi };
      break;
    }
  }
}
console.log("ordered matches:", matches.length, "last:", JSON.stringify(lastMatch));
// print a trace of matches (subsampled)
for (let i = 0; i < matches.length; i += Math.max(1, Math.floor(matches.length / 40))) {
  const m = matches[i];
  console.log(`  tm step ${m.s} <-> game g ${m.gi} (state ${m.state}, tapelen ${m.len})`);
}
const mm = matches[matches.length - 1];
if (mm) console.log(`  tm step ${mm.s} <-> game g ${mm.gi} (state ${mm.state}, tapelen ${mm.len})  [final]`);
if (tm.halted) console.log("TM HALTED at", tm.steps);
else console.log("TM ran", tm.steps, "steps; span", JSON.stringify(tm.config()));
