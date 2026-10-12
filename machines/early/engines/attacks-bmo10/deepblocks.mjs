// Collect the block inventory from (a) full BFS to depth D, (b) rightmost-# play,
// (c) random plays. Union and report growth.
import { RULESETS, activePositions, applyAt, windowOf } from './game.mjs';

const rs = RULESETS.bmo10;
const D = parseInt(process.argv[2] || '84');
const PLAYS = parseInt(process.argv[3] || '300000');

function blocksOf(S, set) {
  const W = windowOf(S);
  let i = 6; // S region starts at W index 6 (after boundary # at 5)
  while (i < W.length) {
    if (W[i] === '#') { i++; continue; }
    let j = i;
    while (j < W.length && W[j] !== '#') j++;
    let B = W.slice(i, j);
    if (j === W.length) { let k = B.length; while (k > 0 && B[k - 1] === '0') k--; B = B.slice(0, k); } // strip tail zeros
    if (B !== '') set.add(B);
    i = j;
  }
}
function runPlay(kind, n, set) {
  let S = '';
  for (let i = 0; i < n; i++) {
    const act = activePositions(S, rs);
    if (!act.length) break;
    const idx = kind === 'rightmost' ? act[act.length - 1] : act[Math.floor(Math.random() * act.length)];
    S = applyAt(S, idx, rs);
    if (i % 97 === 0) blocksOf(S, set);
  }
  return S;
}

const t0 = Date.now();
{
  let S0 = '';
  const visited = new Set([S0]);
  let frontier = [S0];
  const depthBlocks = new Map();
  const addB = (S, d) => { if (!depthBlocks.has(d)) depthBlocks.set(d, new Set()); blocksOf(S, depthBlocks.get(d)); };
  addB('', 0);
  for (let d = 1; d <= D; d++) {
    const next = [];
    for (const S of frontier) {
      const act = activePositions(S, rs);
      for (let k = 0; k < act.length; k++) {
        const S2 = applyAt(S, act[k], rs);
        if (!visited.has(S2)) { visited.add(S2); next.push(S2); }
      }
    }
    frontier = next;
    for (const S of frontier) addB(S, d);
    if (d % 7 === 0 || d === D) {
      const cum = new Set();
      for (let e = 0; e <= d; e++) for (const b of depthBlocks.get(e) || []) cum.add(b);
      console.error(`depth ${d}: states ${visited.size}, cumulative blocks ${cum.size}, new-at-d ${(depthBlocks.get(d) || new Set()).size}`);
    }
  }
}
const playBlocks = new Set();
runPlay('rightmost', PLAYS, playBlocks);
const randBlocks = new Set();
for (let seed = 1; seed <= 3; seed++) runPlay('random', PLAYS, randBlocks);
const all = new Set([...playBlocks, ...randBlocks]);
console.error(`rightmost-${PLAYS} blocks: ${playBlocks.size}; 3x random-${PLAYS}: ${randBlocks.size}; play-union: ${all.size}`);
console.error(`max block length in plays: ${Math.max(...[...all].map(b => b.length))}`);
const bad = [...all].filter(b => b.includes('111') || b.includes('1011'));
console.error('blocks containing 111/1011:', bad.length, bad.slice(0, 5));
import { writeFileSync } from 'node:fs';
writeFileSync('deep-blocks.json', JSON.stringify({ plays: [...all].sort() }, null, 1));
console.error(`total ${((Date.now() - t0) / 1000).toFixed(0)}s; wrote deep-blocks.json`);
