// closure11.mjs — FAST closure checker + refinement for forbidden-substring
// invariants of the BMO 11 game, replacing verify11.mjs's O(3^(2cl)) pair
// enumeration with a factorized algorithm:
//
//   A rewrite u L v -> u R v creates a "new" occurrence of f (overlapping the
//   R part) only for finitely many alignments (f, s) [f starts at abs pos s].
//   Each alignment pins a required suffix of u and/or prefix of v, and pins
//   some chars of R. A violation needs u.L.v to avoid ALL of F. Hence u and v
//   must each be F-free, and no g in F may span the u|L|v seams.
//
//   So: enumerate F-free contexts of length cl (their count collapses as F
//   grows), and for each alignment filter by the pinned chars, then test the
//   seam. Completeness: identical quantifier structure to the naive loop.
//
// Closure theorem (same as verify11.mjs): if w0 avoids F and no rule can
// create a fresh F-occurrence from an F-free u.L.v, then F never occurs in
// any reachable word. Sound & complete for substring invariants at ctx len
// cl = maxf-1.
import { RULES, RULENAME, CYC } from "./game11.mjs";
import fs from "fs";

const SIG = ["0", "1", "#"];
const W0 = CYC.repeat(60) + "0".repeat(60); // materialized initial word (left part 10#-periodic)

export function gfreeStrings(len, F) {
  // all strings of length len over SIG avoiding every pattern in F
  // (a pattern longer than len never matches)
  const out = [];
  const rec = (pref) => {
    if (pref.length === len) { out.push(pref); return; }
    for (const c of SIG) {
      const s = pref + c;
      let ok = true;
      for (const f of F) if (f.length <= s.length && s.endsWith(f)) { ok = false; break; }
      // endsWith is enough: any occurrence inside pref was already excluded inductively
      if (ok) rec(s);
    }
  };
  rec("");
  return out;
}

export function checkClosureFast(F, cl) {
  const maxf = Math.max(...F.map(f => f.length));
  const C = Math.max(cl, maxf - 1);
  const U = gfreeStrings(C, F);
  const viol = [];
  for (let r = 0; r < RULES.length; r++) {
    const [L, R] = RULES[r];
    for (const f of F) {
      // f starts at absolute position s in u.R.v, overlapping [C, C+R.length)
      for (let s = C - f.length + 1; s <= C + R.length - 1; s++) {
        if (s < 0) continue;
        // pinned chars: f[s..s+len) ∩ [0,C) -> u suffix; ∩ [C,C+|R|) -> R; beyond -> v prefix
        let usfx = "", vprf = "", ok = true;
        for (let k = 0; k < f.length; k++) {
          const pos = s + k;
          if (pos < C) usfx += f[k];
          else if (pos < C + R.length) { if (R[pos - C] !== f[k]) { ok = false; break; } }
          else vprf += f[k];
        }
        if (!ok) continue;
        for (const u of U) {
          if (!u.endsWith(usfx)) continue;
          for (const v of U) {
            if (!v.startsWith(vprf)) continue;
            const olds = u + L + v;
            let covered = false;
            for (const g of F) if (olds.includes(g)) { covered = true; break; }
            if (!covered) {
              viol.push({ r, u, v, f, news: u + R + v, olds });
              if (viol.length > 400) return { closed: false, viol, cases: -1, ctxLen: C };
            }
          }
        }
      }
    }
  }
  return { closed: viol.length === 0, viol, cases: -1, ctxLen: C };
}

export function loadCorpus(path) {
  return fs.readFileSync(path, "utf8").split("\n").filter(x => x.length > 0);
}
export function makeBlob(lines) { return "\n" + lines.join("\n") + "\n"; }

