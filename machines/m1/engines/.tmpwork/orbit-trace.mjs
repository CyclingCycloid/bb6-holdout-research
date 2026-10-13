// bare simulator of M1, run from P(3)=R(3,3), print G-form configs at events
const CODE = "1RB1LA0RC0RD1LC1LA1RE1RD1LF0LA---0LE";
const T = []; for (let i = 0; i < 6; i++) T.push([null, null]);
for (let i = 0; i < 12; i++) { const t = CODE.slice(3*i, 3*i+3);
  T[i/2|0][i%2] = { w:+t[0], m: t[1]==='L'?-1:1, n: t[2]==='-'?6:t.charCodeAt(2)-65 }; }
// build R(a,b): runs (a,b) gaps [1], head on fresh 0 right of right run, state D
const tape = new Map();
let p = 0; for (let k = 0; k < 3; k++) tape.set(p++, 1); p++; for (let k = 0; k < 3; k++) tape.set(p++, 1);
let head = p; let st = 3; // D reading 0
let steps = 0, events = 0;
const describe = () => {
  // window around head
  const lo = head - 30, hi = head + 50;
  const runs = []; let q = lo;
  while (q < hi) { const v = tape.get(q) || 0; let r = q; while (r < hi && (tape.get(r) || 0) === v) r++; if (v) runs.push([q - head, r - q]); q = r; }
  return runs.filter(r => r[0] > -30 && r[0] + r[1] < 50).map(r => `${r[0]}:${r[1]}`).join(' ');
};
for (; steps < 300000; steps++) {
  const sy = tape.get(head) || 0;
  if (st === 3 && sy === 0 && steps > 0) {
    events++;
    if (events <= 40) console.log(`event#${events} step=${steps} head=${head} runs(off:len)=${describe()}`);
  }
  const tr = T[st][sy];
  if (tr.n === 6) { console.log(`HALT at step ${steps + 1} head=${head}`); break; }
  tape.set(head, tr.w); head += tr.m; st = tr.n;
}
console.log(`total steps=${steps} events=${events} state=${'ABCDEF'[st]}`);
