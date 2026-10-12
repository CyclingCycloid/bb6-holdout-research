// q_region.mjs — exact block-structured machine for the deterministic rightmost-# play.
//
// State:
//   r          : active run length in {1,2}
//   RH         : raw head string of the region (>= RHLEN symbols, virtual 0^inf beyond)
//   TAIL       : block list of the region beyond RH: blocks 'A'='1010', 'Z'='000',
//                'T'='10' (fill-donated), 's'='1' (flush seam)
//   mats       : material stack, mats[0] = top: { blocks: ['T'?, 'A'/'Z'...], len }
//   (the fill below mats is an infinite supply of 'T' materials)
//
// All operations are the exact macro rules of q_stack.mjs; this representation
// makes the BLOCK STRUCTURE explicit so it can be run-length-abstracted.
//
// Usage: node q_region.mjs diff N   — differential vs p_lib Det (canonical core equality)
//        node q_region.mjs stats N  — block-structure census of the orbit

import { Det } from './p_lib.mjs';

export const BSTR = { A: '1010', Z: '000', T: '10', s: '1' };
export const RHLEN = 20;

export class RegionPlay {
  constructor() { this.r = 1; this.RH = '0'.repeat(RHLEN); this.TAIL = []; this.mats = []; this.steps = 0; }
  head(k) { return (this.RH + '0'.repeat(k)).slice(0, k); }
  rule() {
    const h = this.head(4);
    if (h[0] === '0') return 0;
    if (h.startsWith('100')) return 1;
    if (h.startsWith('110')) return 2;
    if (h.startsWith('1010')) return 3;
    return -1;
  }
  refillIfShort() {
    while (this.RH.length < RHLEN && this.TAIL.length) this.RH += BSTR[this.TAIL.shift()];
    if (this.RH.length < RHLEN) this.RH = this.RH + '0'.repeat(RHLEN - this.RH.length); // virtual 0^inf (canonical: trailing zeros)
  }
  consume(k) { this.RH = this.RH.slice(k); this.refillIfShort(); }
  deposit(b, newR) {
    if (this.r === 1) { if (!this.mats.length) this.mats.push({ blocks: ['T', b], len: 2 + BSTR[b].length }); else { this.mats[0].blocks.push(b); this.mats[0].len += BSTR[b].length; } }
    else this.mats.unshift({ blocks: [b], len: BSTR[b].length });
    this.r = newR;
  }
  flush() {
    // consume(1) already happened: RH = tau[1:]. Prepend M . '1' (kept raw in RH).
    const m = this.mats.length ? this.mats.shift() : { blocks: ['T'], len: 2 };
    this.RH = m.blocks.map((b) => BSTR[b]).join('') + '1' + this.RH;
  }
  step() {
    const p = this.rule(); if (p < 0) return -1;
    if (p === 0) { if (this.r === 2) { this.r = 1; this.RH = '1' + this.RH.slice(1); } else { this.RH = this.RH.slice(1); this.flush(); this.refillIfShort(); } }
    else if (p === 1 || p === 2) { this.consume(3); this.deposit('Z', 1); }
    else { this.consume(4); this.deposit('A', 2); }
    this.steps++; return p;
  }
  // full word reconstruction (canonical like Det)
  render() {
    let w = '10#'.repeat(8);
    const strs = this.mats.map((m) => m.blocks.map((b) => BSTR[b]).join(''));
    if (strs.length) w += strs.reverse().join('#') + '#';
    w += '#'.repeat(this.r - 1) + this.RH + this.TAIL.map((b) => BSTR[b]).join('') + '0'.repeat(40);
    while (w.startsWith('10#')) w = w.slice(3);
    return w.replace(/0+$/, '');
  }
  // region string reconstruction (head-aligned, virtual zeros trimmed to 60)
  regionStr() { return (this.RH + this.TAIL.map((b) => BSTR[b]).join('')).replace(/0+$/, ''); }
}

export function diffTest(N) {
  const d = new Det(); const s = new RegionPlay();
  for (let i = 0; i < N; i++) {
    const rd = d.ruleAtRightmost(), rs = s.rule();
    if (rd !== rs) return { fail: 'rule', at: i, rd, rs };
    if (rd < 0) return { done: 'inactive', at: i };
    d.step(); s.step();
    if (d.core() !== s.render()) return { fail: 'core', at: i, det: d.core(), reg: s.render() };
  }
  return { ok: true, N };
}

const args = process.argv.slice(2);
if (args[0] === 'diff') {
  const N = parseInt(args[1] || '200000');
  const t0 = Date.now();
  console.log(JSON.stringify({ ...diffTest(N), ms: Date.now() - t0 }));
} else if (args[0] === 'stats') {
  const N = parseInt(args[1] || '1000000');
  const s = new RegionPlay();
  const runLens = {}, tailKinds = {}, rhPref = {}, dangerAt = {};
  const t0 = Date.now();
  const rle = (arr) => { const out = []; for (const b of arr) { if (out.length && out[out.length - 1][0] === b) out[out.length - 1][1]++; else out.push([b, 1]); } return out; };
  for (let i = 0; i < N; i++) {
    const p = s.rule(); if (p < 0) { console.log('INACTIVE', i); break; }
    // census before step
    const re = rle(s.TAIL);
    const key = re.map(([b, c]) => b + (c > 9 ? '+' : c)).join('.');
    runLens[re.length] = (runLens[re.length] || 0) + 1;
    tailKinds[key] = (tailKinds[key] || 0) + 1;
    rhPref[s.RH.slice(0, 6)] = (rhPref[s.RH.slice(0, 6)] || 0) + 1;
    s.step();
  }
  const top = (o, k) => Object.fromEntries(Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, k));
  console.log(JSON.stringify({ N, ms: Date.now() - t0, runLens: top(runLens, 12), tailKinds: top(tailKinds, 25), rhPref: top(rhPref, 25) }, null, 1));
}
