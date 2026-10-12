// tm11.mjs — simulator for BMO11 machine 1RB0LD_0LC0RE_1LA0RD_0RB0LC_1RC1RF_0LD---
// Own implementation (tape = two growable arrays); cross-checkable vs sim/tm.exe.
// Usage:
//   node tm11.mjs run <steps> [configEvery]     — run, print configs
//   node tm11.mjs dump <steps> <file> <every>   — run, JSONL dump {s,state,head,lo,hi,tape}
//   node tm11.mjs cross <steps>                 — print RLE-style CP lines like tm.exe
import fs from "fs";
export const CODE = "1RB0LD0LC0RE1LA0RD0RB0LC1RC1RF0LD---";

export function parseCode(code = CODE) {
  const clean = code.replace(/_/g, "");
  if (clean.length !== 36) throw new Error("bad code length");
  const T = [];
  const names = "ABCDEF";
  for (let s = 0; s < 6; s++) {
    T.push([]);
    for (let b = 0; b < 2; b++) {
      const i = (s * 2 + b) * 3;
      const w = clean[i], d = clean[i + 1], n = clean[i + 2];
      if (w === "-" || d === "-" || n === "-") { T[s].push(null); continue; }
      T[s].push({ w: w === "1" ? 1 : 0, d: d === "L" ? -1 : 1, n: n === "H" ? 6 : names.indexOf(n), halt: n === "H" });
    }
  }
  return T;
}

export class TM {
  constructor(code = CODE) {
    this.T = parseCode(code);
    this.R = [0];   // tape cells at positions 0,1,2,...
    this.L = [0];   // tape cells at positions -1,-2,-3,...
    this.head = 0;
    this.state = 0; // A
    this.steps = 0;
    this.halted = false;
  }
  read() {
    return this.head >= 0 ? (this.R[this.head] ?? 0) : (this.L[-this.head - 1] ?? 0);
  }
  write(v) {
    if (this.head >= 0) {
      while (this.R.length <= this.head) this.R.push(0);
      this.R[this.head] = v;
    } else {
      const i = -this.head - 1;
      while (this.L.length <= i) this.L.push(0);
      this.L[i] = v;
    }
  }
  step() {
    if (this.halted) return false;
    const t = this.T[this.state][this.read()];
    if (!t) { throw new Error("undefined transition at step " + this.steps); }
    this.write(t.w);
    this.head += t.d;
    this.steps++;
    if (t.halt) { this.halted = true; return false; }
    this.state = t.n;
    return true;
  }
  tapeString(lo, hi) {
    let s = "";
    for (let p = lo; p <= hi; p++) s += (p >= 0 ? (this.R[p] ?? 0) : (this.L[-p - 1] ?? 0)) ? "1" : "0";
    return s;
  }
  config() {
    let lo = 0, hi = -1;
    for (let i = 0; i < this.R.length; i++) if (this.R[i]) { hi = i; break; } // first 1 in R
    // simpler: nonzero span
    let min1 = Infinity, max1 = -Infinity;
    for (let i = 0; i < this.R.length; i++) if (this.R[i]) { if (i < min1) min1 = i; max1 = i; }
    for (let i = 0; i < this.L.length; i++) if (this.L[i]) { const p = -i - 1; if (p < min1) min1 = p; if (p > max1) max1 = p; }
    if (min1 === Infinity) { min1 = this.head; max1 = this.head; }
    return { s: this.steps, state: "ABCDEF"[this.state], head: this.head, lo: min1, hi: max1, tape: this.tapeString(min1, max1) };
  }
}

const mode = process.argv[2];
if (mode === "run") {
  const steps = parseInt(process.argv[3] || "1000", 10);
  const every = parseInt(process.argv[4] || "0", 10);
  const tm = new TM();
  for (let i = 0; i < steps && !tm.halted; i++) {
    tm.step();
    if (every && tm.steps % every === 0) {
      const c = tm.config();
      console.log(`step ${c.s} state ${c.state} head ${c.head} span [${c.lo},${c.hi}] tape ${c.tape}`);
    }
  }
  const c = tm.config();
  console.log(tm.halted ? `HALT at step ${tm.steps}` : `stopped at step ${tm.steps}`, `state ${tm.halted ? "H" : c.state} head ${tm.head} span [${c.lo},${c.hi}] tape ${c.tape}`);
} else if (mode === "dump") {
  const steps = parseInt(process.argv[3], 10);
  const file = process.argv[4];
  const every = parseInt(process.argv[5] || "1", 10);
  const tm = new TM();
  let out = [];
  for (let i = 0; i < steps && !tm.halted; i++) {
    tm.step();
    if (tm.steps % every === 0) out.push(JSON.stringify(tm.config()));
    if (out.length >= 200000) { fs.appendFileSync(file, out.join("\n") + "\n"); out = []; }
  }
  if (out.length) fs.appendFileSync(file, out.join("\n") + "\n");
  console.log("dumped to", file, tm.halted ? "HALT " + tm.steps : "ran " + tm.steps);
}
