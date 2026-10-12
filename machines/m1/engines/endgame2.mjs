// endgame2.mjs — hybrid endgame verification per (h, r < dt(h)) cell:
//  NUMERIC (always): grid u in 0..24, c in 0..24, t in {h+16, h+18, 307, 1001}: construct
//    L(alpha,t; slack r), walk bstep, require ANCHOR n' = 2^(t+r+1)w + cc with cc = 3 mod 6,
//    cc >= 3 (growth), no halt/degen.
//  SYMBOLIC (best effort): sym4 concrete-t at T0=h+16 with bounded budget; cell counts as
//    PROVEN-SYM if all paths ANCHOR with class/growth forms and outcome stable at T0+1.
// Usage: node endgame2.mjs HMAX
import { stepFastB } from './bstep.mjs';
import { execFileSync } from 'child_process';
import { readFileSync } from 'fs';

const HMAX = +(process.argv[2] || 16);
const DA = [], DT = [];
for (const l of readFileSync('sym4-table.txt', 'utf8').split('\n')) {
  const m = l.match(/h=(\d+).*da=(\d+) dt=(\d+)/);
  if (m) { DA[+m[1]] = +m[2]; DT[+m[1]] = +m[3]; }
}
const rhoOf = (h) => [0n, 1n, 2n].find(r => ((2n ** BigInt(h + 1) * r + 2n ** BigInt(h) - 1n) % 6n + 6n) % 6n === 1n);
function numericEnd(alpha, t0, w, r) {
  const t = BigInt(t0);
  const E = 2n ** (t - 3n) * w;
  const runs = [alpha + 3n * E, (alpha - 1n) + 5n * E];
  for (let j = 0n; j <= BigInt(r); j++) runs.push(2n ** (t + j) * w);
  runs.push(2n ** (t + BigInt(r) + 1n) * w - 1n);
  let c = { t: 'G', r: runs };
  for (let it = 0; it < 100000; it++) {
    const st = stepFastB(c);
    if (st.degenerate) return { bad: 'DEG ' + st.degenerate };
    if (st.halt) return { bad: 'HALT' };
    c = st.c;
    if (c.t === 'R' && c.r[0] === c.r[1] && c.r[0] >= 2n) {
      const cc = c.r[0] - 2n ** (t + BigInt(r) + 1n) * w;
      if (((cc % 6n) + 6n) % 6n !== 3n) return { bad: 'class cc=' + cc };
      if (cc < 3n) return { bad: 'growth cc=' + cc };
      return { ok: cc };
    }
  }
  return { bad: 'cap' };
}
let cells = 0, numOk = 0, symOk = 0; const bads = [], noSym = [];
for (let h = 1; h <= HMAX; h++) {
  const rho = rhoOf(h);
  for (let r = 0; r < DT[h]; r++) {
    cells++;
    // numeric grid
    const stepUC = h <= 16 ? 2 : 6;
    let nok = 0, ntot = 0;
    for (let u = 0; u <= 24; u += stepUC) for (let cI = 0; cI <= 24; cI += stepUC) for (const t of [h + 16, h + 18, 307, 1001]) {
      if (t < h + 16) continue;
      const w = 6n * BigInt(u) + 3n;
      const alpha = 2n ** BigInt(h + 1) * (3n * BigInt(cI) + rho) + 2n ** BigInt(h) - 1n;
      const res = numericEnd(alpha, t, w, r);
      ntot++;
      if (res.bad) bads.push(`h=${h} r=${r} u=${u} c=${cI} t=${t}: ${res.bad}`); else nok++;
    }
    if (bads.length > 25) { console.log('EARLY ABORT:'); bads.forEach(b => console.log('  ' + b)); process.exit(1); }
    if (nok === ntot) numOk++;
    // symbolic best-effort
    let sym = null;
    try {
      const out = execFileSync('node', ['sym4.mjs', String(h), String(r), String(h + 16), 'concrete'], {
        encoding: 'utf8', timeout: 20000, env: { ...process.env, SYM4_MAXPUSH: '400000' }, maxBuffer: 1e8
      });
      const dist = JSON.parse(/dist=(\{[^}]*\})/.exec(out)[1]);
      delete dist.ANCHOR;
      const bu = /BOUNDARY-USES=(\d+)/.exec(out);
      const fu = /FOLD-USES=(\d+)/.exec(out);
      if (Object.keys(dist).length === 0 && (!bu || +bu[1] === 0) && (!fu || +fu[1] === 0)) {
        // t-uniformity: identical outcome at T0+1
        const out2 = execFileSync('node', ['sym4.mjs', String(h), String(r), String(h + 17), 'concrete'], {
          encoding: 'utf8', timeout: 20000, env: { ...process.env, SYM4_MAXPUSH: '400000' }, maxBuffer: 1e8
        });
        const dist2 = JSON.parse(/dist=(\{[^}]*\})/.exec(out2)[1]);
        const distRaw = JSON.parse(/dist=(\{[^}]*\})/.exec(out)[1]);
        const bu2 = /BOUNDARY-USES=(\d+)/.exec(out2);
        const fu2 = /FOLD-USES=(\d+)/.exec(out2);
        if (JSON.stringify(dist2) === JSON.stringify(distRaw) && (!bu2 || +bu2[1] === 0) && (!fu2 || +fu2[1] === 0)) {
          const anchors = [...new Set([...out.matchAll(/ANCHOR n'=(.+)/g)].map(m => m[1].trim()))];
          let okk = anchors.length > 0;
          for (const a of anchors) {
            const mm = a.match(/^1W\+(\d+)\+\(?(-?\d+)(?:\+(\d+)u)?(?:\+(\d+)c)?\)?$/);
            if (!mm) { okk = false; break; }
            if (+mm[1] !== r + 1) { okk = false; break; }
            const d0 = BigInt(mm[2]), du = BigInt(mm[3] ?? 0), dc = BigInt(mm[4] ?? 0);
            if (du < 0n || dc < 0n || du % 6n !== 0n || dc % 6n !== 0n || ((d0 % 6n) + 6n) % 6n !== 3n || d0 < 3n) { okk = false; break; }
          }
          if (okk) { sym = true; symOk++; }
        }
      }
    } catch (e) { sym = false; }
    if (sym !== true) noSym.push(`h=${h} r=${r}`);
  }
  console.log(`h=${h}: cells so far=${cells} numeric-clean=${numOk} symbolic-clean=${symOk}`);
}
console.log(`TOTAL: ${cells} cells; numeric-grid clean: ${numOk}; symbolic-clean: ${symOk}; symbolic-unresolved: ${noSym.length}`);
if (noSym.length) console.log('unresolved (numeric-only): ' + noSym.join(' '));
if (bads.length) { console.log('NUMERIC BADS:'); bads.forEach(b => console.log('  ' + b)); process.exit(1); }
console.log('ALL ENDGAME CELLS: numeric grid clean (class+growth); symbolic proof where listed');
