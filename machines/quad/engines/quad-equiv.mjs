// quad-equiv.mjs — era-level correspondence experiment for the quad pack cm16/cm26/cm51/cm52.
// Experiment for attack-quad.md §15 ("时代层对应定理"). One-line rerun:  node quad-equiv.mjs
//
// ABSTRACT STATE SPACE S (marked states).  s = (b, pos):  b = (b_0..b_{n0-1}) block vector
// (lengths of all 1-blocks on tape), pos = index of the working triple (b_pos, b_pos+1, b_pos+2).
// Canonical realization rho_M(s) of machine M = (A) tape: blocks separated by 0^1 everywhere
// EXCEPT inside the triple, whose internal gap widths are machine constants
//   cm16 (2,2)  cm26 (1,1)  cm51 (1,2)  cm52 (1,1)          [empirical: 5823/5823 era events]
// (B) head/state = M's pivot event at a triple gap:
//   cm16 A0 at the L|R gap start;  cm26 D0 / cm51 A0 / cm52 C0 at the R|Z gap start.
//   [head offset from the L|R gap start: cm16 0, others R+1; 0 violations in 5823 events]
// pos=0 -> virgin tape to the left; pos+2=n0-1 -> virgin tape to the right (cm52's 11 extra keys).
//
// ERA MAP F_M(s): from rho_M(s) run forward.  Era A = the era the anchor belongs to (remaining
// laps to exhaustion), then churn, then era B opens.  Output record =
//   {A: key(pos,nb), A.open(L,R,Z), A.close(eL,eR,eZ), A.laps, B: key, B.open(L,R,Z), halt, timeout}.
//
// Sections:
//   S0 SELFTEST   JS engine + era detector vs embedded quad6.exe ground truth (first 14 eras x4).
//   S1 FIDELITY   embedded real anchors: canonical-form checks, rebuild==real replay, orbit GT.
//   S2 TABLE      78 shared keys x 5 param sets (boundary/regular/stress) x 4 machines.
//                 Outcome classes (halt/timeout/clean), field comparisons on clean rows,
//                 explicit-correction analysis (cm26 odd-reservoir transfer).
//   S2B REPLAY    counterfactual reach-replay: 60 real-orbit abstract states (12 early era
//                 openings x4 orbits + 4 mid + 8 deep closing anchors) fed to ALL four machines.
//   S3 EXTRA52    cm52's 11 right-edge keys (pos=n0-3).
//   S4 CONJUGACY  halt-threat (2-step) + pentomino (1,0,1,0,1) head-distance counts in S2.
//
// Honest-reporting rule: divergences are printed as findings (they delimit the correspondence);
// only S0/S1 failures (implementation bugs) set a nonzero exit code.

// ---------------- machines ----------------
const MACHINES = [
  { name: "cm16", code: "1RB0LE0RC1RB1LC1RD1RF0LA0RD1LE1RB---", pivotSt: 0, gaps: [2, 2], anchorSide: "L" },
  { name: "cm26", code: "1RB1RC1LC0LE1RD1RC1LB0RA---0LF1RD1LF", pivotSt: 3, gaps: [1, 1], anchorSide: "R" },
  { name: "cm51", code: "1RB1RA1LC0RC1RE0LD0RE0LF1RA---1RB1LF", pivotSt: 0, gaps: [1, 2], anchorSide: "R" },
  { name: "cm52", code: "1RB0LD1LC1RD0LE1LA0RB1RD---0LF1RA1LF", pivotSt: 2, gaps: [1, 1], anchorSide: "R" },
];
function buildT(code) {
  const T = [];
  for (let i = 0; i < 6; i++) T.push([null, null]);
  for (let i = 0; i < 12; i++) {
    const t = code.slice(3 * i, 3 * i + 3);
    T[(i / 2) | 0][i % 2] = { w: +t[0], m: t[1] === "L" ? -1 : 1, n: t[2] === "-" ? 6 : t.charCodeAt(2) - 65 };
  }
  return T;
}
function holeOf(T) { for (let s = 0; s < 6; s++) for (let y = 0; y < 2; y++) if (T[s][y].n === 6) return { st: s, sy: y }; }

// ---------------- tape + anchor construction ----------------
function runsOf(tape, lo, hi) {
  const runs = []; let p = lo;
  while (p < hi) { const v = tape.get(p) || 0; let q = p; while (q < hi && (tape.get(q) || 0) === v) q++; runs.push({ v, k: q - p, start: p }); p = q; }
  return runs;
}
function bounds(tape) { let lo = Infinity, hi = -Infinity; for (const [p, v] of tape) if (v) { if (p < lo) lo = p; if (p + 1 > hi) hi = p + 1; } return lo === Infinity ? { lo: 0, hi: 0 } : { lo, hi }; }
function blocksOf(runs) { return runs.filter(r => r.v === 1).map(r => r.k); }
function mkAnchor(M, blocks, pos) {
  const tape = new Map(); const n = blocks.length; let p = 0; const starts = [];
  for (let i = 0; i < n; i++) {
    starts.push(p);
    for (let j = 0; j < blocks[i]; j++) tape.set(p + j, 1);
    p += blocks[i];
    if (i < n - 1) { const g = (i === pos) ? M.gaps[0] : (i === pos + 1) ? M.gaps[1] : 1; p += g; }
  }
  const anchorCell = M.anchorSide === "L" ? starts[pos] + blocks[pos] /* L|R gap start */ : starts[pos + 2] - M.gaps[1] /* R|Z gap start */;
  return { tape, st: M.pivotSt, h: anchorCell };
}
function tapeFromRLE(lo, rle) {
  const tape = new Map(); let p = lo;
  for (const t of rle.split(" ")) { const [v, k] = t.split("^").map(Number); if (v) for (let j = 0; j < k; j++) tape.set(p + j, 1); p += k; }
  return tape;
}

