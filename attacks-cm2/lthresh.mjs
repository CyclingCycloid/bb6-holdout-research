// lthresh.mjs — the poison (M,R) pairs are L-dependent (edge effect). Grid each poison
// (M,R) over L=3..40, run 6 eras, find the lethality threshold L*(M,R).
import { build, runEra, parseRle } from '../reverify-cm2/ref-lib.mjs';
const pairs = [[3,1],[2,2],[1,2],[4,3],[1,1],[2,1],[5,1],[6,1],[8,2],[12,1]];
for (const [M,R] of pairs) {
  const out = [];
  for (let L = 3; L <= 40; L += 3) {
    const t = build([{v:1,len:L},{v:0,len:1},{v:1,len:M},{v:0,len:5},{v:1,len:R}], L+1+M+1);
    let verdict = 'ok';
    for (let e = 0; e < 6; e++) {
      const r = runEra(t);
      if (r.halt) { verdict = 'HALT@' + (e+1); break; }
      if (r.nonterm) { verdict = r.nonterm; break; }
      // poison-tail check
      const rs = parseRle(t.rle().s);
      let bad = false;
      for (let i = 0; i + 1 < rs.length; i++) if (rs[i].v === 0 && rs[i].len === 1 && rs[i+1].v === 1 && rs[i+1].len === 1) { bad = true; break; }
      if (bad) { verdict = '(g1,1)@' + (e+1); break; }
    }
    out.push(`L${L}:${verdict}`);
  }
  console.log(`(M${M},R${R})`.padEnd(10), out.join(' '));
}
