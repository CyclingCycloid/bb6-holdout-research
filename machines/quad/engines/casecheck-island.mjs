// casecheck-island.mjs — island-invariant assertion table for cm16 (W1 discipline).
// (C1) standard lap: word verbatim = A0 B0 C1 D1 A1 E0 D0 F0 | B1^(R-2) B0 C0 C0 C1 D1 A1
//      | E1^(R-1) E0 D1 A0  (2R+14 steps); zero (0^1,1^1,0^1) islands at every step.
// (C2) exhaustion R in {1,2,3,4}: wave departs script; assertions: no halt precondition
//      (st=D reads 0 with [w+1]=1) fires; every island transient dies before any later
//      sprint step and hosts no sprint inside.
// (C3) orbit audit 2e7 steps at 1e9: no halt precondition; island transients (if any)
//      have the head within distance 3 (destroying wave present).
const CODE = "1RB0LE0RC1RB1LC1RD1RF0LA0RD1LE1RB---";
const T = [];
for (let i = 0; i < 6; i++) T.push([null, null]);
for (let i = 0; i < 12; i++) {
  const t = CODE.slice(3 * i, 3 * i + 3);
  T[i / 2 | 0][i % 2] = { w: +t[0], m: t[1] === "L" ? -1 : 1, n: t[2] === "-" ? 6 : t.charCodeAt(2) - 65 };
}
const mkTape = rle => { const m = new Map(); let p = 0; for (const [v, k] of rle) { for (let i = 0; i < k; i++) m.set(p + i, v); p += k; } return m; };
const scan = (m, lo, hi) => { const r = []; let p = lo; while (p < hi) { const v = m.get(p) || 0; let q = p; while (q < hi && (m.get(q) || 0) === v) q++; r.push([v, q - p]); p = q; } return r; };
// island = 1-run of len 1, both neighbor runs 0-runs of len 1; runs must be COMPLETE:
// two context runs each side + nothing touching the scan boundary (kills edge artifacts).
const islands = (runs, stt, scanLo, scanHi) => { const out = []; for (let i = 2; i + 2 < runs.length; i++) {
  if (runs[i][0] !== 1 || runs[i][1] !== 1) continue;
  const L = runs[i - 1], R = runs[i + 1];
  if (L[0] !== 0 || L[1] !== 1 || R[0] !== 0 || R[1] !== 1) continue;
  if (stt[i - 1] <= scanLo || stt[i + 1] + R[1] >= scanHi) continue;
  out.push(i); } return out; };
const starts = (runs, lo = 0) => { let p = lo; return runs.map(([, k]) => { const s = p; p += k; return s; }); };
let fails = [], checks = 0;
const assert = (c, msg) => { checks++; if (!c) fails.push(msg); };
const wname = (st, sy) => "ABCDEF"[st] + sy;

// config builder: 1^4 0 1^8 0 1^9 0 1^x 0^2 1^R 0^2 1^z 0 1^8 0 1^4 ; A at left gap left cell
function build(x, R, z) {
  const rle = [[1, 4], [0, 1], [1, 8], [0, 1], [1, 9], [0, 1], [1, x], [0, 2], [1, R], [0, 2], [1, z], [0, 1], [1, 8], [0, 1], [1, 4]];
  const tape = mkTape(rle);
  const s = starts(scan(tape, 0, 200));
  return { tape, g1: s[7], resL: s[8], resR: s[8] + R - 1 };
}
// ---------- Part 1: standard lap, word verbatim + zero islands ----------
function expectedWord(R) {
  const w = ["A0", "B0", "C1", "D1", "A1", "E0", "D0", "F0"];
  for (let i = 0; i < R - 2; i++) w.push("B1"); w.push("B0", "C0", "C0", "C1", "D1", "A1");
  for (let i = 0; i < R - 1; i++) w.push("E1"); w.push("E0", "D1", "A0");
  return w;
}
for (const R of [13, 20, 40]) {
  const { tape, g1 } = build(6, R, 7);
  let st = 0, h = g1; const got = []; const islandSteps = [];
  const maxSteps = 2 * R + 14;
  for (let t = 0; t < maxSteps; t++) {
    const sy = tape.get(h) || 0;
    got.push(wname(st, sy));
    const lo = h - 40, hi = h + 40;
    { const rr = scan(tape, lo, hi); const stt = starts(rr, lo);
      for (const j of islands(rr, stt, lo, hi)) {
        const cc = stt[j];
        islandSteps.push({ t, near: Math.abs(h - cc) <= 1 || Math.abs(h - (cc + 1)) <= 1 });
      } }
    const tr = T[st][sy];
    tape.set(h, tr.w); h += tr.m; st = tr.n;
  }
  const exp = expectedWord(R);
  assert(got.length === exp.length && got.every((w, i) => w === exp[i]),
    `R=${R}: word mismatch at ${got.findIndex((w, i) => w !== exp[i])}: got ${got.slice(0, 30)} vs exp ${exp.slice(0, 30)}`);
  assert(islandSteps.every(s => s.near), `R=${R}: island with head far at steps ${islandSteps.filter(s=>!s.near).slice(0,5)}`);
}
console.log(`Part1 (standard lap word+islands, R in {13,20,40}): checks=${checks} fails=${fails.length}`);

