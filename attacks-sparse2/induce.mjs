// induce.mjs — verify the INDUCTION STEP of the strong induction on h:
// for each h in [HLO, HHI]: j0(h) = last ladder position with tau_j <= h-1-MARGIN;
// run the master sym5(A_{j0}, tau_{j0}, h, S) and require the outcome to equal table(h)
// exactly: NEXT da=DeltaAlpha(h), dt=DeltaT(h), single-path. This validates
//   T(h) = T-prefix (classes < h, by induction) + master (self-contained final segment)
// at every machine-checkable h. Usage: node induce.mjs HLO HHI [MARGIN=64] [S=40]
import { execFileSync } from 'child_process';
import { readFileSync } from 'fs';

const HLO = +(process.argv[2] ?? 16), HHI = +(process.argv[3] ?? 1024);
const MARGIN = BigInt(+(process.argv[4] ?? 64));
const S = process.argv[5] ?? '40';
const DA = [], DT = [];
for (const l of readFileSync('sym4-table.txt', 'utf8').split('\n')) {
  const m = l.match(/h=(\d+).*da=(\d+) dt=(\d+)/);
  if (m) { DA[+m[1]] = BigInt(m[2]); DT[+m[1]] = +m[3]; }
}
const ladder = JSON.parse(readFileSync('ladder.json', 'utf8')).ladder;
function j0of(h) {
  const marg = MARGIN < BigInt(h - 10) ? MARGIN : BigInt(h - 10); // adaptive: keep start tau <= h-11
  const lim = BigInt(h) - 1n - marg;
  let lo = 0, hi = ladder.length - 1, best = -1;
  while (lo <= hi) { const mid = (lo + hi) >> 1; if (BigInt(ladder[mid].tau) <= lim) { best = mid; lo = mid + 1; } else hi = mid - 1; }
  return best;
}
let ok = 0, bad = 0; const bads = [];
for (let h = HLO; h <= HHI; h++) {
  const j = j0of(h);
  if (j < 0) { bads.push(`h=${h}: no ladder position <= h-1-${MARGIN}`); bad++; continue; }
  const { A, tau } = ladder[j];
  let out;
  try {
    out = execFileSync('node', ['sym5.mjs', A, tau, String(h), S], { encoding: 'utf8', timeout: 120000, maxBuffer: 1e8 });
  } catch (e) { bads.push(`h=${h}: sym5 crash/timeout at j0=${j} (A=${A},tau=${tau})`); bad++; continue; }
  const m = out.match(/paths=(\d+).*\n\s*NEXT da=(\d+) dt=(\d+)/);
  if (!m) { bads.push(`h=${h}: no single NEXT (j0=${j}, A=${A}, tau=${tau}): ${out.split('\n')[0]}${out.split('\n')[1] || ''}`); bad++; continue; }
  if (+m[1] !== 1) { bads.push(`h=${h}: paths=${m[1]} != 1 (split outcomes)`); bad++; continue; }
  if (BigInt(m[2]) !== DA[h] || +m[3] !== DT[h]) { bads.push(`h=${h}: master (${m[2]},${m[3]}) != table (${DA[h]},${DT[h]}) at j0=${j} (A=${A},tau=${tau})`); bad++; continue; }
  ok++;
  if (h % 64 === 0 || h === HHI) console.log(`  h=${h}: ${ok} ok so far (j0=${j}, A=${A}, tau=${tau})`);
}
console.log(`INDUCE ${HLO}..${HHI}: ${ok} ok, ${bad} bad`);
bads.slice(0, 25).forEach(b => console.log('  ' + b));
if (bad) process.exit(1);
console.log('INDUCTION STEP VERIFIED: master(j0(h)) == table(h) for all h in range');
