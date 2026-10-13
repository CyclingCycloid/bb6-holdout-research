// births5.mjs — long-run birth-class certifier.
// Signature of a root birth = (ty, nu2(A), A mod 2^a*9 with a = nu2+8 capped, q mod 144).
// Verify: no signature contains a power of 2 (q=1 impossible / residue separated).
// Log every NEW signature with full context; final table.
// Usage: node births5.mjs NANCH
import { stepFastB } from './bstep.mjs';
const NANCH = Number(process.argv[2] ?? 1000000);
const B = BigInt;
const nu2 = (v) => { let n = 0; let x = B(v); while ((x & 1n) === 0n) { n++; x >>= 1n; } return { j: n, q: x }; };
const mod = (v, m) => Number(((B(v) % B(m)) + B(m)) % B(m));

let n = 3n;
const sigs = new Map(); // key -> {count, ex (first ctx), As: first few A, qs}
let bad = 0, roots = 0;
const newSigs = [];
outer:
for (let k = 0; k < NANCH; k++) {
  let c = { t: 'R', r: [n, n] };
  let prevT = 'START', prevC = null;
  for (let it = 0; it < 9000000; it++) {
    if (c.t === 'S' && (c.r[1] & 1n) === 0n) {
      const A = c.r[0] + c.r[1] / 2n + 1n;
      let ty = null, ctx = '';
      if (prevT === 'L') { ty = 'Lk'; ctx = 'L(' + prevC.r.map(String).join(',') + ')'; }
      else if (prevT === 'R') {
        if (prevC.r[0] === 1n) { ty = 'E1r'; ctx = 'R(1,' + prevC.r[1] + ')'; }
        else { ty = 'L3'; ctx = 'R(' + prevC.r.map(String).join(',') + ')'; }
      }
      if (ty) {
        roots++;
        const { j, q } = nu2(A);
        if (q === 1n) { console.log(`!!! POWER-OF-2 BIRTH A=${A} ty=${ty} ctx=${ctx} anchor=${k}`); bad++; }
        const M = 9 * (2 ** Math.min(j + 8, 24));
        const key = `${ty}|j${j}|A%${M}=${mod(A, M)}|q%144=${mod(q, 144)}`;
        let e = sigs.get(key);
        if (!e) { e = { count: 0, ex: `${ctx} A=${A}`, As: [] }; sigs.set(key, e); newSigs.push(key + '  <- ' + e.ex + ' anchor=' + k); }
        e.count++;
        if (e.As.length < 4) e.As.push(A.toString());
      }
    }
    prevT = c.t; prevC = c;
    const st = stepFastB(c);
    if (st.degenerate || st.halt) { console.log('END', st.degenerate || 'HALT', 'anchor', k); break outer; }
    c = st.c;
    if (c.t === 'R' && c.r[0] === c.r[1] && c.r[0] >= 2n) break;
  }
  n = c.r[0];
  if ((k & 65535) === 0) console.error(`anchor ${k} n=${n} roots=${roots} sigs=${sigs.size} bad=${bad}`);
}
console.log(`DONE anchors=${NANCH} finalN=${n} roots=${roots} bad=${bad} distinct-sigs=${sigs.size}`);
// check each sig for power containment
console.log('\n== signature table (count | signature | example) ==');
const arr = [...sigs.entries()].sort((a, b) => b[1].count - a[1].count);
for (const [k2, e] of arr) console.log(`${String(e.count).padStart(9)}  ${k2}   ex: ${e.ex}  As: ${e.As.join(',')}`);
console.log('\nnew sigs in order of appearance (first 60):');
for (const s of newSigs.slice(0, 60)) console.log('  ' + s);
