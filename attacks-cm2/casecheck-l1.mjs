// casecheck-l1.mjs — W1 Lemma L1 (narrow-gap dance). One line: node casecheck-l1.mjs
// Lemma: A@h with [h]=0, [h+1]=[h+2]=1 => word A0 B1 C1 D0 E1, 5 steps:
//   A0: read 0@h    write 1, R -> B ;  B1: read 1@h+1  write 0, R -> C
//   C1: read 1@h+2  write 0, L -> D ;  D0: read 0@h+1  write 0, L -> E
//   E1: read 1@h    write 0, R -> A.
// Net: [h+1]:=[h+2]:=0 (the (1,1) island eaten; pop -2), [h] restored 0, head h+1.
// (If [h+2]=0 the C-step reads 0 and the machine HALTS — that is the H1 path, Lemma H,
// not part of this routine.) Free data: island length lam>=2 beyond h+2, and [h-1].
import { build, R, runList, sameConfig, cfgStr, check, summary, runWord, l1Word } from './checklib.mjs';
for (const lam of [2, 3, 7]) for (const left of [0, 1]) {
  const H = 20; // [h+1]=[h+2]=1; island may continue to [20+lam-1]; [h-1]=19 = left
  const rs = [R(8, 0), R(5), R(4, 0), R(1, left), R(3, 0), R(lam), R(5, 0), R(2)];
  // 0^8, 1^5 [8..12], 0^4 [13..16], left [17], 0^3 [18,19,20], island [21..20+lam], 0^5, 1^2
  const t0 = build(rs, H);
  const tag = `L1(lam${lam},left${left})`;
  const ok1 = runWord(t0, l1Word, tag);
  const te = build(rs, H);
  te.write(20, 0); te.write(21, 0); te.write(22, 0); te.head = 21; // [h]:=0,[h+1]:=0,[h+2]:=0
  const ok2 = check(tag + '-net', sameConfig(runList(t0), runList(te)),
    `got ${cfgStr(runList(t0))} want ${cfgStr(runList(te))}`);
}
summary('casecheck-l1');
