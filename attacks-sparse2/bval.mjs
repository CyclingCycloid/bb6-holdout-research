// bval.mjs — validate bstep (BigInt engine) vs phase1 (Number engine) on overlap range.
// Checks both full-anchor transitions AND per-step config/cost agreement on Phi(w,m) walks.
import { transitionFast } from './phase1.mjs';
import { stepFast } from './phase1.mjs';
import { stepFastB, transitionFastB } from './bstep.mjs';
let ok = 0, bad = 0; const bads = [];
// 1) full transitions, all odd n 3..999 (all classes, incl. halting off-class)
for (let n = 3; n <= 999; n += 2) {
  const a = transitionFast(n), b = transitionFastB(n);
  const same = (a.halt && b.halt && Number(a.cost) === Number(b.cost)) || (a.degenerate && b.degenerate) || (a.n2 !== undefined && b.n2 !== undefined && a.n2 === Number(b.n2) && Number(a.cost) === Number(b.cost));
  if (same) ok++; else { bad++; bads.push(`n=${n}: ${a.n2??a.halt??a.degenerate} vs ${String(b.n2??b.halt??b.degenerate)} cost ${a.cost} vs ${String(b.cost)}`); }
}
// 2) step-by-step config+cost equality on Phi walks, m=1..40, w=3,9,15,21
outer:
for (let m = 1; m <= 40; m++) for (const w of [3, 9, 15, 21]) {
  const runs = [w - 1, w - 1]; for (let i = 1; i <= m - 1; i++) runs.push(2 ** i * w); runs.push(2 ** m * w - 1);
  let c1 = { t: 'G', r: runs }, c2 = { t: 'G', r: runs.map(BigInt) };
  for (let it = 0; it < 5000; it++) {
    const s1 = stepFast(c1), s2 = stepFastB(c2);
    if (!!s1.halt !== !!s2.halt || !!s1.degenerate !== !!s2.degenerate) { bad++; bads.push(`step mismatch m=${m} w=${w} it=${it}`); break outer; }
    if (s1.halt || s1.degenerate) break;
    if (s1.cost !== Number(s2.cost) && s2.cost < 2n**53n || s1.c.t !== s2.c.t || s1.c.r.length !== s2.c.r.length || s1.c.r.some((v, i) => v !== Number(s2.c.r[i]))) { bad++; bads.push(`cfg/cost mismatch m=${m} w=${w} it=${it}: ${JSON.stringify(s1.c.r.slice(0,4))} vs ${s2.c.r.slice(0,4).map(String)} cost ${s1.cost} vs ${s2.cost}`); break outer; }
    c1 = s1.c; c2 = s2.c;
    if (c1.t === 'R' && c1.r[0] === c1.r[1]) break;
  }
}
console.log(`bval: transitions ok=${ok} bad=${bad}; stepwise bads=${bads.length}`);
bads.slice(0, 10).forEach(b => console.log('  ' + b));
