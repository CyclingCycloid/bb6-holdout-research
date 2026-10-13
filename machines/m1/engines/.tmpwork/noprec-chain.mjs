import { step } from '../phase1.mjs';
let c = { t: 'S', r: [3, 1, 3] };
const seq = [];
for (let i = 0; i < 40; i++) {
  const st = step(c);
  if (st.degenerate) { seq.push(`DEGEN:${st.degenerate}`); break; }
  if (st.halt) { seq.push(`HALT(+${st.cost})`); break; }
  seq.push(`${st.rule} -> ${st.c.t}${st.c.r.length}[${st.c.r}] @${st.cost}`);
  c = st.c;
}
console.log(seq.join('\n'));
