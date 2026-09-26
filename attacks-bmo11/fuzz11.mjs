// fuzz11.mjs — independent differential test of a closed invariant set F:
// generate random F-avoiding materialized words, apply every rule at every
// active position, assert results still avoid F. Complements the exact
// context-enumeration certificate (catches implementation bugs in it).
// Usage: node fuzz11.mjs <trials> [F as JSON file]
import { RULES } from "./game11.mjs";
import fs from "fs";

const trials = parseInt(process.argv[2] || "20000", 10);
const F = JSON.parse(fs.readFileSync(process.argv[3] || "F-final.json", "utf8"));
console.log("F =", JSON.stringify(F));

function avoids(s) { for (const f of F) if (s.includes(f)) return false; return true; }

// random F-free word: build left-to-right, backtrack on violation
function randWord(rng, len) {
  let s = "";
  for (let i = 0; i < len; i++) {
    const order = ["0", "1", "#"].sort(() => rng() - 0.5);
    let placed = false;
    for (const c of order) {
      if (avoids(s + c)) { s += c; placed = true; break; }
    }
    if (!placed) return s; // dead end (shouldn't happen for reasonable F)
  }
  return s;
}

let rng = 42;
const rand = () => (rng = (rng * 1103515245 + 12345) & 0x7fffffff) / 0x80000000;

let checked = 0, apps = 0, bad = 0;
for (let t = 0; t < trials; t++) {
  // materialize with pattern context on the left, zeros right (like real states)
  const core = randWord(rand, 30 + (t % 60));
  if (!avoids(core)) continue;
  const W = "10#".repeat(6) + core + "0".repeat(12);
  if (!avoids(W)) continue;
  checked++;
  for (let i = 0; i < W.length; i++) {
    if (W[i] !== "#") continue;
    for (const [L, R] of RULES) {
      if (W.startsWith(L, i)) {
        apps++;
        const W2 = W.slice(0, i) + R + W.slice(i + L.length);
        if (!avoids(W2)) {
          bad++;
          console.log("FUZZ VIOLATION:", JSON.stringify(W), "rule", L, "->", R, "at", i, "=>", JSON.stringify(W2));
          if (bad > 5) process.exit(1);
        }
      }
    }
  }
}
console.log(`fuzz done: ${checked} words, ${apps} rule applications, ${bad} violations ${bad === 0 ? "(closure CONFIRMED by fuzz)" : "(CLOSURE FALSIFIED)"}`);
