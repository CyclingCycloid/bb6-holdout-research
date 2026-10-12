// routes.mjs — record the FULL intermediate chain (family-classified states) between an
// M2/M1-terminal and the next tail-less sweep start; grid over (L, R) to expose route structure.
import { build, runEra, parseRle } from '../reverify-cm2/ref-lib.mjs';
function classify(t) {
  const rl = t.rle(); const rs = parseRle(rl.s);
  if (rs.length === 0) return 'BLANK';
  let q = rl.lo, hi = -1, off = 0;
  for (let i = 0; i < rs.length; i++) { if (t.head >= q && t.head < q + rs[i].len) { hi = i; off = t.head - q; break; } q += rs[i].len; }
  const hc = hi < 0 ? 'out' : `r${hi}.${off}`;
  // A-form: 5 runs [1,0^1,1,0^5,1] head r3.1
  if (rs.length === 5 && rs[1].v === 0 && rs[1].len === 1 && rs[3].v === 0 && rs[3].len === 5 && hi === 3 && off === 1) return `A(L${rs[0].len},M${rs[2].len},R${rs[4].len})`;
  if (rs.length === 3 && rs[1].v === 0 && rs[1].len === 1 && hi === 2 && off === 0) return `gE(L${rs[0].len},M${rs[2].len})`;
  if (rs.length === 1 && rs[0].v === 1) return `outR(L${rs[0].len})`;
  // g5B: [1^L, 0^5, 1^M, 0^2, 1^R...] head in 0^5
  if (rs.length >= 5 && rs[1].v === 0 && rs[1].len === 5 && hi === 1) return `g5B(L${rs[0].len},M${rs[2].len},R${rs[4].len})`;
  // g6: [1^L, 0^6, 1^R...] head in 0^6
  if (rs.length >= 3 && rs[1].v === 0 && rs[1].len === 6 && hi === 1) return `g6o${off}(L${rs[0].len},R${rs[2].len})`;
  // generic
  return rs.map(x => (x.v ? 'B' + x.len : 'g' + x.len)).join(',') + '@' + hc;
}
function isTaillessA(t) { const rl = t.rle(); const rs = parseRle(rl.s);
  if (rs.length !== 5) return false;
  let q = rl.lo, hi = -1, off = 0;
  for (let i = 0; i < rs.length; i++) { if (t.head >= q && t.head < q + rs[i].len) { hi = i; off = t.head - q; break; } q += rs[i].len; }
  return rs[1].v === 0 && rs[1].len === 1 && rs[3].v === 0 && rs[3].len === 5 && hi === 3 && off === 1;
}
// follow from a terminal: eras until next tail-less A-marker (max 60 eras)
function route(runs, head) {
  const t = build(runs, head);
  const chain = [];
  for (let e = 0; e < 60; e++) {
    const c = classify(t);
    if (e > 0 && isTaillessA(t)) { chain.push('=> START ' + c); return chain; }
    if (e > 0) chain.push(c);
    const r = runEra(t);
    if (r.halt) { chain.push('HALT ' + r.halt); return chain; }
    if (r.nonterm) { chain.push(r.nonterm); return chain; }
  }
  chain.push('(60-era cap)');
  return chain;
}
console.log('===== M2-terminals: routes =====');
for (const [L, R] of [[26,1],[30,10],[42,14],[62,3],[83,12],[116,7],[111,36],[120,40],[141,47],[216,72]]) {
  console.log(`term(L${L},M2,R${R}):`);
  console.log('   ', route([{v:1,len:L},{v:0,len:1},{v:1,len:2},{v:0,len:5},{v:1,len:R}], L+1+2+1).join(' | ').slice(0, 220));
}
console.log('===== M1-terminals: routes =====');
for (const [L, R] of [[21,9],[24,19],[36,11],[39,12],[33,26],[48,20],[63,21],[98,6]]) {
  console.log(`term(L${L},M1,R${R}):`);
  console.log('   ', route([{v:1,len:L},{v:0,len:1},{v:1,len:1},{v:0,len:5},{v:1,len:R}], L+1+1+1).join(' | ').slice(0, 220));
}
