// macro3.mjs — FAST engine: closed forms for hot routines (S/Lap/Fill/Dance/DanceFill),
// literal runsim steps for rare branches (L1, DBL-chain, H2). Validated vs macro2 + oracle.
import { RunTape, TR } from './runsim.mjs';

export class FastTape extends RunTape {} // same representation; closed forms edit runs directly

export function macroStepFast(t) {
  if (t.st !== 0) throw new Error('not A');
  const h = t.head;
  const v0 = t.read(h);
  if (v0 === 1) { // sprint
    const [, ahead] = t.runAt(h);
    t.head += ahead; t.step += ahead;
    return { kind: 'S', steps: ahead };
  }
  const v1 = t.read(h + 1);
  if (v1 === 1) return literalRoutine(t, 'L1'); // gap=1 lap (rare)
  const vm1 = t.read(h - 1);
  if (vm1 === 0) {
    if (t.read(h - 2) === 1) { // Lap
      t.write(h - 2, 0); t.write(h + 1, 1);
      t.head = h - 1; t.step += 5;
      return { kind: 'Lap' };
    }
    t.write(h - 2, 1); t.write(h - 1, 1); t.write(h, 1); t.write(h + 1, 0);
    t.head = h + 2; t.step += 8;
    return { kind: 'Fill' };
  }
  // Dance family: A0 B0 C1 D1 then F-scan
  t.write(h, 1); t.write(h + 1, 1); t.write(h, 0); t.write(h - 1, 0);
  t.step += 4;
  let y = h;
  while (t.read(y) === 0) { t.step++; y--; } // F0 steps (h down to first 1)
  t.step++; t.st = 1; // F1 at y (keeps 1); state B
  // dance walk loop
  for (;;) {
    if (t.read(y - 1) === 1) {
      // B1 branch
      t.write(y - 1, 0); t.write(y, 0); t.step += 2; // B1, C1
      t.step++; // D0 at y-1
      if (t.read(y - 2) === 1) { t.write(y - 2, 0); t.step++; t.head = y - 1; t.st = 0; return { kind: 'Dance', y }; }
      // DanceFill: E0 fills y-2..h, E1 at h+1
      for (let p = y - 2; p <= h; p++) t.write(p, 1);
      t.write(h + 1, 0);
      t.step += (h - y + 3) + 1;
      t.head = h + 2; t.st = 0;
      return { kind: 'DanceFill', y };
    }
    // B0 branch (y-1 = 0): rare (DBL-chain or H2) -> literal steps until A (exactness by construction)
    if (t.read(y - 2) === 0) { t.head = y - 1; t.step += 2; return { kind: 'HALT-H2', y }; } // B0 then C reads 0
    t.head = y - 1;
    return literalRoutine(t, 'DBL');
  }
}
function literalRoutine(t, tag) {
  let n = 0;
  for (;;) {
    const v = t.read(t.head); const tr = TR[t.st][v];
    if (tr.nx === 6) { t.step++; return { kind: 'HALT-' + tag }; }
    t.write(t.head, tr.w); t.head += tr.mv; t.st = tr.nx; t.step++; n++;
    if (t.st === 0) return { kind: tag };
  }
}
