// p_lib.mjs — deterministic rightmost-# play for BMO 10 with two-sided padding.
//
// Word: ... (10#)^L . core . 0^R ...
// We store: core (string over {0,1,#}), and rely on virtual fills:
//   left fill  = "10#" repeated (ends with '#' at the boundary)
//   right fill = infinite 0s
// A rule firing at a # near the left boundary may consume into the fill; we
// handle that by tracking how many symbols were consumed from the left fill
// (only possible at the boundary #, index -1 relative to core start... actually
// the boundary # is virtual). Simpler: keep an explicit padded string
// LEFTPAD*(10#) + core + RIGHTPAD zeros, and re-pad when padding shrinks.
//
// Boundary-artifact safety (per HANDOFF):
//  - left: always keep at least 8 "10#" units before the disturbed region;
//  - right: always keep at least 24 zeros after the last non-zero... in fact
//    after the last '#' at least 24 zeros; also after the rightmost '#' the
//    tail can only lose <=4 symbols per step, so 24 is safe for windowed reads.

export const PATS = [
  ['0', '1'],          // R1
  ['100', '000#'],     // R2
  ['110', '000#'],     // R3
  ['1010', '1010##'],  // R4
];
export const RNAMES = ['R1', 'R2', 'R3', 'R4'];

const LPAD_UNITS = 8;   // "10#" units kept left of core
const RPAD = 40;        // zeros kept right of core

function matchAt(w, i) {
  for (let p = 0; p < PATS.length; p++) {
    const [lhs] = PATS[p];
    let ok = true;
    for (let j = 0; j < lhs.length; j++) {
      if (w[i + 1 + j] !== lhs[j]) { ok = false; break; }
    }
    if (ok) return p;
  }
  return -1;
}

// State = { w: string (padded), base: index in w of core start }
// We define core = w without leading "10#" units and without trailing 0-run,
// but simpler to just track w and a marker; canonical display: strip.
export class Det {
  constructor() {
    this.w = '10#'.repeat(LPAD_UNITS) + '0'.repeat(RPAD);
    this.repad();
    this.steps = 0;
  }
  repad() {
    // canonicalize: strip ALL leading "10#" units (they rejoin the periodic
    // fill) and ALL trailing zeros (they rejoin the 0-fill), then re-pad.
    let w = this.w;
    while (w.startsWith('10#')) w = w.slice(3);
    w = w.replace(/0+$/, '');
    this.w = '10#'.repeat(LPAD_UNITS) + w + '0'.repeat(RPAD);
  }
  // rightmost # index
  rightmostHash() {
    return this.w.lastIndexOf('#');
  }
  // rule at rightmost #, or -1 if inactive
  ruleAtRightmost() {
    const i = this.rightmostHash();
    if (i < 0) return -1;
    return matchAt(this.w, i);
  }
  // one deterministic step; returns rule index or -1 (inactive/none)
  step() {
    const i = this.rightmostHash();
    if (i < 0) return -1;
    const p = matchAt(this.w, i);
    if (p < 0) return -1;
    const [lhs, rhs] = PATS[p];
    this.w = this.w.slice(0, i) + rhs + this.w.slice(i + 1 + lhs.length);
    this.repad();
    this.steps++;
    return p;
  }
  // tail after rightmost #, length k (padded with 0s)
  tail(k = 12) {
    const i = this.rightmostHash();
    if (i < 0) return null;
    let t = this.w.slice(i + 1);
    if (t.length < k) t = t + '0'.repeat(k - t.length);
    return t.slice(0, k);
  }
  // display: core without periodic prefix and trailing zeros
  core() {
    let w = this.w;
    while (w.startsWith('10#')) w = w.slice(3);
    return w.replace(/0+$/, '');
  }
}

// build a Det from an explicit core string (for verification harnesses):
// word = ...10#10# . core . 000...
export function detFromCore(core) {
  const d = new Det();
  d.w = '10#'.repeat(LPAD_UNITS) + core + '0'.repeat(RPAD);
  d.repad();
  d.steps = 0;
  return d;
}
