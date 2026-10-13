import { transition } from '../phase1.mjs';
for (const n of [2, 5, 10, 13]) {
  const res = transition(n, false);
  console.log(`R(${n},${n}) engine halt cost:`, res.halt ? res.cost : '(no halt)', 'events:', res.halt ? res.at : '-');
}
