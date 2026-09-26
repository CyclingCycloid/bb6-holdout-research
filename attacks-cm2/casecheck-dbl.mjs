// casecheck-dbl.mjs — W1 Lemma DBL (double-dance / B0-branch loop). One line: node casecheck-dbl.mjs
//
// Lemma. Hypothesis: A@h, [h]=[h+1]=0, [h-1]=1; y0 = first 1 at or left of h-2 (exists),
// s = h-y0 >= 2; the landing block is a LONE island ([y0-1]=0) with [y0-2]=1. To the left
// the tape has finite structure 1^b1 0^c1 1^b2 0^c2 ... (b_i>=1, c_i>=1; blank = infinite
// zeros). Then the machine executes rounds i = 0,1,...:
//   round core (from state B at y_i-1, having F1'd at y_i):
//     B0: read 0@y_i-1  write 1, L -> C       (island grows left by 1)
//     C@y_i-2: if 0 -> next step reads 0 => HALT (this is the H2 path; word ends 'H')
//              if 1 -> C1: write 0, L -> D
//     D@y_i-3: if 1 -> D1: write 0, R -> F, then F-scan over [y_i-2..y_{i+1}+1] (all 0,
//                     where y_{i+1} = first 1 <= y_i-4) and F1 -> next round at y_{i+1}
//              if 0 -> D0: write 0, L -> E, tail:
//                     E@y_i-4: if 1 -> E1: write 0, R -> A at y_i-3 (done)
//                              if 0 -> E0 x3 filling [y_i-4..y_i-2], then E1 reads the
//                              round's B0 cell [y_i-1] (=1): write 0, R -> A at y_i (done).
//   B1 tail (at a round landing y_i with [y_i-1]=1): B1 C1 D0 then
//                     E@y_i-2: if 1 -> E1 -> A at y_i-1
//                     if 0 -> E0-fill rightward to the FIRST 1, which is the most recent
//                     B0 cell [y_{i-1}-1] (all cells between are 0): E1 erases it -> A at
//                     y_{i-1}. (For a B1 tail with no prior B0 cell this is the classic
//                     DanceFill: fill runs to the deposit [h+1] — cf. casecheck-dancefill.)
// Eaten per looping round: [y_i-2] (C1) and [y_i-3] (D1); written: [y_i-1] (B0) — the
// landing hops left by >=4 per round ("F-scan 落点左移 2 重启" in the scan START).
// Case space enumerated: (b1,c1,b2,c2,b3) with b in {1,2,3,5}, c in {1,2}, depth 1..3,
// plus the deposited right context; every reached scan must find a 1 (hypothesis).
import { build, R, runList, sameConfig, cfgStr, check, summary, runWord, dancePrefix, d1Eat, d0Pass, dblExpectedWord } from './checklib.mjs';

let nRun = 0, nHalt = 0, nEscape = 0;
const BS = [1, 2, 3, 5], GS = [1, 2];
for (const depth of [1, 2, 3]) {
  const combos = [];
  const rec = (k, acc) => { if (k === 0) { combos.push(acc); return; } for (const b of BS) for (const c of GS) rec(k - 1, [...acc, b, c]); };
  rec(depth, []);
  for (const co of combos) {
    const H = 40;
    // right context: island [H-1]=1, [H]=[H+1]... deposit target [H+1] must be 0 pre-dance;
    // then fixed far structure. left structure from co: blocks/gaps ending before y0-1.
    const s = 3; const y0 = H - s; // island at H-1, zeros [y0+1..H-2]
    const cells = new Map();
    for (let q = 0; q <= 8; q++) cells.set(q, 1); // deep anchor 1^9 (guarantees scans land)
    cells.set(H - 1, 1); // dance-prefix island [h-1]
    cells.set(y0, 1);    // the DBL landing island
    let c = y0 - 2;
    for (let i = 0; i < depth; i++) {
      const b = co[2 * i], g = co[2 * i + 1];
      for (let p = c - b + 1; p <= c; p++) cells.set(p, 1); c -= b;
      for (let p = c - g + 1; p <= c; p++) cells.set(p, 0); c -= g;
    }
    if (c < H - 60) continue; // keep layout inside built window
    // tape runs: deep anchor 1^9 [0..8], 0^2 [9,10], then explicit cells from map,
    // island, right ctx (cells map only covers [11..H+12]; blank elsewhere)
    const runs = [R(9), R(2, 0)]; let p = 11;
    while (p <= H + 12) {
      const v = cells.get(p) ?? 0; let len = 0;
      while (p + len <= H + 12 && (cells.get(p + len) ?? 0) === v) len++;
      runs.push(R(len, v)); p += len;
    }
    runs.push(R(5, 0)); runs.push(R(2));
    const t0 = build(runs, H);
    const tag = `DBL(d${depth}:${co.join(',')})`;
    let res;
    try { res = dblExpectedWord(cells, H, y0, tag); }
    catch (e) { if (String(e).includes('scan-escape')) { nEscape++; continue; } throw e; }
    const ok1 = runWord(t0, res.word, tag);
    if (res.end === 'HALT') nHalt++;
    else {
      const te = build(runs, H); // net effect by independent rule replay on a fresh copy
      let y = y0, prevB0 = null, done = false;
      te.write(H + 1, 1); te.write(H - 1, 0); // dance prefix net: deposit +1, island eaten
      for (let guard = 0; guard < 100 && !done; guard++) {
        if (te.read(y - 1) === 1) { // B1 tail
          te.write(y - 1, 0); te.write(y, 0);
          if (te.read(y - 2) === 1) { te.write(y - 2, 0); te.head = y - 1; }
          else {
            let q = y - 2; while (te.read(q) === 0) { te.write(q, 1); q++; }
            check(tag + '-filltarget', q === prevB0, `fill first-1 at ${q}, prevB0 ${prevB0}`);
            te.write(q, 0); te.head = q + 1;
          }
          done = true;
        } else {
          te.write(y - 1, 1); // B0
          if (te.read(y - 2) === 0) { done = 'H'; break; }
          te.write(y - 2, 0); // C1
          if (te.read(y - 3) === 1) { te.write(y - 3, 0); let yp = y - 4; while (!te.read(yp)) yp--; prevB0 = y - 1; y = yp; }
          else { // D0
            te.write(y - 3, 0);
            if (te.read(y - 4) === 1) { te.write(y - 4, 0); te.head = y - 3; }
            else { te.write(y - 4, 1); te.write(y - 3, 1); te.write(y - 2, 1); te.write(y - 1, 0); te.head = y; }
            done = true;
          }
        }
      }
      if (done === 'H') { check(tag + '-net', false, 'net-replay halted unexpectedly'); continue; }
      nRun++;
      const ok2 = check(tag + '-net', sameConfig(runList(t0), runList(te)),
        `got ${cfgStr(runList(t0))} want ${cfgStr(runList(te))}`);
    }
  }
}
console.log(`(DBL cases: ${nRun} to-A, ${nHalt} H2-halts, ${nEscape} scan-escapes excluded by hypothesis)`);
summary('casecheck-dbl');
