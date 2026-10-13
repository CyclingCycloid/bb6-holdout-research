// ref-phaserules.mjs — independent referee check of M1 paper Lemma "phase rules".
// Bare simulator (independent implementation) + grammar rules as printed in paper-en.tex.
// M1 = 1RB1LA_0RC0RD_1LC1LA_1RE1RD_1LF0LA_---0LE ; event = state D reading 0.
// Grammar forms (paper Def): R(a,b) runs (a,b) gaps [1], head on fresh 0 right of right run;
// S(x,y,z,tail) gaps [1,2,1,2,...], head on LEFT 0 of the 2-gap between runs 2,3;
// G(a,b,tail) gaps [3,1,1,...], head on MIDDLE 0 of 3-gap between runs 1,2;
// L(r1,r2,r3,tail) gaps [1,1,1,...], head on the single-0 gap between runs 2,3.
const CODE = "1RB1LA0RC0RD1LC1LA1RE1RD1LF0LA---0LE";
const T = []; for (let i = 0; i < 6; i++) T.push([null, null]);
for (let i = 0; i < 12; i++) { const t = CODE.slice(3 * i, 3 * i + 3);
  T[i / 2 | 0][i % 2] = { w: +t[0], m: t[1] === "L" ? -1 : 1, n: t[2] === "-" ? 6 : t.charCodeAt(2) - 65 }; }

// tape as Map; build grammar configs on absolute cells; head placed per form.
function mk(runs, gaps, headGapIdx, headCellIdxInGap) {
  const tape = new Map(); let p = 0; const starts = [];
  runs.forEach((len, i) => { starts.push(p); for (let k = 0; k < len; k++) tape.set(p + k, 1); p += len;
    if (i < runs.length - 1) { p += gaps[i]; } });
  // head position: absolute cell of the (headCellIdxInGap)-th cell of gap headGapIdx
  let hp = starts[headGapIdx] + runs[headGapIdx] + headCellIdxInGap;
  return { tape, head: hp };
}
// R(a,b, tail...): runs [a,b,...tail], gaps all 1, head on fresh 0 right of the LAST run
function buildR(a, b, tail = []) { const runs = [a, b, ...tail]; const gaps = runs.map((_, i) => 1);
  const m = mk(runs, gaps.slice(0, runs.length - 1), 0, 0);
  const last = runs.reduce((s, l) => s + l, 0) + (runs.length - 1); // end of last run
  return { tape: m.tape, head: last }; }
// S(x,y,z,tail): gaps [1,2,1,2,...]; head = LEFT cell (idx 0) of gap[1] (between runs 2,3)
function buildS(x, y, z, tail = []) { const runs = [x, y, z, ...tail];
  const gaps = runs.slice(0, -1).map((_, i) => (i % 2 === 0 ? 1 : 2));
  return mk(runs, gaps, 1, 0); }
// G(a,b,tail): gaps [3,1,1,...]; head = MIDDLE cell (idx 1) of gap[0]
function buildG(a, b, tail = []) { const runs = [a, b, ...tail];
  const gaps = runs.slice(0, -1).map((_, i) => (i === 0 ? 3 : 1));
  return mk(runs, gaps, 0, 1); }
// L(r1,r2,r3,tail): gaps all 1; head = the 0 between runs 2,3 (gap idx 1, cell 0)
function buildL(r1, r2, r3, tail = []) { const runs = [r1, r2, r3, ...tail];
  const gaps = runs.slice(0, -1).map(() => 1);
  return mk(runs, gaps, 1, 0); }

// run until next event (state D reads 0) or halt; return {steps, halt, runs, gaps, headRel}
function runEvent(cfg) {
  let { tape, head } = cfg; let st = 3; // state D
  const t0 = head;
  let steps = 0;
  for (; steps < 4000; steps++) {
    const sy = tape.get(head) || 0;
    if (st === 3 && sy === 0 && steps > 0) break; // next event
    const tr = T[st][sy];
    if (tr.n === 6) return { steps: steps + 1, halt: true };
    tape.set(head, tr.w); head += tr.m; st = tr.n;
  }
  // extract local window around [t0-30, head+200]
  const lo = Math.min(t0, head) - 60, hi = Math.max(t0, head) + 400;
  const runs = []; let p = lo;
  while (p < hi) { const v = tape.get(p) || 0; let q = p; while (q < hi && (tape.get(q) || 0) === v) q++;
    if (v === 1) runs.push({ s: p, k: q - p }); p = q; }
  // trim 1-runs attached to window edges
  const inside = runs.filter(r => r.s > lo && r.s + r.k < hi);
  // head-relative run description: offsets from head
  const rel = inside.map(r => ({ off: r.s - head, k: r.k }));
  return { steps, halt: false, rel, head };
}

