// q_parse.mjs — exact machine maintaining the REGION'S BLOCK PARSE explicitly.
//
// Region parse: units[] over {'A'=1010, 'Z'=000, 'T'=10, 's'=1(seam), pseudo: 'x'=1, 'z'=0, 'zz'=00}
//   with off = symbols already consumed within units[0]; region string = units[0][off:] + units[1] + ...
//   (units empty <=> region = 0^inf)
// Materials: blocks[] over {'A','Z'} with optional leading 'T' (fill donation), + len.
//
// Ops (exact):
//   R2/R3: consume 3, deposit 'Z'; R4: consume 4, deposit 'A'  (pure unit/offset arithmetic)
//   R1@r2: prepend '1': local window re-parse (only non-pure op)
//   R1@r1: consume 1, flush: units = [...M.blocks, 's', ...units], off = 0
//
// Usage: node q_parse.mjs diff N | census N

import { Det } from './p_lib.mjs';

export const BSTR = { A: '1010', Z: '000', T: '10', s: '1', x: '1', z: '0', zz: '00' };
export const BLEN = { A: 4, Z: 3, T: 2, s: 1, x: 1, z: 1, zz: 2 };

// greedy parse of a string into units (deterministic); returns unit list covering s
// (s may extend beyond the string via the following units — caller stitches)
export function greedyParse(s, maxlen) {
  const out = []; let i = 0;
  while (i < s.length && i < maxlen) {
    if (s.startsWith('1010', i)) { out.push('A'); i += 4; }
    else if (s.startsWith('10', i)) { out.push('T'); i += 2; }
    else if (s.startsWith('000', i)) { out.push('Z'); i += 3; }
    else if (s.startsWith('00', i)) { out.push('zz'); i += 2; }
    else if (s[i] === '0') { out.push('z'); i += 1; }
    else if (s[i] === '1') { out.push('x'); i += 1; }
    else throw new Error('bad char');
  }
  return { units: out, consumed: i };
}

export class ParsePlay {
  constructor() { this.r = 1; this.units = []; this.off = 0; this.mats = []; this.steps = 0; }
  str(n) { // first n symbols of the region
    let s = '';
    let i = this.off;
    for (const u of this.units) {
      const b = BSTR[u];
      if (i > 0) { s += b.slice(i); i = 0; if (s.length >= n) break; continue; }
      s += b; if (s.length >= n) break;
    }
    if (s.length < n) s += '0'.repeat(n - s.length); // virtual 0^inf
    return s.slice(0, n);
  }
  head(k) { return this.str(k); }
  rule() {
    const h = this.str(4);
    if (h[0] === '0') return 0;
    if (h.startsWith('100')) return 1;
    if (h.startsWith('110')) return 2;
    if (h.startsWith('1010')) return 3;
    return -1;
  }
  consume(k) {
    this.off += k;
    while (this.units.length && this.off >= BLEN[this.units[0]]) { this.off -= BLEN[this.units[0]]; this.units.shift(); }
    if (!this.units.length) this.off = 0;
  }
  prepend1() { // R1@r2: region := '1' + region[1:]
    const WIN = 12;
    const full = this.str(WIN); // first WIN symbols (virtual-padded)
    // walk the units covered by the window (from off)
    let W = 0, ui = 0, skip = this.off;
    const covered = [];
    while (ui < this.units.length && W < WIN) {
      const part = BSTR[this.units[ui]].slice(skip); skip = 0;
      covered.push(part); W += part.length; ui++;
    }
    const over = Math.max(0, W - WIN);
    const lastFull = covered.length ? covered[covered.length - 1] : '';
    const overStr = over > 0 ? lastFull.slice(lastFull.length - over) : '';
    // true region = ('1' + full[1:]) + overStr + units[ui:] (+ virtual 0s)
    const ns = '1' + full.slice(1) + overStr;
    const g = greedyParse(ns, ns.length);
    this.units = normalizeRuns([...g.units, ...this.units.slice(ui)]);
    this.off = 0;
  }
  deposit(b, newR) {
    if (this.r === 1) {
      if (!this.mats.length) this.mats.push({ blocks: ['T', b], len: 2 + BLEN[b] });
      else { this.mats[0].blocks.push(b); this.mats[0].len += BLEN[b]; }
    } else this.mats.unshift({ blocks: [b], len: BLEN[b] });
    this.r = newR;
  }
  flush() {
    // materialize the current offset into pseudo units (suffix of units[0])
    if (this.off > 0 && this.units.length) {
      const rem = BSTR[this.units[0]].slice(this.off);
      this.units.shift();
      const pre = [];
      let j = 0;
      while (j < rem.length) {
        if (rem.startsWith('10', j)) { pre.push('T'); j += 2; }
        else if (rem.startsWith('00', j)) { pre.push('zz'); j += 2; }
        else { pre.push('z'); j += 1; }
      }
      this.units = [...pre, ...this.units];
      this.off = 0;
    }
    const m = this.mats.length ? this.mats.shift() : { blocks: ['T'], len: 2 };
    this.units = normalizeRuns([...m.blocks, 's', ...this.units]);
  }
  step() {
    const p = this.rule(); if (p < 0) return -1;
    if (p === 0) { if (this.r === 2) { this.r = 1; this.prepend1(); } else { this.consume(1); this.flush(); } }
    else if (p === 1 || p === 2) { this.consume(3); this.deposit('Z', 1); }
    else { this.consume(4); this.deposit('A', 2); }
    this.steps++; return p;
  }
  render() {
    let w = '10#'.repeat(8);
    const strs = this.mats.map((m) => m.blocks.map((b) => BSTR[b]).join(''));
    if (strs.length) w += strs.reverse().join('#') + '#';
    w += '#'.repeat(this.r - 1) + this.str(2000).replace(/0+$/, '') + '0'.repeat(40);
    while (w.startsWith('10#')) w = w.slice(3);
    return w.replace(/0+$/, '');
  }
}

