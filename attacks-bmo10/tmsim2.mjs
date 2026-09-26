// Clean TM simulator, RLE output identical in format to sim/tm.exe so outputs can be diffed.
// Usage: node tmsim2.mjs <code> <steps> <cpEvery>
const code = process.argv[2];
const STEPS = parseInt(process.argv[3]);
const CPE = parseInt(process.argv[4] || '0');

const T = [];
for (let i = 0; i < 12; i++) {
  const t = code.slice(3 * i, 3 * i + 3);
  T.push({ w: t[0] === '0' ? 0 : 1, d: t[1] === 'L' ? -1 : 1, n: t[2] === '-' ? -1 : t.charCodeAt(2) - 65 });
}
const tape = new Map();
const rd = (p) => tape.get(p) ?? 0;
let head = 0, state = 0, step = 0;

function rle(head) {
  // RLE over [minWritten-1, maxWritten+1) treating outside as 0, like tm.c
  let lo = 0, hi = 0;
  if (tape.size) {
    lo = Math.min(...tape.keys()) - 1;
    hi = Math.max(...tape.keys()) + 2;
  }
  const rc = (p) => (tape.has(p) ? tape.get(p) : 0);
  let s = `@${lo} ${rc(lo)} `;
  let count = 0, cur = rc(lo);
  for (let p = lo; p < hi; p++) {
    const v = rc(p);
    if (v === cur) count++;
    else { s += `${count} `; cur = v; count = 1; }
  }
  s += `${count} `;
  return s;
}

while (step < STEPS) {
  if (CPE > 0 && step > 0 && step % CPE === 0) {
    console.log(`CP ${step} ${String.fromCharCode(65 + state)} ${head} ${rle(head)}`);
  }
  const sy = rd(head);
  const tr = T[state * 2 + sy];
  if (tr.n < 0) { console.log(`HALT ${step} ${String.fromCharCode(65 + state)} ${head} ${rle(head)}`); break; }
  tape.set(head, tr.w);
  head += tr.d;
  state = tr.n;
  step++;
}
console.log(`DONE ${step} ${String.fromCharCode(65 + state)} ${head} ${rle(head)}`);
