// q_meas2.mjs — danger-distance dynamics on the deterministic orbit.
//
// DANGER POSITIONS: i is a danger position of the region tau if
//   tau[i..] starts '011' (=> R1 at head there makes 111) or '0011' (=> 1011),
//   or tau[i..] starts '111'/'1011' (inactive directly).
// The head is at 0; lethal <=> a danger position sits at 0 at some step.
// We track d = min danger position (capped at CAP=36, plus class INF) and the
// transition statistics (d, r, head-window) -> d', to expose the counter algebra
// that keeps the head off the danger positions.
//
// Also: the '11' lifecycle params (position, preceding 0-run, following symbol)
// and their transition statistics.
//
// Usage: node q_meas2.mjs N

import { StackPlay } from './q_stack.mjs';
import fs from 'node:fs';

const N = parseInt(process.argv[2] || '2000000');
const CAP = 36;
const s = new StackPlay();

const zrunBefore = (str, i) => { let n = 0; while (i - 1 - n >= 0 && str[i - 1 - n] === '0') n++; return n; };

function dangerPositions(tau) {
  // positions i (<= CAP+2) where tau[i..] starts 011 / 0011 / 111 / 1011
  const out = [];
  const lim = Math.min(tau.length - 3, CAP + 4);
  for (let i = 0; i <= lim; i++) {
    const a = tau[i], b = tau[i + 1], c = tau[i + 2], d4 = tau[i + 3] ?? '0';
    if (a === '0' && b === '1' && c === '1') out.push(i);          // 011
    else if (a === '0' && b === '0' && c === '1' && d4 === '1') out.push(i); // 0011
    else if (a === '1' && b === '1' && c === '1') out.push(i);      // 111
    else if (a === '1' && b === '0' && c === '1' && d4 === '1') out.push(i); // 1011
  }
  return out;
}

function elevenInfo(tau) {
  // first '11' position + preceding run + following symbol
  for (let i = 0; i + 1 < tau.length; i++) {
    if (tau[i] === '1' && tau[i + 1] === '1') {
      return { pos: Math.min(i, 255), pre: Math.min(zrunBefore(tau, i), 255), follow: tau[i + 2] ?? '0' };
    }
  }
  return null;
}

const dHist = {}, dTrans = {}, dTransR = {}, elevenJoint = {}, eTrans = {};
let lethal = 0;
const t0 = Date.now();
for (let i = 0; i < N; i++) {
  const p = s.rule();
  if (p < 0) { console.log('INACTIVE at', i, s.head(12)); lethal++; break; }
  const tau = s.region;
  const dp = dangerPositions(tau);
  const d0 = dp.length ? Math.min(...dp) : -1; // -1 = INF
  const e0 = elevenInfo(tau);
  const h = s.head(8);
  const key0 = `${d0 <= CAP ? d0 : 'H'}|${s.r}`;
  dHist[key0] = (dHist[key0] || 0) + 1;
  if (e0) {
    const ek = `${e0.pos <= 30 ? e0.pos : 'H'}:${e0.pre <= 20 ? e0.pre : 'H'}:${e0.follow}`;
    elevenJoint[ek] = (elevenJoint[ek] || 0) + 1;
  }
  s.step();
  const tau2 = s.region;
  const dp2 = dangerPositions(tau2);
  const d1 = dp2.length ? Math.min(...dp2) : -1;
  const key1 = `${d0 <= CAP ? d0 : 'H'}|${s.r}>${d1 <= CAP ? d1 : 'H'}|${s.r}`;
  dTrans[key1] = (dTrans[key1] || 0) + 1;
  dTransR[key1 + '|' + p] = (dTransR[key1] || 0) + 1;
  if (e0) {
    const e1 = elevenInfo(tau2);
    const ek1 = e1 ? `${e1.pos <= 30 ? e1.pos : 'H'}:${e1.pre <= 20 ? e1.pre : 'H'}:${e1.follow}` : 'X';
    const k = `${e0.pos <= 30 ? e0.pos : 'H'}:${e0.pre <= 20 ? e0.pre : 'H'}>${ek1}`;
    eTrans[k] = (eTrans[k] || 0) + 1;
  }
}
const sortN = (o) => Object.fromEntries(Object.entries(o).sort((a, b) => a[0] < b[0] ? -1 : 1));
fs.writeFileSync(`q_meas2_N${N}.json`, JSON.stringify({ N, lethal, dHist: sortN(dHist), dTrans: sortN(dTrans), dTransR: sortN(dTransR), elevenJoint: sortN(elevenJoint), eTrans: sortN(eTrans) }, null, 1));
console.log('lethal:', lethal, 'ms:', Date.now() - t0);
console.log('dHist:', JSON.stringify(sortN(dHist)));
console.log('dTrans keys:', Object.keys(dTrans).length);
console.log('elevenJoint:', JSON.stringify(sortN(elevenJoint)));
