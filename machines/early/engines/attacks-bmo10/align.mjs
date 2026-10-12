// Align TM configurations with game states.
// Hypothesis: TM tape (nonzero span) == game word with #s deleted, right-aligned,
// possibly with the game's S extended by the 0-fill. The # positions are carried
// by the TM head+state. We test suffix-matching for every TM step vs the game
// rightmost-# strategy sequence (and other strategies).
import { RULESETS, canon, activePositions, applyAt } from './game.mjs';

const rs = RULESETS.bmo10;

// ---- game side: rightmost-# strategy, # deleted signature ----
function gameSeq(strategy, n) {
  let S = '';
  const out = [{ S, del: '' }];
  for (let i = 0; i < n; i++) {
    const act = activePositions(S, rs);
    const i2 = strategy === 'rightmost' ? act[act.length - 1] : act[0];
    S = applyAt(S, i2, rs);
    out.push({ S, del: S.replace(/#/g, '') });
  }
  return out;
}

// ---- TM side ----
const code = '1RB0LB0RC0LD1LD1RE0LA0RF0RD1RF0RC---';
const T = [];
for (let i = 0; i < 12; i++) {
  const t = code.slice(3 * i, 3 * i + 3);
  T.push({ w: t[0] === '0' ? 0 : 1, d: t[1] === 'L' ? -1 : 1, n: t[2] === '-' ? -1 : t.charCodeAt(2) - 65 });
}
function tmRun(STEPS) {
  const tape = new Map();
  const rd = (p) => tape.get(p) ?? 0;
  let head = 0, state = 0;
  const out = [];
  for (let step = 0; step < STEPS; step++) {
    // record tape string
    let l2 = head, h2 = head;
    for (const [p, v] of tape) { if (v) { l2 = Math.min(l2, p); h2 = Math.max(h2, p + 1); } }
    let s = '';
    for (let p = l2; p < h2; p++) s += rd(p);
    out.push({ step, state, head, tape: s, lo: l2 });
    const sy = rd(head);
    const tr = T[state * 2 + sy];
    if (tr.n < 0) { console.log('HALT', step); break; }
    tape.set(head, tr.w); head += tr.d; state = tr.n;
  }
  return out;
}

const game = gameSeq(process.argv[2] || 'rightmost', parseInt(process.argv[3] || '80'));
const tm = tmRun(parseInt(process.argv[4] || '3000'));

// For each TM step, find game steps g such that tape == del(g) or tape ends with del(g)
// (allowing the game's del to be longer on the left - the TM hasn't written it yet -
// or the TM tape to have extra zeros on the right).
const matches = [];
for (const c of tm) {
  for (let g = 0; g < game.length; g++) {
    const d = game[g].del;
    if (!d) continue;
    if (c.tape === d || c.tape.endsWith(d)) {
      matches.push({ t: c.step, g, state: c.state, head: c.head, exact: c.tape === d });
    }
  }
}
console.log(`matches (tape==del or tape endsWith del): ${matches.length}`);
// compress: for each g, list TM steps
const byG = new Map();
for (const m of matches) { if (!byG.has(m.g)) byG.set(m.g, []); byG.get(m.g).push(m); }
for (const [g, ms] of [...byG.entries()].sort((a, b) => a[0] - b[0]).slice(0, 60)) {
  console.log(`game step ${g} (del=${game[g].del}): TM steps ${ms.map(m => m.t + (m.exact ? '*' : '') + '/' + String.fromCharCode(65 + m.state) + '@' + m.head).slice(0, 6).join(' ')}${ms.length > 6 ? ' ...' : ''}`);
}
