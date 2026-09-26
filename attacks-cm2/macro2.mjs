// macro2.mjs — routine-level macro engine for cm2 (state A to state A), exact step counts.
// Routines derived from the transition semantics (see attack-cm2.md); validated vs runsim.
import { RunTape, TR } from './runsim.mjs';

// Runs representation: same as RunTape but we reuse it and drive routines.
export class MacroTape {
  constructor() { this.t = new RunTape(); this.routines = []; }
  get head() { return this.t.head; }
  get step() { return this.t.step; }
  get st() { return this.t.st; }
  rd(p) { return this.t.read(p); }
  // one macro step: from state A evolve to next state A (or halt). Returns descriptor.
  macroStep() {
    const t = this.t;
    if (t.st !== 0) throw new Error('macroStep called outside state A');
    const h = t.head;
    const v0 = t.read(h);
    if (v0 === 1) { // sprint
      t.step1(); // A1
      return { kind: 'S', h0: h, h1: t.head, steps: 1 };
    }
    // v0 = 0: A0 writes 1
    const v1 = t.read(h + 1);
    if (v1 === 1) {
      // B1 branch: erase h+1, C at h+2
      if (t.read(h + 2) === 0) {
        // A0, B1, then C reads 0 -> HALT
        t.step1(); t.step1(); // A0, B1
        return { kind: 'HALT-H1', h0: h, steps: 2 };
      }
      // A0 B1 C1 D0 E1 : net eats h(h+1)(h+2)->0? verify: A0 w1@h; B1 w0@h+1; C1 w0@h+2; D0 pass@h+1(0); E1: read@h=1 -> w0, A@h+1
      t.step1(); t.step1(); t.step1(); t.step1(); t.step1();
      return { kind: 'L1', h0: h, h1: t.head, steps: 5 }; // gap=1 lap variant
    }
    // v1 = 0: B0 writes 1 at h+1; C1 erases h; D at h-1
    const vm1 = t.read(h - 1);
    if (vm1 === 0) {
      // D0 -> E at h-2
      if (t.read(h - 2) === 1) {
        // Lap: A0 B0 C1 D0 E1
        t.step1(); t.step1(); t.step1(); t.step1(); t.step1();
        return { kind: 'Lap', h0: h, h1: t.head, steps: 5 };
      }
      // Fill: E0 x3 fills h-2,h-1,h ; E1 at h+1 (deposit) ; A at h+2
      t.step1(); t.step1(); t.step1(); // A0 B0 C1
      t.step1(); // D0
      t.step1(); t.step1(); t.step1(); // E0 x3
      t.step1(); // E1
      return { kind: 'Fill', h0: h, h1: t.head, steps: 8 };
    }
    // vm1 = 1: D1 -> F-scan
    t.step1(); t.step1(); t.step1(); t.step1(); // A0 B0 C1 D1
    // F scan: F0 over 0s from h; note h and h-1 are 0 (C1 erased h, D1 erased h-1)
    let y = h;
    while (t.read(y) === 0) { t.step1(); y--; } // F0 steps; exits when read(y)=1 (F1 next)
    // now F at y reading 1: F1 (keep, move L)
    t.step1(); // F1 -> B at y-1
    if (t.read(y - 1) === 0) {
      // B0 variant: write 1 at y-1, C at y-2
      if (t.read(y - 2) === 0) {
        t.step1(); // B0
        return { kind: 'HALT-H2', h0: h, y, steps: 5 + (h - y) + 2 };
      }
      // B0 C1 D1 F1 B0 C1 D0 ... double dance: rare; fall back to literal steps until A
      t.step1(); // B0 (already counted above? no) -- careful
      return this.literalToA('DBL');
    }
    // B1: erase y-1, C at y
    t.step1(); t.step1(); t.step1(); // B1 C1 D0  (C1@y, D0@y-1)
    // E at y-2
    if (t.read(y - 2) === 1) {
      t.step1(); // E1
      return { kind: 'Dance', h0: h, y, h1: t.head, steps: 4 + (h - y) + 1 + 3 + 1 };
    }
    // E-fill: E0 fills y-2.. up to deposit h+1, E1 there
    let p = y - 2;
    while (t.read(p) === 0) { t.step1(); p++; } // E0 steps
    t.step1(); // E1 at p (= h+1)
    return { kind: 'DanceFill', h0: h, y, h1: t.head, steps: 0 };
  }
  literalToA(tag) { // run literal steps until state A (for unhandled rare branches)
    const t = this.t; let n = 0;
    while (t.st !== 0) { const r = t.step1(); if (r.halt) return { kind: 'HALT?' }; n++; }
    return { kind: tag, steps: n };
  }
}