// ---------------- runner with era detection (same detector as quad.c eras mode) ----------------
const GSTAT = {}; // machine -> {dangers, islNear, islFar, runs, halts} aggregated over ALL runs (S4)
function runMarked(M, tape, st, h, cap, nEras = 2) {
  const T = M.T;
  const out = { eras: [], halt: -1, timeout: false, steps: 0, dangers: 0, islNear: 0, islFar: 0, pivotEvents: 0 };
  const g = GSTAT[M.name] = GSTAT[M.name] || { dangers: 0, islNear: 0, islFar: 0, runs: 0, halts: 0, steps: 0 };
  g.runs++;
  let prevBlocks = null, cur = null;
  const closeCur = (step) => { if (cur) { out.eras.push(cur); cur = null; } };
  for (let step = 0; step <= cap; step++) {
    const sy = tape.get(h) || 0;
    if (st === M.pivotSt && sy === 0) {
      out.pivotEvents++;
      const { lo, hi } = bounds(tape);
      const runs = runsOf(tape, lo, hi);
      const blocks = blocksOf(runs);
      for (let i = 2; i + 2 < runs.length; i++) { // pentomino (1,0,1,0,1), complete runs
        if (runs[i].v === 1 && runs[i].k === 1 && runs[i - 1].v === 0 && runs[i - 1].k === 1 && runs[i + 1].v === 0 && runs[i + 1].k === 1
          && runs[i - 2].v === 1 && runs[i + 2].v === 1) {
          const cc = runs[i].start;
          if (Math.abs(h - cc) <= 1 || Math.abs(h - (cc + 1)) <= 1) { out.islNear++; g.islNear++; } else { out.islFar++; g.islFar++; }
        }
      }
      if (prevBlocks && prevBlocks.length === blocks.length && blocks.length >= 3) {
        const d = [];
        for (let j = 0; j < blocks.length; j++) if (prevBlocks[j] !== blocks[j]) d.push(j);
        if (d.length === 3 && d[1] === d[0] + 1 && d[2] === d[0] + 2
          && blocks[d[0]] === prevBlocks[d[0]] + 1 && blocks[d[1]] === prevBlocks[d[1]] - 2 && blocks[d[2]] === prevBlocks[d[2]] + 1
          && d[0] + 2 < blocks.length) {
          const pos = d[0];
          if (cur && cur.pos === pos && cur.nb === blocks.length) {
            cur.ev++; cur.eL = blocks[pos]; cur.eR = blocks[pos + 1]; cur.eZ = blocks[pos + 2];
          } else {
            closeCur(step);
            cur = { openStep: step, pos, nb: blocks.length, L: blocks[pos], R: blocks[pos + 1], Z: blocks[pos + 2], eL: blocks[pos], eR: blocks[pos + 1], eZ: blocks[pos + 2], ev: 1 };
            if (out.eras.length + 1 >= nEras) { out.eras.push(cur); cur = null; out.steps = step; return out; }
          }
        } else closeCur(step);
      } else if (prevBlocks) closeCur(step);
      prevBlocks = blocks;
    }
    const tr = T[st][sy];
    if (tr.n !== 6) { const nsy = tape.get(h + tr.m) || 0; if (T[tr.n][nsy].n === 6) { out.dangers++; g.dangers++; } }
    if (tr.n === 6) { out.halt = step; g.halts++; closeCur(step); out.steps = step; return out; }
    tape.set(h, tr.w); h += tr.m; st = tr.n;
  }
  closeCur(cap); out.timeout = true; out.steps = cap;
  return out;
}
// S4 aggregation hook: call once after all sections
function S4() {
  console.log("== S4 CONJUGACY: halt-relevant micro predicates over ALL runs above (per machine) ==");
  for (const M of MACHINES) {
    const g = GSTAT[M.name] || { dangers: 0, islNear: 0, islFar: 0, runs: 0, halts: 0 };
    console.log(`  ${M.name}: 2-step halt-threats=${g.dangers} pentomino-near=${g.islNear} pentomino-far=${g.islFar} actual-halts=${g.halts}`);
  }
}
const key = (e) => `${e.pos},${e.nb}`;
const trip = (e, pfx) => [e[pfx + "L"], e[pfx + "R"], e[pfx + "Z"]];
function sig(r) { return { halt: r.halt, eras: r.eras.map(e => ({ o: e.openStep, c: e.eL, ev: e.ev, pos: e.pos, nb: e.nb, L: e.L, R: e.R, Z: e.Z, eL: e.eL, eR: e.eR, eZ: e.eZ })) }; }

