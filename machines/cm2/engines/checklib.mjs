// checklib.mjs — shared harness for the cm2 written-derivation case checkers (W1/W2/W3).
// Reference machine = runsim.mjs RunTape (bare per-step semantics; independently
// cross-validated vs stateseq.exe / ocm.exe — see attack-cm2.md L1).
// A "written word" is a list of steps [st, rd, wr, mv, nx]; st/nx in 0..5 (A..F),
// mv in {-1,+1}; the final entry may be ['H', rd] = "machine must HALT at this step
// reading rd". runWord executes the bare machine and asserts every step matches the
// written word (this is the 誊写对拍: the transcription, not the engine, is under test).
import { RunTape } from './runsim.mjs';

export function build(runs, head) {
  const t = new RunTape(); let p = 0;
  for (const r of runs) { if (r.v) for (let i = 0; i < r.len; i++, p++) t.write(p, 1); else p += r.len; }
  t.head = head; t.st = 0; return t;
}
export const R = (len, v = 1) => ({ v, len });
export function cellsOf(t, lo, hi) { const a = []; for (let p = lo; p < hi; p++) a.push(t.read(p)); return a; }
// exact run list over the 1-region plus explicit zero runs inside it (absolute positions)
export function runList(t) {
  const rl = t.rle(); if (!rl.s) return { lo: 0, runs: [], head: t.head, pop: 0 };
  const runs = rl.s.split(' ').map(x => { const [v, l] = x.split('^'); return { v: +v, len: +l }; });
  return { lo: rl.lo, runs, head: t.head, pop: rl.pop };
}
export function sameConfig(a, b) {
  return a.lo === b.lo && a.head === b.head && a.pop === b.pop &&
    a.runs.length === b.runs.length && a.runs.every((r, i) => r.v === b.runs[i].v && r.len === b.runs[i].len);
}
export function cfgStr(c) { return 'lo=' + c.lo + ' h=' + c.head + ' ' + c.runs.map(r => (r.v ? '1' : '0') + '^' + r.len).join(' '); }

let gPass = 0, gFail = 0, gFailLines = [];
export function check(tag, cond, detail = '') {
  if (cond) { gPass++; return true; }
  gFail++; gFailLines.push('FAIL ' + tag + (detail ? '  [' + detail + ']' : ''));
  return false;
}
export function summary(name) {
  console.log(`${name}: pass=${gPass} fail=${gFail}`);
  for (const l of gFailLines) console.log(l);
  if (gFail) { console.log(`${name}: VERDICT FAIL`); process.exitCode = 1; }
  else console.log(`${name}: VERDICT ALL PASS`);
}

// ---- written-word execution -------------------------------------------------
export function runWord(t, word, tag) {
  for (let i = 0; i < word.length; i++) {
    const w = word[i];
    if (w[0] === 'H') { // expected halt: [ 'H', rd ]
      const rd = t.read(t.head);
      // detect halt: current state must be C (2) and rd 0 — halt transfer C0
      const haltsNow = t.st === 2 && rd === 0;
      if (!check(tag + '#s' + i, haltsNow && rd === w[1], `expect HALT rd=${w[1]}, got st=${t.st} rd=${rd}`)) return false;
      return 'HALT';
    }
    const [st, rd, wr, mv, nx] = w;
    const cur = { st: t.st, rd: t.read(t.head), h: t.head };
    if (!check(tag + '#s' + i, cur.st === st && cur.rd === rd, `step ${i}: written ${st}/${rd}, machine ${cur.st}/${cur.rd} (h=${cur.h})`)) return false;
    const r = t.step1(); // machine applies its own table (write+move+next)
    if (r.halt) { check(tag + '#s' + i, false, `unexpected halt at step ${i}`); return false; }
    // verify the applied transition equals the written one
    const appliedWr = t.read(cur.h); // the cell just written (head has moved away)
    if (!check(tag + '#s' + i, appliedWr === wr, `step ${i}: write ${wr} vs applied ${appliedWr}`)) return false;
    if (!check(tag + '#s' + i, t.st === nx, `step ${i}: next ${nx} vs applied ${t.st}`)) return false;
    if (!check(tag + '#s' + i, t.head === cur.h + mv, `step ${i}: move ${mv} vs applied ${t.head - cur.h}`)) return false;
  }
  return true;
}

// ---- written words of the seven routines (W1 lemmas; see attack-cm2.md §W1) --
// S: A reads 1 k times: write 1, move R, stay A.
export const sWord = k => Array.from({ length: k }, () => [0, 1, 1, 1, 0]);
// Lap: A0 B0 C1 D0 E1 (precond [h]=[h+1]=[h-1]=0, [h-2]=1)
export const lapWord = [[0, 0, 1, 1, 1], [1, 0, 1, -1, 2], [2, 1, 0, -1, 3], [3, 0, 0, -1, 4], [4, 1, 0, 1, 0]];
// Fill: A0 B0 C1 D0 E0 E0 E0 E1 (precond [h-2..h+1] all 0)
export const fillWord = [[0, 0, 1, 1, 1], [1, 0, 1, -1, 2], [2, 1, 0, -1, 3], [3, 0, 0, -1, 4],
  [4, 0, 1, 1, 4], [4, 0, 1, 1, 4], [4, 0, 1, 1, 4], [4, 1, 0, 1, 0]];
// L1: A0 B1 C1 D0 E1 (precond [h]=0, [h+1]=[h+2]=1)
export const l1Word = [[0, 0, 1, 1, 1], [1, 1, 0, 1, 2], [2, 1, 0, -1, 3], [3, 0, 0, -1, 4], [4, 1, 0, 1, 0]];
// Dance family prefix: A0 B0 C1 D1 then F-scan of s F0-steps and F1 (precond [h]=[h+1]=0,[h-1]=1,
// landing y=h-s the first 1 at or left of h-2).
export const dancePrefix = s => [[0, 0, 1, 1, 1], [1, 0, 1, -1, 2], [2, 1, 0, -1, 3], [3, 1, 0, 1, 5],
  ...Array.from({ length: s }, () => [5, 0, 0, -1, 5]), [5, 1, 1, -1, 1]];
