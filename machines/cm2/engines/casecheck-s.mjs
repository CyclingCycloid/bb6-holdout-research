// casecheck-s.mjs — W1 Lemma S (sprint). One line: node casecheck-s.mjs
// Lemma: A@h with [h..h+k-1]=1 (k>=1) => word (A1)^k (each step: read 1, write 1, move R,
// stay A). Net: tape unchanged, head h+k. The word reads only the k block cells, so the
// neighbourhood ([h-1], [h+k]) is free — the case space enumerates it exhaustively.
import { build, R, runList, sameConfig, cfgStr, check, summary, runWord, sWord } from './checklib.mjs';
for (const k of [1, 2, 3, 7]) for (const pre of [0, 1]) for (const post of [0, 1]) {
  const H = 18; // block [18..17+k]; pre at [17]; post at [18+k]
  const rs = [R(8, 0), R(5), R(4, 0), R(1, pre), R(k), R(1, post), R(5, 0), R(2)];
  const t0 = build(rs, H);
  const before = runList(t0);
  const tag = `S(k${k},pre${pre},post${post})`;
  const ok1 = runWord(t0, sWord(k), tag);
  const after = runList(t0);
  const expect = { lo: before.lo, head: H + k, pop: before.pop, runs: before.runs };
  const ok2 = check(tag + '-net', sameConfig(after, expect), `got ${cfgStr(after)} want ${cfgStr(expect)}`);
}
summary('casecheck-s');