// ---------------- S0: selftest vs quad6.exe ground truth ----------------
const GT = {
  cm16: [[121,121,1,0,4,2,1,2,2,1,2],[217,238,2,0,4,4,4,2,5,2,3],[312,312,1,0,5,2,1,3,2,1,3],[377,377,1,1,5,7,1,2,7,1,2],[473,494,2,1,5,9,4,2,10,2,3],[564,639,4,0,5,4,8,2,7,2,5],[723,742,2,0,6,2,3,3,3,1,4],[819,819,1,2,6,7,1,2,7,1,2],[915,936,2,2,6,9,4,2,10,2,3],[1006,1081,4,1,6,8,8,2,11,2,5],[1154,1254,5,0,6,5,9,2,9,1,6],[1333,1333,1,2,6,7,1,2,7,1,2],[1429,1450,2,2,6,9,4,2,10,2,3],[1520,1595,4,1,6,10,8,2,13,2,5]],
  cm26: [[135,144,2,0,4,5,4,2,6,2,3],[174,174,1,0,5,2,3,2,2,3,2],[285,294,2,1,5,10,4,2,11,2,3],[344,383,4,0,5,5,8,2,8,2,5],[421,432,2,0,6,2,5,2,3,3,3],[551,560,2,2,6,10,4,2,11,2,3],[610,649,4,1,6,9,8,2,12,2,5],[703,748,4,0,6,6,9,2,9,3,5],[869,878,2,2,6,10,4,2,11,2,3],[928,967,4,1,6,11,8,2,14,2,5],[1029,1097,5,0,6,12,11,2,16,3,6],[1219,1228,2,2,6,10,4,2,11,2,3],[1278,1317,4,1,6,12,8,2,15,2,5],[1383,1468,6,0,6,19,12,2,24,2,7]],
  cm51: [[138,149,2,0,4,5,3,2,6,1,3],[183,183,1,0,5,2,2,2,2,2,2],[298,309,2,1,5,10,3,2,11,1,3],[363,408,4,0,5,5,7,2,8,1,5],[450,463,2,0,6,2,4,2,3,2,3],[588,599,2,2,6,10,3,2,11,1,3],[653,698,4,1,6,9,7,2,12,1,5],[756,807,4,0,6,6,8,2,9,2,5],[934,945,2,2,6,10,3,2,11,1,3],[999,1044,4,1,6,11,7,2,14,1,5],[1110,1186,5,0,6,12,10,2,16,2,6],[1314,1325,2,2,6,10,3,2,11,1,3],[1379,1424,4,1,6,12,7,2,15,1,5],[1494,1589,6,0,6,19,11,2,24,1,7]],
  cm52: [[48,48,1,0,3,2,2,2,2,2,2],[108,119,2,0,4,2,3,2,3,1,3],[162,162,1,1,4,6,1,2,6,1,2],[190,190,1,1,4,7,2,2,7,2,2],[219,249,3,0,4,4,6,2,6,2,4],[291,302,2,0,5,2,3,3,3,1,4],[350,361,2,1,5,7,3,2,8,1,3],[404,404,1,2,5,6,1,2,6,1,2],[432,432,1,2,5,7,2,2,7,2,2],[461,491,3,1,5,9,6,2,11,2,4],[528,604,5,0,5,4,10,2,8,2,6],[654,680,3,0,6,2,5,3,4,1,5],[736,747,2,2,6,7,3,2,8,1,3],[790,790,1,3,6,6,1,2,6,1,2]],
};
let fails = [];
function S0() {
  console.log("== S0 SELFTEST: JS engine + era detector vs quad6.exe ground truth (first 14 eras x4) ==");
  let allok = true;
  for (const M of MACHINES) {
    const r = runMarked(M, new Map(), 0, 0, 40000, 40);
    const got = r.eras.slice(0, 14), exp = GT[M.name];
    let ok = got.length === exp.length; const bad = [];
    for (let i = 0; i < Math.min(got.length, exp.length); i++) {
      const g = got[i], x = exp[i];
      const fields = [g.openStep + 1, g.eL === undefined ? 0 : g.L, g.R, g.Z]; // (start checked via openStep+1)
      const gf = { start: g.openStep + 1, end: g.eL !== undefined ? g.openStep : 0, ev: g.ev, pos: g.pos, n0: g.nb, L: g.L, R: g.R, Z: g.Z, eL: g.eL, eR: g.eR, eZ: g.eZ };
      // C's era_end = last era-event step + 1; our runner does not track lastStep separately for
      // closed eras -> approximate via ev count is not exact; compare start/ev/pos/n0/L/R/Z/eL/eR/eZ only.
      const xf = { start: x[0], ev: x[2], pos: x[3], n0: x[4], L: x[5], R: x[6], Z: x[7], eL: x[8], eR: x[9], eZ: x[10] };
      for (const f in xf) if (gf[f] !== xf[f]) { ok = false; bad.push(`era${i}.${f}: got ${gf[f]} want ${xf[f]}`); }
    }
    if (!ok) allok = false;
    if (!ok) fails.push(`S0 ${M.name}`);
    console.log(`${M.name}: first-14-era match (start/ev/pos/n0/L0/R0/Z0/eL/eR/eZ): ${ok ? "OK" : "FAIL " + bad.slice(0, 3).join("; ")}`);
  }
  return allok;
}

