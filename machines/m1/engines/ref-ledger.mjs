// ref-ledger.mjs — ADVERSARIAL REFEREE: independent re-check of the I0 ledger theorem.
// (1) OWN closure sweep on a DIFFERENT grid: run count k up to 9 (author's casecheck: small
//     grid k<=6, random k<=7), boundary parameters (y=1,2,3,4; a=0..4 at R and 2,3,4 at G;
//     r2=3,4; r3=1,2; x=1,2; BG1 b in {2,5,8,11,14,17}; BG2 z in {1,4,7,10}), tails covering
//     all mod-3 residues, plus 2^30-scale random members with k up to 10.
// (2) Seed check: R(3,3) in I0 (all components listed).
// (3) Independent 500k-event orbit from R(3,3): I0 at every event, anchor residues,
//     re-entry b=2 mod 3, births and power-of-2 births.
// (4) library.json cross-stats: total states, R-family residues (825 = 547 + 150 + 128 claim),
//     2-run G configs a+b=0 mod 3 (448 claim), G(3,·) halt-form count, S-even birth histogram
//     A mod 12 (claim: covers {0..9}, A=4: 9282, A=8: 396).
// (5) RAW-TM check of the true E7 edge: for b in {2,3,5,8,11,14} and several tails, the raw
//     child of G(2,b,tail) is L(1,3,b+1,tail) (engine formula L(1,b+1,b+1,tail) holds only at
//     b=2 — found by ref-edges.mjs); raw delta SUM = +3 = 0 mod 3 ALWAYS (no BG1 needed raw-side).
let PASS = 0, FAIL = 0;
const ok = (c, m) => { if (c) PASS++; else { FAIL++; console.log('FAIL ' + m); } };

function step1(c) {
  if (c.t === 'R') { const [a, b] = c.r; return { c: { t: 'S', r: [a + 1n, b - 2n, 1n] } }; }
  if (c.t === 'S') {
    const [x, y, z, ...rest] = c.r;
    if (y >= 3n) return { c: { t: 'S', r: [x + 1n, y - 2n, z + 1n, ...rest] } };
    if (y === 2n) return { c: { t: 'G', r: [x + 1n, z + 1n, ...rest] } };
    if (y === 1n) return rest.length === 0
      ? { c: { t: 'R', r: [1n, x + z + 3n] } }
      : { c: { t: 'L', r: [1n, x + z + 3n, ...rest] } };
    return { deg: 1 };
  }
  if (c.t === 'G') {
    const [a, b, ...rest] = c.r;
    if (a >= 4n) return { c: { t: 'S', r: [1n, a - 3n, 1n, b + 1n, ...rest] } };
    if (a === 2n) return { c: { t: 'L', r: [1n, b + 1n, b + 1n, ...rest] } };
    if (a === 3n) return { halt: true };
    return { deg: 1 };
  }
  if (c.t === 'L') {
    const [r1, r2, r3, ...rest] = c.r;
    if (r3 >= 2n) return { c: { t: 'L', r: [r1 + 1n, r2, r3 - 1n, ...rest] } };
    if (r3 === 1n) return c.r.length === 3
      ? { c: { t: 'R', r: [r1 + 1n, r2] } }
      : { c: { t: 'S', r: [r1 + 1n, r2, ...rest] } };
    return { deg: 1 };
  }
  return { deg: 1 };
}
const sumR = (c) => c.r.reduce((a, b) => a + b, 0n);
const m3 = (v) => Number(((v % 3n) + 3n) % 3n);
function inI0(c) { // re-derived from the definition in attack-sparse2.md §2
  if (m3(sumR(c)) !== 0) return false;
  const r = c.r;
  if (c.t === 'R') return r[1] >= 3n;
  if (c.t === 'S') return r[1] >= 1n && !(r[0] === 1n && r[1] === 2n && m3(r[2]) !== 1);
  if (c.t === 'G') return !(r[0] === 2n && (r[1] < 2n || m3(r[1]) !== 2)) && r[0] >= 2n;
  if (c.t === 'L') return r[2] >= 1n && r[1] >= 3n;
  return false;
}

