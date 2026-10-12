// casecheck-lap.mjs — W1 Lemma Lap. One line: node casecheck-lap.mjs
// Lemma: A@h with [h]=[h+1]=[h-1]=0, [h-2]=1 => word A0 B0 C1 D0 E1, 5 steps:
//   A0: read 0@h    write 1, R -> B ;  B0: read 0@h+1  write 1, L -> C
//   C1: read 1@h    write 0, L -> D ;  D0: read 0@h-1  write 0, L -> E
//   E1: read 1@h-2  write 0, R -> A.
// Net: [h-2]:=0 (left block right edge eroded), [h+1]:=1 (deposit), [h] restored 0,
// head h-1. The word reads only {h-2..h+1}; free data = left-block length l>=1 and the
// cell right of the future deposit ([h+2]: deposit already present or not) — enumerated.
import { build, R, runList, sameConfig, cfgStr, check, summary, runWord, lapWord } from './checklib.mjs';
for (const l of [1, 2, 3, 7]) for (const dep of [0, 1]) {
  const H = 20; // precond cells [19],[20],[21]=0; l-block ends at [18]; [h+2]=22
  const rs = [R(6, 0), R(5), R(8 - l, 0), R(l), R(3, 0), R(1, dep), R(5, 0), R(2)];
  // 0^6 [0..5], 1^5 [6..10], 0^(8-l) [11..18-l], block [19-l..18], 0^3 [19..21], dep [22], 0^5, 1^2
  const t0 = build(rs, H);
  const tag = `Lap(l${l},dep${dep})`;
  const ok1 = runWord(t0, lapWord, tag);
  const te = build(rs, H); // expected: net effect on a fresh copy
  te.write(18, 0); te.write(21, 1); te.head = 19;
  const ok2 = check(tag + '-net', sameConfig(runList(t0), runList(te)),
    `got ${cfgStr(runList(t0))} want ${cfgStr(runList(te))}`);
}
summary('casecheck-lap');
