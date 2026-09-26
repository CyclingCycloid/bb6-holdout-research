// 3-state brute force for bounded cyclers (A,B,C active; D,E,F self-loop fillers)
function sim(T, steps) {
  const tape = new Map(); let head = 0, st = 0;
  const seen = new Map();
  for (let s = 0; s < steps; s++) {
    const sy = tape.get(head) ?? 0;
    const [w, d, nx] = T[st * 2 + sy];
    // fingerprint: state, head-lo over content string
    let lo = Infinity, hi = -Infinity;
    for (const k of tape.keys()) { if (tape.get(k)) { lo = Math.min(lo, k); hi = Math.max(hi, k); } }
    if (lo === Infinity) lo = hi = 0;
    let content = '';
    for (let p = lo; p <= hi; p++) content += (tape.get(p) ?? 0);
    const fp = st + '|' + (head - lo) + '|' + content;
    if (seen.has(fp)) return { cyc: true, period: s - seen.get(fp), span: hi - lo + 1, T };
    seen.set(fp, s);
    tape.set(head, w); head += d; st = nx;
    if (Math.abs(head) > 1000) return null;
  }
  return null;
}
const found = [];
const dirs = [-1, 1];
for (let code = 0; code < 8 ** 6; code++) {
  let x = code; const T = [];
  for (let i = 0; i < 6; i++) { T.push([x % 2, dirs[(x >> 1) % 2], (x >> 2) % 3]); x >>= 3; }
  const r = sim(T, 3000);
  if (r && r.span <= 12) { found.push({ T, ...r }); if (found.length >= 3) break; }
}
console.log(JSON.stringify(found.slice(0, 3), null, 1).slice(0, 800));
for (const f of found.slice(0, 3)) {
  // to triage code: A0,A1,B0,B1,C0,C1 each w,d,nx; states ABC; D..F fillers 0RD etc
  const ch = (t) => `${t[0]}${t[1] < 0 ? 'L' : 'R'}${'ABC'[t[2]]}`;
  const fill = (S) => `0R${S}0R${S}`;
  console.log(ch(f.T[0]) + ch(f.T[1]) + ch(f.T[2]) + ch(f.T[3]) + ch(f.T[4]) + ch(f.T[5]) + fill('D') + fill('E') + fill('F'));
}
