// sym4.mjs — round-law symbolic engine: proves the landmark-family closure for ALL m.
//
// Landmark family:  L(alpha, t; slack s) = G( alpha + 3*2^(t-3)w, (alpha-1) + 5*2^(t-3)w,
//      2^t w, 2^(t+1) w, ..., 2^(t+s) w, 2^(t+s+1) w - 1 )
//   alpha = 1 mod 6, alpha >= 7, t >= 9 (tail not yet exhausted: s >= 0, m = t+s+1).
// h-class parametrization: alpha = 2^(h+1)*(3c + rho_h) + 2^h - 1, c >= 0 free,
//   rho_h in {0,1,2} the unique residue with alpha = 1 mod 6 (pins nu2(alpha+1)=h exactly,
//   since alpha+1 = 2^h*(2(3c+rho)+1) with odd cofactor).
// Values: {g, e, d0, du, dc} = g*2^(tlb+e)*w + d0 + du*u + dc*c,  w = 6u+3 (u >= lo >= 0),
//   tlb = lower bound on the current landmark's t (exact in concrete mode), only grows.
// Rules mirror bstep.mjs stepFast exactly (collapsed sweeps). Branch decisions:
//   parity: tlb+e >= 1 -> parity of d-part (needs du,dc even; else SPLIT on c or u);
//           tlb+e = 0 (exact mode) -> 1 XOR parity(d-part) (g odd after norm, w odd).
//   run >= c comparisons via lower bounds over the domain (u >= lo, c >= cmin, w >= 3, t >= tlb).
// Outcomes: NEXT(alpha' = alpha + dAlpha, dt) [landmark closure], ANCHOR n'=... [endgame],
//   HALT/DEGEN/FAIL/*-SMALL = incompleteness (must be empty for a complete proof).
// Usage: node sym4.mjs H SLACK [T0] [concrete]
//   H = h-class; SLACK = tail slack s (>= dt(h) -> one round then NEXT; < dt(h) -> endgame);
//   T0 = lower bound on t (default H+16); 'concrete' = T0 is the exact t (early rounds).
import { writeFileSync } from 'fs';

const H = BigInt(+(process.argv[2] ?? 1) || 1);
const SLACK = process.argv[3] !== undefined ? BigInt(+process.argv[3]) : 16n;
const T0 = process.argv[4] !== undefined ? BigInt(+process.argv[4]) : H + 16n;
const CONCRETE = process.argv[5] === 'concrete';
const PINU = process.argv[6] !== undefined ? BigInt(+process.argv[6]) : null; // debug: pin u
const PINC = process.argv[7] !== undefined ? BigInt(+process.argv[7]) : null; // debug: pin c

const C = (x) => ({ g: 0n, e: 0n, d0: BigInt(x), du: 0n, dc: 0n });
const isC = (v) => v.g === 0n && v.du === 0n && v.dc === 0n;
function align(v1, v2) {
  const e = v1.e < v2.e ? v1.e : v2.e;
  const f = (v) => ({ ...v, g: v.g === 0n ? 0n : v.g * 2n ** (v.e - e), e });
  return [f(v1), f(v2)];
}
const norm = (v) => { let g = v.g, e = v.e; while (g !== 0n && g % 2n === 0n) { g /= 2n; e += 1n; } return { g, e, d0: v.d0, du: v.du, dc: v.dc }; };
const ADD = (x, y) => { const [a, b] = align(x, y); return norm({ g: a.g + b.g, e: a.e, d0: a.d0 + b.d0, du: a.du + b.du, dc: a.dc + b.dc }); };
const SUB = (x, y) => { const [a, b] = align(x, y); return norm({ g: a.g - b.g, e: a.e, d0: a.d0 - b.d0, du: a.du - b.du, dc: a.dc - b.dc }); };
const SH1 = (x, tlb) => (CONCRETE && x.g !== 0n && tlb + x.e === 0n
  ? norm({ g: 0n, e: 0n, d0: (x.g * 3n + x.d0 - 1n) / 2n, du: (x.g * 6n + x.du) / 2n, dc: x.dc / 2n })   // (g*w + d - 1)/2 at w-scale
  : { g: x.g, e: x.e - 1n, d0: (x.d0 - 1n) / 2n, du: x.du / 2n, dc: x.dc / 2n }); // (x-1)/2, x odd on domain
