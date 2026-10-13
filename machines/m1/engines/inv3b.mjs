// inv3b.mjs — cascade witnesses W_d (d = 2..5) + halt-reachability + I1 violation classification.
import { readFileSync, writeFileSync } from 'fs';

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

export function inI0(c) {
  const r = c.r.map(Number);
  if (r.reduce((a, b) => a + b, 0) % 3 !== 0) return false;
  if (c.t === 'R') return r[1] >= 3;
  if (c.t === 'S') {
    if (r[1] < 1) return false;
    if (r[0] === 1 && r[1] === 2 && r[2] % 3 !== 1) return false;
    return true;
  }
  if (c.t === 'G') {
    if (r[0] === 2 && (r[1] < 2 || r[1] % 3 !== 2)) return false;
    return r[0] >= 2;
  }
  if (c.t === 'L') return r[2] >= 1 && r[1] >= 3;
  return false;
}
// I1 = I0 + immediate (depth-1) local guards
export function inI1(c) {
  if (!inI0(c)) return false;
  const r = c.r.map(Number);
  if (c.t === 'R' && r[1] % 2 === 0 && oddPart(r[0] + r[1] / 2 + 1) < 3n) return false;
  if (c.t === 'S') {
    const [x, y, z, ...rest] = r;
    if (y % 2 === 0) {
      const A = x + y / 2 + 1, w = z + y / 2;
      if (oddPart(A) < 3n) return false;
      if (A === 3 && (w < 2 || w % 3 !== 2 || (w % 2 === 1 && oddPart((3 * w + 7) / 2) < 3n))) return false;
    } else {
      const N = x + y + z + 2;
      if (r.length >= 4 && N % 2 === 0 && oddPart(rest[0] + N / 2 + 2) < 3n) return false;
    }
  }
  if (c.t === 'G') {
    if (oddPart(r[0] + 1) < 3n) return false;
    if (r[0] === 2 && r[1] % 2 === 1 && oddPart((3 * r[1] + 7) / 2) < 3n) return false;
  }
  if (c.t === 'L' && r[1] % 2 === 0 && oddPart(r[0] + r[2] + r[1] / 2 + 1) < 3n) return false;
  return true;
}

