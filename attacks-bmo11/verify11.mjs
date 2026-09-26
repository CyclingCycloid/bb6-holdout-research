// verify11.mjs — mechanical verification for the BMO 11 game.
//  A. Dichotomy: the rightmost # is inactive  iff  its tail starts 10111.
//     Derived independently by brute force over all 5-symbol binary tails.
//  B. Invariant ladder: sets F of forbidden substrings; closure check
//     under all 5 rules by exhaustive context enumeration; refinement loop
//     guided by a reachability oracle (BFS corpus).
//
// Closure theorem used (sound and complete for substring invariants):
//   If (i) no f in F occurs in the initial word, and
//      (ii) for every rule L->R, every left context u and right context v
//           (each of length maxf-1 over {0,1,#}): whenever some f in F occurs
//           in u.R.v overlapping the R part, some f' in F occurs in u.L.v,
//   then no reachable word contains any f in F.
// Proof: induction on rewrite count. New occurrences after a rewrite either
// lie entirely outside the replaced region (pre-existing) or inside the
// u.R.v window; the latter are excluded because u.L.v is part of the old word.
//
// Oracle use is ONLY heuristic (choosing which substring to forbid);
// the final checkClosure() call is exact rule mechanics + exact w0 check.
import { RULES, RULENAME, CYC } from "./game11.mjs";
import fs from "fs";

const SIG = ["0", "1", "#"];
const W0 = CYC.repeat(40) + "0".repeat(40); // materialized initial word

// ------------------------------------------------------------------ Part A
export function dichotomy() {
  let bad = 0;
  for (let m = 0; m < 32; m++) {
    const t = m.toString(2).padStart(5, "0");
    const full = "#" + t + "00000"; // tail continues with 0s (word is 0^inf right)
    let active = false;
    for (const [L] of RULES) if (full.startsWith(L)) { active = true; break; }
    const claim = !t.startsWith("10111");
    if (active !== claim) { bad++; console.log("DICHOTOMY MISMATCH", t, active, claim); }
  }
  console.log(bad === 0 ? "DICHOTOMY VERIFIED: rightmost # inactive <=> tail starts 10111" : "DICHOTOMY FAILED");
  return bad === 0;
}

// ------------------------------------------------------------------ Part B
function occurs(s, f) { return s.includes(f); }
function occursOverlapping(s, f, lo, hi) {
  // occurrence [a, a+f.length) intersects [lo, hi)
  let a = s.indexOf(f);
  while (a !== -1) {
    if (a < hi && a + f.length > lo) return true;
    a = s.indexOf(f, a + 1);
  }
  return false;
}

// Fast, sound closure check: enumerate exactly the F-FREE contexts u.L.v
// (eff symbols each side, eff >= maxf-1) by backtracking with suffix pruning;
// a violation is any F-free u.L.v whose rewrite u.R.v contains some f in F
// overlapping R. Equivalent to the brute-force quantifier:
//   forall (u,v): f in u.R.v (overlap R) => u.L.v contains an F-member.
export function checkClosureFast(F, cl) {
  const maxf = Math.max(...F.map(f => f.length));
  const eff = Math.max(cl, maxf - 1);
  const viol = [];
  let cases = 0;
  const SIG3 = ["0", "1", "#"];
  for (let r = 0; r < RULES.length; r++) {
    const [L, R] = RULES[r];
    const total = 2 * eff + L.length;
    const buf = new Array(total);
    for (let i = 0; i < L.length; i++) buf[eff + i] = L[i]; // pinned
    const freeOK = (len) => {
      for (const f of F) {
        if (f.length <= len) {
          let ok = true;
          for (let k = 0; k < f.length; k++) if (buf[len - f.length + k] !== f[k]) { ok = false; break; }
          if (ok) return false;
        }
      }
      return true;
    };
    const rec = (i) => {
      if (i === total) {
        const oldsFull = joinRange(buf, 0, total);
        // final safety: olds must be F-free (covers patterns inside the
        // pinned L block that suffix-pruning skipped)
        for (const g of F) if (oldsFull.includes(g)) return;
        cases++;
        const u = joinRange(buf, 0, eff);
        const v = joinRange(buf, eff + L.length, total);
        const news = u + R + v;
        const Rlo = eff, Rhi = eff + R.length;
        for (const f of F) {
          if (occursOverlapping(news, f, Rlo, Rhi)) {
            viol.push({ r, u, v, f, news, olds: u + L + v });
            return;
          }
        }
        return;
      }
      if (i >= eff && i < eff + L.length) { rec(i + 1); return; } // pinned
      for (const c of SIG3) {
        buf[i] = c;
        if (freeOK(i + 1)) rec(i + 1);
      }
    };
    rec(0);
  }
  return { closed: viol.length === 0, viol, cases, ctxLen: eff };
}
function joinRange(a, lo, hi) { let s = ""; for (let i = lo; i < hi; i++) s += a[i]; return s; }

