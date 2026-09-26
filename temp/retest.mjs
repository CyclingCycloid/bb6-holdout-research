import { execFileSync } from 'child_process';
import { resolve } from 'path';
const out = execFileSync(resolve('./sim/triage2.exe'), ['DETAIL','1RB1LA0RC0RD1LC1LA1RE1RD1LF0LA---0LE','1e5'], { encoding: 'utf8', maxBuffer: 1 << 28 });
const lines = out.split('\n');
const good = lines.find(l => l.startsWith('CP '));
console.log('LINE:', JSON.stringify(good.slice(0, 90)));
const m = good.match(/^CP (\d+) ([A-F]) pop=(-?\d+) lo1=(-?\d+) headrel=(-?\d+) width=(-?\d+) runs=(-?\d+) R (.*)$/);
console.log('MATCH:', m ? 'YES groups='+m.length : 'NO');
