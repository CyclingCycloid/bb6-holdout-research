// micro11.mjs — detailed trace of TM steps and game states around given points.
// Usage: node micro11.mjs <tmStep> <nSteps> [gameG]
import { TM } from "./tm11.mjs";
import { INIT, activePositions, ruleAt, applyRule, rightmostHash } from "./game11.mjs";

const tmStep = parseInt(process.argv[2], 10);
const nSteps = parseInt(process.argv[3] || "60", 10);
const gameG = process.argv[4] ? parseInt(process.argv[4], 10) : -1;

const tm = new TM();
for (let i = 0; i < tmStep - 1 && !tm.halted; i++) tm.step();
console.log("== TM trace from step", tmStep);
for (let i = 0; i < nSteps && !tm.halted; i++) {
  tm.step();
  const c = tm.config();
  // local tape window around head
  const lo = Math.min(c.lo, tm.head - 12), hi = Math.max(c.hi, tm.head + 12);
  const tape = tm.tapeString(lo, hi);
  const marker = tm.head - lo;
  console.log(`s=${String(c.s).padStart(7)} ${c.state} h=${String(tm.head).padStart(5)} w=[${c.lo},${c.hi}] ${tape.slice(0, marker)}[${tape[marker]}]${tape.slice(marker + 1)}`);
}

if (gameG >= 0) {
  console.log("== game rightmost-# play around g =", gameG);
  let st = INIT;
  const hist = [st];
  for (let g = 0; g < gameG + 30; g++) {
    const p = rightmostHash(st);
    const r = ruleAt(st, p);
    st = applyRule(st, p, r);
    hist.push(st);
  }
  for (let g = Math.max(0, gameG - 3); g < gameG + 16; g++) {
    const s = hist[g];
    const mm = "10#".repeat(10) + s + "0".repeat(20);
    const p = rightmostHash(s);
    const w = window10(s);
    console.log(`g=${g} rule=${["R1","R2","R3","R4","R5"][ruleAt(s, p)]} state=${s.slice(-70)}  del:${mm.replaceAll("#", "").slice(-80)}`);
  }
}
function window10(s) { return s + "0".repeat(10); }
