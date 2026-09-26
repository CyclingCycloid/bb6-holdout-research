// deterministic11.mjs — BMO 11 rightmost-# deterministic play, long run.
// Full-word (dumb) representation with TWO-SIDED padding (HANDOFF warning:
// keep >=36 leading pattern symbols, >=24 trailing zeros — else boundary
// artifacts fake "INACTIVE" / "no #").
// Census: tail-heads, gaps (between two rightmost #s), absent 5/6-grams,
// forbidden patterns (#10111, 10111 ctx, 1#01, 1011#, 111), runs, |S| curve,
// state-cycle detection.
// Usage: node deterministic11.mjs <NREWRITES> [reportEvery]
import fs from "fs";

const N = parseInt(process.argv[2] || "2000000", 10);
const REPORT = parseInt(process.argv[3] || "100000", 10);
const RULES = [["#0", "1"], ["#100", "010#"], ["#1010", "1010##"], ["#10110", "10101"], ["#11", "10"]];

let word = "10#".repeat(40) + "0".repeat(40);
const ruleCount = [0, 0, 0, 0, 0];

function repad() {
  let i = 0;
  while (word[i] === ("10#"[i % 3])) i++;
  while (i < 36) { word = "10#" + word; i += 3; }
  let z = 0;
  while (word[word.length - 1 - z] === "0") z++;
  if (z < 24) word += "0".repeat(24 - z);
}

function matchAt(p) { // rule index at # position p, or -1 (inactive)
  const c = word;
  if (c[p + 1] === "0") return 0;
  if (c[p + 1] === "1") {
    if (c[p + 2] === "1") return 4;
    if (c[p + 2] === "0") {
      if (c[p + 3] === "0") return 1;
      if (c[p + 3] === "1") {
        if (c[p + 4] === "0") return 2;
        if (c[p + 4] === "1" && c[p + 5] === "0") return 3;
      }
    }
  }
  return -1;
}

// census state
const grams5 = new Uint8Array(243); const grams6 = new Uint8Array(729);
const gi5 = (a) => (a[0] * 81 + a[1] * 27 + a[2] * 9 + a[3] * 3 + a[4]);
const gi6 = (a) => (a[0] * 243 + a[1] * 81 + a[2] * 27 + a[3] * 9 + a[4] * 3 + a[5]);
const VAL = { "0": 0, "1": 1, "#": 2 };
const tails = new Map();   // 12-char tail-head after rightmost # -> count
const gaps = new Map();    // material between two rightmost #s -> count
let saw111 = 0, saw10111 = 0, saw1h01 = 0, saw1011h = 0, sawH10111 = 0, sawWinPre = 0;
let maxLen = 0, minTailLen = 1e9, maxHashRun = 0, max0Run = 0, max1Run = 0, maxGapLen = 0;
const lenCurve = [];
const cycleMap = new Map(); // canonical word hash -> step
let cycleHit = null;