// ---------------- S1: fidelity on real anchors ----------------
const REAL = [
  { m: "cm16", st: 0, h: 2104, lo: -10, pos: 2, rle: "1^641 0^1 1^1000 0^1 1^471 0^2 1^264 0^2 1^87 0^1 1^148 0^1 1^64 0^1 1^14 0^1 1^7 0^1 1^6 0^1 1^4 0^1 1^2",
    exp: { Aclose: [602, 2, 218], Bopen: [1001, 600, 2], Bkey: "1,12" } },
  { m: "cm26", st: 3, h: 2389, lo: -10, pos: 2, rle: "1^641 0^1 1^1000 0^1 1^453 0^1 1^302 0^1 1^68 0^1 1^148 0^1 1^64 0^1 1^14 0^1 1^7 0^1 1^6 0^1 1^4 0^1 1^2",
    exp: { Aclose: [603, 2, 218], Bopen: [1002, 600, 2], Bkey: "1,12" } },
  { m: "cm51", st: 0, h: 2360, lo: -10, pos: 2, rle: "1^641 0^1 1^1000 0^1 1^481 0^1 1^245 0^2 1^96 0^1 1^148 0^1 1^64 0^1 1^14 0^1 1^7 0^1 1^6 0^1 1^4 0^1 1^2",
    exp: { Aclose: [603, 1, 218], Bopen: [1002, 599, 2], Bkey: "1,12" } },
  { m: "cm52", st: 2, h: 2446, lo: -11, pos: 2, rle: "1^641 0^1 1^1000 0^1 1^395 0^1 1^418 0^1 1^11 0^1 1^148 0^1 1^64 0^1 1^14 0^1 1^7 0^1 1^6 0^1 1^4 0^1 1^2",
    exp: { Aclose: [603, 2, 219], Bopen: [1001, 602, 2], Bkey: "1,12" } },
  { m: "cm16", st: 0, h: 0, lo: -2, pos: 0, rle: "1^2 0^2 1^1 0^2 1^2 0^1 1^1",
    // from an exhausted len-1 era event the detector's eraA = the NEXT era (real era 2), eraB = era 3.
    exp: { Aclose: [5, 2, 3], Bopen: [2, 1, 3], Bkey: "0,5" } },
];
function abstractOf(tape, pos) {
  const { lo, hi } = bounds(tape);
  const runs = runsOf(tape, lo, hi);
  const blocks = blocksOf(runs);
  const idx = []; runs.forEach((r, i) => { if (r.v === 1) idx.push(i); });
  const iL = idx[pos], iM = idx[pos + 1], iR = idx[pos + 2];
  const gL = runs[iM].start - (runs[iL].start + runs[iL].k), gR = runs[iR].start - (runs[iM].start + runs[iM].k);
  const internal = new Set([iM - 1, iR - 1]);
  const envGaps = [];
  for (let i = 0; i < runs.length; i++) if (runs[i].v === 0 && !internal.has(i)) envGaps.push(runs[i].k);
  return { blocks, gL, gR, envGaps, leftGapStart: runs[iM].start - gL, R: runs[iM].k };
}
function S1() {
  console.log("== S1 FIDELITY: real anchors -> canonical-form check + rebuild == real replay ==");
  let allok = true;
  for (const R of REAL) {
    const M = MACHINES.find(x => x.name === R.m);
    const tape = tapeFromRLE(R.lo, R.rle);
    const ab = abstractOf(tape, R.pos);
    const gapsOk = ab.gL === M.gaps[0] && ab.gR === M.gaps[1];
    const envOk = ab.envGaps.every(g => g === 1);
    const offOk = R.h - ab.leftGapStart === (M.anchorSide === "L" ? 0 : ab.R + 1);
    const real = runMarked(M, tapeFromRLE(R.lo, R.rle), R.st, R.h, 400000, 2);
    const anc = mkAnchor(M, ab.blocks, R.pos);
    const reb = runMarked(M, anc.tape, anc.st, anc.h, 400000, 2);
    const same = JSON.stringify(sig(real)) === JSON.stringify(sig(reb));
    const expOk = real.eras.length >= 2
      && JSON.stringify(trip(real.eras[0], "e")) === JSON.stringify(R.exp.Aclose)
      && JSON.stringify(trip(real.eras[1], "")) === JSON.stringify(R.exp.Bopen)
      && key(real.eras[1]) === R.exp.Bkey;
    const ok = gapsOk && envOk && offOk && same && expOk && !real.timeout && !reb.timeout;
    if (!ok) { allok = false; fails.push(`S1 ${R.m}@${R.lo}`); }
    console.log(`${R.m}@lo=${R.lo}: gaps(${ab.gL},${ab.gR})=${gapsOk ? "OK" : "BAD"} env1=${envOk ? "OK" : "BAD"} off=${offOk ? "OK" : "BAD"} rebuild==real=${same ? "OK" : "BAD"} orbitGT=${expOk ? "OK" : "BAD"} | A.close=${JSON.stringify(trip(real.eras[0], "e"))} B.open=${JSON.stringify(trip(real.eras[1], ""))}@${key(real.eras[1])} (${real.steps} steps)`);
  }
  const R0 = REAL[0];
  const victim = MACHINES.find(x => x.name === "cm26");
  const raw = runMarked(victim, tapeFromRLE(R0.lo, R0.rle), R0.st, R0.h, 400000, 2);
  console.log(`raw cross-replay of cm16's anchor config on cm26 (NOT cm26-canonical): halt=${raw.halt} eras=${raw.eras.length}${raw.eras[1] ? " B.open=" + JSON.stringify(trip(raw.eras[1], "")) + "@" + key(raw.eras[1]) : ""}  [expected: diverges -> correspondence is at abstract level, not raw-config level]`);
  return allok;
}

