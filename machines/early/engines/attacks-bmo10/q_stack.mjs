// q_stack.mjs — exact STACK-MACHINE re-encoding of the deterministic rightmost-# play (BMO 10).
//
// Word = ... (10#)^inf . M_k # M_{k-1} # ... # M_1 . #^r . tau . 0^inf
//   mats : array of material strings, mats[0] = TOP (adjacent to the active run)
//          (mats may be empty = pure fill; the fill supplies infinite '10' materials)
//   r    : active #-run length in {1,2}
//   tau  : the scan region (tail after the rightmost #), virtual 0^inf on the right
//
// Macro step (exact algebra; every case is the string rule applied at the rightmost #):
//   head '0'    (R1): r=2 -> r=1, tau := '1'+tau[1:]
//                   r=1 -> FLUSH: pop M (fill supplies '10'), tau := M + '1' + tau[1:], r=1
//   head '100'  (R2): tau := tau[3:]; deposit '000': r=1 -> append to M_1 ; r=2 -> push, r=1
//   head '110'  (R3): same as R2
//   head '1010' (R4): tau := tau[4:]; deposit '1010': r=1 -> append, r=2 ; r=2 -> push, r=2
//   else        : INACTIVE (game won)  <=> head starts '111' or '1011'
//
// Materials are pure concatenations of deposited blocks 000/1010 plus the fill's
// donated '10' at the bottom => MAT = ^(10)?(000|1010)*$ (provable by construction).
//
// Usage:
//   node q_stack.mjs diff N     — differential test vs the string simulator p_lib.Det
//   node q_stack.mjs orbit N    — run N steps, assert never inactive, print sanity stats

import { Det } from './p_lib.mjs';

export const ZPAD = '0'.repeat(16);

export class StackPlay {
  constructor() { this.mats = []; this.r = 1; this.region = ''; this.steps = 0; }
  head(k) { return (this.region + ZPAD).slice(0, k); }
  rule() {
    const h = this.head(4);
    if (h[0] === '0') return 0;            // R1  #0 -> 1
    if (h.startsWith('100')) return 1;     // R2  #100 -> 000#
    if (h.startsWith('110')) return 2;     // R3  #110 -> 000#
    if (h.startsWith('1010')) return 3;    // R4  #1010 -> 1010##
    return -1;                             // inactive <=> '111...' or '1011...'
  }
  deposit(b, newR) {
    if (this.r === 1) { if (!this.mats.length) this.mats.push('10'); this.mats[0] += b; }
    else this.mats.unshift(b);
    this.r = newR;
  }
  flush() {
    const m = this.mats.length ? this.mats.shift() : '10';
    this.region = m + '1' + this.region.slice(1);
  }
  step() {
    const p = this.rule();
    if (p < 0) return -1;
    if (p === 0) { if (this.r === 2) { this.r = 1; this.region = '1' + this.region.slice(1); } else this.flush(); }
    else if (p === 1 || p === 2) { this.region = this.region.slice(3); this.deposit('000', 1); }
    else { this.region = this.region.slice(4); this.deposit('1010', 2); }
    this.steps++;
    return p;
  }
  // reconstruct the padded word and canonicalize exactly like Det (fill-strip + trailing-0 strip)
  render() {
    let w = '10#'.repeat(8);
    if (this.mats.length) w += this.mats.slice().reverse().join('#') + '#';
    w += '#'.repeat(this.r - 1) + this.region + '0'.repeat(40);
    while (w.startsWith('10#')) w = w.slice(3);
    return w.replace(/0+$/, '');
  }
}

export function diffTest(N) {
  const d = new Det();
  const s = new StackPlay();
  for (let i = 0; i < N; i++) {
    const rd = d.ruleAtRightmost(), rs = s.rule();
    if (rd !== rs) return { fail: 'rule', at: i, rd, rs, render: s.render(), det: d.core() };
    if (rd < 0) return { done: 'inactive', at: i };
    d.step(); s.step();
    const cd = d.core(), cs = s.render();
    if (cd !== cs) return { fail: 'core', at: i, det: cd, stack: cs };
  }
  return { ok: true, N };
}

const args = process.argv.slice(2);
if (args[0] === 'diff') {
  const N = parseInt(args[1] || '100000');
  const t0 = Date.now();
  console.log(JSON.stringify({ ...diffTest(N), ms: Date.now() - t0 }));
} else if (args[0] === 'orbit') {
  const N = parseInt(args[1] || '1000000');
  const s = new StackPlay();
  const rc = [0, 0, 0, 0];
  let matBad = 0, maxMats = 0, maxRegion = 0;
  const t0 = Date.now();
  for (let i = 0; i < N; i++) {
    const p = s.rule();
    if (p < 0) { console.log('INACTIVE at step', i, 'region head:', s.head(10)); break; }
    rc[p]++;
    s.step();
    if (s.mats.length > maxMats) maxMats = s.mats.length;
    if (s.region.length > maxRegion) maxRegion = s.region.length;
    for (const m of s.mats) if (!/^(10)?(000|1010)*$/.test(m)) { if (matBad < 3) console.log('BAD MAT', m); matBad++; }
  }
  console.log(JSON.stringify({ N, rules: rc, matBad, maxMats, maxRegion, ms: Date.now() - t0 }));
}
