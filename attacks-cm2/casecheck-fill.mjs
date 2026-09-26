// casecheck-fill.mjs — W1 Lemma Fill. One line: node casecheck-fill.mjs
// Lemma: A@h with [h]=[h+1]=[h-1]=[h-2]=0 => word A0 B0 C1 D0 E0 E0 E0 E1, 8 steps:
//   A0: read 0@h    write 1, R -> B ;  B0: read 0@h+1  write 1, L -> C
//   C1: read 1@h    write 0, L -> D ;  D0: read 0@h-1  write 0, L -> E
//   E0: read 0@h-2  write 1, R -> E ;  E0: read 0@h-1  write 1, R -> E
//   E0: read 0@h    write 1, R -> E ;  E1: read 1@h+1  write 0, R -> A.
// Net: [h-2]:=[h-1]:=[h]:=1 (three cells filled; merged into the left block iff [h-3]=1),
// [h+1] restored 0 (the B0 deposit is erased), head h+2.
// Free data: [h-3] (left block present or not) and [h+2] — enumerated exhaustively.
import { build, R, runList, sameConfig, cfgStr, check, summary, runWord, fillWord } from './checklib.mjs';
for (const left of [0, 1]) for (const right of [0, 1]) {
  const H = 20; // precond cells [18..21]=0; [h-3]=17 = left; [h+2]=22 = right
  const rs = [R(8, 0), R(5), R(4, 0), R(1, left), R(4, 0), R(1, right), R(5, 0), R(2)];
  // 0^8, 1^5 [8..12], 0^4 [13..16], left [17], 0^4 [18..21], right [22], 0^5, 1^2
  const t0 = build(rs, H);
  const tag = `Fill(left${left},right${right})`;
  const ok1 = runWord(t0, fillWord, tag);
  const te = build(rs, H);
  te.write(18, 1); te.write(19, 1); te.write(20, 1); te.head = 22;
  const ok2 = check(tag + '-net', sameConfig(runList(t0), runList(te)),
    `got ${cfgStr(runList(t0))} want ${cfgStr(runList(te))}`);
}
summary('casecheck-fill');
