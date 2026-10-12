"""evana.py — find rare decision pairs per machine and characterize era recurrence."""
import glob, os, re, collections

def parse_ev(fn):
    evs = []
    for l in open(fn, encoding='utf-8'):
        if not l.startswith('EV '): continue
        m = re.match(r'EV (\d+) ([A-F])(\d) (-?\d+) pop=(-?\d+) width=(-?\d+) headrel=(-?\d+) R ([^|]*)\|(.*)', l)
        if not m: continue
        step, st, sy, head = int(m.group(1)), m.group(2), m.group(3), int(m.group(4))
        pop, width, hr = int(m.group(5)), int(m.group(6)), int(m.group(7))
        runs = []
        rt = m.group(9).strip()
        if rt and rt != '-':
            for tok in rt.split():
                v, ln = tok.split('^')
                runs.append((int(v), int(ln)))
        evs.append(dict(step=step, st=st, sy=sy, pop=pop, width=width, hr=hr, runs=runs))
    return evs

machines = sorted(set(os.path.basename(f).rsplit('_', 1)[0] for f in glob.glob('ev/*.txt')))
print('machines:', len(machines))
for code in machines:
    counts = {}
    for f in glob.glob('ev/%s_*.txt' % code):
        pair = os.path.basename(f)[:-4].rsplit('_', 1)[1]
        evs = parse_ev(f)
        counts[pair] = evs
    ranked = sorted(counts.items(), key=lambda kv: len(kv[1]))
    rare = [(p, len(e)) for p, e in ranked if len(e) < 300][:4]
    print('\n== %s ==' % code)
    print('  rare pairs (<300 hits/3e8):', rare)
    # take the rarest with at least 8 events; examine recurrence
    for p, e in ranked:
        if 8 <= len(e) < 300:
            print('  era marker %s: n=%d' % (p, len(e)))
            # per-era deltas
            dpop = [e2['pop']-e1['pop'] for e1, e2 in zip(e, e[1:])]
            dwid = [e2['width']-e1['width'] for e1, e2 in zip(e, e[1:])]
            dstep = [e2['step']-e1['step'] for e1, e2 in zip(e, e[1:])]
            print('   dpop:', dpop[:24])
            print('   dwid:', dwid[:24])
            print('   dstep(1e6):', [round(d/1e6, 3) for d in dstep[:24]])
            print('   pop range:', e[0]['pop'], '->', e[-1]['pop'], ' width:', e[0]['width'], '->', e[-1]['width'])
            # era-length vs size correlation (multiplicative test)
            if len(e) >= 12:
                n = len(dstep)
                mx = sum(x*w for x, w in zip(dstep, e[1:]['pop'] if False else [x['pop'] for x in e[1:]]))/n
                mp = sum(x['pop'] for x in e[1:])/n
                print('   corr(dstep,pop) proxy: mean_dstep/mean_pop =', round(mx/mp, 3))
            break
    # also: config drift at the rarest marker
    for p, e in ranked:
        if 20 <= len(e) < 300:
            mid = len(e)//2
            print('   marker %s shapes early/mid/late:' % p)
            for idx in (2, mid, len(e)-2):
                print('     step=%.3e pop=%d width=%d hr=%d runs=%s' % (
                    e[idx]['step'], e[idx]['pop'], e[idx]['width'], e[idx]['hr'],
                    e[idx]['runs'][:10]))
            break
