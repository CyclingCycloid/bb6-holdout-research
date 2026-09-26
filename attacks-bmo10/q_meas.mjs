// q_meas.mjs — measure the seam-danger structure on the deterministic orbit (stack machine).
//
// Hand analysis says the ONLY places where '111'/'1011' can be created are the R1
// seams (region := '1'+tau[1:] at r=2, and region := M+'1'+tau[1:] at flush):
//   lethal pre-heads: '011..' / '0011..' (both R1 kinds); flush with tau[1]=1 (creates
//   011 at the seam); R2/R3 with head '10001'/'11001' (leads to flush with tau[1]=1).
// This harness counts all of those on 10^6 steps, plus the '11' census in the region
// (creation site, preceding 0-run length, following symbol) and material suffix stats.
//
// Usage: node q_meas.mjs N

import { StackPlay } from './q_stack.mjs';
import fs from 'node:fs';

const N = parseInt(process.argv[2] || '1000000');
const s = new StackPlay();

const hist = (o, k, inc = 1) => { o[k] = (o[k] || 0) + inc; };
const zrun = (str, i) => { let n = 0; while (i - 1 - n >= 0 && str[i - 1 - n] === '0') n++; return n; }; // 0-run length immediately before index i

const flushHead = {}, r1r2Head = {}, r23Head = {}, r4Head = {};
let flushTau1 = 0, r1r2_011 = 0, r1r2_0011 = 0, r23_danger = 0, r4_danger = 0;
let n111 = 0, n1011 = 0, n011any = 0, n0011any = 0, n10001any = 0, n11001any = 0, n00001any = 0;
const eleven_pre = {}, eleven_pre_at_create = {}, eleven_follow = {}, eleven_head_events = [];
const topTail = {}, topHead = {}, matTailRun = {};
let elevenSteps = 0, elevenExamples = [];
let flushMatTail = {}, flushMatLen = {};
let ruleC = [0, 0, 0, 0];

// creation attribution: before each step, snapshot whether region has '11'; after, diff.
for (let i = 0; i < N; i++) {
  const p = s.rule();
  if (p < 0) { console.log('INACTIVE at', i); break; }
  ruleC[p]++;
  const tau = s.region;
  const h = s.head(6);
  // global forbidden-content asserts
  if (tau.includes('111')) n111++;
  if (tau.includes('1011')) n1011++;
  if (tau.includes('011')) n011any++;
  if (tau.includes('0011')) n0011any++;
  if (tau.includes('10001')) n10001any++;
  if (tau.includes('11001')) n11001any++;
  if (tau.includes('00001')) n00001any++;
  // '11' census (pre-step)
  let has11 = false;
  for (let j = 0; j + 1 < tau.length; j++) {
    if (tau[j] === '1' && tau[j + 1] === '1') {
      has11 = true;
      hist(eleven_pre, zrun(tau, j));
      hist(eleven_follow, tau[j + 2] ?? '0');
    }
  }
  if (has11) { elevenSteps++; if (elevenExamples.length < 40) elevenExamples.push({ at: i, r: s.r, head: h, tau: tau.slice(0, 40) }); }
  // per-rule head stats
  if (p === 0) {
    if (s.r === 2) {
      hist(r1r2Head, h.slice(0, 4));
      if (h[1] === '1' && h[2] === '1') r1r2_011++;
      if (h.slice(1, 4) === '011') r1r2_0011++;
    } else {
      hist(flushHead, h.slice(0, 5));
      if (h[1] === '1') flushTau1++;
      const m = s.mats.length ? s.mats[0] : '10';
      hist(flushMatTail, m.slice(-2));
      hist(flushMatLen, Math.min(m.length, 30));
    }
  } else if (p === 1 || p === 2) {
    hist(r23Head, h.slice(0, 5));
    if (h[3] === '0' && h[4] === '1') r23_danger++;
  } else {
    hist(r4Head, h.slice(0, 4));
    if (h[4] === '0' && (h.slice(5, 7) === '11' || h.slice(5, 8) === '011')) r4_danger++;
  }
  // material stats
  if (s.mats.length) {
    const t = s.mats[0];
    hist(topTail, t.slice(-2)); hist(topHead, t.slice(0, 2));
    hist(matTailRun, zrun(t, t.length));
  }
  // creation attribution for '11': post-step, new '11's at the head
  s.step();
  const nt = s.region;
  const nh = s.head(4);
  if (p === 0 && nt[0] === '1' && nt[1] === '1') hist(eleven_pre_at_create, zrun(nt, 0) + '|f' + (s.r));
  if (p === 0 && nt.startsWith('11') && eleven_head_events.length < 30) eleven_head_events.push({ at: i, pre: h, r_pre: s.r === undefined ? 0 : (p === 0 ? (h[0] === '0' ? 1 : 1) : 0) });
}

const out = {
  N, ruleC,
  asserts: { n111, n1011, n011any, n0011any, n10001any, n11001any, n00001any },
  dangers: { flushTau1, r1r2_011, r1r2_0011, r23_danger, r4_danger },
  elevenSteps, eleven_pre, eleven_pre_at_create, eleven_follow,
  flushHead_top: Object.fromEntries(Object.entries(flushHead).sort((a, b) => b[1] - a[1]).slice(0, 15)),
  r1r2Head_top: Object.fromEntries(Object.entries(r1r2Head).sort((a, b) => b[1] - a[1]).slice(0, 15)),
  flushMatTail, flushMatLen,
  topTail: Object.fromEntries(Object.entries(topTail).sort((a, b) => b[1] - a[1])),
  matTailRun,
  elevenExamples: elevenExamples.slice(0, 12),
};
fs.writeFileSync('q_meas_N' + N + '.json', JSON.stringify(out, null, 1));
console.log(JSON.stringify({ asserts: out.asserts, dangers: out.dangers, elevenSteps, eleven_pre, eleven_pre_at_create, flushTau1, r23_danger, topTail: out.topTail, matTailRun }, null, 1));
