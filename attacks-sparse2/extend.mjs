// extend.mjs — extend the round-law table BEYOND h=1024 using the master (the direct sym4
// derivation needs the h-halving cascade = superlinear memory; the master needs only the last
// ~64 exponents). For each h in range: j0(h) from the ladder, sym5 -> (dA, dt); record one
// line per h (durable artifact, no big JSON). Also validates: single path, dA = 0 mod 6,
// dt in [2,8], dc-preservation (the 'same' check inside sym5 prints !slope flags).
// Additionally self-consistency: the ladder used for h must only contain classes < h
// (coverage bound check) — asserted per h.
// Usage: node extend.mjs HLO HHI [STEP=1] — writes sym5-table.txt lines 'h=<h> da=<..> dt=<..> j0=<..> A=<..> tau=<..>'
import { execFileSync } from 'child_process';
import { readFileSync, writeFileSync, appendFileSync, existsSync } from 'fs';

const HLO = +(process.argv[2] ?? 1025), HHI = +(process.argv[3] ?? 2000);
const STEP = +(process.argv[4] ?? 1);
const DA = [], DT = [];
for (const l of readFileSync('sym4-table.txt', 'utf8').split('\n')) {
  const m = l.match(/h=(\d+).*da=(\d+) dt=(\d+)/);
  if (m) { DA[+m[1]] = BigInt(m[2]); DT[+m[1]] = +m[3]; }
}
const ladder = JSON.parse(readFileSync('ladder.json', 'utf8')).ladder;
const v2 = (x) => { x = BigInt(x); let c = 0n; while (x % 2n === 0n) { c++; x /= 2n; } return Number(c); };
function j0of(h) {
  const marg = 64n < BigInt(h - 10) ? 64n : BigInt(h - 10);
  const lim = BigInt(h) - 1n - marg;
  let lo = 0, hi = ladder.length - 1, best = -1;
  while (lo <= hi) { const mid = (lo + hi) >> 1; if (BigInt(ladder[mid].tau) <= lim) { best = mid; lo = mid + 1; } else hi = mid - 1; }
  return best;
}
let ok = 0, bad = 0; const bads = [];
if (!existsSync('sym5-table2.txt')) writeFileSync('sym5-table2.txt', '');
for (let h = HLO; h <= HHI; h += STEP) {
  const j = j0of(h);
  if (j < 0) { bads.push(`h=${h}: no ladder pos`); bad++; continue; }
  const { A, tau } = ladder[j];
  // coverage-bound sanity: all classes used by the ladder up to j0 must be < h
  let maxH = 0; for (let i = 0; i <= j; i++) if (ladder[i].H > maxH) maxH = ladder[i].H;
  if (maxH >= h) { bads.push(`h=${h}: ladder class ${maxH} >= h (coverage bound violation)`); bad++; continue; }
  let out;
  try { out = execFileSync('node', ['sym5.mjs', A, tau, String(h), '40'], { encoding: 'utf8', timeout: 180000, maxBuffer: 1e8 }); }
  catch (e) { bads.push(`h=${h}: crash`); bad++; continue; }
  const m = out.match(/paths=(\d+).*\n\s*NEXT da=(\d+) dt=(\d+)(.*)/);
  if (!m || +m[1] !== 1) { bads.push(`h=${h}: not single NEXT: ${out.split('\n')[0]}`); bad++; continue; }
  if (m[4] && m[4].includes('!')) { bads.push(`h=${h}: form flag ${m[4]}`); bad++; continue; }
  const dA = BigInt(m[2]), dt = +m[3];
  // HONEST law shape (referee fix c): class preservation dA=0 mod 6 + growth dt>=2 are ASSERTED;
  // dt>8 is RECORDED (flagged), not filtered. Band bound dA<=2h+6 asserted (referee fix b, S(h)).
  if (dA % 6n !== 0n || dt < 2) { bads.push(`h=${h}: law-shape violation (${dA},${dt})`); bad++; continue; }
  if (dA > 2n * BigInt(h) + 6n) { bads.push(`h=${h}: band bound dA=${dA} > 2h+6`); bad++; continue; }
  appendFileSync('sym5-table2.txt', `h=${h} da=${dA} dt=${dt} j0=${j} A=${A} tau=${tau} maxH=${maxH}` + (dt > 8 ? ` NOTE-dt=${dt}` : '') + '\n');
  ok++;
  if ((h - HLO) % Math.max(1, Math.floor((HHI - HLO) / 20)) === 0) console.log(`  h=${h}: (${dA},${dt}) via j0=${j} (A=${A}, tau=${tau})`);
}
console.log(`EXTEND ${HLO}..${HHI} step ${STEP}: ${ok} ok, ${bad} bad`);
bads.slice(0, 20).forEach(b => console.log('  ' + b));
if (bad) process.exit(1);
console.log('TABLE EXTENDED (master-only, honest): single-path, dA=0 mod 6, dt>=2, dA<=2h+6, dt>8 flagged');
