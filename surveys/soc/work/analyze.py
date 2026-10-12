import math, collections, sys

def load(fn):
    rows = []
    for l in open(fn, encoding='utf-8'):
        l = l.rstrip('\n')
        if not l or l.startswith('#'): continue
        rows.append(l.split('\t'))
    return rows

def f(x):
    try: return float(x)
    except: return -99.0

def i(x):
    try: return int(x)
    except: return -1

def trtop(s):
    """parse 'B1:17.2%;A0:15.5%;E0:12.1%' -> (top1, top3sum, set of pairs)"""
    if s == 'NA': return 0.0, 0.0, set()
    parts = s.split(';')
    pcts = [float(p.split(':')[1][:-1]) for p in parts]
    pairs = set(p.split(':')[0] for p in parts)
    return pcts[0], sum(pcts), pairs

def rle_shape(rle, nshow=10):
    """first nshow runs as tuple; '.' for NA"""
    if rle == 'NA': return ()
    runs = rle.split(';')[:nshow]
    out = []
    for r in runs:
        v, ln = r.split('^')
        out.append((int(v), min(int(ln), 99)))
    return tuple(out)

soc = load('soc_3e8.tsv')
soc1 = {r[2]: r for r in load('soc_1e7.tsv')}

feats = {}
for r in soc:
    code = r[2]
    span, pop, d0 = i(r[5]), i(r[6]), i(r[17])
    runs = i(r[18])
    a_s, a_p = f(r[11]), f(r[12])
    t1, t3, pairs = trtop(r[20])
    s1 = i(soc1[code][5]) if code in soc1 else 0
    g30 = math.log(max(span,2)/max(s1,2))/math.log(30.0) if s1 > 0 else -1
    feats[code] = dict(
        span=span, pop=pop, sparse=pop/max(span,1), d0=d0, d0d=d0/3e8,
        a_s=a_s, a_p=a_p, t1=t1, t3=t3, rpi=runs/max(pop,1), g30=g30,
        runs=runs, rle=rle_shape(r[19]), hs=r[10])

# ---------- coarse clustering ----------
clusters = collections.defaultdict(list)
for c, ft in feats.items():
    if ft['a_p'] >= 0.9 or ft['a_s'] >= 0.9 or ft['d0d'] >= 0.45:
        cl = 'CHAOTIC'
    elif ft['d0'] < 1000:               # D0 state basically unused
        cl = 'D0-INERT'
    elif ft['a_p'] < 0.03 and ft['pop'] < 120:
        cl = 'FROZEN'                   # near-flat pop, tiny tape
    elif ft['a_p'] >= 0.15:
        cl = 'FAST-GROW'                # pop growth alpha >= 0.15
    elif ft['d0d'] >= 0.15:
        cl = 'EVENT-DENSE'
    else:
        cl = 'SLOW-CORE'
    clusters[cl].append(c)

print('== cluster sizes ==')
for k in sorted(clusters, key=lambda k: -len(clusters[k])):
    print(f"{k}: {len(clusters[k])}")

print('\n== per-cluster summary (median) ==')
def med(vals):
    v = sorted(vals); n = len(v)
    return v[n//2] if n else float('nan')
for k in sorted(clusters):
    cs = clusters[k]
    print(f"{k} n={len(cs)}: pop={med([feats[c]['pop']] for c in cs) if False else med([feats[c]['pop'] for c in cs])} "
          f"span={med([feats[c]['span'] for c in cs])} sparse={med([feats[c]['sparse'] for c in cs]):.3f} "
          f"a_p={med([feats[c]['a_p'] for c in cs]):.3f} a_s={med([feats[c]['a_s'] for c in cs]):.3f} "
          f"d0d={med([feats[c]['d0d'] for c in cs]):.4f} t1={med([feats[c]['t1'] for c in cs]):.1f} "
          f"rpi={med([feats[c]['rpi'] for c in cs]):.2f} g30={med([feats[c]['g30'] for c in cs]):.3f}")

# D0-INERT: what do they look like? d0<1000 means state D rarely reads 0
print('\n== D0-INERT machines ==')
for c in sorted(clusters['D0-INERT'], key=lambda c: -feats[c]['pop'])[:15]:
    ft = feats[c]
    print(f"{c} pop={ft['pop']} span={ft['span']} a_p={ft['a_p']:.3f} a_s={ft['a_s']:.3f} d0={ft['d0']} t1={ft['t1']:.1f} head={ft['hs']}")

print('\n== FAST-GROW machines (top 20 by a_p) ==')
for c in sorted(clusters['FAST-GROW'], key=lambda c: -feats[c]['a_p'])[:20]:
    ft = feats[c]
    print(f"{c} pop={ft['pop']} span={ft['span']} a_p={ft['a_p']:.3f} a_s={ft['a_s']:.3f} d0={ft['d0']} t1={ft['t1']:.1f} rpi={ft['rpi']:.2f}")

print('\n== CHAOTIC machines ==')
for c in sorted(clusters['CHAOTIC'], key=lambda c: -feats[c]['a_p'])[:20]:
    ft = feats[c]
    print(f"{c} pop={ft['pop']} span={ft['span']} a_p={ft['a_p']:.3f} a_s={ft['a_s']:.3f} d0d={ft['d0d']:.3f}")

# RLE shape clustering: common prefixes
print('\n== common RLE prefixes (first 6 runs, top 12) ==')
shp = collections.Counter(ft['rle'][:6] for ft in feats.values())
for s, n in shp.most_common(12):
    print(n, s)

# FROZEN machines: near-flat
print('\n== FROZEN sample (10) ==')
for c in sorted(clusters['FROZEN'], key=lambda c: feats[c]['pop'])[:10]:
    ft = feats[c]
    print(f"{c} pop={ft['pop']} span={ft['span']} a_p={ft['a_p']:.3f} d0={ft['d0']} rle6={ft['rle'][:6]}")

import json
json.dump({c: {k: (list(v) if isinstance(v, tuple) else v) for k, v in ft.items()} for c, ft in feats.items()},
          open('feats.json', 'w'))
json.dump({k: v for k, v in clusters.items()}, open('clusters.json', 'w'))
