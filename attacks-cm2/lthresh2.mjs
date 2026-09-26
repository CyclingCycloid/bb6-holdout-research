// lthresh2.mjs — corrected poison detector: a 1-ISLAND (block of length 1 with 0-runs on
// both sides, or at the right tape end). H1 fires when a sprint lands adjacent to one.
import { build, runEra, parseRle } from '../reverify-cm2/ref-lib.mjs';
function islands(rs) {
  const out = [];
  for (let i = 0; i < rs.length; i++) {
    if (rs[i].v === 1 && rs[i].len === 1) {
      const leftGap = i > 0 && rs[i-1].v === 0;
      const rightGap = (i + 1 < rs.length && rs[i+1].v === 0) || i === rs.length - 1; // right blank counts
      if (leftGap && rightGap) out.push(i);
    }
  }
  return out;
}
const pairs = [[3,1],[2,2],[1,2],[4,3],[1,1],[2,1],[5,1],[6,1],[8,2],[12,1],[7,1],[3,7],[3,9],[3,10],[3,16]];
for (const [M,R] of pairs) {
  const out = [];
  for (let L = 3; L <= 40; L += 3) {
    const t = build([{v:1,len:L},{v:0,len:1},{v:1,len:M},{v:0,len:5},{v:1,len:R}], L+1+M+1);
    let verdict = 'ok';
    for (let e = 0; e < 8; e++) {
      const r = runEra(t);
      if (r.halt) { verdict = 'HALT@' + (e+1); break; }
      if (r.nonterm) { verdict = r.nonterm; break; }
      const rs = parseRle(t.rle().s);
      const isl = islands(rs);
      if (isl.length) { verdict = `ISLAND@${e+1}(r${isl[0]})`; break; }
    }
    out.push(`L${L}:${verdict}`);
  }
  console.log(`(M${M},R${R})`.padEnd(10), out.join(' '));
}
