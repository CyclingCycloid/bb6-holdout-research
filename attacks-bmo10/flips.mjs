// Flip-sequence correspondence: TM value-changing writes vs game rewrite effects.
// Game rewrite effects on the #-deleted word (del):
//   R1: "#0"->"1": del flips the '0' (right after the #) from 0 to 1; #count -1
//   R2: "#100"->"000#": del flips two 1s (of "100") to 0; #count same
//   R3: "#110"->"000#": del flips two 1s (of "110") to 0; #count same
//   R4: "#1010"->"1010##": del unchanged; #count +1
// Positions are recorded relative to the RIGHT end of del (negative = left of end).
import { RULESETS, activePositions, applyAt, windowOf } from './game.mjs';

const rs = RULESETS.bmo10;
const NGAME = parseInt(process.argv[2] || '600');
const NTM = parseInt(process.argv[3] || '100000');

// game flip log: for rewrite at V-index i (the active #), in del coordinates.
function gameFlips(n) {
  let S = '';
  const ev = [];
  const LEFT = '10#10#';
  for (let k = 0; k < n; k++) {
    const act = activePositions(S, rs);
    if (!act.length) break;
    const i = act[act.length - 1]; // rightmost active #
    const V = windowOf(S);
    // pattern
    let p = -1;
    for (let q = 0; q < rs.pats.length; q++) if (V.slice(i + 1, i + 1 + rs.pats[q][0].length) === rs.pats[q][0]) p = q;
    // del-position (relative to right end of del, negative leftward) of each LHS symbol after the #
    const del = S.replace(/#/g, '');
    // absolute del index of V position i+1+j: count non-# symbols from window start (index 6) to that position
    const delIdx = (pos) => { let c = 0; for (let z = 6; z < pos && z < V.length; z++) if (V[z] !== '#') c++; return c; };
    const nDel = del.length;
    const relOf = (absIdx) => absIdx - nDel; // relative position in del coords
    if (p === 0) { // R1: flips LHS '0' (at i+1) 0->1
      const d = relOf(delIdx(i + 1));
      ev.push({ k, rule: 'R1', flips: [[d, '0>1']], hashDelta: -1 });
    } else if (p === 1 || p === 2) { // R2/R3: flips 1s at i+1 (and i+2 for R3)
      const pat = rs.pats[p][0];
      const fl = [];
      for (let j = 0; j < pat.length; j++) if (pat[j] === '1') fl.push([relOf(delIdx(i + 1 + j)), '1>0']);
      ev.push({ k, rule: p === 1 ? 'R2' : 'R3', flips: fl, hashDelta: 0 });
    } else { // R4: silent
      ev.push({ k, rule: 'R4', flips: [], hashDelta: +1 });
    }
    S = applyAt(S, i, rs);
  }
  return ev;
}

// TM flip log
const code = '1RB0LB0RC0LD1LD1RE0LA0RF0RD1RF0RC---';
const T = [];
for (let i = 0; i < 12; i++) {
  const t = code.slice(3 * i, 3 * i + 3);
  T.push({ w: t[0] === '0' ? 0 : 1, d: t[1] === 'L' ? -1 : 1, n: t[2] === '-' ? -1 : t.charCodeAt(2) - 65 });
}
function tmFlips(STEPS) {
  const tape = new Map();
  const rd = (p) => tape.get(p) ?? 0;
  let head = 0, state = 0;
  const ev = [];
  let R = -Infinity; // rightmost nonzero cell ever
  for (let step = 0; step < STEPS; step++) {
    const sy = rd(head);
    const tr = T[state * 2 + sy];
    if (tr.n < 0) { console.log('HALT', step); break; }
    if (tr.w !== sy) {
      // value-changing write; record position relative to current right end of nonzero tape
      let r = head; for (const [p, v] of tape) if (v) r = Math.max(r, p);
      R = Math.max(R, r);
      ev.push({ t: step, pos: head - R, old: sy, nw: tr.w, state: String.fromCharCode(65 + state) });
    }
    tape.set(head, tr.w);
    head += tr.d; state = tr.n;
  }
  return ev;
}

const ge = gameFlips(NGAME);
const te = tmFlips(NTM);
console.log(`game rewrites: ${ge.length}, TM flips: ${te.length}`);
console.log('game flips (first 60):');
for (const e of ge.slice(0, 60)) console.log(`  k=${e.k} ${e.rule} ${e.flips.map(f => `${f[0]}:${f[1]}`).join(',')} hashDelta=${e.hashDelta}`);
console.log('TM flips (first 80):');
for (const e of te.slice(0, 80)) console.log(`  t=${e.t} ${e.state} pos=${e.pos} ${e.old}>${e.nw}`);
