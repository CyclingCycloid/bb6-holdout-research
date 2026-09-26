/*
 * astart.c — anchor-map oracle for SPARSE1 = 1RB0RB1LB0LC1RD1LC1RE0RA0RF1RA---1LB.
 *
 * Anchor config A(m,d,k): tape 0^inf 1 0 1^m [0^d 1^k] 0^inf,
 *   head at the gap (the single 0 right of the leading 1), state C.
 * (d is ignored when k==0: no deco at all.)
 * Runs the raw TM from this config until the NEXT anchor config with x==1
 * (same detection as sim.c "anchors" mode), or HALT, or step cap.
 *
 * Reports: F(m,d,k) -> (m',d',k') with cost in TM steps; or HALT at step s.
 * Also reports max number of 1-runs ever seen (family sanity: expect <= 4).
 *
 * Usage:
 *   astart m d k maxsteps          single run
 *   astart grid mmax kmax maxsteps  sweep d=1,2 and k=0..kmax, m=1..mmax
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>

typedef struct { int write; int move; int next; } Trans;
static Trans T[6][2];
static const char *CODE = "1RB0RB1LB0LC1RD1LC1RE0RA0RF1RA---1LB";

static uint8_t *buf = NULL;
static long long plo = 0, phi = 0, allo = 0, ahi = 0, shift = 0;

static void tape_init(void) {
    long long cap = 1 << 22;
    buf = (uint8_t*)calloc(cap, 1); if (!buf) exit(3);
    allo = 0; ahi = cap; shift = 0; plo = 0; phi = 0;
}
static void ensure(long long lo, long long hi) {
    if (lo >= allo && hi <= ahi) return;
    long long nlo = allo, nhi = ahi, half;
    while (lo < nlo || hi > nhi) {
        half = (ahi - allo) / 2; if (half == 0) half = 1;
        if (lo < nlo) nlo -= half; if (hi > nhi) nhi += half;
    }
    if (nhi - nlo > (1LL << 40)) { fprintf(stderr, "tape too large\n"); exit(3); }
    uint8_t *nb = (uint8_t*)calloc(nhi - nlo, 1); if (!nb) { fprintf(stderr, "alloc fail\n"); exit(3); }
    memcpy(nb + (allo - nlo), buf + (allo - shift), ahi - allo);
    free(buf); buf = nb; allo = nlo; ahi = nhi; shift = nlo;
}
static inline uint8_t rd(long long p) { return (p < plo || p >= phi) ? 0 : buf[p - shift]; }
static inline void wr(long long p, uint8_t v) {
    if (p < plo || p >= phi) { ensure(p, p + 1); if (p < plo) plo = p; if (p + 1 > phi) phi = p + 1; }
    buf[p - shift] = v;
}
static int parse_code(const char *c) {
    if (strlen(c) != 36) return 2;
    for (int i = 0; i < 12; i++) { const char *t = c + 3 * i; Trans *tr = &T[i/2][i%2];
        tr->write = (t[0]=='0')?0:(t[0]=='1')?1:-1; tr->move = (t[1]=='L')?-1:(t[1]=='R')?1:0;
        tr->next = (t[2]=='H'||t[2]=='Z')?6:(t[2]>='A'&&t[2]<='F')?t[2]-'A':-1; }
    return 0;
}

/* incremental 1-run count for maxruns stat */
static long long nruns = 0;
static inline int bit(long long p) { return p < plo || p >= phi ? 0 : buf[p - shift]; }
static void upd_runs(long long p, int oldv, int newv) {
    if (oldv == newv) return;
    int l = bit(p-1), r = bit(p+1);
    if (oldv == 0 && newv == 1) nruns += 1 - l - r;
    else if (oldv == 1 && newv == 0) nruns -= 1 - l - r;
}

