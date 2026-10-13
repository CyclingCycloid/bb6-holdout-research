import { stepFastB } from '../bstep.mjs';
let c = { t:'R', r:[3n,3n] };
const gheads = [];
for (let i = 0; i < 150000; i++) {
  const st = stepFastB(c);
  if (st.degenerate || st.halt) break;
  c = st.c;
  if (c.t === 'G') gheads.push(c.r[0]);
}
const mod3 = new Map();
for (const a of gheads) { const k = (a % 3n).toString(); mod3.set(k, (mod3.get(k)||0)+1); }
console.log('G-heads on orbit:', gheads.length, 'mod-3 histogram:', JSON.stringify([...mod3.entries()]));
console.log('distinct small G-heads:', [...new Set(gheads.filter(a=>a<300n).map(String))].sort((a,b)=>+a-+b).join(', '));
// also: mod 4 histogram of G-heads, and check if head 1 or 3 ever appear
console.log('contains head 1 or 3:', gheads.some(a=>a===1n||a===3n));
