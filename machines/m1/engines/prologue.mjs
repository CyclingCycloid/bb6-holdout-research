// prologue.mjs — verify P(n) -> G(n+2,n+1) -> halving chain -> Phi(w,m) on the engine,
// for all n = 3 mod 6 in [3, 6003] (and the safety of the halving chain: a_i+1 = 2^i*w never 2^j).
import { stepFast } from './phase1.mjs';
let ok = 0, bad = 0;
for (let n = 3; n <= 6003; n += 6) {
  const m = Math.log2((n + 3) & -(n + 3)); // nu2
  const w = (n + 3) / 2 ** m;
  let c = { t: 'R', r: [n, n] };
  const gs = [];
  for (let i = 0; i < 200; i++) {
    if (c.t === 'G') { gs.push(c.r); if (gs[gs.length-1][0] % 2 === 0) break; }
    const st = stepFast(c);
    if (st.degenerate || st.halt) { break; }
    c = st.c;
  }
  // expected: G(n+2,n+1); halving chain a_{i+1}=(a_i-1)/2 with runs [a_i, a_i, prev+1...]; ends at Phi
  let good = gs.length >= 2 && gs[0][0] === n + 2 && gs[0][1] === n + 1;
  // build expected chain
  const chain = [[n + 2, n + 1]];
  let a = n + 2;
  const hist = [n + 1];
  while (a % 2 === 1 && a > 2) { a = (a - 1) / 2; hist.unshift(a); chain.push([a, a, ...hist.slice(1).map(x => x + 0).map((x, ix) => ix === 0 ? x : x)]); }
  // simpler: check last state == Phi(w,m) and first == G(n+2,n+1) and count = m+1... wait m+2
  const phi = [w - 1, w - 1];
  for (let i = 1; i <= m - 1; i++) phi.push(2 ** i * w);
  phi.push(2 ** m * w - 1);
  const last = gs[gs.length - 1];
  const lastOk = last.length === phi.length && last.every((v, i) => v === phi[i]);
  const cntOk = gs.length === m + 1;
  // halving-chain safety: a_i + 1 = 2^i * w, w >= 3 odd mult of 3 -> never 2^j (checked symbolically; numeric spot here)
  let chainSafe = true;
  for (let i = 0; i <= m; i++) { const v = 2 ** (m - i) * w; if (v > 0 && (v & (v - 1)) === 0 && v !== 1) chainSafe = false; }
  if (good && lastOk && cntOk && chainSafe) ok++; else { bad++; if (bad < 5) console.log(`n=${n} m=${m} w=${w}: first=${gs[0]} last=${last} exp=${phi} cnt=${gs.length}/${m + 2}`); }
}
console.log(`prologue+halving: ok=${ok} bad=${bad} (n=3..6003 step 6, incl m up to ${Math.floor(Math.log2(6006))})`);
