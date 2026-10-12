"""era.py — analyze DETAIL-mode CP sequences: frozen-prefix, gap growth, pop drift."""
import sys, glob, os, math, collections

def parse(fn):
    cps = []
    for l in open(fn, encoding='utf-8'):
        if not l.startswith('CP '): continue
        parts = l.split()
        d = {'step': int(parts[1]), 'state': parts[2]}
        for p in parts[3:]:
            if '=' in p:
                k, v = p.split('=', 1)
                d[k] = int(v)
        if 'R ' in l:
            rpart = l.split(' R ')[1].strip()
            runs = []
            if rpart and rpart != '-':
                for tok in rpart.split():
                    v, ln = tok.split('^')
                    runs.append((int(v), int(ln)))
            d['rle'] = runs
        cps.append(d)
    return cps

def frozen_prefix(seq):
    """length of common prefix (in run tokens) across all sequences in list"""
    if not seq: return 0
    m = min(len(s) for s in seq)
    n = 0
    for i in range(m):
        vals = {s[i] for s in seq}
        if len(vals) == 1: n += 1
        else: break
    return n

def analyze(fn):
    cps = parse(fn)
    if len(cps) < 12: return None
    late = cps[-20:]
    early = cps[:20]
    # frozen left prefix of RLE token sequence (value,len) across late checkpoints
    rles = [c.get('rle', []) for c in late if c.get('rle')]
    fp = frozen_prefix(rles)
    # frozen length in cells: sum of first fp run lengths
    fpcells = sum(l for (v, l) in rles[0][:fp]) if rles and fp else 0
    # gap (zero-run) statistics over time
    def gaps(cs):
        g = []
        for c in cs:
            r = c.get('rle', [])
            g += [l for (v, l) in r if v == 0]
        return g
    ge, gl = gaps(early), gaps(late)
    maxg_e = max(ge) if ge else 0
    maxg_l = max(gl) if gl else 0
    mean_g_e = sum(ge)/len(ge) if ge else 0
    mean_g_l = sum(gl)/len(gl) if gl else 0
    # pop / width drift across late checkpoints
    pops = [c['pop'] for c in late]
    wids = [c.get('width', 0) for c in late]
    steps = [c['step'] for c in late]
    def slope(ys):
        n = len(ys); sx = sum(steps); sy = sum(ys)
        sxx = sum(x*x for x in steps); sxy = sum(x*y for x, y in zip(steps, ys))
        den = n*sxx - sx*sx
        return (n*sxy - sx*sy)/den if den else 0.0
    # width growth exponent over whole run (from cp[2] to cp[-1])
    w0, w1 = cps[2].get('width', 1), cps[-1].get('width', 1)
    t0, t1 = cps[2]['step'], cps[-1]['step']
    aw = math.log(max(w1,2)/max(w0,2))/math.log(t1/max(t0,2)) if t1 > t0 else 0
    p0, p1 = cps[2]['pop'], cps[-1]['pop']
    ap = math.log(max(p1,2)/max(p0,2))/math.log(t1/max(t0,2)) if t1 > t0 else 0
    # oscillation of pop in late window
    osc = (max(pops) - min(pops))
    return dict(file=os.path.basename(fn)[:-4], ncp=len(cps),
                fp=fp, fpcells=fpcells, width_late=wids[-1], pop_late=pops[-1],
                maxgap_early=maxg_e, maxgap_late=maxg_l,
                meangap_e=round(mean_g_e,2), meangap_l=round(mean_g_l,2),
                pop_slope=round(slope(pops)*1e6, 2), width_slope=round(slope(wids)*1e6, 2),
                aw=round(aw, 3), ap=round(ap, 3), pop_osc=osc,
                head_states=collections.Counter(c['state'] for c in late).most_common(3))

for fn in sorted(glob.glob('detail/*.txt')):
    r = analyze(fn)
    if r:
        print(r)
