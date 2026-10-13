// hclosure2.mjs — FIXED-KEY head-anchored closure (F5 fix) + poison tracking (F1/F3 decisive test)
// + parent-graph BFS for the accelerated poison hunt (coordinator step-3).
// Key v2: head-anchored window i±(2,3); gaps EXACT {1..6,7+}; blocks {1,2,3,B};
// head-run: gap -> exact width + offset class {1,2,3+}; block -> size class + 'L';
// OUT: side + relative offset class {1,2,3,4+} to nearest run boundary.
import { FastTape } from './macro3.mjs';
// ref-lib.mjs vendored from bb6/reverify-cm2 (import path fixed for this tree)
import { build, parseRle, macroStepGuarded } from './ref-lib.mjs';
import fs from 'fs';

const gcls = n => n <= 6 ? String(n) : '7+';
const bcls = n => n <= 3 ? String(n) : 'B';
function keyOf(runs, head) {
  let p = 0, i = -1, off = 0;
  for (let k = 0; k < runs.length; k++) { if (head >= p && head < p + runs[k].len) { i = k; off = head - p; break; } p += runs[k].len; }
  if (i < 0) {
    let best = null, q = 0;
    for (let k = 0; k < runs.length; k++) { const e = q + runs[k].len;
      for (const d of [Math.abs(head - q), Math.abs(head - e)]) if (best === null || d < best) best = d;
      q = e; }
    return 'OUT' + (head < 0 ? 'L' : 'R') + ':' + (best <= 3 ? String(best) : '4+');
  }
  const win = [];
  for (let k = Math.max(0, i - 2); k <= Math.min(runs.length - 1, i + 3); k++) {
    const r = runs[k];
    if (k === i) {
      if (r.v) win.push('b@L:' + bcls(r.len));
      else win.push('g' + gcls(r.len) + '@' + (off <= 2 ? off : '3+'));
    } else win.push(r.v ? 'b' + bcls(r.len) : 'g' + gcls(r.len));
  }
  return win.join(',');
}
function poison(t) {
  const rl = t.rle(); const rs = parseRle(rl.s);
  let q = rl.lo, hi = -1, off = 0;
  for (let i = 0; i < rs.length; i++) { if (t.head >= q && t.head < q + rs[i].len) { hi = i; off = t.head - q; break; } q += rs[i].len; }
  const tags = [];
  if (rs.length === 3 && rs[0].v === 1 && rs[1].v === 0 && rs[1].len === 1 && rs[2].v === 1 && rs[2].len === 1 && hi === 2 && off === 0) tags.push('P1:gE-M1');
  if (hi >= 1 && rs[hi].v === 0 && rs[hi].len === 6 && rs[hi+1] && rs[hi+1].v === 1 && rs[hi+1].len === 1) tags.push('P2:g6-R1');
  if (hi >= 1 && hi + 3 < rs.length && rs[hi].v === 1 && off === 0 && rs[hi-1].v === 0 && rs[hi-1].len === 1 && rs[hi+1].v === 0 && rs[hi+1].len === 1 && rs[hi+2].v === 1 && rs[hi+2].len === 1) tags.push('P3:g1g1-R1');
  if (rs.length === 5 && rs[0].v === 1 && rs[1].v === 0 && rs[1].len === 1 && rs[2].v === 1 && rs[3].v === 0 && rs[3].len === 5 && rs[4].v === 1 && hi === 3 && off === 1) {
    const M = rs[2].len, R = rs[4].len;
    if ((M % 4 === 3 && R === 1) || (M === 2 && R === 2) || (M === 1 && R === 2) || (M === 4 && R === 3)) tags.push(`P4:T0poison(M${M},R${R})`);
  }
  if (hi >= 1 && rs[hi].v === 0 && rs[hi].len === 3 && off === 1 && rs[hi+1] && rs[hi+1].v === 1 && rs[hi+2] && rs[hi+2].v === 0 && rs[hi+2].len === 1 && rs[hi+3] && rs[hi+3].v === 1 && rs[hi+3].len === 1) tags.push('P5:g3+(g1,1)');
  if (hi >= 2 && rs[hi].v === 0 && rs[hi].len === 6 && off >= 1 && rs[hi+1] && rs[hi+1].v === 1 && rs[hi+1].len === 1 && rs[hi-1].v === 1 && rs[hi-1].len >= 4) tags.push('P6:g6o1-L4+R1');
  for (let i = Math.max(hi + 1, 0); i + 1 < rs.length; i++) if (rs[i].v === 0 && rs[i].len === 1 && rs[i+1].v === 1 && rs[i+1].len === 1) { tags.push('P7:tail(g1,1)@r' + i); break; }
  return tags;
}
function era(t, maxMacro = 400000) {
  for (let i = 0; i < maxMacro; i++) {
    const r = macroStepGuarded(t);
    if (String(r.kind).startsWith('HALT')) return { halt: r.kind };
    if (String(r.kind).startsWith('NONTERM')) return { nonterm: r.kind };
    if (r.kind === 'Dance' || r.kind === 'DanceFill' || r.kind === 'DBL' || r.kind === 'L1') return { done: true };
  }
  return { nonterm: 'MAXMACRO' };
}
// ===== real-orbit seeds =====
const seedTape = new FastTape();
const seeds = [];
let eras = 0;
while (seedTape.step < 3e6 && seeds.length < 2500) {
  const r = macroStepGuarded(seedTape);
  if (String(r.kind).startsWith('HALT')) { console.log('seed run HALT?!'); break; }
  if (r.kind === 'Dance' || r.kind === 'DanceFill' || r.kind === 'DBL' || r.kind === 'L1') {
    eras++;
    if (eras % 5 === 0) seeds.push({ runs: seedTape.runs.map(x => ({ ...x })), head: seedTape.head, t: seedTape.step });
  }
}
console.log('seeds:', seeds.length);
// ===== closure with parent graph =====
const nodes = new Map(); // key -> {parents:[keys], ex:{runs,head}, poison:Set, depth, haltTags:Set}
const frontier = [];
function addNode(k, runs, head, parent, tag) {
  if (nodes.has(k)) { if (parent) nodes.get(k).parents.push(parent); return false; }
  nodes.set(k, { parents: parent ? [parent] : [], ex: { runs: runs.map(x=>({...x})), head }, poison: new Set(), depth: parent ? (nodes.get(parent)?.depth ?? 0) + 1 : 0, haltTags: new Set() });
  frontier.push({ k, runs: runs.map(x=>({...x})), head, tag });
  return true;
}
for (const s of seeds) {
  const k = keyOf(s.runs, s.head);
  addNode(k, s.runs, s.head, null, 'seed@' + s.t);
}
for (const s of seeds.slice(0, 400)) {
  const runs = s.runs.map(r => ({ v: r.v, len: r.len >= 4 ? Math.min(r.len * 2, 200) : r.len }));
  const k = keyOf(runs, s.head);
  addNode(k, runs, s.head, null, 'scale@' + s.t);
}
console.log('initial nodes:', nodes.size);
const poisonEvents = [], haltEvents = [];
let rounds = 0;
while (rounds < 12 && frontier.length) {
  rounds++;
  const f2 = []; let newk = 0;
  for (const f of frontier) {
    const nd = nodes.get(f.k);
    const t = build(f.runs, f.head);
    for (const tag of poison(t)) if (!nd.poison.has(tag)) { nd.poison.add(tag); poisonEvents.push({ key: f.k, tag, depth: nd.depth, rle: t.rle().s.slice(0, 90) }); }
    const r = era(t);
    if (r.halt) { if (!nd.haltTags.has(r.halt)) { nd.haltTags.add(r.halt); haltEvents.push({ key: f.k, halt: r.halt, depth: nd.depth }); } continue; }
    if (r.nonterm) { if (!nd.haltTags.has(r.nonterm)) { nd.haltTags.add(r.nonterm); haltEvents.push({ key: f.k, nonterm: r.nonterm, depth: nd.depth }); } continue; }
    const k2 = keyOf(t.runs, t.head);
    const isNew = addNode(k2, t.runs, t.head, f.k, f.tag);
    const nd2 = nodes.get(k2);
    for (const tag of poison(t)) if (!nd2.poison.has(tag)) { nd2.poison.add(tag); poisonEvents.push({ key: k2, tag, depth: nd2.depth, rle: t.rle().s.slice(0, 90) }); }
    if (isNew) {
      newk++;
      f2.push({ k: k2, runs: t.runs.map(x=>({...x})), head: t.head, tag: f.tag });
      const sc = t.runs.map(x => ({ v: x.v, len: x.len >= 4 ? Math.min(x.len * 2 + 6, 300) : x.len }));
      const k3 = keyOf(sc, t.head);
      if (addNode(k3, sc, t.head, k2 + ':scale', f.tag + '>S')) { newk++; f2.push({ k: k3, runs: sc.map(x=>({...x})), head: t.head, tag: f.tag + '>S' }); }
    }
  }
  frontier.length = 0; frontier.push(...f2);
  console.log(`round ${rounds}: frontier ${f2.length} new ${newk} nodes ${nodes.size} poison ${poisonEvents.length} halts ${haltEvents.length}`);
  if (newk === 0) { console.log('CLOSURE at round', rounds); break; }
}
console.log('=== FINAL: nodes', nodes.size, '| poison keys', new Set(poisonEvents.map(e=>e.key)).size, '| halt keys', new Set(haltEvents.map(e=>e.key)).size, '| rounds', rounds);
const poisonKeys = new Set(poisonEvents.map(e => e.key));
console.log('poison keys:', [...poisonKeys].slice(0, 10));
if (poisonKeys.size) {
  let minDepth = Infinity;
  for (const k of poisonKeys) { const d = nodes.get(k)?.depth ?? -1; if (d >= 0 && d < minDepth) minDepth = d; }
  console.log('MIN seed-depth of a poison node:', minDepth, '(era-steps from the nearest seed along the closure graph)');
  poisonEvents.slice(0, 10).forEach(e => console.log('POISON', e.tag, 'depth', e.depth, '@', e.key.slice(0, 55), '|', e.rle.slice(0, 70)));
}
if (haltEvents.length) {
  const hk = {};
  for (const e of haltEvents) hk[e.halt] = (hk[e.halt] || 0) + 1;
  console.log('halt events by kind:', JSON.stringify(hk));
  let minDepth = Infinity;
  for (const e of haltEvents) { const d = nodes.get(e.key)?.depth ?? -1; if (d >= 0 && d < minDepth) minDepth = d; }
  console.log('MIN seed-depth of a halt node:', minDepth);
}
fs.writeFileSync('closure2-nodes.txt', [...nodes.entries()].map(([k, v]) =>
  `${k}\tdepth=${v.depth}\tpoison=[${[...v.poison].join(';') || '-'}]\thalt=[${[...v.haltTags].join(';') || '-'}]\tparents=${v.parents.length}`).join('\n'));
console.log('node inventory written:', nodes.size);
