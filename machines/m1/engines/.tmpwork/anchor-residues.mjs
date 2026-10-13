// anchor sequence n_k from P(3): collect b_k = 2n_k+2 mod M for M<=64; check coverage of classes 9 and 12
import { transitionFast } from '../phase1.mjs';
let n = 3; const seq = [n];
for (let k = 0; k < 24; k++) {
  const r = transitionFast(n);
  if (r.halt || r.degenerate || !r.n2) { console.log('anchor chain ends', JSON.stringify(r).slice(0,80)); break; }
  n = r.n2; seq.push(n);
}
console.log('anchors:', seq.slice(0, 12).join(', '), '... total', seq.length);
let bad9 = [], bad12 = [];
for (let M = 2; M <= 64; M++) {
  const classes = new Set(seq.map(x => (2*x + 2) % M));
  // R(1,b) with b odd leads R(1,b+3); b=9-type: need class 9 reachable: (2n+2)≡9 mod M
  if (!classes.has(9 % M)) bad9.push(M);
  if (!classes.has(12 % M)) bad12.push(M);
}
console.log('M where class 9 NOT covered by on-orbit R(1,b):', bad9.join(',') || 'none');
console.log('M where class 12 NOT covered:', bad12.join(',') || 'none');
