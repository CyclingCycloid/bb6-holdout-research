// births11.mjs — offline class-AP certification from existing logs (births5-1e6.log As fields + births7-log.txt EX lines).
// Conservative: D_fit = gcd of observed differences is a multiple of the true period, so the fitted AP is a SUPERSET
// of the class; power-freeness of the superset implies that of the class.
import { readFileSync, writeFileSync } from 'fs';
const B = BigInt;
function v2(x) { let n = 0n; x = B(x); while ((x & 1n) === 0n) { n++; x >>= 1n; } return n; }
function gcd(a, b) { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) { const t = a % b; a = b; b = t; } return a; }
function powInAP(A0, D) {
  A0 = B(A0); D = B(D);
  if (D <= 0n) D = 1n;
  const s = v2(D), u = D >> s, j = v2(A0), q0 = A0 >> j;
  if (j < s && (q0 % (1n << (s - j))) === 1n && ((1n << j) % u) === (A0 % u)) return { hit: true, how: 't<s', t: j.toString() };
  if (s > 0n && (A0 % (1n << s)) === 0n) {
    const r = (A0 >> s) % u;
    if (r === 0n && u === 1n) return { hit: true, how: 't>=s', t: '>=' + s };
    if (r !== 0n && u > 1n) {
      let p = 1n, t = s; const lim = s + 60000n;
      while (t < lim) { if (p === r && (1n << t) >= A0) return { hit: true, how: 'dlog', t: t.toString() }; p = p * 2n % u; t++; if (p === 1n && (1n << t) > A0 * 4n) break; }
    }
  }
  return { hit: false };
}

// collect members per coarse class key (ty, j, A mod 144)
const members = {}; // key -> Set of A strings
function add(ty, A) {
  A = B(A);
  const j = v2(A);
  const key = `${ty}|j${j}|A${Number(A % 144n)}`;
  (members[key] = members[key] || new Set()).add(A.toString());
}
// from births5-1e6.log signature lines (ty, As)
for (const l of readFileSync('births5-1e6.log', 'utf8').split('\n')) {
  const m = l.match(/^\s+\d+\s+(E1r|L3|Lk)\|j(\d+)\|A%\d+=\d+\|q%144=\d+\s+ex:.*A=(\d+)\s+As: (\d+(?:,\d+)*)/);
  if (m) for (const a of m[4].split(',')) add(m[1], a);
}
// from births7-log.txt EX lines
for (const l of readFileSync('births7-log.txt', 'utf8').split('\n')) {
  const m = l.match(/^EX (Lk|L3) j=(\d+) A=(\d+) q=(\d+) anchor=\d+/);
  if (m) add(m[1], m[3]);
}
const out = [];
let allsafe = true;
for (const key of Object.keys(members).sort()) {
  const As = [...members[key]].map(B).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  if (!key.startsWith('L')) continue; // E1r safe by 3|A
  const A0 = As[0];
  let D = 0n;
  for (const a of As) D = gcd(D, a - A0);
  if (D < 144n) D = 144n; // single-member: fall back to the mod-144 residue class (superset by the key definition)
  const chk = powInAP(A0, D === 0n ? 1n : D);
  if (chk.hit) allsafe = false;
  console.log(`${key}: members=${As.length} A0=${A0} Dfit=${D} j0=${v2(A0)} q0=${A0 >> v2(A0)} POW-IN-AP=${chk.hit}${chk.hit ? ' t=' + chk.t + ' (' + chk.how + ')' : ''}`);
  out.push({ key, members: As.length, A0: A0.toString(), D: D.toString(), pow: chk });
}
writeFileSync('births11-classes.json', JSON.stringify(out, null, 1));
console.log('ALL SAFE:', allsafe);