// clean Dance tail (B1 branch, [y-1]=[y-2]=1): B1 C1 D0 E1
export const danceTail = [[1, 1, 0, 1, 2], [2, 1, 0, -1, 3], [3, 0, 0, -1, 4], [4, 1, 0, 1, 0]];
// DanceFill tail: B1 C1 D0 then E0 x m (fill y-2..h), E1 at deposit h+1
export const danceFillTail = m => [[1, 1, 0, 1, 2], [2, 1, 0, -1, 3], [3, 0, 0, -1, 4],
  ...Array.from({ length: m }, () => [4, 0, 1, 1, 4]), [4, 1, 0, 1, 0]];
// DBL round core: B0 C1 then D-branch handled by the caller.
export const dblRoundCore = [[1, 0, 1, -1, 2], [2, 1, 0, -1, 3]];
export const d1Eat = [3, 1, 0, 1, 5];   // D1: eat y-3, back to F
export const d0Pass = [3, 0, 0, -1, 4]; // D0: pass, go to E

// ---- DBL written-rule simulator ---------------------------------------------
// Simulates the WRITTEN DBL rules (see casecheck-dbl.mjs header) on a dynamic cell map
// starting from state B at y0-1 (i.e. the dance prefix A0B0C1D1 F0^s F1 is prepended
// here; when the prefix already ran on the machine, the map's h+1/h-1 entries make the
// prefix net idempotent). Returns the full expected word and end ('A'|'HALT').
// Throws 'scan-escape' if a rescan finds no 1 (excluded by the lemma hypothesis).
export function dblExpectedWord(cells0, h, y0) {
  const cells = new Map(cells0);
  const rd = p => (cells.has(p) ? cells.get(p) : 0);
  const word = [...dancePrefix(h - y0)];
  cells.set(h + 1, 1); cells.set(h - 1, 0); // dance-prefix net (idempotent if already run)
  let y = y0, prevB0 = null;
  for (let guard = 0; guard < 100; guard++) {
    if (rd(y - 1) === 1) { // B1 tail
      word.push([1, 1, 0, 1, 2], [2, 1, 0, -1, 3], [3, 0, 0, -1, 4]);
      cells.set(y - 1, 0); cells.set(y, 0);
      if (rd(y - 2) === 1) { word.push([4, 1, 0, 1, 0]); cells.set(y - 2, 0); }
      else { // E0-fill rightward to the first 1 = most recent B0 cell (or deposit if none)
        let q = y - 2; while (rd(q) === 0) { cells.set(q, 1); q++; }
        if (prevB0 !== null && q !== prevB0) throw new Error('fill target ' + q + ' != prevB0 ' + prevB0);
        const m = q - (y - 2);
        word.push(...Array.from({ length: m }, () => [4, 0, 1, 1, 4]), [4, 1, 0, 1, 0]);
        cells.set(q, 0);
      }
      return { word, end: 'A' };
    }
    word.push([1, 0, 1, -1, 2]); // B0
    cells.set(y - 1, 1);
    if (rd(y - 2) === 0) { word.push(['H', 0]); return { word, end: 'HALT' }; }
    word.push([2, 1, 0, -1, 3]); // C1
    if (rd(y - 3) === 1) { // D1 -> rescan (landing hops left, first 1 <= y-4)
      word.push(d1Eat);
      cells.set(y - 2, 0); cells.set(y - 3, 0);
      let yp = y - 4; while (!rd(yp)) { if (yp < -1000) throw new Error('scan-escape'); yp--; }
      const nF0 = y - yp - 2;
      word.push(...Array.from({ length: nF0 }, () => [5, 0, 0, -1, 5]), [5, 1, 1, -1, 1]);
      prevB0 = y - 1; y = yp; continue;
    }
    word.push(d0Pass); // D0
    if (rd(y - 4) === 1) { word.push([4, 1, 0, 1, 0]); cells.set(y - 4, 0); return { word, end: 'A' }; }
    // E0 x3 fills [y-4..y-2]; E1 erases this round's B0 cell [y-1]
    word.push([4, 0, 1, 1, 4], [4, 0, 1, 1, 4], [4, 0, 1, 1, 4], [4, 1, 0, 1, 0]);
    cells.set(y - 4, 1); cells.set(y - 3, 1); cells.set(y - 2, 1); cells.set(y - 1, 0);
    return { word, end: 'A' };
  }
  throw new Error('guard');
}

// ---- era composition helpers (W2) ---------------------------------------------
// cellsAround(t, y0, h): snapshot the machine tape into a map for dblExpectedWord.
export function cellsAround(t, y0, h) {
  const m = new Map();
  for (let p = y0 - 90; p <= h + 1; p++) m.set(p, t.read(p));
  return m;
}
// merge [[v,len],...] into a normalized run list (drop len 0, merge equal neighbours)
export function mergeRuns(parts) {
  const out = [];
  for (const [v, len] of parts) {
    if (!len) continue;
    const last = out[out.length - 1];
    if (last && last[0] === v) last[1] += len; else out.push([v, len]);
  }
  return out;
}
export function buildAt(start, parts, head) {
  const t = new RunTape(); let p = start;
  for (const [v, len] of mergeRuns(parts)) { if (v) for (let i = 0; i < len; i++, p++) t.write(p, 1); else p += len; }
  t.head = head; t.st = 0; return t;
}