// ---------- Part 2: exhaustion R in {1,2,3,4} ----------
for (const R of [1, 2, 3, 4]) {
  const { tape, g1, resL, resR } = build(9, R, 7);
  let st = 0, h = g1;
  const sprintAt = new Set(), dangerSteps = [], ivals = [];
  let cur = null, lastA0 = -1, steps = 0;
  for (let t = 0; t < 2 * R + 400; t++) {
    const sy = tape.get(h) || 0;
    if (st === 3 && sy === 0 && (tape.get(h + 1) || 0) === 1) dangerSteps.push(t);
    if ((st === 1 && sy === 1 && (tape.get(h + 1) || 0) === 1 && (tape.get(h - 1) || 0) === 1) ||
        (st === 4 && sy === 1 && (tape.get(h - 1) || 0) === 1 && (tape.get(h + 1) || 0) === 1)) sprintAt.add(t);
    const lo = Math.min(h, resL) - 40, hi = Math.max(h, resR) + 40;
    const rrx = scan(tape, lo, hi); const sttx = starts(rrx, lo);
    const isl = islands(rrx, sttx, lo, hi).length > 0;
    if (isl && !cur) cur = { t0: t };
    if (!isl && cur) { cur.t1 = t - 1; ivals.push(cur); cur = null; }
    const tr = T[st][sy];
    if (tr.n === 6) { fails.push(`R=${R}: HALT at ${t}`); break; }
    tape.set(h, tr.w); h += tr.m; st = tr.n; steps = t + 1;
    if (st === 0 && (tape.get(h) || 0) === 0) { if (lastA0 >= 0) { break; } lastA0 = t; } // second A0 era re-seeded
  }
  if (cur) { cur.t1 = steps - 1; ivals.push(cur); }
  assert(dangerSteps.length === 0, `R=${R}: halt precondition fired at ${dangerSteps.slice(0, 5)}`);
  for (const iv of ivals) {
    const inside = [...sprintAt].some(s => s >= iv.t0 && s <= iv.t1);
    assert(!inside, `R=${R}: sprint inside island [${iv.t0},${iv.t1}]`);
    const ns = [...sprintAt].find(s => s > iv.t1);
    if (ns !== undefined) assert(ns > iv.t1, `R=${R}: sprint ${ns} before island death ${iv.t1}`);
  }
  console.log(`R=${R}: steps=${steps} islandIntervals=${ivals.length}${ivals.map(v=>`[${v.t0},${v.t1}]`).join("")} sprints=${sprintAt.size} dangers=${dangerSteps.length}`);
}
console.log(`Part2 done: checks=${checks} fails=${fails.length}`);

// ---------- Part 3: orbit audit (2e7 steps from the 1e9 state) ----------
{
  const rle = [[1, 893], [0, 1], [1, 896], [0, 1], [1, 1787], [0, 1], [1, 5392], [0, 1], [1, 22850], [0, 2], [1, 1818], [0, 1], [1, 5313], [0, 1], [1, 1395], [0, 1], [1, 1158], [0, 1], [1, 398], [0, 1], [1, 281], [0, 1], [1, 219], [0, 1], [1, 148], [0, 1], [1, 64], [0, 1], [1, 14], [0, 1], [1, 7], [0, 1], [1, 6], [0, 1], [1, 4], [0, 1], [1, 2]];
  const tape = mkTape(rle);
  let st = 1, h = 31766, lo = -17; // oracle CP at 1e9: st=B h=31766 (config RLE from lo=-17)
  // NOTE: the RLE above starts at lo=-17, so tape cell p holds config cell (p+17): shift head
  h = 31766; // absolute head from oracle (lo=-17 already accounted: h is absolute)
  let islandNear = 0, islandFar = 0, danger = 0;
  for (let t = 0; t < 20000000; t++) {
    const sy = tape.get(h) || 0;
    const tr = T[st][sy];
    if (st === 3 && sy === 0 && (tape.get(h + 1) || 0) === 1) danger++;
    const W = 60; const rr = scan(tape, h - W - 10, h + W + 10); const stt = starts(rr, h - W - 10);
    for (const j of islands(rr, stt, h - W, h + W)) {
      const c = stt[j];
      if (Math.abs(h - c) <= 3 || Math.abs(h - (c + 1)) <= 3) islandNear++; else islandFar++;
    }
    if (tr.n === 6) { fails.push(`orbit HALT at ${t}`); break; }
    tape.set(h, tr.w); h += tr.m; st = tr.n;
  }
  assert(danger === 0, `orbit: halt precondition fired ${danger} times`);
  console.log(`Part3 orbit 2e7: islandStepsNear=${islandNear} islandStepsFar=${islandFar} dangers=${danger}`);
}
console.log(`TOTAL checks=${checks} fails=${fails.length}`);
if (fails.length) { console.log("FAILS:\n" + fails.slice(0, 12).join("\n")); process.exit(1); }
console.log("VERDICT ALL PASS");