export function checkClosure(F, ctxLen) {
  const maxf = Math.max(...F.map(f => f.length));
  const cl = ctxLen; // caller's responsibility: sound certification needs cl >= maxf-1
  const viol = [];
  let cases = 0;
  const ctxs = [];
  const rec = (pref) => {
    if (pref.length === cl) { ctxs.push(pref); return; }
    for (const c of SIG) rec(pref + c);
  };
  rec("");
  for (let r = 0; r < RULES.length; r++) {
    const [L, R] = RULES[r];
    for (const u of ctxs) for (const v of ctxs) {
      cases++;
      const news = u + R + v;
      const olds = u + L + v;
      const Rlo = cl, Rhi = cl + R.length;
      for (const f of F) {
        if (occursOverlapping(news, f, Rlo, Rhi)) {
          let covered = false;
          for (const g of F) if (occurs(olds, g)) { covered = true; break; }
          if (!covered) viol.push({ r, u, v, f, news, olds });
          break; // one witness per (rule,ctx) enough
        }
      }
    }
  }
  return { closed: viol.length === 0, viol, cases, ctxLen: cl };
}

export function w0Avoids(F) {
  return F.filter(f => W0.includes(f));
}

// Oracle-guided refinement. corpusBlob: single joined string for fast tests.
// Presence/absence results are memoized across rounds (same candidates recur).
// capCtx caps the context length used during refinement rounds (heuristic);
// the FINAL certification must be run with full contexts (cap >= maxf-1).
export function refine(F0, corpusBlob, maxRounds = 400, verbose = true, capCtx = 3) {
  let F = [...new Set(F0)];
  const present = new Set(), absentMemo = new Set();
  for (let round = 0; round < maxRounds; round++) {
    const { closed, viol } = checkClosureFast(F, capCtx);
    if (closed) return { F, closed: true, rounds: round };
    const v = viol[0];
    const olds = v.olds;
    const cands = [];
    for (let i = 0; i < olds.length; i++)
      for (let len = 1; len + i <= olds.length && len <= 24; len++) {
        const g = olds.slice(i, i + len);
        if (W0.includes(g)) continue;
        cands.push(g);
      }
    cands.sort((a, b) => a.length - b.length);
    let added = null;
    for (const g of cands) {
      if (F.includes(g)) continue;
      if (absentMemo.has(g)) { added = g; break; }
      if (present.has(g)) continue;
      if (corpusBlob.indexOf(g) !== -1) { present.add(g); continue; }
      absentMemo.add(g);
      added = g;
      break;
    }
    if (!added) {
      if (verbose) console.log("STUCK round", round, ": phantom context, violation:", JSON.stringify(v), "olds=", JSON.stringify(v.olds));
      return { F, closed: false, rounds: round, stuck: v };
    }
    F.push(added);
    if (verbose && (round < 40 || round % 10 === 0)) console.log("round", round, "|F|", F.length, "added", JSON.stringify(added), "for viol", JSON.stringify(v.f), RULENAME[v.r]);
  }
  return { F, closed: false, rounds: maxRounds, timeout: true };
}

// Corpus loading: file of state strings (one per line). Returns {lines, blob}
// where blob is a single '\n'-joined string for fast native presence tests
// (patterns are over {0,1,#} so '\n' cannot create cross-line matches).
export function loadCorpus(path) {
  const txt = fs.readFileSync(path, "utf8");
  return txt.split("\n").filter(x => x.length > 0);
}
export function makeBlob(lines) { return "\n" + lines.join("\n") + "\n"; }

if (process.argv[1] && process.argv[1].endsWith("verify11.mjs")) {
  dichotomy();
  const F0 = ["111", "1#01"];
  const r = checkClosure(F0, 3);
  console.log("seed F={111,1#01}: closed =", r.closed, "cases =", r.cases, "violations =", r.viol.length);
  for (const v of r.viol.slice(0, 8)) {
    console.log("  viol:", RULENAME[v.r], "u=", v.u, "v=", v.v, "creates", JSON.stringify(v.f), "olds=", JSON.stringify(v.olds), "news=", JSON.stringify(v.news));
  }
}
