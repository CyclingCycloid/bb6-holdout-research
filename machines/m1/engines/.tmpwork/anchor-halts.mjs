// bare simulator from R(n,n); record config at each event; find halting n and the last few G-forms
const CODE = "1RB1LA0RC0RD1LC1LA1RE1RD1LF0LA---0LE";
const T = []; for (let i = 0; i < 6; i++) T.push([null, null]);
for (let i = 0; i < 12; i++) { const t = CODE.slice(3*i, 3*i+3);
  T[i/2|0][i%2] = { w:+t[0], m: t[1]==='L'?-1:1, n: t[2]==='-'?6:t.charCodeAt(2)-65 }; }
function runsAround(tape, head) {
  const lo = head - 30, hi = head + 60;
  const runs = []; let q = lo;
  while (q < hi) { const v = tape.get(q) || 0; let r = q; while (r < hi && (tape.get(r) || 0) === v) r++; if (v) runs.push([q, r - q]); q = r; }
  return runs.filter(r => r[0] > lo && r[0] + r[1] < hi);
}
function formOf(tape, head) {
  const runs = runsAround(tape, head);
  if (!runs.length) return 'empty';
  const offs = runs.map(r => r[0] - head);
  const lens = runs.map(r => r[1]);
  // classify by gap structure around head
  const gaps = [];
  for (let i = 0; i + 1 < runs.length; i++) gaps.push(runs[i+1][0] - (runs[i][0] + runs[i][1]));
  // head position: which gap contains head?
  let gi = -1, goff = -1;
  for (let i = 0; i < gaps.length; i++) { const s = runs[i][0] + runs[i][1]; if (head >= s && head < s + gaps[i]) { gi = i; goff = head - s; } }
  if (head < runs[0][0]) return `LEFT-of-all(${lens.join(',')})`;
  if (gi === -1) return `RIGHT-of-all(${lens.join(',')})`;
  const gdesc = gaps.map((g,i)=> i===gi ? `[${g}]*` : `${g}`).join(',');
  return `${lens.join(',')} gaps ${gdesc} head@gap${gi}+${goff}`;
}
function runFrom(n, maxSteps = 60000) {
  const tape = new Map(); let p = 0;
  for (let k = 0; k < n; k++) tape.set(p++, 1); p++;
  for (let k = 0; k < n; k++) tape.set(p++, 1);
  let head = p, st = 3, steps = 0; const gSeen = [];
  for (; steps < maxSteps; steps++) {
    const sy = tape.get(head) || 0;
    if (st === 3 && sy === 0 && steps > 0) {
      const f = formOf(tape, head);
      if (f.startsWith('') && (f.includes('3,1') || true)) gSeen.push(f);
      if (gSeen.length > 6) gSeen.shift();
    }
    const tr = T[st][sy];
    if (tr.n === 6) return { halt: true, steps: steps + 1, last: gSeen };
    tape.set(head, tr.w); head += tr.m; st = tr.n;
  }
  return { halt: false, steps };
}
let halts = 0;
for (let n = 2; n <= 80; n++) {
  const r = runFrom(n);
  if (r.halt) { halts++; if (halts <= 13) console.log(`R(${n},${n}): HALT@${r.steps} last-forms: ${r.last.slice(-3).join(' | ')}`); }
}
console.log('halting anchors n in 2..80:', halts);
