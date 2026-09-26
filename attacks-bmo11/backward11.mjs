// backward11.mjs — YES-hunt: backward BFS from goal-tail configurations via
// rule inverses, with meet-in-middle against the forward BFS corpus.
// (Supersedes the prior session's version, which pruned by heuristic
// blockers and only tested for INIT.)
//
// Inverse moves (w' -> w such that firing at an active # of w gives w'):
//   R1^-1: any occurrence of "1"        <- "#0"
//   R2^-1: any occurrence of "010#"     <- "#100"
//   R3^-1: any occurrence of "1010##"   <- "#1010"
//   R4^-1: any occurrence of "10101"    <- "#10110"
//   R5^-1: any occurrence of "10"       <- "#11"
// Applied inside the canonical window (ctx6 + deviation + 0-pad), then
// re-canonicalized (phase-aware). Soundness: replacing an RHS occurrence by
// its LHS yields a word whose forward move AT THAT # is exactly the inverse
// (the LHS matches there by construction); every forward move of w is
// recoverable this way, so backward BFS is complete per level.
//
// Start set: canonical states with rightmost-# tail starting 10111, bounded
// size. Meet: forward corpus files (one canonical state per line) + INIT.
import { canon, phaseOf, window, INIT } from "./game11.mjs";
import fs from "fs";

const L0 = parseInt(process.argv[2] || "22", 10);
const MAXDEPTH = parseInt(process.argv[3] || "28", 10);
const MAXSET = parseInt(process.argv[4] || "4000000", 10);
const corpusFiles = process.argv.slice(5);

const INV = [
  ["1", "#0"],
  ["010#", "#100"],
  ["1010##", "#1010"],
  ["10101", "#10110"],
  ["10", "#11"],
];

// forward meet set
const fwd = new Set([INIT]);
let fwdMaxLen = 0;
for (const f of corpusFiles) {
  const txt = fs.readFileSync(f, "utf8");
  for (const line of txt.split("\n")) if (line.length) { fwd.add(line); if (line.length > fwdMaxLen) fwdMaxLen = line.length; }
}
console.log(`forward meet set: ${fwd.size} states (maxlen ${fwdMaxLen}) from [${corpusFiles.join(",")}] + INIT`);

// start set: all canonical states = canon(prefix + "#10111"), prefix over {0,1,#}, bounded
const SIG = ["0", "1", "#"];
function tailOf(st) {
  const T = window(st);
  let p = -1;
  for (let i = 0; i < T.length; i++) if (T[i] === "#") p = i;
  return T.slice(p + 1, p + 6).padEnd(5, "0");
}
let cur = new Set();
for (let pl = 0; pl + 6 <= L0; pl++) {
  const rec = (pref) => {
    if (pref.length === pl) {
      const st = canon(pref + "#10111");
      if (st.length <= L0 + 8 && tailOf(st) === "10111") cur.add(st);
      return;
    }
    for (const c of SIG) rec(pref + c);
  };
  rec("");
}
console.log(`start set: ${cur.size} goal states (|state| <= ${L0 + 8})`);

const seen = new Set(cur);
let meet = null;
for (const st of cur) if (fwd.has(st)) { meet = st; console.log("MEET at level 0:", st); }

const t0 = Date.now();
for (let d = 1; d <= MAXDEPTH && !meet; d++) {
  const next = new Set();
  let capped = false;
  for (const st of cur) {
    const phi = phaseOf(st);
    const T = window(st);
    for (const [R, L] of INV) {
      let i = T.indexOf(R);
      while (i >= 0) {
        const cand = canon(T.slice(0, i) + L + T.slice(i + R.length), phi);
        if (!seen.has(cand)) { seen.add(cand); next.add(cand); }
        i = T.indexOf(R, i + 1);
      }
    }
    if (seen.size > MAXSET) { console.log("set cap exceeded at depth", d); capped = true; break; }
  }
  for (const st of next) if (fwd.has(st)) { meet = st; console.log(`MEET at depth ${d}:`, st); break; }
  cur = next;
  let maxLen = 0, minLen = 1e9;
  for (const st of cur) { if (st.length > maxLen) maxLen = st.length; if (st.length < minLen) minLen = st.length; }
  console.log(`backward depth ${d}: new ${next.size}, total seen ${seen.size}, len range [${minLen},${maxLen}], ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  if (!next.size || capped) break;
}
console.log(meet ? "YES WITNESS FOUND (meet state above) — reconstruct sequence via forward BFS from INIT" : `no meet within backward depth ${MAXDEPTH} / start bound ${L0}`);
