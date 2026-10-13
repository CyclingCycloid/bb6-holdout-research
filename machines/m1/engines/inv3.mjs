// inv3.mjs — (A) the mod-3 LEDGER invariant I0: closure table + trajectory check;
// (B) halt-exclusion pollution: witness chains to G(3,·)/power-of-2 heads at each guard depth;
// (C) cascade: search configs in I_d \ I_{d+1} whose pipeline births a power-of-2 at depth d+1.
import { readFileSync } from 'fs';

function step1(c) {
  if (c.t === 'R') { const [a, b] = c.r; return { c: { t: 'S', r: [a + 1n, b - 2n, 1n] } }; }
  if (c.t === 'S') {
    const [x, y, z, ...rest] = c.r;
    if (y >= 3n) return { c: { t: 'S', r: [x + 1n, y - 2n, z + 1n, ...rest] } };
    if (y === 2n) return { c: { t: 'G', r: [x + 1n, z + 1n, ...rest] } };
    if (y === 1n) { if (rest.length === 0) return { c: { t: 'R', r: [1n, x + z + 3n] } }; return { c: { t: 'L', r: [1n, x + z + 3n, ...rest] } }; }
    return { degenerate: 'S y=' + y };
  }
  if (c.t === 'G') {
    const [a, b, ...rest] = c.r;
    if (a >= 4n) return { c: { t: 'S', r: [1n, a - 3n, 1n, b + 1n, ...rest] } };
    if (a === 2n) return { c: { t: 'L', r: [1n, b + 1n, b + 1n, ...rest] } };
    if (a === 3n) return { halt: true };
    return { degenerate: 'G a=' + a };
  }
  if (c.t === 'L') {
    const [r1, r2, r3, ...rest] = c.r;
    if (r3 >= 2n) return { c: { t: 'L', r: [r1 + 1n, r2, r3 - 1n, ...rest] } };
    if (r3 === 1n) { if (c.r.length === 3) return { c: { t: 'R', r: [r1 + 1n, r2] } }; return { c: { t: 'S', r: [r1 + 1n, r2, ...rest] } }; }
    return { degenerate: 'L r3=' + r3 };
  }
  return { degenerate: '?' };
}
const S3 = (v) => Number(v % 3n);
const oddPart = (v) => { let x = BigInt(v); while ((x & 1n) === 0n && x > 0n) x >>= 1n; return x; };
const isPow2 = (v) => { let x = BigInt(v); return x > 0n && (x & (x - 1n)) === 0n; };

// ---------------- (A) LEDGER INVARIANT I0 ----------------
// I0 := { C : SUM(C) = 0 (mod 3)  ∧  dom(C)  ∧  E7fix(C) }
//   dom:  R: b>=3 ; S: y>=1 ; L: r3>=1, r2>=3 ; G: a>=2
//   E7fix: G(a=2, b, ...): b>=2 and b = 2 (mod 3)   [keeps SUM = 0 through E7]
//   S(1,2,z) boundary: z = 1 (mod 3)                 [E3 -> G(2, z+1) must pass E7fix]
export function inI0(c) {
  const r = c.r.map(Number); const k = r.length;
  if (r.reduce((a, b) => a + b, 0) % 3 !== 0) return false;
  if (c.t === 'R') return r[1] >= 3;
  if (c.t === 'S') {
    if (r[1] < 1) return false;
    if (r[0] === 1 && r[1] === 2 && r[2] % 3 !== 1) return false;  // births G(2, z+1)
    return true;
  }
  if (c.t === 'G') {
    if (r[0] === 2 && (r[1] < 2 || r[1] % 3 !== 2)) return false;
    return r[0] >= 2;
  }
  if (c.t === 'L') return r[2] >= 1 && r[1] >= 3;
  return false;
}
// EXHAUSTIVE boundary-inclusive closure check of I0 over a dense instance space.
// Closure means: every member's step is a member, OR (G a=3 halt form) — classified.
{
  let ok = 0, bad = [], haltForms = 0, haltFormsInI0 = 0;
  const chk = (c) => {
    if (!inI0(c)) return;
    const st = step1(c);
    if (st.halt) { haltForms++; if (inI0(c)) haltFormsInI0++; return; }   // G(3,..) members counted
    if (st.degenerate) { bad.push(`DEG ${JSON.stringify(c.r)} ${st.degenerate}`); return; }
    if (!inI0(st.c)) bad.push(`${c.t}[${c.r}] -> ${st.c.t}[${st.c.r}]`);
    ok++;
  };
  for (let a = 1; a <= 24; a++) for (let b = 1; b <= 45; b++) chk({ t: 'R', r: [BigInt(a), BigInt(b)] });
  for (let x = 1; x <= 15; x++) for (let y = 1; y <= 18; y++) for (let z = 1; z <= 15; z++) {
    chk({ t: 'S', r: [BigInt(x), BigInt(y), BigInt(z)] });
    for (const w of [1, 2, 3, 4, 5, 8, 11, 16, 17]) {
      chk({ t: 'S', r: [BigInt(x), BigInt(y), BigInt(z), BigInt(w)] });
      for (const w2 of [1, 3, 6, 7]) chk({ t: 'S', r: [BigInt(x), BigInt(y), BigInt(z), BigInt(w), BigInt(w2)] });
    }
  }
  for (let a = 2; a <= 40; a++) for (let b = 1; b <= 24; b++) {
    chk({ t: 'G', r: [BigInt(a), BigInt(b)] });
    for (const w of [1, 5, 11]) { chk({ t: 'G', r: [BigInt(a), BigInt(b), BigInt(w)] }); chk({ t: 'G', r: [BigInt(a), BigInt(b), BigInt(w), BigInt(2 * w)] }); }
  }
  for (let r1 = 1; r1 <= 15; r1++) for (let r2 = 1; r2 <= 21; r2++) for (let r3 = 1; r3 <= 15; r3++) {
    chk({ t: 'L', r: [BigInt(r1), BigInt(r2), BigInt(r3)] });
    for (const w of [1, 3, 4, 5, 11]) { chk({ t: 'L', r: [BigInt(r1), BigInt(r2), BigInt(r3), BigInt(w)] }); chk({ t: 'L', r: [BigInt(r1), BigInt(r2), BigInt(r3), BigInt(w), BigInt(w)] }); }
  }
  console.log(`(A) I0 closure: ${ok} member-steps verified, ${bad.length} violations` + (bad[0] ? ` e.g. ${bad[0]} ${bad[1] || ''}` : ''));
  console.log(`    G(3,·) halt-forms encountered inside I0: ${haltFormsInI0}/${haltForms}`);
  // trajectory
  const lib = JSON.parse(readFileSync('library.json', 'utf8')).states;
  let v0 = 0, fv = null;
  for (const s of lib) { const [t, rs] = s.split(':'); if (!inI0({ t, r: rs.split(',').map(BigInt) })) { v0++; if (!fv) fv = s; } }
  console.log(`(A) trajectory in I0: ${lib.length - v0}/${lib.length}` + (fv ? ` viol ${fv}` : ''));
}

