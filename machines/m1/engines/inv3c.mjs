// inv3c.mjs — verify hand-constructed witnesses; randomized search for [good,...,pow2] birth cascades.
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
const oddPart = (v) => { let x = BigInt(v); while ((x & 1n) === 0n && x > 0n) x >>= 1n; return x; };
const isPow2 = (v) => { let x = BigInt(v); return x > 0n && (x & (x - 1n)) === 0n; };
function inI0(c) {
  const r = c.r.map(Number);
  if (r.reduce((a, b) => a + b, 0) % 3 !== 0) return false;
  if (c.t === 'R') return r[1] >= 3;
  if (c.t === 'S') { if (r[1] < 1) return false; if (r[0] === 1 && r[1] === 2 && r[2] % 3 !== 1) return false; return true; }
  if (c.t === 'G') { if (r[0] === 2 && (r[1] < 2 || r[1] % 3 !== 2)) return false; return r[0] >= 2; }
  if (c.t === 'L') return r[2] >= 1 && r[1] >= 3;
  return false;
}
function birthsOf(c, nBirths = 8, maxSteps = 3000) {
  const births = [];
  let prevEven = (c.t === 'S' && c.r[1] % 2n === 0n);
  if (prevEven) births.push(Number(c.r[0] + c.r[1] / 2n + 1n));
  for (let i = 0; i < maxSteps && births.length < nBirths; i++) {
    const st = step1(c);
    if (st.halt || st.degenerate) break;
    c = st.c;
    const nowEven = (c.t === 'S' && c.r[1] % 2n === 0n);
    if (nowEven && !prevEven) births.push(Number(c.r[0] + c.r[1] / 2n + 1n));
    prevEven = nowEven;
  }
  return births;
}
function runChain(c, maxSteps = 400) {
  const seq = [`${c.t}[${c.r.join(',')}]`];
  for (let i = 0; i < maxSteps; i++) {
    const st = step1(c);
    if (st.halt) { seq.push('HALT'); return { seq, halt: true }; }
    if (st.degenerate) { seq.push('DEG:' + st.degenerate); return { seq, deg: true }; }
    c = st.c; seq.push(`${c.t}[${c.r.join(',')}]`);
  }
  return { seq, cap: true };
}
// ---- verify hand witnesses ----
for (const [c, note] of [
  [{ t: 'S', r: [1n, 1n, 1n, 1n, 1n, 1n] }, 'W3-candidate: E5 -> L[1,5,1,1,1] (bad depth-2 site)'],
  [{ t: 'G', r: [4n, 2n, 7n, 5n] }, 'W4-candidate: G-head route'],
  [{ t: 'L', r: [1n, 3n, 1n, 3n, 1n] }, 'W2 = depth-2 classic'],
]) {
  const bs = birthsOf(c, 4);
  const rc = runChain(c);
  console.log(`${c.t}[${c.r}] inI0=${inI0(c)} births(first4)=${bs.slice(0, 4).join(',')} chainHalt=${rc.halt} steps=${rc.seq.length - 1} :: ${note}`);
}
// ---- randomized search for [good, pow2] and [good, good, pow2] ----
function randInt(mx) { return 1 + Math.floor(Math.random() * mx); }
const hits = { g1p2: null, g2p2: null };
outer:
for (let it = 0; it < 600000; it++) {
  const tc = Math.floor(Math.random() * 4);
  let t, k;
  if (tc === 0) { t = 'R'; k = 2; } else if (tc === 1) { t = 'S'; k = 3 + Math.floor(Math.random() * 6); } else if (tc === 2) { t = 'G'; k = 2 + Math.floor(Math.random() * 5); } else { t = 'L'; k = 3 + Math.floor(Math.random() * 6); }
  const r = [];
  for (let i = 0; i < k; i++) r.push(BigInt(randInt(46)));
  if (t === 'R' && r[1] < 3n) continue;
  const c = { t, r };
  if (!inI0(c)) continue;
  const bs = birthsOf(c, 3);
  if (bs.length >= 2 && !isPow2(bs[0]) && isPow2(bs[1])) { hits.g1p2 = hits.g1p2 || `${t}[${r.join(',')}] births ${bs.slice(0, 2).join(',')}`; }
  if (bs.length >= 3 && !isPow2(bs[0]) && !isPow2(bs[1]) && isPow2(bs[2])) { hits.g2p2 = hits.g2p2 || `${t}[${r.join(',')}] births ${bs.slice(0, 3).join(',')}`; }
  if (hits.g1p2 && hits.g2p2) break outer;
}
console.log('random search [good,pow2]:', hits.g1p2 || 'NOT FOUND');
console.log('random search [good,good,pow2]:', hits.g2p2 || 'NOT FOUND');
// halt-reachability of found witnesses
for (const h of [hits.g1p2, hits.g2p2]) {
  if (!h) continue;
  const [t, rs] = h.split('['); const rr = rs.split(']')[0].split(',').map(BigInt);
  const rc = runChain({ t, r: rr });
  console.log(`  ${h}: chain halt=${rc.halt} steps=${rc.seq.length - 1}`);
}