/* detect next x==1 anchor after start; returns 0 found (fills m2,d2,k2,steps), 1 halt, 2 cap, 3 dirty-never */
static int run_anchor(long long m, long long d, long long k, long long cap,
                      long long *m2, long long *d2, long long *k2, long long *steps_out, long long *maxr) {
    tape_init();
    /* build: pos0=1, pos1=0(gap), pos2..m+1: 1^m, then if k>0: d zeros, then 1^k */
    wr(0, 1); wr(1, 0);
    long long p = 2;
    for (long long i = 0; i < m; i++) wr(p++, 1);
    if (k > 0) { for (long long i = 0; i < d; i++) wr(p++, 0); for (long long i = 0; i < k; i++) wr(p++, 1); }
    long long head = 1; int state = 2 /*C*/; long long step = 0;
    /* exact initial run count over visited window [plo, phi) */
    nruns = 0; { long long q2 = plo; int prev = 0;
        while (q2 < phi) { int v = bit(q2); if (v && !prev) nruns++; prev = v; q2++; } }
    long long mr = nruns;
    if (m2) *m2 = -1;
    while (step < cap) {
        /* anchor detection (skip the initial config: require step>0) */
        if (state == 2 && step > 0 && rd(head) == 0 && rd(head-1) == 1 && rd(head+1) == 1) {
            long long q = head - 1, x = 0;
            while (rd(q) == 1) { x++; q--; }
            long long leftok = 1;
            for (long long r = q; r >= plo; r--) if (rd(r)) { leftok = 0; break; }
            if (leftok && x == 1) {
                long long mm = 0; q = head + 1;
                while (rd(q) == 1) { mm++; q++; }
                long long dd = 0, kk = 0;
                /* scan the zeros run, bounded by visited window (all beyond visited is 0) */
                while (rd(q) == 0 && q <= phi) { dd++; q++; }
                if (q > phi) {
                    /* no 1 found anywhere right of block within visited: no deco */
                    if (m2) { *m2 = mm; *d2 = 0; *k2 = 0; }
                    *steps_out = step; *maxr = mr; return 0;
                } else {
                    while (rd(q) == 1) { kk++; q++; }
                    long long rightok = 1;
                    for (long long r = q; r < phi; r++) if (rd(r)) { rightok = 0; break; }
                    if (rightok) { if (m2) { *m2 = mm; *d2 = dd; *k2 = kk; } *steps_out = step; *maxr = mr; return 0; }
                }
            }
        }
        uint8_t sy = rd(head);
        Trans tr = T[state][sy];
        if (tr.next == 6) { *steps_out = step; *maxr = mr; return 1; }
        if (tr.write < 0 || tr.next < 0) { *steps_out = step; *maxr = mr; return 1; }
        int oldv = rd(head);
        wr(head, (uint8_t)tr.write);
        upd_runs(head, oldv, tr.write);
        if (nruns > mr) mr = nruns;
        head += tr.move; state = tr.next; step++;
    }
    *steps_out = step; *maxr = mr; return 2;
}

int main(int argc, char **argv) {
    if (parse_code(CODE)) return 2;
    if (argc >= 2 && !strcmp(argv[1], "grid")) {
        long long mmax = atoll(argv[2]), kmax = atoll(argv[3]), cap = atoll(argv[4]);
        printf("# F grid: mmax=%lld kmax=%lld cap=%lld\n", mmax, kmax, cap);
        for (long long m = 1; m <= mmax; m++)
            for (long long k = 0; k <= kmax; k++)
                for (long long d = 1; d <= 2; d++) {
                    if (k == 0 && d == 2) continue;
                    long long m2, d2, k2, st = 0, mr = 0;
                    int res = run_anchor(m, d, k, cap, &m2, &d2, &k2, &st, &mr);
                    if (res == 0) printf("F %lld %lld %lld -> %lld %lld %lld cost=%lld maxr=%lld\n", m, d, k, m2, d2, k2, st, mr);
                    else if (res == 1) printf("F %lld %lld %lld -> HALT at %lld maxr=%lld\n", m, d, k, st, mr);
                    else printf("F %lld %lld %lld -> CAP\n", m, d, k);
                }
        return 0;
    }
    long long m = atoll(argv[1]), d = atoll(argv[2]), k = atoll(argv[3]), cap = atoll(argv[4]);
    int terse = (argc >= 6 && !strcmp(argv[5], "terse"));
    long long m2, d2, k2, st = 0, mr = 0;
    int res = run_anchor(m, d, k, cap, &m2, &d2, &k2, &st, &mr);
    if (terse) {
        if (res == 0) printf("OK %lld %lld %lld %lld %lld\n", m2, d2, k2, st, mr);
        else if (res == 1) printf("HALT %lld %lld\n", st, mr);
        else printf("CAP\n");
        return 0;
    }
    if (res == 0) printf("F(%lld,%lld,%lld) = (%lld,%lld,%lld) cost=%lld maxr=%lld\n", m, d, k, m2, d2, k2, st, mr);
    else if (res == 1) printf("F(%lld,%lld,%lld) HALT at %lld maxr=%lld\n", m, d, k, st, mr);
    else printf("F(%lld,%lld,%lld) cap-exceeded\n", m, d, k);
    return 0;
}
