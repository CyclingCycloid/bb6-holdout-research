// trace-poison.mjs — rerun the closure, capture the concrete chain to each poison node,
// then trace the poison node's OWN era continuation (halt? (0^1,1^1) creation?).
import { FastTape } from './macro3.mjs';
import { build, parseRle, macroStepGuarded } from '../reverify-cm2/ref-lib.mjs';
function keyOf(runs, head) {
  let p = 0, i = -1, off = 0;
  for (let k = 0; k < runs.length; k++) { if (head >= p && head < p + runs[k].len) { i = k; off = head - p; break; } p += runs[k].len; }
  if (i < 0) { let best = null, q = 0;
    for (let k = 0; k < runs.length; k++) { const e = q + runs[k].len;
      for (const d of [Math.abs(head - q), Math.abs(head - e)]) if (best === null || d < best) best = d;
      q = e; }
    return 'OUT' + (head < 0 ? 'L' : 'R') + ':' + (best <= 3 ? String(best) : '4+'); }
  const gcls = n => n <= 6 ? String(n) : '7+'; const bcls = n => n <= 3 ? String(n) : 'B';
  const win = [];
  for (let k = Math.max(0, i - 2); k <= Math.min(runs.length - 1, i + 3); k++) {
    const r = runs[k];
    if (k === i) { if (r.v) win.push('b@L:' + bcls(r.len)); else win.push('g' + gcls(r.len) + '@' + (off <= 2 ? off : '3+')); }
    else win.push(r.v ? 'b' + bcls(r.len) : 'g' + gcls(r.len));
  }
  return win.join(',');
}
function poison(t) {
  const rl = t.rle(); const rs = parseRle(rl.s);
  let q = rl.lo, hi = -1, off = 0;
  for (let i = 0; i < rs.length; i++) { if (t.head >= q && t.head < q + rs[i].len) { hi = i; off = t.head - q; break; } q += rs[i].len; }
  const tags = [];
  if (hi >= 1 && rs[hi].v === 0 && rs[hi].len === 6 && rs[hi+1] && rs[hi+1].v === 1 && rs[hi+1].len === 1) tags.push('P2:g6-R1');
  return tags;
}
function era(t) {
  for (let i = 0; i < 400000; i++) {
    const r = macroStepGuarded(t);
    if (String(r.kind).startsWith('HALT')) return { halt: r.kind };
    if (String(r.kind).startsWith('NONTERM')) return { nonterm: r.kind };
    if (r.kind === 'Dance' || r.kind === 'DanceFill' || r.kind === 'DBL' || r.kind === 'L1') return { done: true };
  }
  return { nonterm: 'MAXMACRO' };
}
// rebuild the closure (same as hclosure2) but record concrete chains to poison nodes
const seedTape = new FastTape();
const seeds = []; let eras = 0;
while (seedTape.step < 3e6 && seeds.length < 2500) {
  const r = macroStepGuarded(seedTape);
  if (r.kind === 'Dance' || r.kind === 'DanceFill' || r.kind === 'DBL' || r.kind === 'L1') { eras++;
    if (eras % 5 === 0) seeds.push({ runs: seedTape.runs.map(x => ({ ...x })), head: seedTape.head, t: seedTape.step }); }
}
const nodes = new Map(); const frontier = [];
function addNode(k, runs, head, parent, tag) {
  if (nodes.has(k)) { if (parent) nodes.get(k).parents.push(parent); return false; }
  nodes.set(k, { parents: parent ? [parent] : [], ex: { runs: runs.map(x=>({...x})), head }, depth: parent ? (nodes.get(parent)?.depth ?? 0) + 1 : 0, tag });
  frontier.push({ k, runs: runs.map(x=>({...x})), head, tag }); return true;
}
for (const s of seeds) addNode(keyOf(s.runs, s.head), s.runs, s.head, null, 'seed@' + s.t);
for (const s of seeds.slice(0, 400)) {
  const runs = s.runs.map(r => ({ v: r.v, len: r.len >= 4 ? Math.min(r.len * 2, 200) : r.len }));
  addNode(keyOf(runs, s.head), runs, s.head, null, 'scale@' + s.t);
}
let rounds = 0; const frontier2 = [];
while (rounds < 12 && frontier.length) {
  rounds++; const f2 = [];
  for (const f of frontier) {
    const t = build(f.runs, f.head);
    if (poison(t).length) { /* poison node: keep for tracing */ }
    const r = era(t);
    if (r.halt || r.nonterm) continue;
    const k2 = keyOf(t.runs, t.head);
    if (addNode(k2, t.runs, t.head, f.k, f.tag)) {
      f2.push({ k: k2, runs: t.runs.map(x=>({...x})), head: t.head, tag: f.tag });
      const sc = t.runs.map(x => ({ v: x.v, len: x.len >= 4 ? Math.min(x.len * 2 + 6, 300) : x.len }));
      if (addNode(keyOf(sc, t.head), sc, t.head, k2 + ':s', f.tag + '>S')) f2.push({ k: keyOf(sc, t.head), runs: sc.map(x=>({...x})), head: t.head, tag: f.tag + '>S' });
    }
  }
  frontier.length = 0; frontier.push(...f2);
}
console.log('closure done: nodes', nodes.size, 'rounds', rounds);
// find poison-reachable nodes and their chains
const poisonNodes = [];
for (const [k, nd] of nodes) {
  const t = build(nd.ex.runs, nd.ex.head);
  if (poison(t).length) poisonNodes.push({ k, nd, tags: poison(t) });
}
console.log('poison-reachable concrete nodes:', poisonNodes.length);
// for each: BFS the parent chain back to a seed, then re-run forward printing each era
function chainTo(k) {
  const path = [];
  let cur = k;
  while (cur && nodes.has(cur)) { const nd = nodes.get(cur); path.unshift(cur); cur = nd.parents[0]; }
  return path;
}
let shown = 0;
for (const pn of poisonNodes) {
  if (shown >= 3) break;
  shown++;
  const path = chainTo(pn.k);
  console.log('=== POISON NODE', pn.k.slice(0, 55), 'tags', pn.tags.join(';'), 'chain len', path.length);
  // re-run forward from the seed
  const startNd = nodes.get(path[0]);
  const t = build(startNd.ex.runs, startNd.ex.head);
  console.log('  seed state:', t.rle().s.slice(0, 95), 'h=' + t.head);
  for (let e = 0; e < path.length + 4; e++) {
    const cur = nodes.get(path[e]);
    if (cur && e < path.length) {
      const r = era(t);
      console.log('  era', e + 1, '->', r.halt ? 'HALT ' + r.halt : (r.nonterm ? r.nonterm : (keyOf(t.runs, t.head) === path[e+1] ? '[matches closure]' : '[DIVERGES from closure!]')), '|', t.rle().s.slice(0, 85), 'h=' + t.head);
      if (r.halt || r.nonterm) break;
    } else {
      // past the closure path: continue the poison node's own future
      const r = era(t);
      console.log('  +', e - path.length + 1, '->', r.halt ? 'HALT ' + r.halt : (r.nonterm ? r.nonterm : (poison(t).length ? 'POISON:' + poison(t).join(';') : 'clean')), '|', t.rle().s.slice(0, 85), 'h=' + t.head);
      if (r.halt || r.nonterm) break;
    }
  }
}
