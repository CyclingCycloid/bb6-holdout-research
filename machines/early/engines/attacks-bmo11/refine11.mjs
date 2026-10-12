// refine11.mjs — oracle-guided refinement of the forbidden-pattern set F,
// seeded with the goal blocker "#10111".
// Final certification (if the loop closes) is exact: checkClosure() is pure
// rule mechanics and W0-avoidance is exact.
import { dichotomy, checkClosure, checkClosureFast, refine, loadCorpus, makeBlob, w0Avoids } from "./verify11.mjs";
import { RULENAME } from "./game11.mjs";

dichotomy();
const corpusFiles = process.argv.slice(2);
let corpus = [];
for (const f of corpusFiles) corpus = corpus.concat(loadCorpus(f));
console.log("corpus:", corpus.length, "states from", corpusFiles.join(","));
const blob = makeBlob(corpus);

const F0 = ["#10111", "1#01"];
const t0 = Date.now();
const res = refine(F0, blob, 400, true);
console.log(`refine: closed=${res.closed} rounds=${res.rounds} |F|=${res.F.length} ${(Date.now() - t0) / 1000 | 0}s`);
if (res.stuck) console.log("STUCK ON:", JSON.stringify(res.stuck));
if (res.closed) {
  // FINAL certification at full context length (>= maxf-1) — sound check.
  const maxf = Math.max(...res.F.map(f => f.length));
  const cert = checkClosureFast(res.F, maxf - 1);
  console.log("certification at full ctx", maxf - 1, ": closed =", cert.closed, "cases =", cert.cases);
  const inW0 = w0Avoids(res.F);
  console.log("patterns occurring in w0 (must be empty):", JSON.stringify(inW0));
  console.log("F sorted by length:");
  const Fs = [...res.F].sort((a, b) => a.length - b.length);
  for (let i = 0; i < Fs.length; i += 10) console.log("  " + Fs.slice(i, i + 10).map(x => JSON.stringify(x)).join(" "));
  console.log("Fmax len =", Math.max(...res.F.map(f => f.length)));
}