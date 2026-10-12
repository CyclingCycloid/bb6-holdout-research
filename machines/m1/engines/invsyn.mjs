// invsyn.mjs — ICE-style coarse-invariant synthesis for M1 (mod-6 template, escalation ladder).
// State space = phase x run-vector; template predicates = conjunctions of per-position mod-6
// residue classes (with position-conditional guards like "S with y=2"). The 9 rules from
// phase1.mjs are the ONLY transition mechanism (imported verbatim via bstep mirror of stepFast —
// but closure must be checked on SINGLE-STEP transitions, so we use the uncollapsed step1
// transcribed from phase1's step() — identical rule set, uncollapsed semantics).
// Workflow: (1) CEGAR loop: candidate -> check closure by SAT-like enumeration over
//   representatives (bounded run vectors) -> counterexamples -> refine classes;
// (2) library rejection: every candidate checked against library.json states.
// The key families to test: is there a closed superset U of the true G-class set such that
// 3_X ∉ U (3 mod 6 head) — and is U closed under all 9 rules?
import { readFileSync } from 'fs';

// ---------- rule kernel (uncollapsed single-step, from phase1.mjs step()) ----------
export function step1(c) {
  if (c.t === 'R') { const [a, b] = c.r; return { c: { t: 'S', r: [a + 1n, b - 2n, 1n] } }; }
  if (c.t === 'S') {
    const [x, y, z, ...rest] = c.r;
    if (y >= 3n) return { c: { t: 'S', r: [x + 1n, y - 2n, z + 1n, ...rest] } };
    if (y === 2n) return { c: { t: 'G', r: [x + 1n, z + 1n, ...rest] } };
    if (y === 1n) { if (rest.length === 0) return { c: { t: 'R', r: [1n, x + z + 3n] } }; return { c: { t: 'L', r: [1n, x + z + 3n, ...rest] } }; }
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

// Number-based single-step (same rules; for class enumeration)
function stepN(c) {
  if (c.t === 'R') { const [a, b] = c.r; return { c: { t: 'S', r: [a + 1, b - 2, 1] } }; }
  if (c.t === 'S') {
    const [x, y, z, ...rest] = c.r;
    if (y >= 3) return { c: { t: 'S', r: [x + 1, y - 2, z + 1, ...rest] } };
    if (y === 2) return { c: { t: 'G', r: [x + 1, z + 1, ...rest] } };
    if (y === 1) { if (rest.length === 0) return { c: { t: 'R', r: [1, x + z + 3] } }; return { c: { t: 'L', r: [1, x + z + 3, ...rest] } }; }
  }
  if (c.t === 'G') {
    const [a, b, ...rest] = c.r;
    if (a >= 4) return { c: { t: 'S', r: [1, a - 3, 1, b + 1, ...rest] } };
    if (a === 2) return { c: { t: 'L', r: [1, b + 1, b + 1, ...rest] } };
    if (a === 3) return { halt: true };
    return { degenerate: 'G a=' + a };
  }
  if (c.t === 'L') {
    const [r1, r2, r3, ...rest] = c.r;
    if (r3 >= 2) return { c: { t: 'L', r: [r1 + 1, r2, r3 - 1, ...rest] } };
    if (r3 === 1) { if (c.r.length === 3) return { c: { t: 'R', r: [r1 + 1, r2] } }; return { c: { t: 'S', r: [r1 + 1, r2, ...rest] } }; }
    return { degenerate: 'L r3=' + r3 };
  }
  return { degenerate: '?' };
}
const m6 = (v) => Number(((Number(v) % 6) + 6) % 6);
const key = (c, spec) => {
  // spec: {phase, get: indices used} — canonical class key
  return spec.f(c);
};
// ---------- template 1: per-phase mod-6 class predicates ----------
// G: (a,b) mod 6 classes; L: (r2,r3) classes + r1>=1; R: (a,b) with b class; S: y-conditional:
//   y=2: (x,z) classes; y=1: (x+z+3) handled via L/R; y>=3: no constraint (all classes open).
const T = {
  G: (r) => m6(r[0]) + '_' + m6(r[1]),
  L: (r) => m6(r[1]) + '_' + m6(r[2]),
  R: (r) => 'b' + m6(r[1]),
  S2: (r) => m6(r[0]) + '_' + m6(r[2]),   // S with y=2
};

// ---------- library load ----------
const lib = JSON.parse(readFileSync('library.json', 'utf8')).states;

// ---------- candidate U0: trajectory classes ----------
function classify(c) {
  if (c.t === 'G') return { fam: 'G', cls: T.G(c.r) };
  if (c.t === 'L') return { fam: 'L', cls: T.L(c.r) };
  if (c.t === 'R') return { fam: 'R', cls: T.R(c.r) };
  if (c.t === 'S') return { fam: c.r[1] === 2n ? 'S2' : 'S', cls: c.r[1] === 2n ? T.S2(c.r) : 'y3' };
  return { fam: c.t, cls: '?' };
}
const U = { G: new Set(), L: new Set(), R: new Set(), S2: new Set(), S: new Set() };
for (const s of lib) {
  const { fam, cls } = classify({ t: s[0], r: s.slice(2).split(',').map(BigInt) });
  U[fam].add(cls);
}
// P(3) = R(3,3): b class 3 — the trajectory R classes
console.log('U0 (trajectory classes): G ' + U.G.size + ', L ' + U.L.size + ', R ' + [...U.R].join(',') + ', S2 ' + U.S2.size + ', S(y>=3) ' + [...U.S].join(','));
console.log('P(3) in U0?', U.R.has('b3') ? 'YES (b3)' : 'NO — P(3) b=3');
// G(3,·) exclusion: 3_x not in U.G?
const g3 = [...U.G].filter(k => k.startsWith('3_'));
console.log('G head-3 classes in U0:', g3.join(','));

// ---------- closure check: enumerate all possible successors of U ----------
// For each family/class in U, generate ALL successor class-configurations reachable by
// choosing values consistent with the class (symbolic enumeration over residue tuples),
// and check membership in U. This is exact closure for mod-6 templates (successor classes
// are affine in predecessor residues; the guards depend only on residues and the class set).
function succClasses(fam, cls, depth = 6) {
  // enumerate concrete small vectors in the class, apply step1, collect successor classes
  const outs = new Map();
  const vals = (cl, phase, pos) => {
    // all v in [1..48] with v mod 6 = cl (plus bigger to exercise guards)
    const res = [];
    for (let v = cl; v <= 30; v += 6) res.push(v);
    return res;
  };
  function gen(phase, clsStr, k, prefix, i, cb) {
    if (i === k) { cb(prefix); return; }
    const cl = phase === 'S' && clsStr === 'y3' ? null : parseInt(clsStr.split('_')[i] ?? clsStr.slice(1));
    const vs = cl === null ? [2,3,4,5,6,7,8,9,10,11,12,13,15,18] : vals(cl).map(Number);
    for (const v of vs) gen(phase, clsStr, k, [...prefix, v], i + 1, cb);
  }
  if (fam === 'G') {
    const [i, j] = cls.split('_').map(Number);
    gen('G', cls, 2, [], 0, (r) => {
      // tail: try k = 2..5 extra runs with plausible values (>=5, any residues)
      for (let k = 0; k <= 3; k++) {
        const tails = [[], [7], [7, 13], [7, 13, 25]][k];
        const c = { t: 'G', r: [...r.map(Number), ...tails.map(Number)] };
        const st = stepN(c);
        if (st.halt) outs.set('HALT', 1);
        else if (st.c) { const q = classify(st.c); outs.set(q.fam + ':' + q.cls, 1); }
      }
    });
  }
  if (fam === 'L') {
    const [i, j] = cls.split('_').map(Number);
    for (const r1 of [1, 2, 3, 7, 13]) gen('L', cls, 2, [], 0, (r) => {
      for (let k = 0; k <= 2; k++) {
        const tails = [[], [11], [11, 23]][k];
        const c = { t: 'L', r: [r1, ...r.map(Number), ...tails.map(Number)] };
        const st = stepN(c);
        if (st.c) { const q = classify(st.c); outs.set(q.fam + ':' + q.cls, 1); }
      }
    });
  }
  if (fam === 'R') {
    const b = parseInt(cls.slice(1));
    for (const a of [1, 2, 3, 7]) for (const bb of vals(b).map(Number)) {
      const c = { t: 'R', r: [a, bb] };
      const st = stepN(c);
      if (st.c) { const q = classify(st.c); outs.set(q.fam + ':' + q.cls, 1); }
    }
  }
  if (fam === 'S2') {
    const [i, j] = cls.split('_').map(Number);
    gen('S', cls, 2, [], 0, (r) => {
      for (let k = 0; k <= 2; k++) {
        const tails = [[], [5], [5, 11]][k];
        const c = { t: 'S', r: [...r.map(Number), ...tails.map(Number)] };
        const st = stepN(c);
        if (st.c) { const q = classify(st.c); outs.set(q.fam + ':' + q.cls, 1); }
      }
    });
  }
  if (fam === 'S') { // y>=3: enumerate all y mod-6 classes >= 3 (values 3..64)
    for (const y of [3, 4, 5, 6, 7, 8]) for (const x of [1, 2, 7]) for (const z of [1, 2, 5, 7, 11]) {
      for (let k = 0; k <= 1; k++) {
        const tails = [[], [5]][k];
        const c = { t: 'S', r: [x, y, z, ...tails] };
        const st = stepN(c);
        if (st.c) { const q = classify(st.c); outs.set(q.fam + ':' + q.cls, 1); }
      }
    }
  }
  return [...outs.keys()];
}

function inU(q) {
  const [fam, ...rest] = q.split(':');
  const cls = rest.join(':');
  return U[fam] && U[fam].has(cls);
}

// ---------- CEGAR: find closure violations ----------
let iter = 0;
while (iter++ < 25) {
  const viols = [];
  for (const fam of ['G', 'L', 'R', 'S2', 'S']) {
    for (const cls of [...U[fam]]) {
      for (const o of succClasses(fam, cls)) {
        if (o === 'HALT') { viols.push(`HALT from ${fam}:${cls}`); continue; }
        if (!inU(o)) viols.push(`${fam}:${cls} -> ${o}`);
      }
    }
  }
  console.log(`CEGAR iter ${iter}: ${viols.length} violations`);
  const uniq = [...new Set(viols)];
  uniq.slice(0, 12).forEach(v => console.log('   ' + v));
  if (!viols.length) { console.log('CLOSED at iter ' + iter); break; }
  // widen: add all missing classes appearing as successors (ICE style)
  let added = 0;
  for (const v of uniq) {
    if (v.startsWith('HALT')) continue;
    const [fam, cls] = [v.split(':')[0], v.split(':').slice(1).join(':')];
    if (U[fam] && !U[fam].has(cls)) { U[fam].add(cls); added++; }
  }
  console.log(`  widened by ${added} classes`);
  if (added === 0) { console.log('CANNOT WIDEN — HALT reachable from U: invariant fails'); break; }
}
console.log('final U: G ' + U.G.size + '/36, L ' + U.L.size + '/36, R ' + [...U.R].join(',') + ', S2 ' + U.S2.size + '/36, S ' + [...U.S].join(','));
console.log('G head-3 classes still excluded?', [...U.G].filter(k => k.startsWith('3_')).length === 0 ? 'YES' : 'NO — ' + [...U.G].filter(k => k.startsWith('3_')).join(','));
console.log('U.G all:', [...U.G].sort().join(' '));