// ---------------- S2: synthetic bisimulation table ----------------
const SHARED78 = ["0,4","0,5","1,5","0,6","1,6","2,6","0,7","1,7","2,7","3,7","0,8","1,8","2,8","3,8","4,8","0,9","0,10","1,10","2,10","3,10","4,10","5,10","6,10","0,11","0,12","1,12","2,12","3,12","4,12","5,12","6,12","7,12","8,12","0,13","0,14","0,15","1,15","2,15","3,15","4,15","5,15","6,15","7,15","8,15","9,15","10,15","11,15","0,16","1,16","2,16","3,16","4,16","5,16","6,16","7,16","8,16","9,16","10,16","11,16","12,16","0,17","0,18","0,19","1,19","2,19","3,19","4,19","5,19","6,19","7,19","8,19","9,19","10,19","11,19","12,19","13,19","14,19","15,19"];
const EXTRA52 = ["0,3","1,4","2,5","3,6","4,7","5,8","7,10","9,12","12,15","13,16","16,19"];
const PSETS = [
  { name: "b1-R1", trip: [2, 1, 2] },   // boundary: exhausted odd reservoir
  { name: "b2-R2", trip: [3, 2, 3] },   // boundary: exhausted even reservoir
  { name: "r1-R13", trip: [5, 13, 4] }, // regular
  { name: "r2-R8", trip: [2, 8, 5] },   // regular
  { name: "s1-R40", trip: [7, 40, 3] }, // stress
];
function blocksForKey(kstr, setIdx) {
  const [pos, n0] = kstr.split(",").map(Number);
  const base = setIdx === 4 ? 4 : 0;
  const envL = [], envR = [];
  for (let j = 0; j < pos; j++) envL.push(base + 1 + ((j + pos + setIdx) % 3));
  for (let j = 0; j < n0 - pos - 3; j++) envR.push(base + 1 + ((2 * j + n0 + setIdx) % 3));
  const blocks = [...envL, ...PSETS[setIdx].trip, ...envR];
  if (blocks.length !== n0) throw new Error(`blocks ${blocks.length} != ${n0}`);
  return { blocks, pos };
}
function tableRun(M, kstr, setIdx, cap) {
  const { blocks, pos } = blocksForKey(kstr, setIdx);
  const anc = mkAnchor(M, blocks, pos);
  return runMarked(M, anc.tape, anc.st, anc.h, cap, 2);
}
function diffHistAdd(hist, tag, a, b) {
  const h = hist[tag] = hist[tag] || {};
  const d = b.map((x, i) => x - a[i]).join(",");
  h[d] = (h[d] || 0) + 1;
}
function S2(cap) {
  console.log(`== S2 TABLE: ${SHARED78.length} shared keys x ${PSETS.length} param sets x 4 machines (cap ${cap}) ==`);
  const perSet = {}; // set -> machine -> {halt, timeout, clean}
  const diffA = {}, diffB = {}, keyB = {};
  const CLS = { exh: { tot: 0, aEq: 0, aCorr: 0 }, mid: { tot: 0, aEq: 0, aCorr: 0 } };
  let clean4 = 0, rows = 0, sameA = 0, sameACorr = 0, sameB = 0, sameKeyB = 0;
  const divExamples = [];
  for (const kstr of SHARED78) {
    for (let s = 0; s < PSETS.length; s++) {
      const rec = {};
      for (const M of MACHINES) rec[M.name] = tableRun(M, kstr, s, cap);
      rows++;
      const outc = (r) => r.halt >= 0 ? "halt" : r.timeout ? "timeout" : (r.eras.length >= 2 ? "clean" : "short");
      for (const M of MACHINES) {
        const p = perSet[PSETS[s].name] = perSet[PSETS[s].name] || {};
        const q = p[M.name] = p[M.name] || { halt: 0, timeout: 0, clean: 0, short: 0 };
        q[outc(rec[M.name])]++;
      }
      const base = rec.cm16;
      const allClean = MACHINES.every(M => outc(rec[M.name]) === "clean");
      const Rin = PSETS[s].trip[1]; // input reservoir (exhaustion status of the input state)
      if (!allClean) {
        const mix = MACHINES.map(M => M.name + ":" + outc(rec[M.name]) + (rec[M.name].halt >= 0 ? "@" + rec[M.name].halt : "")).join(" ");
        if (divExamples.length < 8) divExamples.push(`key=${kstr} set=${PSETS[s].name} -> ${mix}`);
        continue;
      }
      clean4++;
      // eraA comparison (exhaustion map). Non-exhausted inputs (R>=3): the continuation era is the
      // affine lap cascade. Exhausted inputs (R<=2): eraA is already a post-churn re-seeded era
      // (churn layer). The explicit cm26 correction on odd input reservoirs: one fewer lap,
      // eR = base+2, eL/eZ = base-1 (cm26's exhaustion residue is {2,3} vs {1,2}).
      const cls = Rin <= 2 ? "exh" : "mid";
      CLS[cls].tot++;
      let aOk = true, aOkCorr = true;
      for (const M of MACHINES.slice(1)) {
        const A0 = base.eras[0], A1 = rec[M.name].eras[0];
        const eq = A0.ev === A1.ev && JSON.stringify(trip(A0, "e")) === JSON.stringify(trip(A1, "e"));
        if (!eq) aOk = false;
        let dEv = 0, dTrip = [0, 0, 0];
        if (M.name === "cm26" && cls === "mid" && Rin % 2 === 1) { dEv = -1; dTrip = [-1, 2, -1]; }
        const eqc = A1.ev === A0.ev + dEv && trip(A1, "e").every((x, i) => x === trip(A0, "e")[i] + dTrip[i]);
        if (!eqc) aOkCorr = false;
        diffHistAdd(diffA, M.name, trip(A0, "e"), trip(A1, "e"));
      }
      if (aOk) { sameA++; CLS[cls].aEq++; }
      if (aOkCorr) { sameACorr++; CLS[cls].aCorr++; }
      // eraB comparison (churn / re-seed map)
      let bOk = true, kOk = true;
      for (const M of MACHINES.slice(1)) {
        const B0 = base.eras[1], B1 = rec[M.name].eras[1];
        if (JSON.stringify(trip(B0, "")) !== JSON.stringify(trip(B1, ""))) bOk = false;
        if (key(B0) !== key(B1)) kOk = false;
        diffHistAdd(diffB, M.name, trip(B0, ""), trip(B1, ""));
        const h = keyB[M.name] = keyB[M.name] || {};
        const kd = key(B0) + "->" + key(B1);
        h[kd] = (h[kd] || 0) + 1;
      }
      if (bOk) sameB++;
      if (kOk) sameKeyB++;
    }
  }
  console.log(`rows=${rows} | all-4-clean rows=${clean4} | outcome-mixed rows=${rows - clean4}`);
  for (const sname in perSet) {
    const p = perSet[sname];
    console.log(`  set ${sname}: ` + MACHINES.map(M => `${M.name}(halt=${p[M.name].halt},tmo=${p[M.name].timeout},clean=${p[M.name].clean})`).join(" "));
  }
  console.log(`on clean rows: eraA(exhaustion) identical x4: ${sameA}/${clean4} (with cm26 odd-R correction: ${sameACorr}/${clean4})`);
  console.log(`  split by input: non-exhausted R>=3: ${CLS.mid.tot} rows, eraA identical ${CLS.mid.aEq} (corrected ${CLS.mid.aCorr}) | exhausted R<=2: ${CLS.exh.tot} rows, eraA identical ${CLS.exh.aEq} (eraA here is already churn output)`);
  console.log(`eraB.open triple identical x4: ${sameB}/${clean4} | eraB KEY identical x4: ${sameKeyB}/${clean4}`);
  for (const m in diffA) {
    const top = Object.entries(diffA[m]).sort((a, b) => b[1] - a[1]).slice(0, 4);
    console.log(`  A.close diff ${m}: ${top.map(([d, c]) => `(${d}):${c}`).join(" ")}`);
  }
  for (const m in diffB) {
    const top = Object.entries(diffB[m]).sort((a, b) => b[1] - a[1]).slice(0, 6);
    console.log(`  B.open diff ${m}: ${top.map(([d, c]) => `(${d}):${c}`).join(" ")}`);
  }
  for (const m in keyB) {
    const bad = Object.entries(keyB[m]).filter(([k]) => !k.startsWith(k.split("->")[0] + "->" + k.split("->")[0]) || k.split("->")[0] !== k.split("->")[1]).filter(([k]) => k.split("->")[0] !== k.split("->")[1]);
    const tot = Object.values(keyB[m]).reduce((a, b) => a + b, 0);
    console.log(`  B.key changed ${m}: ${bad.reduce((a, [, c]) => a + c, 0)}/${tot}${bad.length ? " e.g. " + bad.slice(0, 3).map(([k, c]) => k + ":" + c).join(" ") : ""}`);
  }
  console.log(`  outcome-mixed examples (theorem boundary / partiality of F_M):`);
  for (const e of divExamples) console.log(`    ${e}`);
  return { rows, clean4, sameA, sameACorr, sameB, sameKeyB };
}

