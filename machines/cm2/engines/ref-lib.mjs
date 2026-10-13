// ref-lib.mjs — referee verification helpers (read-only w.r.t. existing artifacts).
// Copies macro3.mjs macroStepFast semantics EXACTLY, adding: runaway-F-scan guard,
// optional per-A-visit H1-precondition audit hook, and era/chain runners.
import { FastTape } from './macro3.mjs';
import { TR } from './runsim.mjs';
export { FastTape };

export function build(runs, head) {
  const t = new FastTape(); let p = 0;
  for (const r of runs) { if (r.v) for (let i = 0; i < r.len; i++, p++) t.write(p, 1); else p += r.len; }
  t.head = head; t.st = 0; return t;
}
export function parseRle(s) {
  return s ? s.split(' ').map(x => { const [v, l] = x.split('^'); return { v: +v, len: +l }; }) : [];
}
export function rleStr(t) { return t.rle().s; }

// exact copy of macro3.mjs macroStepFast, with caps (NONTERM-* results) so the referee
// harness cannot hang on a runaway F-scan / literal routine.
export function macroStepGuarded(t, cap = 2e7) {
  if (t.st !== 0) throw new Error('not A');
  const h = t.head;
  const v0 = t.read(h);
  if (v0 === 1) { const [, ahead] = t.runAt(h); t.head += ahead; t.step += ahead; return { kind: 'S', steps: ahead }; }
  const v1 = t.read(h + 1);
  if (v1 === 1) return literalRoutine(t, 'L1', cap);
  const vm1 = t.read(h - 1);
  if (vm1 === 0) {
    if (t.read(h - 2) === 1) { t.write(h - 2, 0); t.write(h + 1, 1); t.head = h - 1; t.step += 5; return { kind: 'Lap' }; }
    t.write(h - 2, 1); t.write(h - 1, 1); t.write(h, 1); t.write(h + 1, 0);
    t.head = h + 2; t.step += 8; return { kind: 'Fill' };
  }
  t.write(h, 1); t.write(h + 1, 1); t.write(h, 0); t.write(h - 1, 0);
  t.step += 4;
  let y = h, n = 0;
  while (t.read(y) === 0) { t.step++; y--; if (++n > cap) return { kind: 'NONTERM-FSCAN' }; }
  t.step++; t.st = 1;
  for (let w = 0; w < cap; w++) {
    if (t.read(y - 1) === 1) {
      t.write(y - 1, 0); t.write(y, 0); t.step += 2; t.step++;
      if (t.read(y - 2) === 1) { t.write(y - 2, 0); t.step++; t.head = y - 1; t.st = 0; return { kind: 'Dance', y }; }
      for (let p = y - 2; p <= h; p++) t.write(p, 1);
      t.write(h + 1, 0);
      t.step += (h - y + 3) + 1;
      t.head = h + 2; t.st = 0;
      return { kind: 'DanceFill', y };
    }
    if (t.read(y - 2) === 0) { t.head = y - 1; t.step += 2; return { kind: 'HALT-H2', y }; }
    t.head = y - 1;
    return literalRoutine(t, 'DBL', cap);
  }
  return { kind: 'NONTERM-WALK' };
}
function literalRoutine(t, tag, cap) {
  let n = 0;
  for (;;) {
    const v = t.read(t.head); const tr = TR[t.st][v];
    if (tr.nx === 6) { t.step++; return { kind: 'HALT-' + tag }; }
    t.write(t.head, tr.w); t.head += tr.mv; t.st = tr.nx; t.step++; n++;
    if (t.st === 0) return { kind: tag };
    if (n > cap) return { kind: 'NONTERM-' + tag };
  }
}

// H1 precondition at an A-visit (before the routine): A reads 0 at h, [h+1]=1, [h+2]=0.
export function h1Precond(t) {
  return t.st === 0 && t.read(t.head) === 0 && t.read(t.head + 1) === 1 && t.read(t.head + 2) === 0;
}

// Run ONE era (ends at Dance/DanceFill/DBL/L1 or HALT/NONTERM), auditing H1 preconds at every A-visit.
// Returns { halt, nonterm, h1Hits:[{step,rle}], seq:[{kind,steps}], tape }.
export function runEra(t, maxMacro = 400000) {
  const seq = []; let halt = null, nonterm = null; const h1Hits = [];
  if (h1Precond(t)) h1Hits.push({ step: t.step, rle: t.rle().s.slice(0, 120) });
  for (let i = 0; i < maxMacro; i++) {
    const r = macroStepGuarded(t);
    seq.push({ kind: r.kind, steps: r.steps ?? null });
    if (String(r.kind).startsWith('HALT')) { halt = r.kind; break; }
    if (String(r.kind).startsWith('NONTERM')) { nonterm = r.kind; break; }
    if (r.kind === 'Dance' || r.kind === 'DanceFill' || r.kind === 'DBL' || r.kind === 'L1') break;
    if (h1Precond(t)) h1Hits.push({ step: t.step, rle: t.rle().s.slice(0, 120) });
  }
  return { halt, nonterm, h1Hits, seq, tape: t };
}

// All (0^g, 1^1) pairs strictly right of the head's cell (INV-T-relevant poison candidates).
export function poisonPairs(t) {
  const rl = t.rle(); const rs = parseRle(rl.s);
  const out = [];
  let q = rl.lo;
  let headSeen = false;
  for (let i = 0; i < rs.length; i++) {
    if (!headSeen && t.head >= q && t.head < q + rs[i].len) headSeen = true;
    else if (headSeen && i + 1 < rs.length && rs[i].v === 0 && rs[i].len === 1 && rs[i + 1].v === 1 && rs[i + 1].len === 1) {
      out.push({ at: q, g: 1 });
    }
    q += rs[i].len;
  }
  // end-of-tape case: last run is 0^1 1^1 with blank beyond
  if (headSeen && rs.length >= 2) {
    const a = rs[rs.length - 2], b = rs[rs.length - 1];
    if (a.v === 0 && a.len === 1 && b.v === 1 && b.len === 1) out.push({ at: 'end', g: 1 });
  }
  return out;
}

// crude family classifier for reporting: shape signature (1-runs classed, 0-runs exact) + head class
export function sig(t) {
  const rl = t.rle(); const rs = parseRle(rl.s);
  const shape = rs.map(x => x.v ? 'B' + (x.len < 10 ? x.len : '*') : 'g' + x.len).join(',');
  let q = rl.lo, hc = 'out';
  for (let i = 0; i < rs.length; i++) {
    if (t.head >= q && t.head < q + rs[i].len) { hc = i + (rs[i].v ? '+' : '-') + ':' + (t.head - q); break; }
    q += rs[i].len;
  }
  return { shape, hc, rle: rl.s };
}

// Chain: run up to maxEras consecutive eras on one tape; stop on halt/nonterm or when a
// predicate fires. Returns { stopped, reason, eras, lastSig }.
export function chain(t, maxEras, onStop) {
  let eras = 0;
  for (; eras < maxEras; eras++) {
    const r = runEra(t);
    if (r.halt) { if (onStop) onStop(eras, r); return { stopped: true, reason: r.halt, eras: eras + 1 }; }
    if (r.nonterm) { if (onStop) onStop(eras, r); return { stopped: true, reason: r.nonterm, eras: eras + 1 }; }
    if (onStop && onStop(eras, r)) return { stopped: true, reason: 'predicate', eras: eras + 1 };
  }
  return { stopped: false, reason: 'maxEras', eras };
}