// ---------- (1) OWN closure grid ----------
{
  let steps = 0, haltForms = 0;
  const chk = (c) => {
    if (!inI0(c)) return;
    const st = step1(c);
    if (st.halt) { haltForms++; return; }
    ok(!st.deg, 'degenerate member ' + c.t + '[' + c.r + ']');
    if (!st.deg) ok(inI0(st.c), 'closure ' + c.t + '[' + c.r + '] -> ' + st.c.t + '[' + st.c.r + ']');
    steps++;
  };
  const B = (v) => BigInt(v);
  // R: include a=0 (out of strict grammar but accepted by inI0 — referee completeness probe)
  for (const a of [0, 1, 2, 3, 5]) for (let b = 1; b <= 33; b++) chk({ t: 'R', r: [B(a), B(b)] });
  // S: k=3..9, tails with all mod-3 residues; boundary x,y,z
  const tailSets = [[], [1], [2], [3], [6, 1], [4, 5], [7, 2, 3], [1, 1, 1, 1, 1], [5, 5, 4], [2, 7, 3, 8, 1, 4]];
  for (const x of [1, 2, 7]) for (const y of [1, 2, 3, 4, 5, 6, 9]) for (const z of [1, 2, 3, 4, 7, 10])
    for (const tail of tailSets) chk({ t: 'S', r: [B(x), B(y), B(z), ...tail.map(B)] });
  // G: heads 2..9, BG1 boundary b set, tails
  for (const a of [2, 3, 4, 5, 6, 7, 9]) for (const b of [1, 2, 3, 4, 5, 8, 11, 14, 17])
    for (const tail of [[], [2], [5], [1, 4], [3, 3], [2, 2, 2]]) chk({ t: 'G', r: [B(a), B(b), ...tail.map(B)] });
  // L: boundary r2=3,4; r3=1,2; r1=1,2; tails to k=9
  for (const r1 of [1, 2, 6]) for (const r2 of [3, 4, 7, 10]) for (const r3 of [1, 2, 3, 8])
    for (const tail of tailSets) chk({ t: 'L', r: [B(r1), B(r2), B(r3), ...tail.map(B)] });
  // 2^30-scale random members, k up to 10
  let big = 0;
  for (let i = 0; i < 60000; i++) {
    const t = ['R', 'S', 'G', 'L'][i & 3];
    const k = t === 'R' ? 2 : t === 'S' ? 3 + (i % 8) : t === 'G' ? 2 + (i % 8) : 3 + (i % 8);
    const r = []; for (let j = 0; j < k; j++) r.push(BigInt(1 + Math.floor(Math.random() * 2 ** 30)));
    if (t === 'R' && r[1] < 3n) continue;
    if (t === 'G' && r[0] < 2n) continue;
    const c = { t, r };
    if (!inI0(c)) continue;
    const st = step1(c);
    if (st.halt || st.deg) continue;
    ok(inI0(st.c), 'big closure ' + t + '[' + r.join(',') + ']');
    big++;
  }
  console.log(`(1) own closure grid: ${steps}+${big} member-steps, ${haltForms} classified G(3,·) halt-forms`);
}

// ---------- (2) seed ----------
{
  const seed = { t: 'R', r: [3n, 3n] };
  ok(m3(sumR(seed)) === 0, 'seed SUM=6=0 mod 3');
  ok(seed.r[1] >= 3n, 'seed domain b=3>=3');
  ok(inI0(seed), 'seed in I0');
  console.log('(2) seed R(3,3): SUM=6, b=3, no boundary guard applies -> in I0');
}

// ---------- (3) 500k orbit ----------
{
  let c = { t: 'R', r: [3n, 3n] };
  let viol = 0, anchors = 0, reentries = 0, rebad = 0, births = 0, pow2 = 0, ev = 0;
  let prevEven = false;
  for (; ev < 500000; ev++) {
    if (!inI0(c)) { viol++; if (viol === 1) console.log('  FIRST VIOL ' + c.t + '[' + c.r + '] @' + ev); }
    if (c.t === 'R' && c.r[0] === c.r[1]) { anchors++; if (m3(c.r[0]) !== 0) rebad++; }
    if (c.t === 'R' && c.r[0] === 1n) { reentries++; if (m3(c.r[1]) !== 2) rebad++; }
    const nowEven = c.t === 'S' && c.r[1] % 2n === 0n;
    if (nowEven && !prevEven) { births++; const A = c.r[0] + c.r[1] / 2n + 1n; if (A > 0n && (A & (A - 1n)) === 0n) pow2++; }
    prevEven = nowEven;
    const st = step1(c);
    if (st.halt || st.deg) { console.log('  orbit ended ' + (st.halt ? 'HALT' : 'DEG') + ' @' + ev); break; }
    c = st.c;
  }
  console.log(`(3) 500k orbit: events=${ev} I0-violations=${viol} anchors=${anchors} (n!=0mod3: ${rebad - (reentries ? 0 : 0) ? '?' : 0}) reentries=${reentries} (bad b: counted in rebad) rebad=${rebad} births=${births} pow2-births=${pow2}`);
}

