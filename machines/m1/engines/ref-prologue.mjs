// ref-prologue.mjs — referee checks for M1 paper: (1) blank tape reaches P(3) at step 54;
// (2) prologue closed form: from P(n), n≡3 mod 6, n+3=2^m w, trajectory reaches
//     Phi(w,m)=G(w-1,w-1,2w,4w,...,2^{m-1}w,2^m w -1)  (gaps [3,1,1,...]);
// (3) the intermediate claims R(1,2n+2) and G(n+2,n+1).
const CODE = "1RB1LA0RC0RD1LC1LA1RE1RD1LF0LA---0LE";
const T = []; for (let i = 0; i < 6; i++) T.push([null, null]);
for (let i = 0; i < 12; i++) { const t = CODE.slice(3 * i, 3 * i + 3);
  T[i / 2 | 0][i % 2] = { w: +t[0], m: t[1] === "L" ? -1 : 1, n: t[2] === "-" ? 6 : t.charCodeAt(2) - 65 }; }
function step(tape, st, h) { const sy = tape.get(h) || 0; const tr = T[st][sy];
  if (tr.n === 6) return { halt: true }; tape.set(h, tr.w); return { halt: false, st: tr.n, h: h + tr.m }; }
// describe config as runs (abs) around head
function describe(tape, h, padL = 80, padR = 400) {
  const lo = h - padL, hi = h + padR; const runs = []; let p = lo;
  while (p < hi) { const v = tape.get(p) || 0; let q = p; while (q < hi && (tape.get(q) || 0) === v) q++;
    if (v === 1 && p > lo && q < hi) runs.push([p - h, q - p]); p = q; }
  return runs;
}
// ---- (1) blank tape ----
{
  const tape = new Map(); let st = 0, h = 0, t = 0, found = -1;
  for (; t < 200; t++) {
    if (st === 3 && (tape.get(h) || 0) === 0) {
      const r = describe(tape, h, 8, 8);
      // P(3): runs (3,3) gap 1, head fresh 0 right of right run => rel runs [-4,3],[-1..]=...
      if (found < 0) { /* first event */ }
      const isP3 = r.length === 2 && r[0][1] === 3 && r[1][1] === 3 && r[1][0] - (r[0][0] + r[0][1]) === 1 && r[1][0] + r[1][1] === 0;
      if (isP3) { found = t; break; }
    }
    const r = step(tape, st, h); if (r.halt) break; st = r.st; h = r.h;
  }
  console.log(`blank-tape first P(3) event at step t=${found} (paper: 54)`);
}
// ---- (2) prologue ----
function fromP(n, maxSteps = 500000) {
  const tape = new Map();
  // 1^n 0 1^n with head on the fresh 0 after the right run; left sentinel far left (0s)
  for (let i = 0; i < n; i++) tape.set(100 + i, 1);
  for (let i = 0; i < n; i++) tape.set(101 + n + i, 1);
  let st = 3, h = 100 + 2 * n, t = 0;
  const events = [];
  for (; t < maxSteps; t++) {
    if (st === 3 && (tape.get(h) || 0) === 0 && t > 0) events.push({ t, h, runs: describe(tape, h, 60, 900) });
    if (events.length > 4000) break;
    const r = step(tape, st, h); if (r.halt) return { halt: true, t, events }; st = r.st; h = r.h;
  }
  return { halt: false, events };
}
function phiRuns(w, m) { // relative to head at gap[?]... head is middle of 3-gap between run1,2
  const runs = [w - 1, w - 1]; for (let i = 1; i <= m - 1; i++) runs.push(2 ** i * w); runs.push(2 ** m * w - 1);
  // absolute layout: place run1 so that 3-gap middle 0 is at cell 0:
  // run1 occupies [-2-(w-1) .. -3], gap cells [-2,-1,0], run2 starts at 1
  let abs = []; let p = -2 - (w - 1);
  const gaps = runs.slice(0, -1).map((_, i) => (i === 0 ? 3 : 1));
  runs.forEach((k, i) => { abs.push([p, k]); p += k + (gaps[i] ?? 0); });
  return abs;
}
for (const [n, w, m] of [[9, 3, 2], [21, 3, 3], [29, 1, 5], [45, 3, 4], [93, 3, 5], [6141, 3, 11], [57, 5, 3] /*57+3=60=4*15: 2^2*15*/]) {
  const res = fromP(n);
  if (res.halt) { console.log(`n=${n}: HALT at t=${res.t} (paper: no halt, reaches Phi)`); continue; }
  const target = phiRuns(w, m);
  const tgt = JSON.stringify(target);
  const hit = res.events.find(e => JSON.stringify(e.runs.map(([o, k]) => [o + e.h, k])) === tgt);
  // also check intermediate claims R(1,2n+2), G(n+2,n+1)
  const r1 = JSON.stringify([[1, 1], [3, 2 * n + 2]]); // R(1,2n+2): runs 1@h-2, (2n+2)@h ... fresh0 head right of run2
  const hitR = res.events.find(e => JSON.stringify(e.runs.map(([o, k]) => [o, k]).slice(-2)) === JSON.stringify([[-2, 1], [0, 2 * n + 2]]) || JSON.stringify(e.runs) === JSON.stringify([[-2, 1], [0, 2 * n + 2]]));
  const g1 = res.events.find(e => { const r = e.runs; return r.length >= 2 && r[0][1] === n + 2 && r[1][1] === n + 1; });
  console.log(`n=${n} (w=${w},m=${m}): events=${res.events.length} R(1,${2 * n + 2})@${hitR ? hitR.t : "MISS"} G(${n + 2},${n + 1})@${g1 ? g1.t : "MISS"} Phi(${w},${m})@${hit ? hit.t : "MISS"}`);
}
