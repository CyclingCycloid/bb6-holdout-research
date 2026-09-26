import { execFileSync } from 'child_process';
import { resolve } from 'path';
const out = execFileSync(resolve('./sim/triage2.exe'), ['DETAIL','1RB1LA0RC0RD1LC1LA1RE1RD1LF0LA---0LE','1e5'], { encoding: 'utf8', maxBuffer: 1 << 28 });
const lines = out.split('\n');
const good = lines.find(l => l.startsWith('CP '));
const RE = /^CP (\d+) ([A-F]) pop=(-?\d+) lo1=(-?\d+) headrel=(-?\d+) width=(-?\d+) runs=(-?\d+) R (.*)$/;
console.log('full on real:', RE.test(good));
console.log('JSON real  :', JSON.stringify(good.slice(0, 82)));
const hard = "CP 1000 D pop=21 lo1=-12 headrel=4 width=25 runs=7 R 1^1 0^1 1^8 0^2 1^1 0^1 1^11 \r";
console.log('full on hard:', RE.test(hard));
console.log('len real/hard:', good.length, hard.length);
for (let i = 0; i < 82; i++) if (good[i] !== hard[i]) { console.log('first diff at', i, JSON.stringify(good[i]), JSON.stringify(hard[i])); break; }
