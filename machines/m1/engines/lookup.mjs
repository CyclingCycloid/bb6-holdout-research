// lookup.mjs — programmatic j0 lookup + sym5 invocation (NO hand-copied literals).
// Usage: node lookup.mjs h1 [h2 ...] [--margins]
import { readFileSync } from 'fs';
import { execFileSync } from 'child_process';

const args = process.argv.slice(2);
const MARG = args.includes('--margins');
const hs = args.filter(a => /^[0-9]+$/.test(a));
const ladder = JSON.parse(readFileSync('ladder.json', 'utf8')).ladder;
export function j0of(h) {
  const marg = 64n < BigInt(h - 10) ? 64n : BigInt(h - 10);
  const lim = BigInt(h) - 1n - marg;
  let lo = 0, hi = ladder.length - 1, best = -1;
  while (lo <= hi) { const mid = (lo + hi) >> 1; if (BigInt(ladder[mid].tau) <= lim) { best = mid; lo = mid + 1; } else hi = mid - 1; }
  return best;
}
for (const h of hs) {
  const j = j0of(+h);
  if (j < 0) { console.log(`h=${h}: no ladder position`); continue; }
  const { A, tau } = ladder[j];
  const env = { ...process.env };
  if (MARG) env.SYM5_MARGINS = '1';
  const out = execFileSync('node', ['sym5.mjs', A, tau, String(h), '40'], { encoding: 'utf8', timeout: 300000, maxBuffer: 1e9, env });
  const m = out.match(/paths=(\d+)[^\n]*\n\s*(NEXT da=\d+ dt=\d+|ANCHOR[^\n]*)/);
  console.log(`h=${h} j0=${j} A=${A} tau=${tau} -> ${m ? m[2] : out.split('\n')[0]}`);
}