// births along pipeline (fresh S-even creations)
function birthsOf(c, nBirths = 6, maxSteps = 800) {
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
function runChain(c, maxSteps = 300) {
  const seq = [`${c.t}[${c.r.join(',')}]`];
  for (let i = 0; i < maxSteps; i++) {
    const st = step1(c);
    if (st.halt) { seq.push('HALT'); return { seq, halt: true }; }
    if (st.degenerate) { seq.push('DEG:' + st.degenerate); return { seq, deg: true }; }
    c = st.c; seq.push(`${c.t}[${c.r.join(',')}]`);
  }
  return { seq, cap: true };
}

// ---- W_d search: config in I1 whose first (d-1) births are good, d-th is a power of 2 ----
const witnesses = {};
function tryW(c) {
  if (!inI1(c)) return;
  const bs = birthsOf(c, 5);
  for (let j = 0; j < bs.length; j++) {
    if (isPow2(bs[j])) { const key = 'W' + (j + 1); if (!witnesses[key]) witnesses[key] = { c: `${c.t}[${c.r.join(',')}]`, births: bs.slice(0, j + 1).join(',') }; return; }
  }
}
// search space: L (k=3..7), S (k=3..6), R, G — values small-ish but covering residues & 2-adic
for (let r1 = 1; r1 <= 4; r1++) for (let r2 = 3; r2 <= 13; r2 += 2) for (let r3 = 1; r3 <= 3; r3++)
  for (let p2 = 1; p2 <= 10; p2++) for (let p3 = 1; p3 <= 14; p3++) {
    tryW({ t: 'L', r: [BigInt(r1), BigInt(r2), BigInt(r3), BigInt(p2), BigInt(p3)] });
    for (let p4 = 1; p4 <= 20; p4++) if ((p2 + p3 + p4) % 3 === 0) tryW({ t: 'L', r: [BigInt(r1), BigInt(r2), BigInt(r3), BigInt(p2), BigInt(p3), BigInt(p4)] });
  }
for (let x = 1; x <= 8; x++) for (let y = 1; y <= 9; y += 2) for (let z = 1; z <= 8; z++)
  for (let p2 = 1; p2 <= 10; p2++) for (let p3 = 1; p3 <= 12; p3++) {
    if ((x + y + z + p2 + p3) % 3 === 0) tryW({ t: 'S', r: [BigInt(x), BigInt(y), BigInt(z), BigInt(p2), BigInt(p3)] });
  }
console.log('cascade witnesses (in I1, j-th birth = 2^t):');
for (const k of Object.keys(witnesses).sort()) console.log(`  ${k}: ${witnesses[k].c}   births: ${witnesses[k].births}`);
// halt-reachability: each witness runs to halt or long chain
for (const k of Object.keys(witnesses).sort()) {
  const [t, rs] = witnesses[k].c.split('[');
  const rr = rs.slice(0, -1).split(',').map(BigInt);
  const rc = runChain({ t, r: rr });
  console.log(`  ${k} chain: ${rc.seq.length - 1} steps, halt=${rc.halt}, cap=${rc.cap || false}, deg=${rc.deg || false}`);
}
// ---- I1 violation classification over BROAD tails ----
{
  let n = 0; const cls = {};
  const chk = (c) => {
    if (!inI1(c)) return;
    const st = step1(c);
    if (st.halt || st.degenerate) { cls['halt/deg'] = (cls['halt/deg'] || 0) + 1; if (n < 6) { console.log('  VIOL ' + `${c.t}[${c.r}]`); n++; } return; }
    if (!inI1(st.c)) {
      const child = st.c; let why = child.t + ':';
      const cr = child.r.map(Number);
      if (child.t === 'S' && cr[1] % 2 === 1 && cr.length >= 4) why += 'Sodd-guard(N=' + (cr[0] + cr[1] + cr[2] + 2) + ')';
      else if (child.t === 'L') why += 'L-guard(r2=' + cr[1] + ')';
      else if (child.t === 'R') why += 'R-guard(b=' + cr[1] + ')';
      else if (child.t === 'G') why += 'G-form(a=' + cr[0] + ')';
      else why += 'S-even(A)';
      cls[why.split('(')[0]] = (cls[why.split('(')[0]] || 0) + 1;
      if (n < 14) { console.log(`  VIOL ${c.t}[${c.r}] -> ${child.t}[${child.r}]  (${why})`); n++; }
    }
  };
  console.log('I1 single-step violations (broad tails):');
  for (let r1 = 1; r1 <= 6; r1++) for (let r2 = 3; r2 <= 16; r2++) for (let r3 = 1; r3 <= 6; r3++)
    for (let p2 = 1; p2 <= 14; p2++) for (let p3 = 1; p3 <= 14; p3++) {
      if ((r1 + r2 + r3 + p2 + p3) % 3 === 0) chk({ t: 'L', r: [BigInt(r1), BigInt(r2), BigInt(r3), BigInt(p2), BigInt(p3)] });
      for (let p4 = 1; p4 <= 14; p4++) if ((r1 + r2 + r3 + p2 + p3 + p4) % 3 === 0) chk({ t: 'L', r: [BigInt(r1), BigInt(r2), BigInt(r3), BigInt(p2), BigInt(p3), BigInt(p4)] });
    }
  for (let x = 1; x <= 10; x++) for (let y = 1; y <= 12; y++) for (let z = 1; z <= 10; z++)
    for (let p2 = 1; p2 <= 12; p2++) for (let p3 = 1; p3 <= 12; p3++) {
      if ((x + y + z + p2 + p3) % 3 === 0) chk({ t: 'S', r: [BigInt(x), BigInt(y), BigInt(z), BigInt(p2), BigInt(p3)] });
      for (let p4 = 1; p4 <= 12; p4++) if ((x + y + z + p2 + p3 + p4) % 3 === 0) chk({ t: 'S', r: [BigInt(x), BigInt(y), BigInt(z), BigInt(p2), BigInt(p3), BigInt(p4)] });
    }
  console.log('  violation classes:', JSON.stringify(cls));
}
