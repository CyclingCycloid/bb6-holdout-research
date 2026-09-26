// enc11.mjs — systematic search for the TM<->game encoding.
// For chosen TM steps, test game states (from several strategies and corpora)
// under a family of encodings of the word into binary, right-aligned.
import { TM } from "./tm11.mjs";
import { INIT, activePositions, ruleAt, applyRule, rightmostHash } from "./game11.mjs";
import fs from "fs";

// encodings: name -> (state) => binary string (suffix, ending at word's last 1)
function encFactory(name, K = 60) {
  return (state) => {
    const m = "10#".repeat(K) + state + "0".repeat(60);
    let d;
    switch (name) {
      case "del": d = m.replaceAll("#", ""); break;
      case "h0": d = m.replaceAll("#", "0"); break;
      case "h1": d = m.replaceAll("#", "1"); break;
      case "h00": d = m.replaceAll("#", "00"); break;
      case "h01": d = m.replaceAll("#", "01"); break;
      case "h10": d = m.replaceAll("#", "10"); break;
      case "h000": d = m.replaceAll("#", "000"); break;
      case "del_flip": d = m.replaceAll("#", "").replace(/[01]/g, c => c === "0" ? "1" : "0"); break;
      default: throw new Error("enc " + name);
    }
    const last1 = d.lastIndexOf("1");
    return d.slice(Math.max(0, last1 - 5000), last1 + 1);
  };
}
const ENCS = ["del", "h0", "h1", "h00", "h01", "h10", "h000", "del_flip"];

// game libraries
function playRightmost(n) {
  const out = [INIT]; let st = INIT;
  for (let g = 0; g < n; g++) { const p = rightmostHash(st); st = applyRule(st, p, ruleAt(st, p)); out.push(st); }
  return out;
}
function playLeftmost(n) {
  const out = [INIT]; let st = INIT;
  for (let g = 0; g < n; g++) {
    const ap = activePositions(st);
    if (!ap.length) break;
    st = applyRule(st, ap[0], ruleAt(st, ap[0]));
    out.push(st);
  }
  return out;
}

const libR = playRightmost(30000);
const libL = playLeftmost(30000);
const libRand = fs.readFileSync("corpus-rand.txt", "utf8").split("\n").filter(x => x.length > 0);
console.log("libraries:", libR.length, libL.length, libRand.length);

// index each library by encoding-name -> map from last-12 chars -> [idx]
function buildIndex(lib) {
  const idx = new Map(); // enc -> Map(key->[i])
  for (const enc of ENCS) {
    const f = encFactory(enc);
    const m = new Map();
    for (let i = 0; i < lib.length; i++) {
      const e = f(lib[i]);
      const k = e.slice(-12);
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(i);
    }
    idx.set(enc, m);
  }
  return idx;
}
const idxR = buildIndex(libR), idxL = buildIndex(libL), idxRand = buildIndex(libRand);

const tm = new TM();
const TMSTEPS = parseInt(process.argv[2] || "40000", 10);
const checkpoints = process.argv.slice(3).map(Number).length ? process.argv.slice(3).map(Number) : [TMSTEPS];
for (const target of checkpoints) {
  while (tm.steps < target && !tm.halted) tm.step();
  const c = tm.config();
  const t = c.tape;
  console.log(`\n== TM step ${target}: state ${c.state} head ${c.head} span [${c.lo},${c.hi}] tape(${t.length}) ${t}`);
  for (const [libName, lib, idx] of [["rightmost", libR, idxR], ["leftmost", libL, idxL], ["random", libRand, idxRand]]) {
    for (const enc of ENCS) {
      const m = idx.get(enc);
      const cands = m.get(t.slice(-12)) || [];
      for (const i of cands) {
        const e = encFactory(enc)(lib[i]);
        if (e.length >= t.length && e.slice(-t.length) === t) {
          console.log(`  MATCH lib=${libName} enc=${enc} state#${i}`);
        }
      }
    }
  }
}
if (tm.halted) console.log("HALT at", tm.steps);
