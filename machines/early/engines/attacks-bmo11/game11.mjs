// game11.mjs — BMO 11 rewrite-game engine.
// Alphabet {0,1,#}. Full word = (10#)^omega (left-infinite) + deviation + 0^omega.
// Rules (any occurrence, any order):
//   #0 -> 1 ; #100 -> 010# ; #1010 -> 1010## ; #10110 -> 10101 ; #11 -> 10
// Canonical state string: ctx6(psi) + deviation (no trailing zeros),
// where the deviation starts at the leftmost position differing from the
// periodic continuation and psi is the phase consumed by stripping.
export const CYC = "10#";
export const RULES = [
  ["#0", "1"],
  ["#100", "010#"],
  ["#1010", "1010##"],
  ["#10110", "10101"],
  ["#11", "10"],
];
export const RULENAME = ["R1(#0->1)", "R2(#100->010#)", "R3(#1010->1010##)", "R4(#10110->10101)", "R5(#11->10)"];
const Z = "0".repeat(16);

export function ctx6(psi) {
  let s = "";
  for (let k = 6; k >= 1; k--) s += CYC[((((psi - k) % 3) + 3) % 3)];
  return s;
}

// Phase-aware canonicalization.
// A canonical state is ctx6(psi) + deviation, where psi is the pattern phase
// immediately left of the deviation: the pattern-expected symbol at the
// deviation is CYC[psi]. For a string whose first character sits at pattern
// phase phi (expected symbol CYC[phi]), canon strips the maximal pattern
// prefix and re-emits 6 fresh pattern symbols of the correct phase.
// The strip continues past the end of the (zero-trimmed) string into the
// implicit right-infinite 0s whenever the pattern expects '0' there — the
// leftmost deviation may sit inside those implicit zeros.
export function canon(str, phi = 0) {
  let e = str.length;
  while (e > 0 && str[e - 1] === "0") e--;
  const t = str.slice(0, e);
  let i = 0;
  for (;;) {
    const exp = CYC[(phi + i) % 3];
    const act = i < t.length ? t[i] : "0";
    if (exp === act) i++; else break;
  }
  return ctx6((phi + i) % 3) + t.slice(Math.min(i, t.length));
}

// phase of a canonical state (pattern phase at its first character)
export function phaseOf(state) {
  for (let p = 0; p < 3; p++) if (state.startsWith(ctx6(p))) return p;
  throw new Error("not a canonical state: " + state);
}

export function window(state) { return state + Z; }

// All positions i in the window where some LHS matches (active #s).
// Includes the pattern-# at window index 5 (= word position -1) when active;
// the pattern-# at index 2 (word -4) can never be active (followed by 10#),
// which selftest() asserts as a canary.
export function activePositions(state) {
  const T = window(state);
  const out = [];
  for (let i = 0; i + 1 < T.length; i++) {
    if (T[i] !== "#") continue;
    for (const [L] of RULES) {
      if (T.startsWith(L, i)) { out.push(i); break; }
    }
  }
  return out;
}

export function ruleAt(state, i) {
  const T = window(state);
  for (let r = 0; r < RULES.length; r++) {
    if (T.startsWith(RULES[r][0], i)) return r;
  }
  return -1;
}

export function applyRule(state, i, r) {
  const T = window(state);
  const [L, R] = RULES[r];
  if (!T.startsWith(L, i)) throw new Error("rule mismatch");
  return canon(T.slice(0, i) + R + T.slice(i + L.length), phaseOf(state));
}

export function successors(state) {
  const out = [];
  for (const i of activePositions(state)) {
    const r = ruleAt(state, i);
    out.push([applyRule(state, i, r), i, r]);
  }
  return out;
}

export function rightmostHash(state) {
  const T = window(state);
  let p = -1;
  for (let i = 0; i < T.length; i++) if (T[i] === "#") p = i;
  return p; // always >= 5: ctx6 contains two '#'
}

export function tail5(state) {
  const T = window(state);
  const p = rightmostHash(state);
  return T.slice(p + 1, p + 6);
}

export function isGoal(state) { return tail5(state) === "10111"; }

export const INIT = canon(""); // "10#10#"

// Full-word reconstruction for cross-checks: materialize `lp` pattern symbols.
export function materialize(state, lp = 12) {
  const psi = [0, 1, 2].find(p => ctx6(p) === state.slice(0, 6));
  if (psi === undefined) throw new Error("bad state (ctx6 mismatch): " + state);
  let left = "";
  for (let k = 7; k <= 6 + lp; k++) left = CYC[((((psi - k) % 3) + 3) % 3)] + left;
  return left + state + "0".repeat(16);
}

// ---------------------------------------------------------------- self tests
// Grow a materialized word in place: prepend whole "10#" units (phase
// preserving) while fewer than 36 symbols of leading pattern material remain,
// append zeros while fewer than 24 trailing zeros remain.
function growDumb(dumb) {
  let i = 0;
  while (i < dumb.length && dumb[i] === CYC[i % 3]) i++;
  while (i < 36) { dumb = "10#" + dumb; i += 3; }
  let z = 0;
  while (z < dumb.length && dumb[dumb.length - 1 - z] === "0") z++;
  if (z < 24) dumb += "0".repeat(24 - z);
  return dumb;
}

