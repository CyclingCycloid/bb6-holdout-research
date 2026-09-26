// RLE fact tabulation over the forward-reachable set.
import { RULESETS, bfs } from './game.mjs';

const rs = RULESETS.bmo10;
const DEPTH = parseInt(process.argv[2] || '60');
const r = bfs(rs, DEPTH, 5000000, 900);
const states = [...r.visited.keys()];
console.error(`visited=${states.length}`);

function rle(s) { // array of [sym,count]
  const out = [];
  for (const c of s) {
    if (out.length && out[out.length - 1][0] === c) out[out.length - 1][1]++;
    else out.push([c, 1]);
  }
  return out;
}

const zeroRun = new Map(), hashRun = new Map(), oneRun = new Map();
const rec = (m, k) => m.set(k, (m.get(k) || 0) + 1);
for (const S of states) {
  const T = rle('10#10#' + S + '0000'); // include fills
  for (const [c, k] of T) {
    if (c === '0') rec(zeroRun, Math.min(k, 30));
    if (c === '#') rec(hashRun, Math.min(k, 30));
    if (c === '1') rec(oneRun, Math.min(k, 30));
  }
}
const show = (m, name) => console.log(name + ':', [...m.entries()].sort((a, b) => a[0] - b[0]).map(([k, v]) => `${k}:${v}`).join(' '));
show(oneRun, '1-run lengths');
show(hashRun, '#-run lengths');
show(zeroRun, '0-run lengths (capped 30)');

// zero-runs adjacent to #: (zeros directly left of a #-run, zeros right of #-run)
const zl = new Map(), zr = new Map();
for (const S of states) {
  const T = rle('10#10#' + S + '0000');
  for (let i = 0; i < T.length; i++) {
    if (T[i][0] === '#') {
      const L = i > 0 && T[i - 1][0] === '0' ? Math.min(T[i - 1][1], 20) : 0;
      const R = i + 1 < T.length && T[i + 1][0] === '0' ? Math.min(T[i + 1][1], 20) : 0;
      rec(zl, L); rec(zr, R);
    }
  }
}
show(zl, '0-run left of # (0 = not-0)');
show(zr, '0-run right of # (0 = not-0)');

// does max 0-run / #-run grow with depth? bucket by depth
const byD = new Map();
for (const S of states) {
  const d = r.visited.get(S).depth;
  const T = rle(S);
  let mz = 0, mh = 0;
  for (const [c, k] of T) { if (c === '0') mz = Math.max(mz, k); if (c === '#') mh = Math.max(mh, k); }
  const e = byD.get(d) || { mz: 0, mh: 0, n: 0 };
  e.mz = Math.max(e.mz, mz); e.mh = Math.max(e.mh, mh); e.n++;
  byD.set(d, e);
}
const ds = [...byD.keys()].sort((a, b) => a - b);
console.log('depth: max0run max#run (every 5th depth)');
for (const d of ds) if (d % 5 === 0 || d === ds[ds.length - 1]) console.log(`  d=${d}: ${byD.get(d).mz} ${byD.get(d).mh}`);
