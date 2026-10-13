// measure2.mjs — deep-tail structure of trajectory configs.
// Questions:
//  Q1: per-position residue distribution of runs at positions 4.. (the "tail")
//  Q2: BIG-k configs: what do they look like concretely (sample)
//  Q3: tail length distribution per family
//  Q4: pairsum structure rho_{2i+1}+rho_{2i+2} mod 6 along tails
//  Q5: "other" R exact instances (a,b) and born-A forms
import { readFileSync } from 'fs';
const lib = JSON.parse(readFileSync('library.json', 'utf8')).states;
const mod = (v, m) => Number(((Number(v) % m) + m) % m);

// Q5: exact "other" R instances
const others = [];
// Q1/Q3: position residue histograms
const posHist = {}; // pos -> {mod6res: count}
const klen = {};
let bigSamples = [];
for (const s of lib) {
  const [t, rs] = s.split(':');
  const r = rs.split(',').map(Number);
  const k = r.length;
  const kc = k <= 4 ? String(k) : 'BIG';
  klen[t + kc] = (klen[t + kc] || 0) + 1;
  for (let i = 0; i < r.length; i++) {
    const key = t + (i + 1);
    posHist[key] = posHist[key] || {};
    posHist[key][mod(r[i], 6)] = (posHist[key][mod(r[i], 6)] || 0) + 1;
  }
  if (t === 'R' && r[0] !== 1 && r[0] !== r[1]) others.push(r.join(','));
  if (kc === 'BIG' && bigSamples.length < 25 && Math.random() < 0.001) bigSamples.push(s);
}
console.log('Q5 "other" R exact instances (' + others.length + '):');
const oset = {};
for (const o of others) oset[o] = (oset[o] || 0) + 1;
console.log(JSON.stringify(oset, null, 1));
console.log('\nQ3 k-length hist:', JSON.stringify(klen));
console.log('\nQ1 per-position mod-6 histograms (positions 1..12):');
for (let p = 1; p <= 12; p++) {
  const h = posHist['S' + p] || posHist['L' + p] || posHist['G' + p];
  if (h) console.log('  pos ' + p + ': ' + JSON.stringify(h));
}
console.log('\nQ2 BIG-k samples:');
for (const b of bigSamples) console.log('  ' + b);
