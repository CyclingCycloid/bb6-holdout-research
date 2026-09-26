// casecheck-dancefill.mjs — W1 Lemma DanceFill. One line: node casecheck-dancefill.mjs
// Lemma: as Dance, but the landing block has length exactly 2 ([y-1]=[y]=1, [y-2]=0).
// Then the machine executes
//   A0 B0 C1 D1 F0^s F1 B1 C1 D0 E0^(s+3) E1            (2s+12 steps)
//   ... F1: read 1@y, write 1, L -> B ;  B1: read 1@y-1 write 0, R -> C
//   C1: read 1@y    write 0, L -> D ;  D0: read 0@y-1  write 0, L -> E
//   E0 x (s+3): read 0@[y-2..h], write 1, R (refill up to h) ;  E1: read 1@[h+1] (deposit),
//   write 0, R -> A.
// Net: [y-2..h]:=1 (the landing pair, the eaten island and all zeros refilled; pop +1
// net: +（s+3) written, -3 eaten by B1/C1/D1), [h+1]:=0, head h+2.
// Free data: s in {2,3}, [y-3] (a block left of the pair or not), [h+2] — enumerated.
import { build, R, runList, sameConfig, cfgStr, check, summary, runWord, dancePrefix, danceFillTail } from './checklib.mjs';
const word = s => [...dancePrefix(s), ...danceFillTail(s + 3)];
for (const s of [2, 3]) for (const left of [0, 1]) for (const right of [0, 1]) {
  const H = 30; const y = H - s;
  const gapL = y - 14; // [11..y-4] zeros, [y-3] = left cell
  if (gapL < 1) throw new Error('layout');
  const rs = [R(6, 0), R(5), R(gapL, 0), R(1, left), R(1, 0), R(2), R(s - 2, 0), R(1), R(2, 0), R(1, right), R(5, 0), R(2)];
  // ... 0^gapL, [y-3]=left, [y-2]=0, pair [y-1,y], zeros [y+1..H-2], island [H-1], [H]=0,
  // deposit-target [H+1], right [H+2], 0^5, 1^2
  const t0 = build(rs, H);
  const tag = `DanceFill(s${s},left${left},right${right})`;
  const ok1 = runWord(t0, word(s), tag);
  const te = build(rs, H);
  for (let p = y - 2; p <= H; p++) te.write(p, 1); // refill [y-2..h]
  te.write(H + 1, 0);                              // deposit erased
  te.head = H + 2;
  const ok2 = check(tag + '-net', sameConfig(runList(t0), runList(te)),
    `got ${cfgStr(runList(t0))} want ${cfgStr(runList(te))}`);
}
summary('casecheck-dancefill');
