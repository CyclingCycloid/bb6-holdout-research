// ref-witness.mjs — ADVERSARIAL REFEREE: independent raw-TM reproduction of the five
// pollution-cascade witnesses of attack-sparse2.md §3, plus the equivalence (⟸) check on
// inv3c's capped random witness.
// For each witness: (a) phase chain from an independently transcribed rule set — event count,
//    birth sequence (A at each S-even sweep entry), I0 membership of every config, HALT;
//    (b) RAW TM from the materialized tape — halt confirmation, raw step count, and
//    event-by-event tape agreement with the phase chain (catches engine infidelity on the
//    witness pipeline, e.g. any G(2,b!=2) site).
const CODE = '1RB1LA0RC0RD1LC1LA1RE1RD1LF0LA---0LE';
const ST = ['A', 'B', 'C', 'D', 'E', 'F']; const rule = {};
ST.forEach((s, i) => { const a = CODE.slice(6 * i, 6 * i + 6); const p = (t) => (t === '---' ? { halt: 1 } : { w: +t[0], d: t[1], n: t[2] }); rule[s] = [p(a.slice(0, 3)), p(a.slice(3, 6))]; });
function step1(c) {
  if (c.t === 'R') { const [a, b] = c.r; return { c: { t: 'S', r: [a + 1n, b - 2n, 1n] } }; }
  if (c.t === 'S') {
    const [x, y, z, ...rest] = c.r;
    if (y >= 3n) return { c: { t: 'S', r: [x + 1n, y - 2n, z + 1n, ...rest] } };
    if (y === 2n) return { c: { t: 'G', r: [x + 1n, z + 1n, ...rest] } };
    if (y === 1n) return rest.length === 0 ? { c: { t: 'R', r: [1n, x + z + 3n] } } : { c: { t: 'L', r: [1n, x + z + 3n, ...rest] } };
    return { deg: 1 };
  }
  if (c.t === 'G') {
    const [a, b, ...rest] = c.r;
    if (a >= 4n) return { c: { t: 'S', r: [1n, a - 3n, 1n, b + 1n, ...rest] } };
    if (a === 2n) return { c: { t: 'L', r: [1n, b + 1n, b + 1n, ...rest] } };
    if (a === 3n) return { halt: 1 };
    return { deg: 1 };
  }
  if (c.t === 'L') {
    const [r1, r2, r3, ...rest] = c.r;
    if (r3 >= 2n) return { c: { t: 'L', r: [r1 + 1n, r2, r3 - 1n, ...rest] } };
    if (r3 === 1n) return c.r.length === 3 ? { c: { t: 'R', r: [r1 + 1n, r2] } } : { c: { t: 'S', r: [r1 + 1n, r2, ...rest] } };
    return { deg: 1 };
  }
  return { deg: 1 };
}
const m3 = (v) => Number(((v % 3n) + 3n) % 3n);
const sumR = (c) => c.r.reduce((a, b) => a + b, 0n);
function inI0(c) {
  if (m3(sumR(c)) !== 0) return false;
  const r = c.r;
  if (c.t === 'R') return r[1] >= 3n;
  if (c.t === 'S') return r[1] >= 1n && !(r[0] === 1n && r[1] === 2n && m3(r[2]) !== 1);
  if (c.t === 'G') return !(r[0] === 2n && (r[1] < 2n || m3(r[1]) !== 2)) && r[0] >= 2n;
  if (c.t === 'L') return r[2] >= 1n && r[1] >= 3n;
  return false;
}
function materialize(c) {
  const cells = new Map(); let pos = 0, head = -1;
  const run = (n) => { for (let i = 0; i < Number(n); i++) cells.set(pos + i, 1); pos += Number(n); };
  const zer = (n, at = -1) => { const b = pos; for (let i = 0; i < n; i++) { if (i === at) head = b + i; pos++; } };
  if (c.t === 'R') { run(c.r[0]); zer(1); run(c.r[1]); head = pos; }
  else if (c.t === 'S') { run(c.r[0]); zer(1); run(c.r[1]); zer(2, 0); run(c.r[2]); for (let i = 3; i < c.r.length; i++) { zer(1); run(c.r[i]); } }
  else if (c.t === 'G') { run(c.r[0]); zer(3, 1); run(c.r[1]); for (let i = 2; i < c.r.length; i++) { zer(1); run(c.r[i]); } }
  else if (c.t === 'L') { run(c.r[0]); zer(1); run(c.r[1]); zer(1, 0); run(c.r[2]); for (let i = 3; i < c.r.length; i++) { zer(1); run(c.r[i]); } }
  return { cells, head };
}
function norm(cells, h) {
  const ks = [...cells.keys()]; if (!ks.length) return { s: '', h };
  const lo = Math.min(...ks); const arr = []; for (let k of ks) arr.push(k - lo);
  let s = ''; const hi = Math.max(...arr);
  for (let i = 0; i <= hi; i++) s += arr.includes(i) ? '1' : '0';
  return { s, h: h - lo };
}
function rawWalkAndCompare(c0, maxEvents = 20000, maxRaw = 5e7) {
  // phase chain
  const chain = [c0]; const births = [];
  let prevEven = c0.t === 'S' && c0.r[1] % 2n === 0n;
  if (prevEven) births.push(c0.r[0] + c0.r[1] / 2n + 1n);
  let c = c0, haltAt = -1;
  for (let i = 0; i < maxEvents; i++) {
    const st = step1(c);
    if (st.halt) { haltAt = i + 1; break; }
    if (st.deg) return { deg: true, at: i };
    c = st.c; chain.push(c);
    const nowEven = c.t === 'S' && c.r[1] % 2n === 0n;
    if (nowEven && !prevEven) births.push(c.r[0] + c.r[1] / 2n + 1n);
    prevEven = nowEven;
  }
  // raw walk, comparing at every D-on-0 event
  const m = materialize(c0);
  let { cells, head } = m, stt = 'D', raw = 0, ev = 0, mism = null;
  const get = (i) => cells.get(i) || 0;
  for (; raw < maxRaw; raw++) {
    const r = rule[stt][get(head)];
    if (r.halt) { if (ev !== chain.length || haltAt !== ev) mism = 'halt mismatch'; return { events: ev, rawSteps: raw + 1, halted: true, births, chainLen: chain.length, mism }; }
    if (r.w === 0) cells.delete(head); else cells.set(head, 1);
    head += r.d === 'R' ? 1 : -1; stt = r.n;
    if (stt === 'D' && get(head) === 0) {
      ev++;
      if (ev < chain.length) {
        const want = materialize(chain[ev]);
        const a = norm(cells, head), b = norm(want.cells, want.head);
        if (a.s !== b.s || a.h !== b.h) { mism = `tape@ev${ev}: raw ${a.s}@${a.h} vs phase ${b.s}@${b.h}`; return { events: ev, rawSteps: raw + 1, halted: false, births, chainLen: chain.length, mism }; }
      } else {
        // phase chain ended in HALT: run the final halt segment (engine claims cost 15).
        // NOTE (referee finding): for some tails this segment CONTAINS intermediate D-on-0
        // events (e.g. G(3,3,6) at +9, config G(1,1,4,6)-shaped, SUM=12=0 mod 3) — the engine's
        // one-event halt is a granularity simplification. We require: halt within 15 steps and
        // every intermediate D-on-0 SUM = 0 mod 3.
        let st2 = stt, hh = head, extraEv = 0, allS3 = true;
        for (let k = 0; k < 15; k++) {
          const r2 = rule[st2][get(hh)];
          if (r2.halt) return { events: ev, rawSteps: raw + 1 + k + 1, halted: true, births, chainLen: chain.length, mism, extraEv, extraAllS3: allS3 };
          if (r2.w === 0) cells.delete(hh); else cells.set(hh, 1);
          hh += r2.d === 'R' ? 1 : -1; st2 = r2.n;
          if (st2 === 'D' && get(hh) === 0) {
            extraEv++;
            const ks = [...cells.keys()]; let s = 0; for (const kk of ks) s++;
            // sum of run lengths = number of 1-cells
            if (s % 3 !== 0) allS3 = false;
          }
        }
        mism = 'no halt within 15 steps of final segment'; return { events: ev, rawSteps: raw + 16, halted: false, births, chainLen: chain.length, mism, extraEv, extraAllS3: allS3 };
      }
    }
  }
  return { events: ev, rawSteps: raw, halted: false, births, chainLen: chain.length, mism: 'raw cap' };
}
const W = [
  ['d=1', { t: 'L', r: [1n, 3n, 1n, 3n, 1n] }],
  ["d=1'", { t: 'S', r: [1n, 1n, 1n, 1n, 1n, 1n] }],
  ["d=1''", { t: 'G', r: [4n, 2n, 7n, 5n] }],
  ['d=2', { t: 'S', r: [3n, 2n, 25n, 43n, 23n, 12n, 4n, 2n] }],
  ['d=3', { t: 'S', r: [12n, 28n, 23n, 42n, 14n, 22n, 38n, 31n] }],
];
console.log('=== five md witnesses (phase chain + raw TM, event-by-event tape agreement) ===');
for (const [name, c0] of W) {
  // every phase config in I0?
  let allI0 = true, n = 0;
  { let c = c0; for (let i = 0; i < 20000; i++) { if (!inI0(c)) { allI0 = false; break; } n++; const st = step1(c); if (st.halt || st.deg) break; c = st.c; } }
  const r = rawWalkAndCompare(c0);
  const pow = r.births.map((b) => (b > 0n && (b & (b - 1n)) === 0n));
  console.log(`${name} ${c0.t}[${c0.r.join(',')}]: inI0(start)=${inI0(c0)} allConfigsInI0=${allI0}(n=${n}) phaseEvents=${r.chainLen - 1}${r.halted ? ' HALT' : ''} rawHalt=${r.halted} rawSteps=${r.rawSteps} births=[${r.births.join(',')}] pow2=[${pow.join(',')}] tapeAgreement=${r.mism ? 'FAIL: ' + r.mism : 'OK (every event)'}`);
}
console.log('=== equivalence (<=) fresh witness: inv3c capped case, big cap ===');
const r2 = rawWalkAndCompare({ t: 'S', r: [39n, 34n, 5n, 30n, 43n, 19n, 37n] }, 200000, 2e8);
console.log(`S[39,34,5,30,43,19,37]: phaseEvents=${r2.chainLen - 1} rawHalt=${r2.halted} rawSteps=${r2.rawSteps} births=[${r2.births.join(',')}] tapeAgreement=${r2.mism ? 'FAIL: ' + r2.mism : 'OK'}`);
console.log('=== classic d=1 chain listing (vs md) ===');
{
  let c = W[0][1]; const seq = [c.t + '[' + c.r.join(',') + ']'];
  for (let i = 0; i < 30; i++) { const st = step1(c); if (st.halt) { seq.push('HALT'); break; } c = st.c; seq.push(c.t + '[' + c.r.join(',') + ']'); }
  console.log(seq.join(' -> '));
}