const t0 = Date.now();
let inactiveAt = -1;
for (let step = 0; step < N; step++) {
  // rightmost #
  let p = word.lastIndexOf("#");
  if (p < 0) { console.log("NO # at step", step); break; }
  const r = matchAt(p);
  if (r < 0) {
    const tail = word.slice(p + 1);
    inactiveAt = step;
    console.log("RIGHTMOST # INACTIVE at step", step, "tail:", tail.slice(0, 30), "word tail:", word.slice(-60));
    break;
  }
  ruleCount[r]++;
  const [L, R] = RULES[r];
  word = word.slice(0, p) + R + word.slice(p + L.length);
  repad();

  // ---- census (on the padded word; leading periodic part is real material)
  const w = word;
  // runs
  let run = 1;
  for (let i = 1; i < w.length; i++) {
    if (w[i] === w[i - 1]) run++; else {
      if (w[i-1] === "0" && run > max0Run) max0Run = run;
      if (w[i-1] === "#" && run > maxHashRun) maxHashRun = run;
      if (w[i-1] === "1" && run > max1Run) max1Run = run;
      run = 1;
    }
  }
  // grams + forbidden
  const n = w.length;
  let a0 = 0, a1 = 0, a2 = 0, a3 = 0, a4 = 0, a5 = 0;
  for (let i = 0; i < n; i++) {
    const v = VAL[w[i]];
    a0 = a1; a1 = a2; a2 = a3; a3 = a4; a4 = a5; a5 = v;
    if (i >= 4) grams5[gi5([a0, a1, a2, a3, a4])] = 1;
    if (i >= 5) grams6[gi6([a0, a1, a2, a3, a4, a5])] = 1;
  }
  if (w.includes("111")) saw111++;
  if (w.includes("10111")) saw10111++;
  if (w.includes("1#01")) saw1h01++;
  if (w.includes("1011#")) saw1011h++;
  if (w.includes("#10111")) sawH10111++;
  if (w.includes("1011#0") || w.includes("1011#11") || w.includes("1011#10110")) sawWinPre++;
  // tail + gap (relative to rightmost #)
  p = w.lastIndexOf("#");
  const t12 = w.slice(p + 1, p + 13).padEnd(12, "0");
  tails.set(t12, (tails.get(t12) || 0) + 1);
  if (p + 1 - w.lastIndexOf("#", p - 1) - 1 > maxGapLen) maxGapLen = p + 1 - w.lastIndexOf("#", p - 1) - 1;
  const q = w.lastIndexOf("#", p - 1);
  const gap = w.slice(q + 1, p);
  gaps.set(gap, (gaps.get(gap) || 0) + 1);
  if (w.length > maxLen) maxLen = w.length;
  // cycle detection (cheap hash every 500 steps)
  if (step % 500 === 0) {
    // canonical: strip periodic prefix + trailing zeros
    let i = 0; while (w[i] === "10#"[i % 3]) i++;
    let e = w.length; while (e > 0 && w[e - 1] === "0") e--;
    const canon = w.slice(i, e);
    const h = canon.length * 1000003 + (canon.length ? (canon.charCodeAt(0) * 31 + canon.charCodeAt(canon.length - 1)) : 0);
    const prev = cycleMap.get(h);
    if (prev !== undefined && prev.canon === canon) { cycleHit = { step, prevStep: prev.step, len: canon.length }; console.log("EXACT CYCLE:", step, "==" , prev.step, "canonlen", canon.length); break; }
    cycleMap.set(h, { step, canon });
  }
  if (step % REPORT === 0) {
    let i = 0; while (w[i] === "10#"[i % 3]) i++;
    let e = w.length; while (e > 0 && w[e - 1] === "0") e--;
    lenCurve.push({ step, S: e - i, len: w.length });
    console.log(`step ${step} rules ${ruleCount} |S|~${e - i} maxlen ${maxLen} t=${((Date.now() - t0) / 1000).toFixed(1)}s 111:${saw111} 10111:${saw10111} #10111:${sawH10111} 1#01:${saw1h01} 1011#:${saw1011h} winPre:${sawWinPre} tails:${tails.size} gaps:${gaps.size} runs 0/${max0Run} #/${maxHashRun} 1/${max1Run}`);
  }
}
console.log(`\nDONE ${N} rewrites in ${((Date.now() - t0) / 1000 | 0)}s; inactiveAt=${inactiveAt} cycle=${JSON.stringify(cycleHit)}`);
console.log("rule counts:", ruleCount);
console.log(`111:${saw111} 10111:${saw10111} #10111:${sawH10111} 1#01:${saw1h01} 1011#:${saw1011h} winPre:${sawWinPre}`);
console.log("distinct tails(12):", tails.size, " gaps:", gaps.size, " maxGapLen:", maxGapLen);
// absent 5/6 grams
const absent5 = [], absent6 = [];
const SYM = "01#";
for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) for (let c = 0; c < 3; c++) for (let d = 0; d < 3; d++) for (let e = 0; e < 3; e++) {
  if (!grams5[a * 81 + b * 27 + c * 9 + d * 3 + e]) absent5.push(SYM[a] + SYM[b] + SYM[c] + SYM[d] + SYM[e]);
}
console.log("present 5-grams:", 243 - absent5.length, "/243; absent:", absent5.length);
fs.writeFileSync("det11-absent5.json", JSON.stringify(absent5, null, 0));
const topTails = [...tails.entries()].sort((x, y) => y[1] - x[1]).slice(0, 40);
console.log("top tails:", JSON.stringify(topTails.map(x => x[0])));
const topGaps = [...gaps.entries()].sort((x, y) => y[1] - x[1]).slice(0, 40);
console.log("top gaps:", JSON.stringify(topGaps.map(x => x[0])));
console.log("gaps containing 1011:", JSON.stringify([...gaps.keys()].filter(g => g.includes("1011"))));
console.log("gaps ending 1011:", JSON.stringify([...gaps.keys()].filter(g => g.endsWith("1011"))));
console.log("tails starting 1011:", JSON.stringify([...tails.keys()].filter(t => t.startsWith("1011"))));
fs.writeFileSync("det11-census.json", JSON.stringify({
  N, ruleCount, saw111, saw10111, sawH10111, saw1h01, saw1011h, sawWinPre,
  absent5, tails: [...tails.entries()], gaps: [...gaps.entries()], lenCurve,
  max0Run, max1Run, maxHashRun, maxGapLen,
}, null, 0));
console.log("wrote det11-census.json");
