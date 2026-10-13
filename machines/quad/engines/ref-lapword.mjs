// ref-lapword.mjs — blind-audit referee script (read-only w.r.t. papers).
// Question: does the STANDARD LAP WORD of quad paper Lemma (lap) hold for all four
// machines cm16/26/51/52 from the paper's standard lap configuration?
// Config per paper: left seam 0^2 at g,g+1; right reservoir 1^R at g+2..g+R+1;
// right seam 0^2; deposit 1^z; working block 1^x to the left; head A at g.
// Also records the net (x,R,z) bookkeeping after one macro return to A.
const MACHINES = {
  cm16: "1RB0LE0RC1RB1LC1RD1RF0LA0RD1LE1RB---",
  cm26: "1RB1RC1LC0LE1RD1RC1LB0RA---0LF1RD1LF",
  cm51: "1RB1RA1LC0RC1RE0LD0RE0LF1RA---1RB1LF",
  cm52: "1RB0LD1LC1RD0LE1LA0RB1RD---0LF1RA1LF",
};
const mkT = code => {
  const T = []; for (let i = 0; i < 6; i++) T.push([null, null]);
  for (let i = 0; i < 12; i++) {
    const t = code.slice(3 * i, 3 * i + 3);
    T[i / 2 | 0][i % 2] = { w: +t[0], m: t[1] === "L" ? -1 : 1, n: t[2] === "-" ? 6 : t.charCodeAt(2) - 65 };
  } return T;
};
const mkTape = rle => { const m = new Map(); let p = 0; for (const [v, k] of rle) { for (let i = 0; i < k; i++) m.set(p + i, v); p += k; } return m; };
const runsOf = (m) => { const rs = []; let p = -400; let prev = null; // scan -400..+400
  for (let q = -400; q <= 400; q++) { const v = m.get(q) || 0;
    if (prev === null || v !== prev[0]) { rs.push([v, 1, q]); prev = rs[rs.length - 1]; } else prev[1]++; }
  return rs; };
const wname = (st, sy) => "ABCDEF"[st] + sy;
// paper's standard lap configuration (same as casecheck-island.mjs build())
function build(x, R, z) {
  const rle = [[1, 4], [0, 1], [1, 8], [0, 1], [1, 9], [0, 1], [1, x], [0, 2], [1, R], [0, 2], [1, z], [0, 1], [1, 8], [0, 1], [1, 4]];
  const tape = mkTape(rle);
  // start of run index 7 (the 0^2 left seam)
  let p = 0; let g1 = 0; rle.forEach(([v, k], i) => { if (i === 7) g1 = p; p += k; });
  return { tape, g1 };
}
const expectedWord = R => {
  const w = ["A0", "B0", "C1", "D1", "A1", "E0", "D0", "F0"];
  for (let i = 0; i < R - 2; i++) w.push("B1"); w.push("B0", "C0", "C0", "C1", "D1", "A1");
  for (let i = 0; i < R - 1; i++) w.push("E1"); w.push("E0", "D1", "A0");
  return w;
};
for (const [name, code] of Object.entries(MACHINES)) {
  const T = mkT(code);
  for (const R of [13, 20]) {
    const { tape, g1 } = build(6, R, 7);
    let st = 0, h = g1; const got = []; let halted = false;
    const maxSteps = 2 * R + 14 + 200;
    for (let t = 0; t < maxSteps; t++) {
      const sy = tape.get(h) || 0;
      got.push(wname(st, sy));
      const tr = T[st][sy];
      if (tr.n === 6) { halted = true; tape.set(h, tr.w); break; }
      tape.set(h, tr.w); h += tr.m; st = tr.n;
      if (st === 0 && t > 0 && (tape.get(h) || 0) === 0 && got.length >= 2 * R + 10) break; // one macro (A->A) done
    }
    const exp = expectedWord(R);
    const nMatch = got.slice(0, exp.length).filter((w, i) => w === exp[i]).length;
    const wordOk = got.length >= exp.length && got.slice(0, exp.length).every((w, i) => w === exp[i]);
    // net effect on (x, R, z): count via runs around the window
    const rs = runsOf(tape);
    // find the reservoir-ish structure: print compact rle of nonzero region
    let nz = rs.filter(r => r[1] > 0 && r[2] > g1 - 60 && r[2] < g1 + R + 60);
    const rleStr = nz.map(r => `${r[0] === 1 ? "1" : "0"}^${r[1]}`).join(" ");
    console.log(`${name} R=${R}: halted=${halted} events=${got.length} wordMatchesPaper=${wordOk} firstMismatchAt=${got.slice(0, exp.length).findIndex((w, i) => w !== exp[i])} head=${h} state=${"ABCDEF"[st]}`);
    console.log(`   window rle: ${rleStr}`);
    if (!wordOk) console.log(`   got[0..12]=${got.slice(0, 13).join(" ")}`);
  }
}
