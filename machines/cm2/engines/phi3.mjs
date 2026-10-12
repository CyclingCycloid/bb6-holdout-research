// phi3.mjs — compute Phi3(input-state) = the R of the NEXT tail-less M3-terminal (or 'none'),
// on a covering grid of M2/M1-restart cascade inputs. Inputs: the g5B/g6 states that the
// terminals produce. Direct simulation, 300-era cap.
import { build, runEra, parseRle } from '../reverify-cm2/ref-lib.mjs';
function taillessA(t) { const rl = t.rle(); const rs = parseRle(rl.s);
  if (rs.length !== 5) return null;
  let q = rl.lo, hi = -1, off = 0;
  for (let i = 0; i < rs.length; i++) { if (t.head >= q && t.head < q + rs[i].len) { hi = i; off = t.head - q; break; } q += rs[i].len; }
  if (rs[1].v === 0 && rs[1].len === 1 && rs[3].v === 0 && rs[3].len === 5 && hi === 3 && off === 1)
    return { L: rs[0].len, M: rs[2].len, R: rs[4].len };
  return null; }
function phi3(runs, head, maxEra = 300) {
  const t = build(runs, head);
  for (let e = 0; e < maxEra; e++) {
    const a = taillessA(t);
    if (a && e > 0) {
      if (a.M % 4 === 3) return { R: a.R, M: a.M, eras: e }; // will end at M3-terminal; R only changes when M hits 4 — R at M≡3 stage is the terminal R
      // not an M≡3 marker: continue until M3-class or cap
    }
    const r = runEra(t);
    if (r.halt) return { halt: r.halt, eras: e };
    if (r.nonterm) return { nonterm: r.nonterm, eras: e };
  }
  return { none: true };
}
// WAIT: M%4==3 markers mid-walk all have the SAME R (R only grows when a new sweep starts).
// So detecting the FIRST tail-less A-marker with M%4==3 after the input gives the M3-terminal R
// of that sweep (the sweep ends at M=3 with that same R... unless M%4==3 marker has M>3 and the
// sweep ends at M=3 with R+0). Correct: within a sweep, M decreases 4, R increases 1 each step,
// so the FIRST M≡3 marker determines terminal (M=3, same R as first M≡3 marker? NO: terminal M=3
// has R = R_first + (M_first-3)/4. Fix: run to the actual M==3 marker.)
function phi3b(runs, head, maxEra = 400) {
  const t = build(runs, head);
  for (let e = 0; e < maxEra; e++) {
    const a = taillessA(t);
    if (a && e > 0 && a.M === 3) return { R: a.R, eras: e };
    const r = runEra(t);
    if (r.halt) return { halt: r.halt, eras: e };
    if (r.nonterm) return { nonterm: r.nonterm, eras: e };
  }
  return { none: true };
}
console.log('=== Phi3 from M2-terminal (L,2,R) [i.e. from g5B(L-2,2,R+1)] ===');
const rows = [];
for (const R of [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]) {
  const out = [];
  for (const L of [7,8,9,10,11,12,13,15,19,23]) {
    const res = phi3b([{v:1,len:L},{v:0,len:1},{v:1,len:2},{v:0,len:5},{v:1,len:R}], L+4);
    out.push(`L${L}:${res.R !== undefined ? 'R'+res.R : (res.halt || res.nonterm || 'none')}`);
  }
  rows.push(`R=${String(R).padStart(2)} ` + out.join(' '));
}
console.log(rows.join('\n'));
console.log('=== Phi3 from M1-terminal (L,1,R) [i.e. from g6o1(L,R+1)] ===');
const rows2 = [];
for (const R of [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]) {
  const out = [];
  for (const L of [6,9,12,15,18,21,24,27]) {
    const res = phi3b([{v:1,len:L},{v:0,len:1},{v:1,len:1},{v:0,len:5},{v:1,len:R}], L+3);
    out.push(`L${L}:${res.R !== undefined ? 'R'+res.R : (res.halt || res.nonterm || 'none')}`);
  }
  rows2.push(`R=${String(R).padStart(2)} ` + out.join(' '));
}
console.log(rows2.join('\n'));
