// runsim.mjs — run-level interpreter for cm2 = 1RB1RA1LC0RC---0LD0LE0RF1RE0RA0LF1LB
// Config = list of runs [{v,len}] covering [base, base+total); outside = blank 0 (infinite both sides).
// Same step semantics as the bare machine. Cross-checked vs ocm.exe.
export const CODE = "1RB1RA1LC0RC---0LD0LE0RF1RE0RA0LF1LB";
export const TR = (() => {
  const T = [[], [], [], [], [], []];
  for (let i = 0; i < 12; i++) {
    const t = CODE.substr(3 * i, 3);
    T[i / 2 | 0][i % 2] = { w: +t[0], mv: t[1] === 'L' ? -1 : 1, nx: t[2] === '-' ? 6 : t[2].charCodeAt(0) - 65 };
  }
  return T;
})();
export class RunTape {
  constructor() { this.runs = []; this.base = 0; this.head = 0; this.st = 0; this.step = 0; }
  total() { let s = 0; for (const r of this.runs) s += r.len; return s; }
  // locate: returns [ri, off] with run ri containing p (extends blank runs as needed for writes)
  _extend(p) {
    if (this.runs.length === 0) { this.base = p; this.runs = [{ v: 0, len: 1 }]; return; }
    const end = this.base + this.total();
    if (p < this.base) { this.runs.unshift({ v: 0, len: this.base - p }); this.base = p; }
    else if (p >= end) { this.runs.push({ v: 0, len: p - end + 1 }); }
  }
  locate(p) { this._extend(p); let s = this.base; for (let i = 0; i < this.runs.length; i++) { const r = this.runs[i]; if (p < s + r.len) return [i, p - s]; s += r.len; } throw new Error('locate fail'); }
  read(p) { if (this.runs.length === 0) return 0; const end = this.base + this.total(); if (p < this.base || p >= end) return 0; const [ri, off] = this.locate(p); return this.runs[ri].v; }
  write(p, v) {
    this._extend(p);
    const [ri, off] = this.locate(p); const r = this.runs[ri];
    if (r.v === v) return;
    if (r.len === 1) { r.v = v; this._fix(ri); return; }
    if (off === 0) { r.len--; this.runs.splice(ri, 0, { v, len: 1 }); this._fix(ri); return; }
    if (off === r.len - 1) { r.len--; this.runs.splice(ri + 1, 0, { v, len: 1 }); this._fix(ri + 1); return; }
    this.runs.splice(ri, 1, { v: r.v, len: off }, { v, len: 1 }, { v: r.v, len: r.len - off - 1 }); this._fix(ri + 1);
  }
  _fix(ri) { // merge/split cleanup around ri
    const rs = this.runs;
    for (let i = Math.max(0, ri - 2); i <= Math.min(rs.length - 1, ri + 2); i++) {
      if (rs[i].len === 0) { rs.splice(i, 1); i--; continue; }
      if (i > 0 && rs[i].v === rs[i - 1].v) { rs[i - 1].len += rs[i].len; rs.splice(i, 1); i--; }
    }
  }
  step1() {
    const v = this.read(this.head);
    const tr = TR[this.st][v];
    if (tr.nx === 6) return { halt: true, step: this.step };
    this.write(this.head, tr.w);
    this.head += tr.mv; this.st = tr.nx; this.step++;
    return { halt: false };
  }
  rle() {
    let lo = Infinity, hi = -Infinity, s = this.base;
    for (const r of this.runs) { if (r.v === 1) { if (s < lo) lo = s; if (s + r.len > hi) hi = s + r.len; } s += r.len; }
    if (hi === -Infinity) return { lo: 0, hi: 0, pop: 0, w: 0, s: '' };
    let parts = [], p = lo, pop = 0;
    while (p < hi) { const [ri, off] = this.locate(p); const r = this.runs[ri];
      parts.push(`${r.v}^${r.len - off}`); if (r.v === 1) pop += r.len - off; p += r.len - off; }
    return { lo, hi, pop, w: hi - lo, s: parts.join(' ') };
  }
}
// runAt(p): [value, cellsFromPToEndOfRun, off] for the run containing p (blank => [0,0,0])
RunTape.prototype.runAt = function (p) {
  if (!this.runs.length) return [0, 0, 0];
  const end = this.base + this.total();
  if (p < this.base || p >= end) return [0, 0, 0];
  const [ri, off] = this.locate(p); const r = this.runs[ri];
  return [r.v, r.len - off, off];
};
