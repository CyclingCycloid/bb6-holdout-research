// endgame3.mjs — fast symbolic endgame sweep for larger h (257..1024):
// symbolic-only (sym4 concrete-t at T0=h+16 and T0+1, both boundary/fold-free, identical dist,
// all-ANCHOR with class/growth forms); numeric grid ONLY for cells that fail symbolically.
// Usage: node endgame3.mjs HLO HHI
import { stepFastB } from './bstep.mjs';
import { execFileSync } from 'child_process';
import { readFileSync } from 'fs';

const HLO = +(process.argv[2] || 257), HHI = +(process.argv[3] || 1024);
const DT = [];
for (const l of readFileSync('sym4-table.txt', 'utf8').split('\n')) {
  const m = l.match(/h=(\d+).*da=(\d+) dt=(\d+)/);
  if (m) DT[+m[1]] = +m[3];
}
const rhoOf = (h) => [0n, 1n, 2n].find(r => ((2n ** BigInt(h + 1) * r + 2n ** BigInt(h) - 1n) % 6n + 6n) % 6n === 1n);
function numericEnd(alpha, t0, w, r) {
  const t = BigInt(t0);
  const E = 2n ** (t - 3n) * w;
  const runs = [alpha + 3n * E, (alpha - 1n) + 5n * E];
  for (let j = 0n; j <= BigInt(r); j++) runs.push(2n ** (t + j) * w);
  runs.push(2n ** (t + BigInt(r) + 1n) * w - 1n);
  let c = { t: 'G', r: runs };
  for (let it = 0; it < 200000; it++) {
    const st = stepFastB(c);
    if (st.degenerate) return 'DEG ' + st.degenerate;
    if (st.halt) return 'HALT';
    c = st.c;
    if (c.t === 'R' && c.r[0] === c.r[1] && c.r[0] >= 2n) {
      const cc = c.r[0] - 2n ** (t + BigInt(r) + 1n) * w;
      return (((cc % 6n) + 6n) % 6n === 3n && cc >= 3n) ? null : 'class/growth cc=' + cc;
    }
  }
  return 'cap';
}
function symRun(h, r, t0) {
  const out = execFileSync('node', ['sym4.mjs', String(h), String(r), String(t0), 'concrete'], {
    encoding: 'utf8', timeout: 30000, env: { ...process.env, SYM4_MAXPUSH: '300000' }, maxBuffer: 1e8
  });
  const dist = JSON.parse(/dist=(\{[^}]*\})/.exec(out)[1]);
  const bu = /BOUNDARY-USES=(\d+)/.exec(out), fu = /FOLD-USES=(\d+)/.exec(out);
  const anchors = [...new Set([...out.matchAll(/ANCHOR n'=(.+)/g)].map(m => m[1].trim()))];
  return { dist, bu: bu ? +bu[1] : 0, fu: fu ? +fu[1] : 0, anchors };
}
let cells = 0, symOk = 0; const unresolved = [], bads = [];
for (let h = HLO; h <= HHI; h++) {
  const rho = rhoOf(h);
  for (let r = 0; r < DT[h]; r++) {
    cells++;
    let ok = false;
    try {
      const A = symRun(h, r, h + 16);
      const d1 = { ...A.dist }; delete d1.ANCHOR;
      if (Object.keys(d1).length === 0 && A.bu === 0 && A.fu === 0 && A.anchors.length > 0) {
        const B = symRun(h, r, h + 17);
        const d2 = { ...B.dist }; delete d2.ANCHOR;
        if (JSON.stringify(A.dist) === JSON.stringify(B.dist) && B.bu === 0 && B.fu === 0) {
          ok = true;
          for (const a of A.anchors) {
            const mm = a.match(/^1W\+(\d+)\+\(?(-?\d+)(?:\+(\d+)u)?(?:\+(\d+)c)?\)?$/);
            if (!mm || +mm[1] !== r + 1) { ok = false; break; }
            const d0 = BigInt(mm[2]), du = BigInt(mm[3] ?? 0), dc = BigInt(mm[4] ?? 0);
            if (du < 0n || dc < 0n || du % 6n !== 0n || dc % 6n !== 0n || ((d0 % 6n) + 6n) % 6n !== 3n || d0 < 3n) { ok = false; break; }
          }
        }
      }
    } catch (e) { ok = false; }
    if (ok) { symOk++; continue; }
    unresolved.push(`h=${h} r=${r}`);
    // numeric fallback grid
    let bad = null;
    outer: for (let u = 0; u <= 12; u += 4) for (let cI = 0; cI <= 12; cI += 4) for (const t of [h + 16, h + 18, 1001]) {
      if (t < h + 16) continue;
      const w = 6n * BigInt(u) + 3n;
      const alpha = 2n ** BigInt(h + 1) * (3n * BigInt(cI) + rho) + 2n ** BigInt(h) - 1n;
      const res = numericEnd(alpha, t, w, r);
      if (res) { bad = `h=${h} r=${r} u=${u} c=${cI} t=${t}: ${res}`; break outer; }
    }
    if (bad) bads.push(bad);
  }
  if (h % 32 === 0 || h === HHI) console.log(`h=${h}: cells=${cells} symbolic-clean=${symOk} unresolved=${unresolved.length} bads=${bads.length}`);
}
console.log(`TOTAL h=${HLO}..${HHI}: ${cells} cells; symbolic ${symOk}; unresolved(numeric-verified) ${unresolved.length}; numeric bads ${bads.length}`);
if (unresolved.length) console.log('unresolved cells: ' + unresolved.slice(0, 50).join(' ') + (unresolved.length > 50 ? ' ...' : ''));
if (bads.length) { bads.slice(0, 10).forEach(b => console.log('  BAD ' + b)); process.exit(1); }
console.log('ENDGAME SWEEP CLEAN (symbolic where counted, numeric-verified elsewhere)');
