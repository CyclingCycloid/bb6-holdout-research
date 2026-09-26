// sweeps.mjs — decompose the tail-less walk into diagonal sweeps; extract the
// terminal -> next-sweep-start map PSI; test the poison-start invariant.
import { FastTape } from './macro3.mjs';
import { parseRle, macroStepGuarded } from '../reverify-cm2/ref-lib.mjs';
const CAP = 2e8;
const t = new FastTape();
const seq = []; // chronological tail-less A / gE / outR markers
while (t.step < CAP) {
  const r = macroStepGuarded(t);
  if (String(r.kind).startsWith('HALT')) { console.log('HALT', r.kind, t.step); break; }
  if (r.kind === 'Dance' || r.kind === 'DanceFill' || r.kind === 'DBL' || r.kind === 'L1') {
    const rl = t.rle(); const rs = parseRle(rl.s);
    let q = rl.lo, hi = -1, off = 0;
    for (let i = 0; i < rs.length; i++) { if (t.head >= q && t.head < q + rs[i].len) { hi = i; off = t.head - q; break; } q += rs[i].len; }
    if (rs.length === 5 && rs[0].v === 1 && rs[1].v === 0 && rs[1].len === 1 && rs[2].v === 1 && rs[3].v === 0 && rs[3].len === 5 && rs[4].v === 1 && hi === 3 && off === 1)
      seq.push({ t: t.step, kind: 'A', L: rs[0].len, M: rs[2].len, R: rs[4].len });
    if (rs.length === 3 && rs[0].v === 1 && rs[1].v === 0 && rs[1].len === 1 && rs[2].v === 1 && hi === 2 && off === 0)
      seq.push({ t: t.step, kind: 'gE', L: rs[0].len, M: rs[2].len });
    if (rs.length === 1 && rs[0].v === 1 && (t.head === rs[0].len + 1 || t.head === rs[0].len + 2))
      seq.push({ t: t.step, kind: 'outR', L: rs[0].len, off: t.head - rs[0].len });
  }
}
console.log('markers:', seq.length);
// sweep decomposition: A-markers chained by (L+3, M-4, R+1)
const sweeps = [];
let cur = null;
for (const m of seq) {
  if (m.kind === 'A') {
    if (cur && cur.kind === 'sweep' && m.L === cur.lastL + 3 && m.M === cur.lastM - 4 && m.R === cur.lastR + 1) {
      cur.lastL = m.L; cur.lastM = m.M; cur.lastR = m.R; cur.len++;
    } else {
      cur = { kind: 'sweep', start: m, lastL: m.L, lastM: m.M, lastR: m.R, len: 1 };
      sweeps.push(cur);
    }
  } else { cur = { kind: 'gap', state: m }; sweeps.push(cur); }
}
const sw = sweeps.filter(s => s.kind === 'sweep');
console.log('sweeps:', sw.length, 'gaps:', sweeps.length - sw.length);
// terminal (last marker of each sweep) and next sweep start
console.log('--- terminal -> next start (first 40) ---');
let poisonStarts = 0;
for (let i = 0; i + 1 < sw.length && i < 40; i++) {
  const term = { L: sw[i].lastL, M: sw[i].lastM, R: sw[i].lastR };
  const next = sw[i + 1].start;
  console.log(`term(L${term.L},M${term.M},R${term.R}) [start was L${sw[i].start.L},M${sw[i].start.M},R${sw[i].start.R}, len${sw[i].len}] -> next start (L${next.L},M${next.M},R${next.R})`);
}
// poison-start check on ALL sweeps
const poisonM0 = new Set(['3,3,1', '3,5,1', '3,6,1', '3,12,1', '6,2,2', '6,1,2', '9,4,3']);
for (const s of sw) {
  const k = `${s.start.L},${s.start.M},${s.start.R}`;
  if (poisonM0.has(k)) { poisonStarts++; console.log('POISON SWEEP START!', k, 'at t=' + s.start.t); }
  // also: any marker IN the sweep at a poison cell
  let L = s.start.L, M = s.start.M, R = s.start.R;
  for (let j = 0; j < s.len; j++) {
    const kk = `${L},${M},${R}`;
    if (poisonM0.has(kk)) { poisonStarts++; console.log('POISON CELL IN SWEEP!', kk, 'at t=' + s.start.t); break; }
    L += 3; M -= 4; R += 1;
  }
}
console.log('poison sweep-cell hits:', poisonStarts);
// M0 mod 4 histogram of sweep starts + next-start map
const psi = new Map();
for (let i = 0; i + 1 < sw.length; i++) {
  const term = sw[i], next = sw[i + 1].start;
  const key = `term(M${term.lastM}%4=${term.lastM % 4},R%3=${term.lastR % 3})`;
  if (!psi.has(key)) psi.set(key, new Map());
  const mm = psi.get(key);
  const v = `next(L${next.L}%3=${next.L % 3},M0%4=${next.M % 4},R0%3=${next.R % 3})`;
  mm.set(v, (mm.get(v) || 0) + 1);
}
console.log('--- PSI map (terminal class -> next start class) ---');
for (const [k, v] of psi) { console.log(k, '->'); for (const [vv, c] of v) console.log('   ', vv, 'x' + c); }