// Refinement: same protocol as verify11.mjs — on a violation, add the SHORTEST
// substring of olds that is (a) absent from w0 and (b) absent from the corpus
// (reachability oracle). If none exists -> phantom context (stuck).
export function refineFast(F0, blob, maxRounds = 600, verbose = true, maxPatLen = 14) {
  let F = [...new Set(F0)];
  for (let round = 0; round < maxRounds; round++) {
    const { closed, viol } = checkClosureFast(F, 3);
    if (closed) return { F, closed: true, rounds: round };
    // pick the violation with the SHORTEST olds (most likely to fix cheaply)
    viol.sort((a, b) => a.olds.length - b.olds.length);
    const v = viol[0];
    const olds = v.olds;
    const cands = [];
    for (let i = 0; i < olds.length; i++)
      for (let len = 1; len + i <= olds.length && len <= maxPatLen; len++) {
        const g = olds.slice(i, i + len);
        if (W0.includes(g)) continue;
        cands.push(g);
      }
    cands.sort((a, b) => a.length - b.length);
    let added = null;
    for (const g of cands) {
      if (F.includes(g)) continue;
      if (blob.indexOf(g) === -1) { added = g; break; }
    }
    if (!added) {
      if (verbose) console.log("STUCK round", round, ": phantom context; violation:", JSON.stringify({ rule: RULENAME[v.r], u: v.u, v: v.v, creates: v.f, olds: v.olds, news: v.news }));
      return { F, closed: false, rounds: round, stuck: v };
    }
    F.push(added);
    if (verbose && (round < 40 || round % 10 === 0)) console.log("round", round, "|F|", F.length, "added", JSON.stringify(added), "for viol", JSON.stringify(v.f), RULENAME[v.r], "olds=", JSON.stringify(v.olds));
  }
  return { F, closed: false, rounds: maxRounds, timeout: true };
}

// w0 avoidance (exact)
export function w0Avoids(F) { return F.filter(f => W0.includes(f)); }

// ---------------- CLI ----------------
if (process.argv[1] && process.argv[1].endsWith("closure11.mjs")) {
  const mode = process.argv[2] || "refine";
  if (mode === "closure") {
    // node closure11.mjs closure "#10111" "0010111" ...
    const F = process.argv.slice(3);
    const t0 = Date.now();
    const r = checkClosureFast(F, 3);
    console.log("F =", JSON.stringify(F), "-> closed =", r.closed, "violations =", r.viol.length, `${((Date.now() - t0) / 1000).toFixed(1)}s`);
    for (const v of r.viol.slice(0, 10)) console.log("  viol:", RULENAME[v.r], "u=", v.u, "v=", v.v, "creates", JSON.stringify(v.f), "olds=", JSON.stringify(v.olds), "-> news=", JSON.stringify(v.news));
  } else if (mode === "refine") {
    // node closure11.mjs refine <corpus files...> -- <seed patterns...>
    const args = process.argv.slice(3);
    const dash = args.indexOf("--");
    const corpusFiles = args.slice(0, dash === -1 ? args.length : dash);
    const seed = dash === -1 ? ["#10111"] : args.slice(dash + 1);
    let corpus = [];
    for (const f of corpusFiles) corpus = corpus.concat(loadCorpus(f));
    console.log("corpus:", corpus.length, "states; seed F0 =", JSON.stringify(seed));
    const blob = makeBlob(corpus);
    const t0 = Date.now();
    const res = refineFast(seed, blob, 600);
    console.log(`refine: closed=${res.closed} rounds=${res.rounds} |F|=${res.F.length} ${(Date.now() - t0) / 1000 | 0}s`);
    if (res.stuck) console.log("STUCK ON:", JSON.stringify(res.stuck));
    if (res.closed) {
      const cert = checkClosureFast(res.F, 3);
      console.log("re-certification: closed =", cert.closed);
      console.log("patterns occurring in w0 (must be empty):", JSON.stringify(w0Avoids(res.F)));
      const Fs = [...res.F].sort((a, b) => a.length - b.length);
      for (let i = 0; i < Fs.length; i += 12) console.log("  " + Fs.slice(i, i + 12).map(x => JSON.stringify(x)).join(" "));
      console.log("Fmax len =", Math.max(...res.F.map(f => f.length)));
      fs.writeFileSync("closed-F.json", JSON.stringify(res.F, null, 1));
      console.log("wrote closed-F.json");
    }
  }
}
