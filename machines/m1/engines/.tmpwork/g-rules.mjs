// bare simulator, count steps from G-form configs to next event / halt
const CODE = "1RB1LA0RC0RD1LC1LA1RE1RD1LF0LA---0LE";
const T = []; for (let i = 0; i < 6; i++) T.push([null, null]);
for (let i = 0; i < 12; i++) { const t = CODE.slice(3*i, 3*i+3);
  T[i/2|0][i%2] = { w:+t[0], m: t[1]==='L'?-1:1, n: t[2]==='-'?6:t.charCodeAt(2)-65 }; }
function buildG(a,b,tail=[]) { // runs (a,b,...tail), gaps [3,1,1...], head mid of 3-gap
  const tape = new Map(); let p = 0; const runs=[a,b,...tail];
  for (let i=0;i<runs.length;i++){ for(let k=0;k<runs[i];k++) tape.set(p+k,1); p+=runs[i]; if(i<runs.length-1) p += (i===0?3:1); }
  // head: middle of first gap = a + 1
  return { tape, head: a+1 };
}
function runTo(cfg, maxSteps=5000) {
  let {tape, head} = cfg; let st = 3; const t0 = head;
  for (let s = 0; s < maxSteps; s++) {
    const sy = tape.get(head) || 0;
    if (st === 3 && sy === 0 && s > 0) {
      // report event config
      const lo = Math.min(t0,head)-40, hi = Math.max(t0,head)+40;
      const runs=[]; let p=lo;
      while(p<hi){const v=tape.get(p)||0; let q=p; while(q<hi&&(tape.get(q)||0)===v)q++; if(v)runs.push([p,q-p]); p=q;}
      return { event: true, steps: s, head, runsRel: runs.filter(r=>r[0]>lo&&r[0]+r[1]<hi).map(r=>[r[0]-head, r[1]]) };
    }
    const tr = T[st][sy];
    if (tr.n === 6) return { event:false, halt:true, steps: s+1, head };
    tape.set(head, tr.w); head += tr.m; st = tr.n;
  }
  return { event:false, halt:false, steps:maxSteps };
}
for (const [a,b] of [[3,2],[3,7],[3,20],[2,1],[2,2],[2,3],[2,5],[2,10],[1,1],[1,3],[1,5],[1,10]]) {
  const r = runTo(buildG(a,b));
  console.log(`G(${a},${b}): ${r.halt?'HALT':(r.event?'event':'?')} steps=${r.steps} ${r.event?JSON.stringify(r.runsRel):''}`);
}
