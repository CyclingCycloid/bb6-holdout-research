// chaincheck3.mjs — machine-verify every consecutive DZ transition in a raw M3 scan
// log against the closed-form anchor map + costs.
// DZ line: "DZ <step> g<I>.<O> w=<W> n=<n> r1 [r2] g: <g1>"
// Anchor encoding: g0.0 w=1 n=1 [N]        -> A1(N)
//                  g0.0 w=1 n=2 [a b] g:1  -> A2(a,b)
//                  g1.0 w=2 n=2 [a b] g:2  -> A3(a,b)
//                  anything with w>=3, or g0.0 w=2 n=1, or g0.1* -> halt precursor
// Map (exact, grid-verified):
//  A1(N): N=1 -> PRE(w=3) cost 5; N even -> A2(N,N/2) cost (m^3+9m^2+11m+9)/3 (m=N/2);
//         N odd -> A3((N-1)/2,(N+1)/2) cost (N+1)(N+4)/2
//  A2(a,b) -> A1(2a+b) cost (a^3+6a^2+8a+9)/3
//  A3(1,b) -> PRE(g0.0 w=2 n=1 [b+2]) cost 4; a even -> A2(a,b+a/2+1) cost (m^3+9m^2+5m+9)/3 (m=a/2);
//         a odd -> A3((a-1)/2,b+(a+3)/2) cost (a^2+3a+4)/2
import { readFileSync } from 'node:fs';
const file = process.argv[2];
const lines = readFileSync(file, 'utf8').split('\n').filter(l => l.startsWith('DZ'));
const evs = [];
for (const ln of lines) {
  const m = ln.match(/^DZ (\d+) g(-?\d+)\.(-?\d+) w=(\d+) n=(\d+) (\d+)(?: (\d+))?(?: g: ?(\d+))?/);
  if (!m) { console.log('UNPARSED: ' + ln); process.exit(1); }
  evs.push({ step: BigInt(m[1]), g: +m[2], o: +m[3], w: +m[4], n: +m[5], r1: BigInt(m[6]), r2: m[7] !== undefined ? BigInt(m[7]) : null, g1: m[8] !== undefined ? BigInt(m[8]) : null, raw: ln });
}
function classify(e) {
  if (e.g === 0 && e.o === 0 && e.w === 1 && e.n === 1) return ['A1', e.r1];
  if (e.g === 0 && e.o === 0 && e.w === 1 && e.n === 2 && e.g1 === 1n) return ['A2', e.r1, e.r2];
  if (e.g === 1 && e.o === 0 && e.w === 2 && e.n === 2 && e.g1 === 2n) return ['A3', e.r1, e.r2];
  return ['PRE', e.raw];
}
function stepAnchor(st) {
  const [k, x, y] = st;
  if (k === 'A1') {
    const N = x;
    if (N === 1n) return [['PRE'], 5n];
    if ((N & 1n) === 0n) { const m = N / 2n; return [['A2', N, N / 2n], (m * m * m + 9n * m * m + 11n * m + 9n) / 3n]; }
    return [['A3', (N - 1n) / 2n, (N + 1n) / 2n], (N + 1n) * (N + 4n) / 2n];
  }
  if (k === 'A2') return [['A1', 2n * x + y], (x * x * x + 6n * x * x + 8n * x + 9n) / 3n];
  // A3
  if (x === 1n) return [['PRE'], 4n];
  if ((x & 1n) === 0n) { const m = x / 2n; return [['A2', x, y + x / 2n + 1n], (m * m * m + 9n * m * m + 5n * m + 9n) / 3n]; }
  return [['A3', (x - 1n) / 2n, y + (x + 3n) / 2n], (x * x + 3n * x + 4n) / 2n];
}
let ok = 0, bad = 0;
for (let i = 0; i + 1 < evs.length; i++) {
  const cur = classify(evs[i]), nxt = classify(evs[i + 1]);
  const [pred, cost] = stepAnchor(cur);
  const actualCost = evs[i + 1].step - evs[i].step;
  if (pred.map(String).join(",") === nxt.map(String).join(",") && cost === actualCost) ok++;
  else { bad++; console.log(`BAD ${i}: ${evs[i].raw} -> ${evs[i + 1].raw}   predicted ${JSON.stringify(pred)} cost ${cost} (actual ${actualCost})`); }
}
console.log(`chain: ${ok} consecutive transitions verified, bad=${bad}, events=${evs.length}`);
// also: nothing between (all DZ events are in the file by construction of the scanner)
