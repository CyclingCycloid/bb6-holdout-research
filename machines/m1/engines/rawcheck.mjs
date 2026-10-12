// rawcheck.mjs — independent raw TM simulation of M1 from the blank tape (no macros).
// M1 = 1RB1LA0RC0RD1LC1LA1RE1RD1LF0LA---0LE ; HALT = E reads 1.
const CODE = '1RB1LA0RC0RD1LC1LA1RE1RD1LF0LA---0LE';
const T = [];
for (let i = 0; i < 12; i++) {
  const t = CODE.slice(3 * i, 3 * i + 3);
  if (t[0] === '-') T[i] = null; // unused F1
  else T[i] = { w: +t[0], d: t[1] === 'L' ? -1 : 1, n: t[2].charCodeAt(0) - 65 };
}
// tape as Map
const tape = new Map();
const rd = (p) => tape.get(p) || 0;
const wr = (p, v) => { if (v) tape.set(p, v); else tape.delete(p); };
let st = 0, head = 0, step = 0;
const snap = () => {
  const ks = [...tape.keys()].sort((a, b) => a - b);
  if (!ks.length) return '(blank)';
  let s = '', p = ks[0] - 1;
  for (const k of ks) { for (; p < k; p++) s += '.'; s += '1'; p = k + 1; }
  return s + ' head@' + head;
};
for (step = 0; step < 1000; step++) {
  // record D-on-0 events with tape = 0^inf 1^3 0 1^3 0^inf, head right of right block
  if (st === 3 && rd(head) === 0) { // state D
    const ks = [...tape.keys()].sort((a, b) => a - b);
    const lo = ks[0], hi = ks[ks.length - 1];
    // pure P(3): runs of 3 and 3 with single 0 gap, head = hi+1
    if (hi - lo === 6 && head === hi + 1 && ks.length === 6 && rd(lo + 3) === 0 && ks.every(k => k === lo || k === lo + 1 || k === lo + 2 || k === lo + 4 || k === lo + 5 || k === hi)) {
      console.log(`P(3) anchor CONFIRMED at raw step ${step}: tape ${snap()}`);
    }
  }
  const c = rd(head);
  const tr = T[st * 2 + c];
  if (!tr) { console.log(`HALT at step ${step} (state ${String.fromCharCode(65+st)} reads ${c})`); break; }
  wr(head, tr.w); head += tr.d; st = tr.n;
}
console.log('final step count:', step);