// merge pseudo z/zz runs into Z/z/zz canonically; merge equal adjacent units EXCEPT keep 'A','Z','T','s' distinct from pseudos
export function normalizeRuns(units) {
  const out = [];
  const push = (u) => {
    if (out.length && out[out.length - 1] === u) { /* same unit adjacent: keep as two (run-encoding later) */ }
    out.push(u);
  };
  // first: collapse runs of z/zz/z.. into maximal 0-run then re-split into Z^q + remainder
  const res = [];
  let i = 0;
  while (i < units.length) {
    if (units[i] === 'z' || units[i] === 'zz') {
      let n = 0;
      while (i < units.length && (units[i] === 'z' || units[i] === 'zz')) { n += BLEN[units[i]]; i++; }
      while (n >= 3) { res.push('Z'); n -= 3; }
      if (n === 2) res.push('zz');
      else if (n === 1) res.push('z');
    } else { res.push(units[i]); i++; }
  }
  for (const u of res) push(u);
  return out;
}

export function diffTest(N) {
  const d = new Det(); const s = new ParsePlay();
  for (let i = 0; i < N; i++) {
    const rd = d.ruleAtRightmost(), rs = s.rule();
    if (rd !== rs) return { fail: 'rule', at: i, rd, rs, str: s.str(12) };
    if (rd < 0) return { done: 'inactive', at: i };
    d.step(); s.step();
    if (d.core() !== s.render()) return { fail: 'core', at: i, det: d.core().slice(0, 80), reg: s.render().slice(0, 80) };
  }
  return { ok: true, N };
}

const args = process.argv.slice(2);
if (args[0] === 'diff') {
  const N = parseInt(args[1] || '200000');
  const t0 = Date.now();
  console.log(JSON.stringify({ ...diffTest(N), ms: Date.now() - t0 }));
} else if (args[0] === 'census') {
  const N = parseInt(args[1] || '1000000');
  const s = new ParsePlay();
  const rle = (arr) => { const out = []; for (const b of arr) { if (out.length && out[out.length - 1][0] === b) out[out.length - 1][1]++; else out.push([b, 1]); } return out; };
  const shapes = {}; const unitCount = {}; const matShapes = {}; const matCount = {};
  const t0 = Date.now();
  for (let i = 0; i < N; i++) {
    const p = s.rule(); if (p < 0) { console.log('INACTIVE', i); break; }
    const re = rle(s.units);
    const key = re.map(([b, c]) => b + (c > 8 ? '+' : c)).join('.');
    shapes[key] = (shapes[key] || 0) + 1;
    unitCount[re.length] = (unitCount[re.length] || 0) + 1;
    matCount[s.mats.length] = (matCount[s.mats.length] || 0) + 1;
    if (s.mats.length) {
      const mr = rle(s.mats[0].blocks);
      const mk = mr.map(([b, c]) => b + (c > 8 ? '+' : c)).join('.');
      matShapes[mk] = (matShapes[mk] || 0) + 1;
    }
    s.step();
  }
  const top = (o, k) => Object.fromEntries(Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, k));
  console.log(JSON.stringify({ N, ms: Date.now() - t0, shapes: Object.keys(shapes).length, topShapes: top(shapes, 20), unitCount: top(unitCount, 15), matCount: top(matCount, 15), matShapes: Object.keys(matShapes).length, topMatShapes: top(matShapes, 15) }, null, 1));
}