const SH2 = (x, tlb) => (CONCRETE && x.g !== 0n && tlb + x.e === 0n
  ? norm({ g: 0n, e: 0n, d0: (x.g * 3n + x.d0 - 2n) / 2n, du: (x.g * 6n + x.du) / 2n, dc: x.dc / 2n })
  : { g: x.g, e: x.e - 1n, d0: (x.d0 - 2n) / 2n, du: x.du / 2n, dc: x.dc / 2n }); // (x-2)/2, x even on domain
const show = (v) => (v.g === 0n ? `` : `${v.g}W${v.e >= 0n ? '+' : ''}${v.e}`) +
  (v.g === 0n || (v.d0 === 0n && v.du === 0n && v.dc === 0n) ? `` : `+`) +
  (v.du === 0n && v.dc === 0n ? `${v.d0}` : `(${v.d0}${v.du ? '+' + v.du + 'u' : ''}${v.dc ? '+' + v.dc + 'c' : ''})`);
const mod2 = (x) => ((x % 2n) + 2n) % 2n;

const paths = [];
const work = [];
const MAXEV = 21 * Number(H) + 6 * Number(T0) + 240; // halvings + cascade + R-chase (~3t events)
let pushes = 0, MAXPUSH = +(process.env.SYM4_MAXPUSH || 400000);
let boundaryUses = 0, foldUses = 0;
function walk(st0) {
  work.push({ st: st0, lo: 0n, cmin: 0n, tlb: T0, ev: [], gs: [], dep: 0 });
  const seen = new Set();
  while (work.length) {
    if (pushes++ > MAXPUSH) { paths.push({ out: 'PUSH-CAP' }); break; }
    const it = work.pop(); const { lo, cmin, tlb, dep } = it; let ev = it.ev, gs = it.gs;
    let st = it.st;
    {
      const key = st.t + '|' + lo + '|' + cmin + '|' + tlb + '|' + st.r.map(v => `${v.g},${v.e},${v.d0},${v.du},${v.dc}`).join(';');
      if (seen.has(key)) continue;
      seen.add(key);
    }
    // CONCRETE fold: at t+e = 0 the w-scale term g*2^0*w = g*(6u+3) folds into the affine part
    if (CONCRETE) {
      let folded = false;
      st = { t: st.t, r: st.r.map(v => {
        if (v.g !== 0n && tlb + v.e <= 0n) { folded = true; foldUses++; return norm({ g: 0n, e: 0n, d0: v.g * 3n + v.d0, du: v.g * 6n + v.du, dc: v.dc }); }
        return v;
      }) };
      if (folded && st.t === 'G') gs = [...gs, st.r.map(show).join(',')];
    }
    const push = (st2, lo2, cm2, tlb2, ev2, gs2) => work.push({ st: st2, lo: lo2, cmin: cm2, tlb: tlb2, ev: ev2, gs: gs2, dep: dep + 1 });
    // lower bound of value over domain (u>=lo, c>=cmin, w>=3, t>=tlb)
    const lb = (v) => {
      let b = v.d0 + v.du * (v.du >= 0n ? lo : 0n) + v.dc * (v.dc >= 0n ? cmin : 0n);
      if (v.du < 0n || v.dc < 0n) return null; // negative slope: no lb (reported by caller)
      if (v.g > 0n) { if (tlb + v.e < 0n) return null; b += v.g * 2n ** (tlb + v.e) * 3n; }
      return b;
    };
    // parity with splits; returns 0n/1n or 'SPLIT' (sub-paths pushed)
    const par = (v) => {
      if (v.g === 0n || tlb + v.e >= 1n || (CONCRETE && tlb + v.e >= 0n)) {
        const pu = mod2(v.du), pc = mod2(v.dc);
        if (pu === 0n && pc === 0n) {
          let p = mod2(v.d0);
          if (CONCRETE && v.g !== 0n && tlb + v.e === 0n) { p = 1n ^ p; boundaryUses++; } // g*w odd contribution
          return p;
        }
        if (pc === 1n) {
          for (const pp of [0n, 1n]) {
            const f = (x) => ({ ...x, d0: x.d0 + x.dc * pp, dc: 2n * x.dc });
            push({ t: st.t, r: st.r.map(f) }, lo, pp === 0n ? cmin : (cmin > 0n ? (cmin - 1n + 2n) / 2n : 0n), tlb, [...ev], [...gs]);
          }
          return 'SPLIT';
        } else {
          for (const pp of [0n, 1n]) {
            const f = (x) => ({ ...x, d0: x.d0 + x.du * pp, du: 2n * x.du });
            const loNew = (lo - pp + 1n) / 2n < 0n ? 0n : (lo - pp + 1n) / 2n;
            push({ t: st.t, r: st.r.map(f) }, loNew, cmin, tlb, [...ev], [...gs]);
          }
          return 'SPLIT';
        }
      }
      paths.push({ st, lo, cmin, tlb, ev, gs, out: `FAIL tlb+e<1 (${tlb + v.e}) at ${show(v)}` });
      return 'FAILED';
    };
    if (dep > MAXEV) { paths.push({ st, lo, cmin, tlb, ev, gs, out: 'DEPTH-CAP' }); continue; }
    // finite small-case split for pure-affine values: v = d0 + du*u + dc*c <= thr on part of the domain.
    // Decompose into pinned points/rows (u and/or c substituted) + residual boxes; capped size.
    const floorDiv = (a, b) => { const q = a / b; return (a % b !== 0n && ((a < 0n) !== (b < 0n))) ? q - 1n : q; };
    const pinU = (u) => st.r.map(x => ({ ...x, d0: x.d0 + x.du * u, du: 0n }));
    const pinC = (c) => st.r.map(x => ({ ...x, d0: x.d0 + x.dc * c, dc: 0n }));
    const splitSmall = (v, thr) => {
      if (v.g !== 0n || v.du < 0n || v.dc < 0n) return false;
      const TH = BigInt(thr);
      let pushesNeeded = 0;
      if (v.du === 0n && v.dc === 0n) return false;
      if (v.du === 0n) {
        const Cmax = floorDiv(TH - v.d0, v.dc);
        if (Cmax < cmin) return false;
        pushesNeeded = Number(Cmax - cmin) + 2;
        if (pushesNeeded > 80) return false;
        for (let c = cmin; c <= Cmax; c++) push({ t: st.t, r: pinC(c) }, lo, 0n, tlb, [...ev, 'sm'], gs);
        push({ t: st.t, r: st.r }, lo, Cmax + 1n, tlb, [...ev, 'sm'], gs);
        return true;
      }
      const Umax = floorDiv(TH - v.d0, v.du);
      if (Umax < lo) return false;
      for (let u = lo; u <= Umax; u++) pushesNeeded += (v.dc === 0n ? 1 : Number(floorDiv(TH - v.d0 - v.du * u, v.dc) - cmin) + 2);
      pushesNeeded += 1;
      if (pushesNeeded > 80) return false;
      for (let u = lo; u <= Umax; u++) {
        if (v.dc === 0n) { push({ t: st.t, r: pinU(u) }, 0n, cmin, tlb, [...ev, 'sm'], gs); continue; }
        const Cu = floorDiv(TH - v.d0 - v.du * u, v.dc);
        if (Cu >= cmin) {
          for (let c = cmin; c <= Cu; c++) { const r = st.r.map(x => { let y = { ...x, d0: x.d0 + x.du * u, du: 0n }; y = { ...y, d0: y.d0 + y.dc * c, dc: 0n }; return y; }); push({ t: st.t, r }, 0n, 0n, tlb, [...ev, 'sm'], gs); }
          push({ t: st.t, r: pinU(u) }, 0n, Cu + 1n, tlb, [...ev, 'sm'], gs);
        } else {
          push({ t: st.t, r: pinU(u) }, 0n, cmin, tlb, [...ev, 'sm'], gs);
        }
      }
      push({ t: st.t, r: st.r }, Umax + 1n, cmin, tlb, [...ev, 'sm'], gs);
      return true;
    };
    if (st.t === 'G') {
      const [a, b, ...rest] = st.r;
      if (dep > 0) { const lm = isLandmark(st, tlb); if (lm) { paths.push({ st, lo, cmin, tlb: lm.tlb, ev, gs: [...gs, st.r.map(show).join(',')], out: 'NEXT', lm }); continue; } }
      gs = [...gs, st.r.map(show).join(',')];
      if (isC(a)) {
        if (a.d0 === 3n) { paths.push({ st, lo, cmin, tlb, ev, gs, out: 'HALT(G a=3)' }); continue; }
        if (a.d0 === 2n) { push({ t: 'L', r: [C(1), ADD(b, C(1)), ADD(b, C(1)), ...rest] }, lo, cmin, tlb, [...ev, 'G2'], gs); continue; }
        if (a.d0 >= 4n) { push({ t: 'S', r: [C(1), SUB(a, C(3)), C(1), ADD(b, C(1)), ...rest] }, lo, cmin, tlb, [...ev, 'G4'], gs); continue; }
        paths.push({ st, lo, cmin, tlb, ev, gs, out: `DEGEN G a=${a.d0}` }); continue;
      }
      if (a.g < 0n || a.du < 0n || a.dc < 0n) { paths.push({ st, lo, cmin, tlb, ev, gs, out: `G a neg-part ${show(a)}` }); continue; }
      if (lb(a) >= 4n) { push({ t: 'S', r: [C(1), SUB(a, C(3)), C(1), ADD(b, C(1)), ...rest] }, lo, cmin, tlb, [...ev, 'G4'], gs); continue; }
      if (splitSmall(a, 3)) continue;
      paths.push({ st, lo, cmin, tlb, ev, gs, out: `G-SMALL-a ${show(a)} lb=${lb(a)}` }); continue;
    }
    if (st.t === 'S') {
      const [x, y, z, ...rest] = st.r;
      const p = par(y);
      if (p === 'SPLIT' || p === 'FAILED') continue;
      if (isC(y) && y.d0 === 2n) { push({ t: 'G', r: [ADD(x, C(1)), ADD(z, C(1)), ...rest] }, lo, cmin, tlb, [...ev, 'Sy2'], gs); continue; }
      if (isC(y) && y.d0 === 1n) {
        if (rest.length === 0) { push({ t: 'R', r: [C(1), ADD(ADD(x, z), C(3))] }, lo, cmin, tlb, [...ev, 'Sy1R'], gs); }
        else push({ t: 'L', r: [C(1), ADD(ADD(x, z), C(3)), ...rest] }, lo, cmin, tlb, [...ev, 'Sy1L'], gs);
        continue;
      }
      if (isC(y) && y.d0 < 1n) { paths.push({ st, lo, cmin, tlb, ev, gs, out: `DEGEN S y=${y.d0}` }); continue; }
      if (y.g < 0n || y.du < 0n || y.dc < 0n) { paths.push({ st, lo, cmin, tlb, ev, gs, out: `S y neg-part ${show(y)}` }); continue; }
      if (lb(y) >= 3n) {
        if (p === 1n) {
          const j = SH1(y, tlb); const nz = ADD(ADD(x, j), ADD(ADD(z, j), C(3)));
          if (rest.length === 0) push({ t: 'R', r: [C(1), nz] }, lo, cmin, tlb, [...ev, 'Sw1R'], gs);
          else push({ t: 'L', r: [C(1), nz, ...rest] }, lo, cmin, tlb, [...ev, 'Sw1L'], gs);
        } else {
          const j = SH2(y, tlb);
          push({ t: 'G', r: [ADD(ADD(x, j), C(1)), ADD(ADD(z, j), C(1)), ...rest] }, lo, cmin, tlb, [...ev, 'Sw2G'], gs);
        }
        continue;
      }
      if (splitSmall(y, 2)) continue;
      paths.push({ st, lo, cmin, tlb, ev, gs, out: `S-SMALL-y ${show(y)} lb=${lb(y)}` }); continue;
    }
    if (st.t === 'L') {
      const [r1, r2, r3, ...rest] = st.r;
      if (isC(r3) && r3.d0 < 1n) { paths.push({ st, lo, cmin, tlb, ev, gs, out: `DEGEN L r3=${r3.d0}` }); continue; }
      if (r3.g < 0n || r3.du < 0n || r3.dc < 0n) { paths.push({ st, lo, cmin, tlb, ev, gs, out: `L r3 neg-part ${show(r3)}` }); continue; }
      if (lb(r3) >= 1n) {
        const nr1 = ADD(r1, r3);
        if (rest.length === 0) push({ t: 'R', r: [nr1, r2] }, lo, cmin, tlb, [...ev, 'Lsw'], gs);
        else push({ t: 'S', r: [nr1, r2, ...rest] }, lo, cmin, tlb, [...ev, 'Lsw'], gs);
        continue;
      }
      if (splitSmall(r3, 0)) continue;
      paths.push({ st, lo, cmin, tlb, ev, gs, out: `L-SMALL-r3 ${show(r3)} lb=${lb(r3)}` }); continue;
    }
    if (st.t === 'R') {
      const [p1, q1] = st.r;
      const eqf = (x, y) => { const [a, b] = align(x, y); return a.g === b.g && a.e === b.e && a.d0 === b.d0 && a.du === b.du && a.dc === b.dc; };
      if (eqf(p1, q1)) {
        const l1 = lb(p1);
        if (isC(p1) ? p1.d0 >= 2n : (l1 !== null && l1 >= 2n)) { paths.push({ st, lo, cmin, tlb, ev, gs, out: `ANCHOR n'=${show(p1)}` }); continue; }
        if (splitSmall(p1, 1)) continue;
        paths.push({ st, lo, cmin, tlb, ev, gs, out: `DEGEN R anchor a<2 ${show(p1)}` }); continue;
      }
      if (isC(q1) && q1.d0 < 3n) { paths.push({ st, lo, cmin, tlb, ev, gs, out: `DEGEN R q=${q1.d0}` }); continue; }
      if (q1.g < 0n || q1.du < 0n || q1.dc < 0n) { paths.push({ st, lo, cmin, tlb, ev, gs, out: `R q neg-part ${show(q1)}` }); continue; }
      if (lb(q1) >= 3n) { push({ t: 'S', r: [ADD(p1, C(1)), SUB(q1, C(2)), C(1)] }, lo, cmin, tlb, [...ev, 'R3'], gs); continue; }
      if (splitSmall(q1, 2)) continue;
      paths.push({ st, lo, cmin, tlb, ev, gs, out: `R-SMALL-q ${show(q1)} lb=${lb(q1)}` }); continue;
    }
  }
}
// ---- build start L(alpha, t; SLACK): alpha = 2^(H+1)(3c+rho)+2^H-1
const rho = [0n, 1n, 2n].find(r => (2n ** (H + 1n) * r + 2n ** H - 1n) % 6n === 1n % 6n && (((2n ** (H + 1n) * r + 2n ** H - 1n) % 6n) + 6n) % 6n === 1n);
const d0a = 2n ** (H + 1n) * rho + 2n ** H - 1n;      // alpha's constant part
const dca = 3n * 2n ** (H + 1n);                       // alpha's c-slope (even)
const runs = [
  { g: 3n, e: -3n, d0: d0a, du: 0n, dc: dca },          // alpha + 3*2^(t-3) w
  { g: 5n, e: -3n, d0: d0a - 1n, du: 0n, dc: dca },     // alpha-1 + 5*2^(t-3) w
];
for (let j = 0n; j <= SLACK; j++) runs.push({ g: 1n, e: j, d0: 0n, du: 0n, dc: 0n });  // 2^(t+j) w
runs.push({ g: 1n, e: SLACK + 1n, d0: -1n, du: 0n, dc: 0n });                // 2^(t+SLACK+1) w - 1
if (PINU !== null || PINC !== null) {
  runs.forEach(v => { if (PINU !== null) { v.d0 += v.du * PINU; v.du = 0n; } if (PINC !== null) { v.d0 += v.dc * PINC; v.dc = 0n; } });
}
walk({ t: 'G', r: runs });
// ---- recognize landmark outputs (relaxed: any affine alpha'-part in c, u)
function isLandmark(st, tlb) {
  if (st.t !== 'G' || st.r.length < 3) return null;
  const [a, b, c] = st.r;
  const [aa, bb] = align(a, b);
  if (aa.g !== 3n || bb.g !== 5n) return null;
  if (c.g !== 1n || c.d0 !== 0n || c.du !== 0n || c.dc !== 0n) return null;
  if (bb.d0 !== aa.d0 - 1n || bb.du !== aa.du || bb.dc !== aa.dc) return null;
  // alpha' = 1 mod 6 ON-DOMAIN (u >= lo, c >= cmin): slopes must be 0 mod 6, constant 1 mod 6
  if (aa.du % 6n !== 0n || aa.dc % 6n !== 0n || ((aa.d0 % 6n) + 6n) % 6n !== 1n) return null;
  const tc = c.e;
  if (tc - aa.e !== 3n) return null;
  for (let i = 2; i + 1 < st.r.length; i++) {
    const r = st.r[i];
    if (r.g !== 1n || r.d0 !== 0n || r.du !== 0n || r.dc !== 0n || r.e !== tc + BigInt(i - 2)) return null;
  }
  const last = st.r[st.r.length - 1];
  if (last.g !== 1n || last.d0 !== -1n || last.du !== 0n || last.dc !== 0n || last.e !== tc + BigInt(st.r.length - 3)) return null;
  return { alphaForm: aa, dt: tc, tlb: tlb + tc };
}
const START_D0 = d0a, START_DC = dca;
const outs = [];
for (const p of paths) {
  if (!p.out) { outs.push('NOOUT'); continue; }
  if (p.out === 'NEXT') {
    const f = p.lm.alphaForm;
    const dA = f.d0 - START_D0;
    const same = f.dc === START_DC && f.du === 0n;
    outs.push(`NEXT da=${dA}${dA % 6n === 0n ? '' : '(!mod6)'} dt=${p.lm.dt}${same ? '' : '(!slope ' + f.du + 'u+' + f.dc + 'c)'}`);
    continue;
  }
  if (p.out.startsWith('ANCHOR')) {
    const mm = p.out.match(/^ANCHOR n'=(.*)$/);
    outs.push(p.out);
    continue;
  }
  outs.push(p.out + ' ' + (p.st ? p.st.r.slice(0, 2).map(show).join(';') : ''));
}
const dist = {};
for (const o of outs) { const k = o.split(' ')[0].split('(')[0]; dist[k] = (dist[k] || 0) + 1; }
console.log(`h=${H} slack=${SLACK} T0=${T0}${CONCRETE ? ' exact' : ''} rho=${rho}: paths=${paths.length} pushes=${pushes} dist=${JSON.stringify(dist)}${boundaryUses ? ' BOUNDARY-USES=' + boundaryUses : ''}${foldUses ? ' FOLD-USES=' + foldUses : ''}`);
for (const o of [...new Set(outs)]) console.log('  ' + o);
// JSON slice persistence gated behind SYM4_JSON=1 (disk safety: slices are disposable;
// the one-line NEXT/ANCHOR conclusion on stdout is the durable artifact).
if (process.env.SYM4_JSON === '1' && paths.length <= 300) writeFileSync(`sym4-h${H}-s${SLACK}.json`, JSON.stringify(paths.map(p => ({
  lo: String(p.lo), cmin: String(p.cmin), tlb: String(p.tlb ?? ''), out: p.out || 'TERM',
  st: p.st ? p.st.t + '[' + p.st.r.map(show).join(',') + ']' : '', gs: p.gs, ev: p.ev
})), null, 1));