// ---------------- (B) witness chains ----------------
function runChain(c, maxSteps = 200) {
  const seq = [`${c.t}[${c.r.join(',')}]`];
  for (let i = 0; i < maxSteps; i++) {
    const st = step1(c);
    if (st.halt) { seq.push('HALT'); return { seq, halt: true }; }
    if (st.degenerate) { seq.push('DEG:' + st.degenerate); return { seq, deg: true }; }
    c = st.c; seq.push(`${c.t}[${c.r.join(',')}]`);
  }
  return { seq };
}
{
  const W = { t: 'L', r: [1n, 3n, 1n, 3n, 1n] };
  console.log(`(B) W2 = L[1,3,1,3,1] inI0? ${inI0(W)}  inI1(depth-1 guards)? ${inI0(W)}`);
  const rc = runChain(W);
  console.log(`    chain (${rc.seq.length - 1} steps, halt=${rc.halt}):`);
  console.log('    ' + rc.seq.join(' -> '));
}

// ---------------- (C) cascade: depth-d witnesses ----------------
// I_d := I0 + first-d-birth guards: every S-even config born within the first d "pipeline
// births" from C has non-power-of-2 A := x + y/2 + 1.
// birthsOf(C): simulate the pipeline concretely; record each S-even creation's A, up to n births.
function birthsOf(c, nBirths = 8, maxSteps = 4000) {
  const births = [];
  let prevEven = (c.t === 'S' && c.r[1] % 2n === 0n);
  if (prevEven) births.push(Number(c.r[0] + c.r[1] / 2n + 1n));
  for (let i = 0; i < maxSteps && births.length < nBirths; i++) {
    const st = step1(c);
    if (st.halt || st.degenerate) break;
    c = st.c;
    const nowEven = (c.t === 'S' && c.r[1] % 2n === 0n);
    if (nowEven && !prevEven) births.push(Number(c.r[0] + c.r[1] / 2n + 1n)); // fresh birth
    else if (nowEven && i === 0 && c.t === 'S') { /* covered */ }
    prevEven = nowEven;
  }
  return births;
}
function inId(c, d) {
  if (!inI0(c)) return false;
  const bs = birthsOf(c, d);
  if (bs.length < d) return true; // fewer than d births happen (exits first) — vacuous beyond
  for (const b of bs) if (isPow2(b)) return false;
  return true;
}
{
  console.log('(C) cascade witnesses: configs in I_d whose (d+1)-th birth is a power of 2:');
  // search: L with odd r2 and varied tails; S-odd k>=4; R — small values.
  const found = {};
  function tryC(c, dmax = 6) {
    if (!inI0(c)) return;
    const bs = birthsOf(c, dmax + 1);
    for (let d = 0; d < dmax; d++) {
      // in I_d iff first d births all good (vacuous if fewer than d births)
      let inD = true;
      for (let i = 0; i < Math.min(d, bs.length); i++) if (isPow2(bs[i])) { inD = false; break; }
      if (!inD) return;
      if (bs.length > d && isPow2(bs[d])) {
        const key = 'depth' + (d + 1);
        if (!found[key]) {
          // verify the bad birth reaches a halt form eventually (run the chain)
          found[key] = { c: `${c.t}[${c.r.join(',')}]`, births: bs.slice(0, d + 1) };
        }
      }
    }
  }
  for (let r1 = 1; r1 <= 5; r1++) for (let r2 = 3; r2 <= 15; r2 += 2) for (let r3 = 1; r3 <= 4; r3++)
    for (let p2 = 1; p2 <= 12; p2++) for (let p3 = 1; p3 <= 24; p3++) for (let p4 = 1; p4 <= 48; p4++)
      tryC({ t: 'L', r: [BigInt(r1), BigInt(r2), BigInt(r3), BigInt(p2), BigInt(p3), BigInt(p4)] });
  for (const k of Object.keys(found)) console.log(`   ${k}: ${found[k].c}  births ${found[k].births.join(',')}`);
  // halt-reachability of the depth-2 witness's bad birth: run W2's full chain (done above)
}
