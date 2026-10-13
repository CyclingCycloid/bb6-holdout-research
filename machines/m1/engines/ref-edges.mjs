// ref-edges.mjs — ADVERSARIAL REFEREE: event-level raw-TM verification of the ten phase rules
// and of the mod-3 LEDGER at the raw machine level. Independent of phase1.mjs: the raw TM is
// parsed directly from the 36-char code; configs are materialized to tapes; the machine is run
// to the NEXT D-on-0 event; the resulting (tape, head) is compared with the materialization of
// the phase-rule child. Any rule error or grammar error shows up as a tape mismatch.
//
// Checks:
//  (1) blank tape -> 54 steps -> state D reading 0 on tape 1^3 0 1^3, head right of right block
//      (L0 entry P(3) = R(3,3)).
//  (2) For a boundary+random grid of grammar configs: raw event == phase child (tape+head),
//      halt events for G(3,·) confirmed at raw level, no raw D-on-0 event skipped.
//  (3) RAW ledger: for I0 members, sum(runs) mod 3 preserved across the raw event (this checks
//      the ten affine identities at the machine level, E7 guarded members included).
let PASS = 0, FAIL = 0;
const ok = (c, m) => { if (c) PASS++; else { FAIL++; console.log('FAIL ' + m); } };

// ---- raw TM from code (parsed here, not imported) ----
const CODE = '1RB1LA0RC0RD1LC1LA1RE1RD1LF0LA---0LE';
const STATES = ['A', 'B', 'C', 'D', 'E', 'F'];
const rule = {}; // rule[state][bit] = {w, dir, next} | {halt:true}
STATES.forEach((s, i) => {
  const a = CODE.slice(6 * i, 6 * i + 6);
  const p = (t) => (t === '---' ? { halt: true } : { w: t[0] === '1' ? 1 : 0, dir: t[1], next: t[2] });
  rule[s] = [p(a.slice(0, 3)), p(a.slice(3, 6))];
});
// sanity: F reading 0 halts; D 0->1RE; E 0->1LF
ok(rule.F[0].halt === true, 'F0 halt');
ok(rule.D[0].w === 1 && rule.D[0].dir === 'R' && rule.D[0].next === 'E', 'D0=1RE');
ok(rule.E[0].w === 1 && rule.E[0].dir === 'L' && rule.E[0].next === 'F', 'E0=1LF');

class Tape {
  constructor() { this.c = new Map(); }
  get(i) { return this.c.get(i) || 0; }
  set(i, v) { if (v === 0) this.c.delete(i); else this.c.set(i, 1); }
  window() { let lo = 0, hi = 0; for (const k of this.c.keys()) { if (k < lo) lo = k; if (k > hi) hi = k; } return [lo, hi]; }
  runs() { // list of [start,endIncl] of 1-blocks within [lo-2, hi+3]
    const [lo, hi] = this.window(); const out = []; let i = lo - 2, cur = null;
    for (; i <= hi + 3; i++) { const b = this.get(i); if (b && cur === null) cur = i; if (!b && cur !== null) { out.push([cur, i - 1]); cur = null; } }
    return out;
  }
  snapshot(h, radius) { // bounded string around head, enough to identify local pattern
    let s = ''; for (let i = h - radius; i <= h + radius; i++) s += this.get(i);
    return s;
  }
}
function rawRun(cells, head, state, maxSteps) {
  // run until next (state D, read 0) or halt; returns {event:true} | {halt, steps} | {cap}
  for (let s = 0; s < maxSteps; s++) {
    const bit = cells.get(head);
    const r = rule[state][bit];
    if (r.halt) return { halt: true, steps: s };
    cells.set(head, r.w);
    head += r.dir === 'R' ? 1 : -1;
    state = r.next;
    if (state === 'D' && cells.get(head) === 0) return { event: true, steps: s + 1, head, cells };
  }
  return { cap: true };
}

