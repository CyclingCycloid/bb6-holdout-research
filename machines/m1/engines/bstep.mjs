// bstep.mjs — BigInt mirror of phase1.mjs stepFast/transitionFast (same rules, exact arithmetic).
// Validated against the Number engine on the overlap range by bval.mjs.
export function stepFastB(c) {
  const B = BigInt;
  if (c.t === 'R') {
    const [a, b] = c.r;
    if (b < 3n) return { degenerate: `R(a=${a},b=${b}) b<3` };
    return { c: { t: 'S', r: [a + 1n, b - 2n, 1n] }, cost: 2n * b + 3n, rule: 'R->S3' };
  }
  if (c.t === 'S') {
    const [x, y, z, ...rest] = c.r;
    if (y >= 3n) {
      let j, ey, cost;
      if (y % 2n === 1n) { j = (y - 1n) / 2n; ey = 1n; const mm = (y - 1n) / 2n; cost = 2n * mm * mm + 7n * mm; }
      else { j = (y - 2n) / 2n; ey = 2n; const mm = y / 2n; cost = 2n * mm * mm + 5n * mm - 7n; }
      const c2 = ey === 1n
        ? (rest.length === 0 ? { t: 'R', r: [1n, x + j + z + j + 3n] } : { t: 'L', r: [1n, x + j + z + j + 3n, ...rest] })
        : { t: 'G', r: [x + j + 1n, z + j + 1n, ...rest] };
      const cost2 = ey === 1n ? 2n * (x + j) + (z + j) + 14n : 7n;
      return { c: c2, cost: cost + cost2, rule: `S-sweep(y->${ey})` };
    }
    if (y === 2n) return { c: { t: 'G', r: [x + 1n, z + 1n, ...rest] }, cost: 7n, rule: 'S(y2)->G' };
    if (y === 1n) {
      if (rest.length === 0) return { c: { t: 'R', r: [1n, x + z + 3n] }, cost: 2n * x + z + 14n, rule: 'S3(y1)->R' };
      return { c: { t: 'L', r: [1n, x + z + 3n, ...rest] }, cost: 2n * x + z + 14n, rule: 'S(y1)->L' };
    }
    return { degenerate: `S y=${y}` };
  }
  if (c.t === 'G') {
    const [a, b, ...rest] = c.r;
    if (a >= 4n) return { c: { t: 'S', r: [1n, a - 3n, 1n, b + 1n, ...rest] }, cost: 2n * a + 3n, rule: 'G->S' };
    if (a === 3n) return { c: { t: 'G', r: [1n, 1n, b + 1n, ...rest] }, cost: 9n, rule: 'G(a3)->G(1,1,b+1)' };
    if (a === 2n) return { c: { t: 'L', r: [1n, 3n, b + 1n, ...rest] }, cost: 16n, rule: 'G(a2)->L(1,3,b+1)' };
    if (a === 1n) return { halt: true, cost: 6n, rule: 'G(a1)->HALT' };
    return { degenerate: `G a=${a}` };
  }
  if (c.t === 'L') {
    const [r1, r2, r3, ...rest] = c.r;
    if (r3 >= 2n) {
      const j = r3 - 1n;
      const cost = j * (2n * r2 + 5n) + (2n * r2 + 5n);
      if (c.r.length === 3) return { c: { t: 'R', r: [r1 + j + 1n, r2] }, cost, rule: 'L3-sw->R' };
      return { c: { t: 'S', r: [r1 + j + 1n, r2, ...rest] }, cost, rule: 'L-sw->S' };
    }
    if (r3 === 1n) {
      if (c.r.length === 3) return { c: { t: 'R', r: [r1 + 1n, r2] }, cost: 2n * r2 + 5n, rule: 'L3->R' };
      return { c: { t: 'S', r: [r1 + 1n, r2, ...rest] }, cost: 2n * r2 + 5n, rule: 'L->S' };
    }
    return { degenerate: `L r3=${r3}` };
  }
  return { degenerate: 'unknown type' };
}
export function transitionFastB(n) {
  let c = { t: 'R', r: [BigInt(n), BigInt(n)] }, t = 0n;
  for (let i = 0; i < 1e6; i++) {
    const st = stepFastB(c);
    if (st.degenerate) return { degenerate: st.degenerate };
    if (st.halt) return { halt: true, cost: t + st.cost };
    t += st.cost; c = st.c;
    if (c.t === 'R' && c.r[0] === c.r[1] && c.r[0] >= 2n) return { n2: c.r[0], cost: t };
  }
  return { deggenerate: 'cap', degenerate: 'iteration cap' };
}
