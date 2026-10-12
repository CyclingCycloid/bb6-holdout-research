// hunt2.mjs — verified lethal preimage grid + deep era-level orbit hunt.
import { FastTape } from './macro3.mjs';
import { build, runEra, parseRle, macroStepGuarded } from '../reverify-cm2/ref-lib.mjs';
function taillessA(t) { const rl = t.rle(); const rs = parseRle(rl.s);
  if (rs.length !== 5) return null;
  let q = rl.lo, hi = -1, off = 0;
  for (let i = 0; i < rs.length; i++) { if (t.head >= q && t.head < q + rs[i].len) { hi = i; off = t.head - q; break; } q += rs[i].len; }
  if (rs[1].v === 0 && rs[1].len === 1 && rs[3].v === 0 && rs[3].len === 5 && hi === 3 && off === 1)
    return { L: rs[0].len, M: rs[2].len, R: rs[4].len };
  return null; }
const lethal = [];
for (const M of [1,2]) for (let L = 3; L <= 33; L++) for (let R = 1; R <= 8; R++) {
  const t = build([{v:1,len:L},{v:0,len:1},{v:1,len:M},{v:0,len:5},{v:1,len:R}], L+1+M+1);
  for (let e = 0; e < 300; e++) { const r = runEra(t);
    if (r.halt) { lethal.push({ M, L, R, k: r.halt, e: e+1 }); break; }
    if (r.nonterm) break; }
}
console.log('verified lethal M1/M2-terminals (L<=33, R<=8):', lethal.length);
console.log(lethal.map(x => `(M${x.M},L${x.L},R${x.R})`).join(' '));
const m3ok = lethal.filter(x => x.L % 3 === 0);
console.log('L≡0 (mod 3) subset [orbit-compatible]:', m3ok.map(x => `(M${x.M},L${x.L},R${x.R})`).join(' ') || '(none)');
// ALSO: M3-terminal R lethal check is direct (R in lineage); extend grid for M3 R small
const lethalM3 = [];
for (let L = 3; L <= 33; L += 3) for (const R of [1, 7, 31]) {
  const t = build([{v:1,len:L},{v:0,len:1},{v:1,len:3},{v:0,len:5},{v:1,len:R}], L+5);
  for (let e = 0; e < 300; e++) { const r = runEra(t);
    if (r.halt) { lethalM3.push(`(M3,L${L},R${R})@${e+1}`); break; }
    if (r.nonterm) break; }
}
console.log('M3-lineage lethality re-verification:', lethalM3.join(' '));
// ==== deep hunt ====
const CAP = +process.argv[2] || 1e10;
const t2 = new FastTape();
let eras = 0, hits = 0;
const lethalSet = new Set(lethal.map(x => `(M${x.M},L${x.L},R${x.R})`));
let lastLog = 0;
const t0 = Date.now();
while (t2.step < CAP) {
  const r = macroStepGuarded(t2);
  if (String(r.kind).startsWith('HALT')) { console.log('!!! ORBIT HALT', r.kind, t2.step); break; }
  if (r.kind === 'Dance' || r.kind === 'DanceFill' || r.kind === 'DBL' || r.kind === 'L1') {
    eras++;
    const a = taillessA(t2);
    if (a) {
      const key = `(M${a.M},L${a.L},R${a.R})`;
      if (lethalSet.has(key)) { hits++; console.log('LETHAL-PREIMAGE HIT t=' + t2.step, key, 'era', eras); break; }
      if (a.M === 3 && (a.R === 1 || a.R === 7 || a.R === 31 || a.R === 127)) { hits++; console.log('LINEAGE HIT t=' + t2.step, key, 'era', eras); break; }
    }
  }
  if (t2.step - lastLog > 2e9) { lastLog = t2.step; console.error('t=' + t2.step, 'eras=' + eras, ((Date.now()-t0)/1000)+'s'); }
}
console.log('hunt done: t=' + t2.step, 'eras=' + eras, 'hits=' + hits, ((Date.now()-t0)/1000).toFixed(0) + 's');