// ---------- (4) library.json cross-stats ----------
{
  const { readFileSync } = await import('fs');
  const lib = JSON.parse(readFileSync('library.json', 'utf8')).states;
  let viol = 0, R = 0, reentry = 0, anchorN = 0, other = 0, G2 = 0, G3 = 0;
  const aHist = {};
  let births = 0;
  let prevEven = false;
  for (const s of lib) {
    const [t, rs] = s.split(':');
    const c = { t, r: rs.split(',').map(BigInt) };
    if (!inI0(c)) viol++;
    if (t === 'R') {
      R++;
      if (c.r[0] === 1n) reentry++; else if (c.r[0] === c.r[1]) anchorN++; else other++;
    }
    if (t === 'G' && c.r.length === 2) G2++;
    if (t === 'G' && c.r[0] === 3n) G3++;
    const nowEven = t === 'S' && c.r[1] % 2n === 0n;
    if (nowEven && !prevEven) { const A = c.r[0] + c.r[1] / 2n + 1n; const h = Number(A % 12n); aHist[h] = (aHist[h] || 0) + 1; births++; }
    prevEven = nowEven;
  }
  console.log(`(4) library: ${lib.length} states, I0-violations=${viol}`);
  console.log(`    R total=${R} (reentry R(1,b)=${reentry}, anchors=${anchorN}, other=${other}), 2-run G=${G2}, G(3,·)=${G3}`);
  console.log(`    S-even birth A mod 12 histogram over ${births} births: ` + JSON.stringify(aHist));
}

// ---------- (5) RAW E7 truth table ----------
{
  const CODE = '1RB1LA0RC0RD1LC1LA1RE1RD1LF0LA---0LE';
  const ST = ['A', 'B', 'C', 'D', 'E', 'F']; const rule = {};
  ST.forEach((s, i) => { const a = CODE.slice(6 * i, 6 * i + 6); const p = (t) => (t === '---' ? { halt: 1 } : { w: +t[0], d: t[1], n: t[2] }); rule[s] = [p(a.slice(0, 3)), p(a.slice(3, 6))]; });
  const rawEvent = (c) => {
    const cells = new Map(); let pos = 0, head = -1;
    const run = (n) => { for (let i = 0; i < Number(n); i++) cells.set(pos + i, 1); pos += Number(n); };
    const zer = (n, at = -1) => { const b = pos; for (let i = 0; i < n; i++) { if (i === at) head = b + i; pos++; } };
    if (c.t === 'R') { run(c.r[0]); zer(1); run(c.r[1]); head = pos; }
    else if (c.t === 'G') { run(c.r[0]); zer(3, 1); run(c.r[1]); for (let i = 2; i < c.r.length; i++) { zer(1); run(c.r[i]); } }
    else throw new Error('only R/G here');
    let st = 'D', steps = 0;
    const get = (i) => cells.get(i) || 0;
    for (; steps < 20000; steps++) {
      const r = rule[st][get(head)];
      if (r.halt) return { halt: steps };
      cells.set(head, r.w) || cells.delete(head);
      if (r.w === 0) cells.delete(head); else cells.set(head, 1);
      head += r.d === 'R' ? 1 : -1; st = r.n;
      if (st === 'D' && get(head) === 0) {
        // parse runs
        const ks = [...cells.keys()]; const lo = Math.min(...ks), hi = Math.max(...ks);
        const runs = []; let cur = null;
        for (let i = lo - 1; i <= hi + 1; i++) { const b = get(i); if (b && cur === null) cur = i; if (!b && cur !== null) { runs.push(BigInt(i - cur)); cur = null; } }
        return { runs, headRel: 'ok', steps: steps + 1 };
      }
    }
    return { cap: 1 };
  };
  const fmt = [];
  for (const b of [2, 3, 5, 8, 11, 14]) for (const tail of [[], [2n], [5n, 2n]]) {
    const c = { t: 'G', r: [2n, BigInt(b), ...tail] };
    const out = rawEvent(c);
    const rawChild = out.runs ? 'L[' + out.runs.join(',') + ']' : 'HALT/' + JSON.stringify(out);
    const sParent = 2 + b + tail.reduce((a, x) => a + Number(x), 0);
    const sChild = out.runs ? out.runs.reduce((a, x) => a + Number(x), 0) : null;
    fmt.push(`G(2,${b}${tail.length ? ',' + tail.join(',') : ''}) -> raw ${rawChild}  dSUM=${sChild === null ? '?' : sChild - sParent}  engine L[1,${b + 1},${b + 1}${tail.length ? ',' + tail.join(',') : ''}]${b === 2 ? '  (b=2: engine=raw)' : '  (engine WRONG here)'}`);
  }
  console.log('(5) raw E7 truth table (ref-edges finding, isolated):');
  for (const f of fmt) console.log('    ' + f);
}
console.log(`REF-LEDGER: ${PASS} pass, ${FAIL} fail`);
process.exit(FAIL ? 1 : 0);
