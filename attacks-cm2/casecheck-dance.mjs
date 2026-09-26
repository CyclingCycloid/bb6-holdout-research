// casecheck-dance.mjs — W1 Lemma Dance (clean). One line: node casecheck-dance.mjs
// Lemma: A@h with [h]=[h+1]=0, [h-1]=1; let y = the first 1 scanning left from h-2
// (exists), s = h-y >= 2, and [y-1]=[y-2]=1. Then the machine executes
//   A0 B0 C1 D1 F0^s F1 B1 C1 D0 E1                    (s+9 steps)
//   A0: read 0@h    write 1, R -> B ;  B0: read 0@h+1  write 1, L -> C  (deposit [h+1])
//   C1: read 1@h    write 0, L -> D ;  D1: read 1@h-1  write 0, R -> F  (island eaten)
//   F0 x s: read 0, write 0, L (over [h]..[y+1]) ;  F1: read 1@y, write 1, L -> B
//   B1: read 1@y-1  write 0, R -> C ;  C1: read 1@y    write 0, L -> D
//   D0: read 0@y-1  write 0, L -> E ;  E1: read 1@y-2  write 0, R -> A.
// Net: eaten = {h-1} (prefix D1) + [y-2..y] (C1,B1,E1); deposit [h+1]:=1; head y-1.
// Free data: s in {2,3,5} (s=2: h-1 is the right edge of the landing block; s>=3: [h-1]
// is a lone island), landing-block length lam>=3, [h+2] — enumerated exhaustively.
import { build, R, runList, sameConfig, cfgStr, check, summary, runWord, dancePrefix, danceTail } from './checklib.mjs';
const word = s => [...dancePrefix(s), ...danceTail];
for (const s of [2, 3, 5]) for (const lam of [3, 4, 7]) for (const right of [0, 1]) {
  const H = 30; const y = H - s;
  // layout: 1^5 [6..10], 0^big [11..y-lam], lam-block [y-lam+1..y], zeros [y+1..H-2] (s-2),
  // island [H-1], zeros [H], deposit-target [H+1], right [H+2], 0^5, 1^2
  const gapL = y - lam - 10; // [11..y-lam]
  if (gapL < 1) throw new Error('layout');
  const rs = [R(6, 0), R(5), R(gapL, 0), R(lam), R(s - 2, 0), R(1), R(2, 0), R(1, right), R(5, 0), R(2)];
  const t0 = build(rs, H);
  const tag = `Dance(s${s},lam${lam},right${right})`;
  const ok1 = runWord(t0, word(s), tag);
  const te = build(rs, H);
  te.write(H - 1, 0);                      // prefix D1 eats [h-1]
  te.write(y, 0); te.write(y - 1, 0); te.write(y - 2, 0); // C1, B1, E1
  te.write(H + 1, 1);                      // deposit
  te.head = y - 1;
  const ok2 = check(tag + '-net', sameConfig(runList(t0), runList(te)),
    `got ${cfgStr(runList(t0))} want ${cfgStr(runList(te))}`);
}
summary('casecheck-dance');