function fmt(res) { return res.halt ? "HALT" : JSON.stringify(res.rel); }
let bad = 0, tot = 0;
function chk(name, got, expSteps, expDesc) {
  tot++;
  const okS = got.steps === expSteps;
  const okD = !expDesc || fmt(got) === expDesc;
  if (!okS || !okD) { bad++; console.log(`BAD ${name}: steps ${got.steps} (exp ${expSteps}) ${fmt(got)}\n     exp ${expDesc}`); }
}
// ---- Rule (R): R(a,b) -> S3(a+1, b-2, 1), 2b+3, b>=3 ----
for (const [a, b] of [[3, 3], [5, 4], [7, 10], [9, 3]]) {
  const r = runEvent(buildR(a, b));
  const exp = JSON.stringify([{ off: -3, k: a + 1 }, { off: -1, k: b - 2 }, { off: 2, k: 1 }]);
  chk(`R(${a},${b})`, r, 2 * b + 3, exp);
}
// ---- Rule (S>=): S(x,y,z) -> S(x+1,y-2,z+1), 2y+3, y>=3 ----
for (const [x, y, z] of [[3, 5, 2], [2, 4, 7], [1, 3, 3]]) {
  const r = runEvent(buildS(x, y, z));
  const exp = JSON.stringify([{ off: -5, k: x + 1 }, { off: -1, k: y - 2 }, { off: 3, k: z + 1 }]);
  chk(`S(${x},${y},${z})`, r, 2 * y + 3, exp);
}
// ---- Rule (S2): S(x,2,z) -> G(x+1,z+1), 7 ----
for (const [x, z] of [[4, 5], [2, 9], [6, 2]]) {
  const r = runEvent(buildS(x, 2, z));
  const exp = JSON.stringify([{ off: -4, k: x + 1 }, { off: 0, k: z + 1 }]);
  chk(`S2(${x},${z})`, r, 7, exp);
}
// ---- Rule (S1): S(x,1,z) -> R/L(1, x+z+3), 2x+z+14 ----
for (const [x, z] of [[3, 3], [5, 2], [2, 8]]) {
  const r = runEvent(buildS(x, 1, z));
  const exp = JSON.stringify([{ off: -2, k: 1 }, { off: 0, k: x + z + 3 }]);
  chk(`S1(${x},${z})`, r, 2 * x + z + 14, exp);
}
// ---- Rule (G>=): G(a,b) -> S(1, a-3, 1, b+1), 2a+3, a>=4 ----
for (const [a, b] of [[7, 6], [5, 12], [9, 4]]) {
  const r = runEvent(buildG(a, b));
  const exp = JSON.stringify([{ off: -6, k: 1 }, { off: -4, k: a - 3 }, { off: -1, k: 1 }, { off: 2, k: b + 1 }]);
  chk(`G>=(${a},${b})`, r, 2 * a + 3, exp);
}
// ---- Rule (G2): G(2,b) -> L(1, b+1, b+1), 16  (PAPER) vs raw? ----
for (const [b] of [[1], [2], [3], [5], [10]]) {
  const r = runEvent(buildG(2, b));
  console.log(`INFO G2(2,${b}): steps=${r.steps} ${fmt(r)}`);
}
// ---- Rule (G3): G(3,b) -> HALT, 15 ----
for (const [b] of [[2], [7]]) { const r = runEvent(buildG(3, b)); chk(`G3(3,${b})`, r, 15, null); if (!r.halt) console.log(`  G3 not halted: ${fmt(r)}`); }
// ---- Rule (L>=): L(r1,r2,r3) -> L(r1+1, r2, r3-1), 2r2+5, r3>=2 ----
for (const [r1, r2, r3] of [[2, 4, 6], [1, 7, 2]]) {
  const r = runEvent(buildL(r1, r2, r3));
  const exp = JSON.stringify([{ off: -4, k: r1 + 1 }, { off: -2, k: r2 }, { off: 0, k: r3 - 1 }]);
  chk(`L>=(${r1},${r2},${r3})`, r, 2 * r2 + 5, exp);
}
// ---- Rule (L1): L(r1,r2,1) -> R(r1+1, r2), 2r2+5 ----
for (const [r1, r2] of [[3, 5], [2, 9]]) {
  const r = runEvent(buildL(r1, r2, 1));
  const exp = JSON.stringify([{ off: -3, k: r1 + 1 }, { off: -1, k: r2 }]);
  chk(`L1(${r1},${r2})`, r, 2 * r2 + 5, exp);
}
console.log(`\nref-phaserules: total=${tot} bad=${bad} (plus INFO lines for G2)`);
