// kclosure.mjs — key-graph closure ladder → unconditional non-halting verdict.
//
// Key at radius r: (state, window cells [h-r .. h+r], 2r+1 bits). Universe 6*2^(2r+1).
// One-step successor is exactly determined by [h-r-1 .. h+r+1]: enumerate the 2 free
// boundary cells ([h-r-1], [h+r+1]) → 4 completions; run the bare transition.
// Closure K*_r = BFS from the blank-tape initial key over all completions (monotone in a
// finite universe → always reaches a fixed point).
// Danger keys at radius r: windows from which the very next step executes the hole
// transition (T[st][sy].next == hole.st AND window[head + move] == hole.sy).
// Verdict ladder: smallest r with K*_r ∩ danger_r = ∅  ⟹  unconditional non-halting:
//   induction — key_0 ∈ K*_r (blank start), K*_r closed under all completions, and a
//   halt at step t+1 requires key_t ∈ danger_r.
import fs from "fs";
const MACHINES = [
  { name: "cm16", code: "1RB0LE0RC1RB1LC1RD1RF0LA0RD1LE1RB---" },
  { name: "cm26", code: "1RB1RC1LC0LE1RD1RC1LB0RA---0LF1RD1LF" },
  { name: "cm51", code: "1RB1RA1LC0RC1RE0LD0RE0LF1RA---1RB1LF" },
  { name: "cm52", code: "1RB0LD1LC1RD0LE1LA0RB1RD---0LF1RA1LF" },
];
function buildT(code) {
  const T = [];
  for (let i = 0; i < 6; i++) T.push([null, null]);
  for (let i = 0; i < 12; i++) {
    const t = code.slice(3 * i, 3 * i + 3);
    T[i / 2 | 0][i % 2] = { w: +t[0], m: t[1] === "L" ? -1 : 1, n: t[2] === "-" ? 6 : t.charCodeAt(2) - 65 };
  }
  return T;
}
function holeOf(T) {
  for (let s = 0; s < 6; s++) for (let y = 0; y < 2; y++) if (T[s][y].n === 6) return { st: s, sy: y };
  return null;
}
function analyze(M, r) {
  const T = buildT(M.code);
  const hole = holeOf(T);
  const W = 2 * r + 1;
  const enc = (st, cells) => { let id = st; for (let j = 0; j < W; j++) id = id * 2 + (cells[j] ? 1 : 0); return id; };
  // one-step successor over the 2 free boundary cells
  function succ(id) {
    const st = id / (2 ** W) | 0;
    let b = id % (2 ** W);
    const cells = []; for (let j = W - 1; j >= 0; j--) { cells[j] = b & 1; b >>= 1; } // cells[0]=[h-r] .. cells[W-1]=[h+r]
    const ctr = r; const sy = cells[ctr]; const tr = T[st][sy];
    if (tr.n === 6) return { halt: true, list: [] };
    const out = [];
    for (const l3 of [0, 1]) for (const r3 of [0, 1]) {
      let nc;
      if (tr.m > 0) { nc = cells.slice(1).concat([r3]); nc[r - 1] = tr.w; }  // written cell at new-index r-1
      else { nc = [l3].concat(cells.slice(0, W - 1)); nc[r + 1] = tr.w; }    // written cell at new-index r+1
      out.push(enc(tr.n, nc));
    }
    return { halt: false, list: out };
  }
  const init = enc(0, new Array(W).fill(0));
  const inK = new Set([init]); const work = [init];
  let haltedKey = false;
  while (work.length) {
    const id = work.pop();
    const { halt, list } = succ(id);
    if (halt) haltedKey = true;
    for (const nx of list) if (!inK.has(nx)) { inK.add(nx); work.push(nx); }
  }
  // danger keys at radius r
  const danger = [];
  for (let st = 0; st < 6; st++) for (let b = 0; b < 2 ** W; b++) {
    const cells = []; let bb = b; for (let j = W - 1; j >= 0; j--) { cells[j] = bb & 1; bb >>= 1; }
    const sy = cells[r]; const tr = T[st][sy];
    if (tr.n === 6) continue; // hole-state windows: the orbit reaches the hole only via entries
    const tgt = cells[r + tr.m];
    if (tr.n === hole.st && tgt === hole.sy) danger.push(enc(st, cells));
  }
  const hit = danger.filter(d => inK.has(d)).length;
  return { size: inK.size, danger: danger.length, hit, haltedKey };
}
let anyOpen = false;
for (const M of MACHINES) {
  const row = [];
  let closedAt = null;
  for (let r = 2; r <= 6; r++) {
    const { size, danger, hit, haltedKey } = analyze(M, r);
    row.push(`r=${r}:|K*|=${size},danger=${danger},hit=${hit}${haltedKey ? ",HOLE-KEY" : ""}`);
    if (hit === 0 && closedAt === null) closedAt = r;
  }
  console.log(`${M.name}: ${row.join("  ")}  ⟹ ${closedAt ? "CLOSED at r=" + closedAt + " → unconditional non-halting" : "danger absorbed at all r ≤ 6"}`);
  if (!closedAt) anyOpen = true;
}
console.log(anyOpen ? "VERDICT: ladder exhausted at r=6 — closure absorbs danger (report honestly)" : "VERDICT: all four machines closed → unconditional non-halting");