export function selftest() {
  let fails = 0;
  const ok = (c, m) => { if (!c) { fails++; console.log("FAIL:", m); } };
  ok(ctx6(0) === "10#10#" && ctx6(1) === "0#10#1" && ctx6(2) === "#10#10", "ctx6");
  ok(INIT === "10#10#", "INIT=" + INIT);
  ok(phaseOf(INIT) === 0, "phaseOf INIT");
  // goal sanity
  const g2 = canon("#10111");
  ok(isGoal(g2) === true, "goal word #10111 recognized, got tail " + JSON.stringify(tail5(g2)));
  const g3 = canon("#101101");
  ok(!isGoal(g3), "tail 10110 -> active (R4)");
  const g4 = canon("#11");
  ok(!isGoal(g4), "tail 11 -> active (R5)");
  const g5 = canon("#111");
  ok(!isGoal(g5), "tail 11 -> active (R5) even with 111 start");
  const g6 = canon("#0");
  ok(!isGoal(g6), "tail 0 -> active (R1)");
  const g7 = canon("#101110");
  ok(isGoal(g7) === true, "tail 10111 0 still goal");

  // differential test 1: rightmost-# strategy, dumb full-word engine vs canonical engine.
  let dumb = "10#".repeat(40) + "0".repeat(24);
  let st = INIT;
  for (let step = 0; step < 600; step++) {
    const dwin = dumb + "0".repeat(8);
    let p = -1;
    for (let i = 0; i < dwin.length; i++) if (dwin[i] === "#") p = i;
    let rr = -1;
    for (let r = 0; r < RULES.length; r++) if (dwin.startsWith(RULES[r][0], p)) { rr = r; break; }
    if (rr < 0) { console.log("dumb: rightmost # inactive at step", step); break; }
    dumb = dwin.slice(0, p) + RULES[rr][1] + dwin.slice(p + RULES[rr][0].length);
    dumb = growDumb(dumb);
    const sp = rightmostHash(st);
    const ap = activePositions(st);
    if (!ap.includes(sp)) { fails++; console.log("ENGINEDISAGREE: canon rightmost # inactive at step", step); break; }
    if (ruleAt(st, sp) !== rr) { fails++; console.log("RULEDISAGREE at step", step, rr, ruleAt(st, sp)); break; }
    st = applyRule(st, sp, ruleAt(st, sp));
    phaseOf(st); // throws if malformed
    const cd = canon(dumb);
    if (cd !== st) {
      fails++;
      console.log("DIFF at step", step, "\n canon(dumb):", cd, "\n engine:", st);
      break;
    }
    // canary: among the two pattern-#s inside ctx6 only the one nearest the
    // deviation (window index 5/4/3 for phase 0/1/2) can ever be active; the
    // other is followed by "10#" and matches no LHS.
    const near = [5, 4, 3][phaseOf(st)];
    for (const a of activePositions(st)) if (a < 5 && a !== near) { fails++; console.log("CANARY: active at", a, st); }
    if (isGoal(st)) { console.log("GOAL at step", step); break; }
  }

  // differential test 2: random active position; apply same rule at same
  // occurrence-rank on the materialized word.
  let dumb3 = "10#".repeat(40) + "0".repeat(24);
  let st3 = INIT;
  let rng3 = 987654321;
  const rand3 = () => (rng3 = (rng3 * 1103515245 + 12345) & 0x7fffffff) / 0x80000000;
  for (let step = 0; step < 4000; step++) {
    const apS = activePositions(st3);
    if (apS.length === 0) break;
    const pickIdx = Math.floor(rand3() * apS.length);
    const posS = apS[pickIdx];
    const r = ruleAt(st3, posS);
    let rank = 0;
    for (const a of apS) if (a <= posS && ruleAt(st3, a) === r) rank++;
    const dwin = dumb3 + "0".repeat(8);
    const occ = [];
    for (let i = 0; i + 1 < dwin.length; i++) {
      if (dwin[i] === "#" && dwin.startsWith(RULES[r][0], i)) occ.push(i);
    }
    if (occ.length < rank) { fails++; console.log("occurrence mismatch step", step, "rank", rank, "occ", occ.length); break; }
    const p3 = occ[rank - 1];
    dumb3 = dwin.slice(0, p3) + RULES[r][1] + dwin.slice(p3 + RULES[r][0].length);
    dumb3 = growDumb(dumb3);
    st3 = applyRule(st3, posS, r);
    phaseOf(st3);
    const cd = canon(dumb3);
    if (cd !== st3) { fails++; console.log("DIFF3 step", step, "\n canon(dumb):", cd, "\n engine:", st3); break; }
    if (isGoal(st3)) { console.log("GOAL3 at step", step); break; }
  }
  console.log(fails === 0 ? "SELFTEST OK" : "SELFTEST FAILURES: " + fails);
  return fails === 0;
}

if (process.argv[1] && process.argv[1].endsWith("game11.mjs") && process.argv[2] === "selftest") {
  selftest();
}