// ---- phase rules: re-transcribed independently (uncollapsed event semantics) ----
function step1(c) {
  if (c.t === 'R') { const [a, b] = c.r; if (b < 3n) return { deg: 1 }; return { c: { t: 'S', r: [a + 1n, b - 2n, 1n] } }; }
  if (c.t === 'S') {
    const [x, y, z, ...rest] = c.r;
    if (y >= 3n) return { c: { t: 'S', r: [x + 1n, y - 2n, z + 1n, ...rest] } };
    if (y === 2n) return { c: { t: 'G', r: [x + 1n, z + 1n, ...rest] } };
    if (y === 1n) return rest.length === 0
      ? { c: { t: 'R', r: [1n, x + z + 3n] } }
      : { c: { t: 'L', r: [1n, x + z + 3n, ...rest] } };
    return { deg: 1 };
  }
  if (c.t === 'G') {
    const [a, b, ...rest] = c.r;
    if (a >= 4n) return { c: { t: 'S', r: [1n, a - 3n, 1n, b + 1n, ...rest] } };
    if (a === 2n) return { c: { t: 'L', r: [1n, b + 1n, b + 1n, ...rest] } };
    if (a === 3n) return { halt: true };
    return { deg: 1 };
  }
  if (c.t === 'L') {
    const [r1, r2, r3, ...rest] = c.r;
    if (r3 >= 2n) return { c: { t: 'L', r: [r1 + 1n, r2, r3 - 1n, ...rest] } };
    if (r3 === 1n) return c.r.length === 3
      ? { c: { t: 'R', r: [r1 + 1n, r2] } }
      : { c: { t: 'S', r: [r1 + 1n, r2, ...rest] } };
    return { deg: 1 };
  }
  return { deg: 1 };
}
// ---- config -> tape materialization (grammar of phase1.mjs header) ----
function materialize(c) {
  const t = new Tape(); let pos = 0; let head = -1;
  const putRun = (n) => { for (let i = 0; i < Number(n); i++) t.set(pos + i, 1); pos += Number(n); };
  const zeros = (n, headAt = -1) => { const base = pos; for (let i = 0; i < n; i++) { if (i === headAt) head = base + i; pos++; } };
  if (c.t === 'R') { putRun(c.r[0]); zeros(1); putRun(c.r[1]); head = pos; } // fresh 0 right of right block
  else if (c.t === 'S') { putRun(c.r[0]); zeros(1); putRun(c.r[1]); zeros(2, 0); putRun(c.r[2]); for (let i = 3; i < c.r.length; i++) { zeros(1); putRun(c.r[i]); } }
  else if (c.t === 'G') { putRun(c.r[0]); zeros(3, 1); putRun(c.r[1]); for (let i = 2; i < c.r.length; i++) { zeros(1); putRun(c.r[i]); } }
  else if (c.t === 'L') { putRun(c.r[0]); zeros(1); putRun(c.r[1]); zeros(1, 0); putRun(c.r[2]); for (let i = 3; i < c.r.length; i++) { zeros(1); putRun(c.r[i]); } }
  else throw new Error('type');
  return { t, head };
}
function normTape(t, h) { // shift so leftmost 1-cell is at 0 (config equality = up to translation)
  const ks = [...t.c.keys()];
  if (!ks.length) return { c: new Map(), h };
  const lo = Math.min(...ks);
  const m = new Map(); for (const k of ks) m.set(k - lo, 1);
  return { c: m, h: h - lo };
}
function tapeEq(t1, h1, t2, h2) {
  const a = normTape(t1, h1), b = normTape(t2, h2);
  if (a.c.size !== b.c.size) return false;
  for (const k of a.c.keys()) if (!b.c.has(k)) return false;
  return a.h === b.h;
}
const sumR = (c) => c.r.reduce((a, b) => a + b, 0n);
const s3 = (v) => Number(v % 3n);
function inI0(c) {
  const r = c.r.map(Number);
  if (r.reduce((a, b) => a + b, 0) % 3 !== 0) return false;
  if (c.t === 'R') return r[1] >= 3;
  if (c.t === 'S') { if (r[1] < 1) return false; if (r[0] === 1 && r[1] === 2 && r[2] % 3 !== 1) return false; return true; }
  if (c.t === 'G') { if (r[0] === 2 && (r[1] < 2 || r[1] % 3 !== 2)) return false; return r[0] >= 2; }
  if (c.t === 'L') return r[2] >= 1 && r[1] >= 3;
  return false;
}
// parse a D-on-0 tape back into a phase config (classifier) — secondary check
function parseConfig(t, h) {
  const rs = t.runs();
  const gaps = [];
  for (let i = 1; i < rs.length; i++) gaps.push(rs[i][0] - rs[i - 1][1] - 1);
  // relative head position: which gap contains h, at which offset
  let gIdx = -1, gOff = -1;
  for (let i = 0; i < gaps.length; i++) { const s = rs[i][1] + 1; if (h >= s && h < s + gaps[i]) { gIdx = i; gOff = h - s; } }
  const runs = rs.map(([a, b]) => BigInt(b - a + 1));
  if (rs.length === 2 && gaps[0] === 1 && gIdx === -1 && h === rs[1][1] + 1) return { t: 'R', r: runs };
  if (gIdx === 1 && gOff === 0 && gaps[1] === 2 && gaps[0] === 1 && gaps.slice(2).every(g => g === 1)) return { t: 'S', r: runs };
  if (gIdx === 0 && gOff === 1 && gaps[0] === 3 && gaps.slice(1).every(g => g === 1)) return { t: 'G', r: runs };
  if (gIdx === 1 && gOff === 0 && gaps.every(g => g === 1)) return { t: 'L', r: runs };
  return { t: '?', r: runs };
}

// ---------- (1) blank tape, 54 steps ----------
{
  const t = new Tape(); let head = 0, st = 'A';
  for (let i = 0; i < 54; i++) { const r = rule[st][t.get(head)]; t.set(head, r.w); head += r.dir === 'R' ? 1 : -1; st = r.next; }
  ok(st === 'D' && t.get(head) === 0, 'step54 state D on 0');
  const pc = parseConfig(t, head);
  ok(pc.t === 'R' && pc.r[0] === 3n && pc.r[1] === 3n, 'step54 config R(3,3), got ' + pc.t + '[' + pc.r.join(',') + ']');
}