// ---------------- S2B: counterfactual reach-replay ----------------
// Real-orbit abstract states (blocks, pos), extracted from quad6.exe ev traces of the four
// orbits: 12 era-opening anchors per machine (early, steps<=4e4), the 4 mid anchors (depth ~5e6,
// also used in S1), and 8 deep era-closing anchors (depths 1.8e8 / 6.0e8).
const REPLAY_SAMPLE = [
  // early era openings (cm16 orbit, steps 120..1254; extracted from ev trace)
  { src: "e16", blocks: [2,1,2,1], pos: 0 }, { src: "e16", blocks: [4,4,2,2], pos: 0 }, { src: "e16", blocks: [2,1,3,4,2], pos: 0 },
  { src: "e16", blocks: [3,7,1,2,1], pos: 1 }, { src: "e16", blocks: [3,9,4,2,2], pos: 1 }, { src: "e16", blocks: [4,8,2,4,2], pos: 0 },
  { src: "e16", blocks: [2,3,3,6,4,2], pos: 0 }, { src: "e16", blocks: [4,7,7,1,2,1], pos: 2 }, { src: "e16", blocks: [4,7,9,4,2,2], pos: 2 },
  { src: "e16", blocks: [4,8,8,2,4,2], pos: 1 }, { src: "e16", blocks: [5,9,2,6,4,2], pos: 0 }, { src: "e16", blocks: [10,9,7,1,2,1], pos: 2 },
  // early era openings (cm26 orbit, steps 134..1227)
  { src: "e26", blocks: [5,4,2,2], pos: 0 }, { src: "e26", blocks: [2,3,2,4,2], pos: 0 }, { src: "e26", blocks: [3,10,4,2,2], pos: 1 },
  { src: "e26", blocks: [5,8,2,4,2], pos: 0 }, { src: "e26", blocks: [2,5,2,6,4,2], pos: 0 }, { src: "e26", blocks: [4,7,10,4,2,2], pos: 2 },
  { src: "e26", blocks: [4,9,8,2,4,2], pos: 1 }, { src: "e26", blocks: [6,9,2,6,4,2], pos: 0 }, { src: "e26", blocks: [10,9,10,4,2,2], pos: 2 },
  { src: "e26", blocks: [10,11,8,2,4,2], pos: 1 }, { src: "e26", blocks: [12,11,2,6,4,2], pos: 0 }, { src: "e26", blocks: [17,10,10,4,2,2], pos: 2 },
  // early era openings (cm51 orbit, steps 137..1224)
  { src: "e51", blocks: [5,3,2,2], pos: 0 }, { src: "e51", blocks: [2,2,2,4,2], pos: 0 }, { src: "e51", blocks: [3,10,3,2,2], pos: 1 },
  { src: "e51", blocks: [5,7,2,4,2], pos: 0 }, { src: "e51", blocks: [2,4,2,6,4,2], pos: 0 }, { src: "e51", blocks: [4,7,10,3,2,2], pos: 2 },
  { src: "e51", blocks: [4,9,7,2,4,2], pos: 1 }, { src: "e51", blocks: [6,8,2,6,4,2], pos: 0 }, { src: "e51", blocks: [10,9,10,3,2,2], pos: 2 },
  { src: "e51", blocks: [10,11,7,2,4,2], pos: 1 }, { src: "e51", blocks: [12,10,2,6,4,2], pos: 0 }, { src: "e51", blocks: [17,10,10,3,2,2], pos: 2 },
  // early era openings (cm52 orbit, steps 47..679)
  { src: "e52", blocks: [2,2,2], pos: 0 }, { src: "e52", blocks: [2,3,2,1], pos: 0 }, { src: "e52", blocks: [3,6,1,2], pos: 1 },
  { src: "e52", blocks: [3,7,2,2], pos: 1 }, { src: "e52", blocks: [4,6,2,2], pos: 0 }, { src: "e52", blocks: [2,3,3,4,2], pos: 0 },
  { src: "e52", blocks: [3,7,3,2,1], pos: 1 }, { src: "e52", blocks: [3,8,6,1,2], pos: 2 }, { src: "e52", blocks: [3,8,7,2,2], pos: 2 },
  { src: "e52", blocks: [3,9,6,2,2], pos: 1 }, { src: "e52", blocks: [4,10,2,4,2], pos: 0 }, { src: "e52", blocks: [2,5,3,6,4,2], pos: 0 },
  // mid anchors (depth ~5e6)
  { src: "mid", blocks: [641,1000,471,264,87,148,64,14,7,6,4,2], pos: 2 },
  { src: "mid", blocks: [641,1000,453,302,68,148,64,14,7,6,4,2], pos: 2 },
  { src: "mid", blocks: [641,1000,481,245,96,148,64,14,7,6,4,2], pos: 2 },
  { src: "mid", blocks: [641,1000,395,418,11,148,64,14,7,6,4,2], pos: 2 },
  // deep era-closing anchors (depths 1.8e8 / 6.0e8)
  { src: "d16a", blocks: [324,6422,4002,2848,1738,966,283,219,148,64,14,7,7,1,2,1], pos: 12 },
  { src: "d16b", blocks: [893,896,1787,3574,11945,10482,2478,1256,399,281,219,148,64,14,7,7,1,2,1], pos: 15 },
  { src: "d26a", blocks: [324,6422,4002,2848,2418,2,680,396,220,148,64,14,7,6,4,2], pos: 4 },
  { src: "d26b", blocks: [893,896,1787,3574,11945,10482,3304,1339,513,282,219,148,64,14,7,11,2,3,2], pos: 15 },
  { src: "d51a", blocks: [893,896,1787,3574,11945,10482,3304,829,739,345,290,107,111,21,8,11,1,3,2], pos: 15 },
  { src: "d51b", blocks: [893,896,1787,3574,11945,10482,3304,829,739,345,290,107,111,21,13,1,5,4,2], pos: 14 },
  { src: "d52a", blocks: [324,6422,4002,2848,1738,966,572,439,2,148,64,14,7,6,4,2], pos: 7 },
  { src: "d52b", blocks: [893,896,1787,3574,11945,10482,3304,829,397,395,220,148,64,14,7,8,1,3,1], pos: 16 },
];
function S2B(cap) {
  console.log(`== S2B REACH-REPLAY: ${REPLAY_SAMPLE.length} real-orbit abstract states x 4 machines (counterfactual; cap ${cap}) ==`);
  let aSame = 0, aSameCorr = 0, n = 0, bKeySame = 0, haltsAny = 0, timeouts = 0;
  const RCLS = { exh: 0, mid: 0 };
  const haltByCls = { exh: 0, mid: 0 };
  const diffB = {}, diffA = {};
  const bExamples = [];
  for (const S of REPLAY_SAMPLE) {
    const rec = {};
    for (const M of MACHINES) {
      const anc = mkAnchor(M, S.blocks, S.pos);
      rec[M.name] = runMarked(M, anc.tape, anc.st, anc.h, cap, 2);
    }
    if (MACHINES.some(M => rec[M.name].halt >= 0)) { haltsAny++; haltByCls[S.blocks[S.pos + 1] <= 2 ? "exh" : "mid"]++; continue; }
    if (MACHINES.some(M => rec[M.name].timeout || rec[M.name].eras.length < 2)) { timeouts++; continue; }
    n++;
    const base = rec.cm16;
    // eraA exhaustion: exact, and "with correction" (cm26 odd-reservoir: one fewer lap,
    // eR+2, eL/eZ-1). Only meaningful for non-exhausted inputs (R>=3); exhausted inputs
    // have eraA = post-churn re-seeded era (churn layer).
    const Rin = S.blocks[S.pos + 1];
    const cls = Rin <= 2 ? "exh" : "mid";
    RCLS[cls]++;
    let okA = true, okAc = true;
    for (const M of MACHINES.slice(1)) {
      const A0 = base.eras[0], A1 = rec[M.name].eras[0];
      const eq = A0.ev === A1.ev && JSON.stringify(trip(A0, "e")) === JSON.stringify(trip(A1, "e"));
      if (!eq) okA = false;
      let dEv = 0, dTrip = [0, 0, 0];
      if (M.name === "cm26" && cls === "mid" && Rin % 2 === 1) { dEv = -1; dTrip = [-1, 2, -1]; }
      const eqc = A1.ev === A0.ev + dEv && trip(A1, "e").every((x, i) => x === trip(A0, "e")[i] + dTrip[i]);
      if (!eqc) okAc = false;
      diffHistAdd(diffA, M.name, trip(A0, "e"), trip(A1, "e"));
    }
    if (okA) aSame++;
    if (okAc) aSameCorr++;
    // eraB
    let kOk = true;
    for (const M of MACHINES.slice(1)) {
      const B0 = base.eras[1], B1 = rec[M.name].eras[1];
      if (key(B0) !== key(B1)) kOk = false;
      diffHistAdd(diffB, M.name, trip(B0, ""), trip(B1, ""));
    }
    if (kOk) bKeySame++;
    else if (bExamples.length < 6) bExamples.push(`${S.src}: key16=${key(base.eras[1])} vs ` + MACHINES.slice(1).map(M => `${M.name}:${rec[M.name].eras[1] ? key(rec[M.name].eras[1]) : "?"}`).join(" "));
  }
  console.log(`states=${REPLAY_SAMPLE.length} usable=${n} (any-halt=${haltsAny} [exhausted-input ${haltByCls.exh}, mid-input ${haltByCls.mid}], tmo/short=${timeouts})`);
  console.log(`eraA exhaustion identical x4: ${aSame}/${n} | with cm26 odd-R correction: ${aSameCorr}/${n} (non-exhausted inputs: ${RCLS.mid} of the usable rows)`);
  console.log(`eraB key identical x4: ${bKeySame}/${n}`);
  for (const m in diffA) {
    const top = Object.entries(diffA[m]).sort((a, b) => b[1] - a[1]).slice(0, 3);
    console.log(`  A.close diff ${m}: ${top.map(([d, c]) => `(${d}):${c}`).join(" ")}`);
  }
  for (const m in diffB) {
    const top = Object.entries(diffB[m]).sort((a, b) => b[1] - a[1]).slice(0, 4);
    console.log(`  B.open diff ${m}: ${top.map(([d, c]) => `(${d}):${c}`).join(" ")}`);
  }
  for (const e of bExamples) console.log(`  key-divergence: ${e}`);
  return { n, aSame, aSameCorr, bKeySame };
}

