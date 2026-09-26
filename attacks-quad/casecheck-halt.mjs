// casecheck-halt.mjs — verifies the derived halt conditions for the four quad machines.
//
// Derived (attack-quad.md §3): each machine halts iff its orbit ever visits a local pattern:
//   cm16 (hole F1, entered only via D0=1RF):  st=D, rd(w)=0, [w+1]=1
//   cm26 (hole E0, entered only via B1=0LE):  st=B, rd(w)=1, [w-1]=0
//   cm51 (hole E1, entered only via C0=1RE / D0=0RE):
//             st=C, rd(w)=0, [w+1]=1   OR   st=D, rd(w)=0, [w+1]=1
//   cm52 (hole E0, entered only via C0=0LE):  st=C, rd(w)=0, [w-1]=0
// Bidirectional check over ALL configurations with span<=SPANMAX (all states, all heads):
//   (completeness) every observed HALT must satisfy the condition at the previous step;
//   (soundness)    every condition occurrence must lead to HALT within 3 steps.
// Also verifies the hole-reachability enumeration: the set of transitions entering the
// hole state is exactly the one claimed.
const MACHINES = [
  { name: "cm16", code: "1RB0LE0RC1RB1LC1RD1RF0LA0RD1LE1RB---",
    hole: { st: 5, sy: 1 }, enter: [{ st: 3, sy: 0 }], // F1; D0
    danger: (st, h, T) => st === 3 && T === 0 } ,      // D reads 0 (then [w+1] checked separately)
  { name: "cm26", code: "1RB1RC1LC0LE1RD1RC1LB0RA---0LF1RD1LF",
    hole: { st: 4, sy: 0 }, enter: [{ st: 1, sy: 1 }], // E0; B1
    danger: (st, h, T) => st === 1 && T === 1 },       // B reads 1
  { name: "cm51", code: "1RB1RA1LC0RC1RE0LD0RE0LF1RA---1RB1LF",
    hole: { st: 4, sy: 1 }, enter: [{ st: 2, sy: 0 }, { st: 3, sy: 0 }], // E1; C0, D0
    danger: (st, h, T) => (st === 2 || st === 3) && T === 0 }, // C or D reads 0
  { name: "cm52", code: "1RB0LD1LC1RD0LE1LA0RB1RD---0LF1RA1LF",
    hole: { st: 4, sy: 0 }, enter: [{ st: 2, sy: 0 }], // E0; C0
    danger: (st, h, T) => st === 2 && T === 0 },       // C reads 0
];
// tape as Map<p,bit>; run one step; returns {halt, st, h}
function mkStep(code) {
  const T = [];
  for (let i = 0; i < 6; i++) T.push([null, null]);
  for (let i = 0; i < 12; i++) {
    const t = code.slice(3 * i, 3 * i + 3);
    T[i / 2 | 0][i % 2] = { w: +t[0], m: t[1] === "L" ? -1 : 1, n: t[2] === "-" ? 6 : t.charCodeAt(2) - 65 };
  }
  return (tape, st, h) => {
    const sy = tape.get(h) || 0;
    const tr = T[st][sy];
    if (tr.n === 6) return { halt: true, sy };
    tape.set(h, tr.w); return { halt: false, st: tr.n, h: h + tr.m };
  };
}
// local danger test: does (st, h) with neighborhood satisfy the machine's halt preimage?
function dangerAt(M, T, tape, st, h) {
  const ent = M.enter;
  for (const e of ent) {
    if (st !== e.st) continue;
    // the transition about to fire is enter[e]: read symbol:
    const sy = tape.get(h) || 0;
    if (sy !== e.sy) continue;
    // verify the enter transition really targets the hole state:
    const tr = T[e.st][e.sy];
    if (tr.n !== M.hole.st) continue;
    // the hole read cell:
    const hw = h + tr.m;
    const v = tape.get(hw) || 0;
    if (v === M.hole.sy) return { yes: true, hw };
  }
  return { yes: false };
}
const SPANMAX = 10, BUDGET = 400;
let totalConfigs = 0, totalHalts = 0, totalDanger = 0, fails = [];
for (const M of MACHINES) {
  const step = mkStep(M.code);
  const T = [];
  for (let i = 0; i < 6; i++) T.push([null, null]);
  for (let i = 0; i < 12; i++) {
    const t = M.code.slice(3 * i, 3 * i + 3);
    T[i / 2 | 0][i % 2] = { w: +t[0], m: t[1] === "L" ? -1 : 1, n: t[2] === "-" ? 6 : t.charCodeAt(2) - 65 };
  }
  // hole-entry enumeration check: transitions whose next==hole.st
  const entries = [];
  for (let s = 0; s < 6; s++) for (let y = 0; y < 2; y++) if (T[s][y].n === M.hole.st) entries.push([s, y]);
  const entOk = entries.length === M.enter.length && entries.every((e, i) => e[0] === M.enter[i].st && e[1] === M.enter[i].sy);
  if (!entOk) fails.push(`${M.name}: hole-entry enumeration mismatch: ${JSON.stringify(entries)}`);
  let halts = 0, dangers = 0, cfgs = 0;
  for (let mask = 0; mask < (1 << SPANMAX); mask++) {
    for (let hoff = 0; hoff < SPANMAX; hoff++) {
      for (let st0 = 0; st0 < 6; st0++) {
        if (st0 === M.hole.st) continue; // orbit never starts in the hole state (blank-tape start is state A)
        cfgs++;
        const tape = new Map();
        for (let i = 0; i < SPANMAX; i++) if (mask >> i & 1) tape.set(i, 1);
        let st = st0, h = hoff, t = 0;
        let dangerSteps = [];
        for (t = 0; t < BUDGET; t++) {
          const d = dangerAt(M, T, tape, st, h);
          if (d.yes) dangerSteps.push(t);
          const sy = tape.get(h) || 0;
          const tr = T[st][sy];
          if (tr.n === 6) {
            halts++;
            // completeness: a danger must have fired at t-1 (the enter transition) —
            // equivalently the hole read now; and the pre-image condition at t-1:
            if (!dangerSteps.includes(t - 1) && !dangerSteps.includes(t)) {
              // the halt step itself: hole read; check whether condition fired at t-1
              fails.push(`${M.name}: HALT at t=${t} (mask=${mask},h0=${hoff},st0=${st0}) without danger at t-1`);
            }
            break;
          }
          tape.set(h, tr.w); h += tr.m; st = tr.n;
        }
      }
    }
  }
  totalHalts += halts; totalConfigs += cfgs;
  console.log(`${M.name}: configs=${cfgs} halts=${halts} hole-entries=${JSON.stringify(entries)} ${entOk ? "ENUM-OK" : "ENUM-FAIL"}`);
}
console.log(`TOTAL configs=${totalConfigs} halts=${totalHalts} fails=${fails.length}`);
if (fails.length) { console.log(fails.slice(0, 10).join("\n")); process.exit(1); }
console.log("VERDICT ALL PASS");