// ---------- (2)+(3) event-level raw vs phase over a boundary+random grid ----------
{
  let checked = 0, halted = 0, sumChecked = 0;
  const cases = [];
  // boundary grid (grammar-valid): R needs b>=3
  for (const a of [1, 2, 3, 5, 8, 13]) for (const b of [3, 4, 5, 6, 9, 12]) cases.push({ t: 'R', r: [BigInt(a), BigInt(b)] });
  for (const x of [1, 2, 5]) for (const y of [1, 2, 3, 4, 5, 8]) for (const z of [1, 2, 4, 5, 7]) {
    cases.push({ t: 'S', r: [BigInt(x), BigInt(y), BigInt(z)] });
    for (const w of [1, 2, 3, 5]) { cases.push({ t: 'S', r: [BigInt(x), BigInt(y), BigInt(z), BigInt(w)] }); cases.push({ t: 'S', r: [BigInt(x), BigInt(y), BigInt(z), BigInt(w), BigInt(w + 2)] }); }
  }
  for (const a of [2, 3, 4, 5, 7, 9, 16]) for (const b of [1, 2, 3, 5, 8, 11]) {
    cases.push({ t: 'G', r: [BigInt(a), BigInt(b)] });
    for (const w of [1, 3, 5]) { cases.push({ t: 'G', r: [BigInt(a), BigInt(b), BigInt(w)] }); cases.push({ t: 'G', r: [BigInt(a), BigInt(b), BigInt(w), BigInt(2 * w)] }); }
  }
  for (const r1 of [1, 4]) for (const r2 of [3, 4, 9, 10]) for (const r3 of [1, 2, 3, 7]) {
    cases.push({ t: 'L', r: [BigInt(r1), BigInt(r2), BigInt(r3)] });
    for (const w of [1, 5]) { cases.push({ t: 'L', r: [BigInt(r1), BigInt(r2), BigInt(r3), BigInt(w)] }); cases.push({ t: 'L', r: [BigInt(r1), BigInt(r2), BigInt(r3), BigInt(w), BigInt(w), BigInt(2 * w)] }); }
  }
  // random large
  const rnd = (m) => BigInt(1 + Math.floor(Math.random() * m));
  for (let i = 0; i < 3000; i++) {
    const t = ['R', 'S', 'G', 'L'][i & 3];
    const k = t === 'R' ? 2 : t === 'S' ? 3 + (i % 7) : t === 'G' ? 2 + (i % 6) : 3 + (i % 7);
    const r = []; for (let j = 0; j < k; j++) r.push(i > 1500 ? rnd(2 ** 24) : rnd(60));
    if (t === 'R' && r[1] < 3n) continue;
    if (t === 'G' && r[0] < 2n) continue; // grammar: G needs a>=2
    cases.push({ t, r });
  }
  for (const c of cases) {
    // known engine-domain edge (found by this referee run): E7's formula G(2,b)->L(1,b+1,b+1)
    // is raw-faithful only for b>=2; G(2,1) raw-walks to L(1,3,2) instead. G(2,1) is outside
    // I0 (BG1: b>=2, b=2 mod 3) and unreachable from I0 (E3 children have b=z+1>=2). Excluded.
    if (c.t === 'G' && c.r[0] === 2n && c.r[1] === 1n) continue;
    const st = step1(c);
    const m = materialize(c);
    const maxSteps = 4 * Number(c.r.reduce((a, b) => a + b, 0n)) + 200;
    const out = rawRun(m.t, m.head, 'D', maxSteps);
    if (st.halt) {
      ok(out.halt === true, 'raw halt for ' + c.t + c.r);
      halted++; checked++; continue;
    }
    ok(!st.deg, 'phase degenerate for grammar config ' + c.t + '[' + c.r.join(',') + ']');
    if (st.deg) continue;
    ok(out.event === true, 'raw event reached for ' + c.t + c.r + ' (out=' + JSON.stringify({ ...out, cells: undefined }) + ')');
    if (!out.event) continue;
    const m2 = materialize(st.c);
    ok(tapeEq(out.cells, out.head, m2.t, m2.head), `tape mismatch ${c.t}[${c.r}] -> raw vs ${st.c.t}[${st.c.r}]`);
    const pc = parseConfig(out.cells, out.head);
    ok(pc.t === st.c.t && pc.r.length === st.c.r.length && pc.r.every((v, i) => v === st.c.r[i]), `parse mismatch at ${c.t}[${c.r}]: raw=${pc.t}[${pc.r}] phase=${st.c.t}[${st.c.r}]`);
    // (3) raw ledger: sum mod 3 preserved for I0 members
    if (inI0(c)) { ok(s3(sumR(c)) === s3(sumR(st.c)), `raw-ledger sum mod3 ${c.t}[${c.r}]`); sumChecked++; }
    checked++;
  }
  console.log(`(2) event-level raw-vs-phase: ${checked} configs (incl. ${halted} halt forms G(3,·))`);
  console.log(`(3) raw mod-3 ledger checked on ${sumChecked} I0-member events`);
}
console.log(`REF-EDGES: ${PASS} pass, ${FAIL} fail`);
process.exit(FAIL ? 1 : 0);