// ---------------- S3: cm52 extra keys ----------------
function S3(cap) {
  console.log(`== S3 EXTRA52: cm52 right-edge keys (pos=n0-3) x param sets ==`);
  let back = 0, tot = 0, halted = 0;
  const ex = [];
  for (const kstr of EXTRA52) {
    for (let s = 0; s < PSETS.length; s++) {
      const r = tableRun(MACHINES[3], kstr, s, cap);
      if (r.halt >= 0) { halted++; ex.push(`${kstr}/${PSETS[s].name}: HALT@${r.halt}`); continue; }
      const b = r.eras[1];
      if (!b) { ex.push(`${kstr}/${PSETS[s].name}: short/tmo`); continue; }
      tot++;
      if (SHARED78.includes(key(b))) back++;
      else ex.push(`${kstr}/${PSETS[s].name} -> B=${JSON.stringify(trip(b, ""))}@${key(b)} (extra-key to extra-key)`);
    }
  }
  console.log(`runs=${EXTRA52.length * PSETS.length} halted=${halted} reached-B=${tot} back-to-shared-key=${back}/${tot}`);
  for (const e of ex.slice(0, 6)) console.log(`   ${e}`);
  return { back, tot, halted };
}

// ---------------- main ----------------
for (const M of MACHINES) { M.T = buildT(M.code); M.hole = holeOf(M.T); }
const CAP = Number(process.argv[2] || 200000);
const s0 = S0();
const s1 = s0 && S1();
const s2 = s1 ? S2(CAP) : null;
const s2b = s1 ? S2B(400000) : null;
const s3 = s1 ? S3(CAP) : null;
if (s1) S4();
console.log("== VERDICT ==");
if (fails.length) { console.log(`S0/S1 IMPLEMENTATION FAILURES: ${fails.join(", ")} (do not trust the table)`); process.exit(1); }
console.log("S0 selftest PASS | S1 fidelity PASS (engine+detector+constructor validated vs quad6.exe)");
console.log(`S2 synthetic table: ${s2.rows} rows, clean=${s2.clean4}, eraA identical=${s2.sameA} (corrected ${s2.sameACorr}), eraB identical=${s2.sameB}, eraB key identical=${s2.sameKeyB}`);
console.log(`S2B reach-replay: n=${s2b.n}, eraA identical=${s2b.aSame} (corrected ${s2b.aSameCorr}), eraB key identical=${s2b.bKeySame}`);
console.log("Verdict semantics: eraA = exhaustion map (affine lap cascade); eraB = churn/re-seed map.");
process.exit(0);
