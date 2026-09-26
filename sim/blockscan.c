/*
 * BMO1 two-block configuration logger.
 * Logs every step where the tape has EXACTLY two maximal 1-runs (globally),
 * printing: step, state, head, then (from left) run1 len, zeros between, run2 len,
 * plus head offset relative to: start of run1 (h1), start of run2 (h2).
 * Usage: blockscan CODE STEPS
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>

typedef struct { int write; int move; int next; } Trans;
static Trans T[6][2];

static uint8_t *buf = NULL;
static long long plo = 0, phi = 0, allo = 0, ahi = 0, shift = 0;

static void tape_init(void) {
    long long cap = 1 << 20;
    buf = (uint8_t*)calloc(cap, 1);
    if (!buf) exit(3);
    allo = 0; ahi = cap; shift = 0; plo = 0; phi = 0;
}
static void ensure(long long lo, long long hi) {
    if (lo >= allo && hi <= ahi) return;
    long long nlo = allo, nhi = ahi, half;
    while (lo < nlo || hi > nhi) {
        half = (ahi - allo) / 2; if (half == 0) half = 1;
        if (lo < nlo) nlo -= half;
        if (hi > nhi) nhi += half;
    }
    if (nhi - nlo > (1LL << 40)) { fprintf(stderr, "tape too large\n"); exit(3); }
    uint8_t *nb = (uint8_t*)calloc(nhi - nlo, 1);
    if (!nb) { fprintf(stderr, "alloc fail\n"); exit(3); }
    memcpy(nb + (allo - nlo), buf + (allo - shift), ahi - allo);
    free(buf); buf = nb; allo = nlo; ahi = nhi; shift = nlo;
}
static inline uint8_t rd(long long p) { return (p < plo || p >= phi) ? 0 : buf[p - shift]; }
static inline void wr(long long p, uint8_t v) {
    if (p < plo || p >= phi) { ensure(p, p + 1); if (p < plo) plo = p; if (p + 1 > phi) phi = p + 1; }
    buf[p - shift] = v;
}

static int parse_code(const char *code) {
    if (strlen(code) != 36) { fprintf(stderr, "code must be 36 chars\n"); return 2; }
    for (int i = 0; i < 12; i++) {
        const char *t = code + 3 * i; Trans *tr = &T[i / 2][i % 2];
        tr->write = (t[0]=='0')?0:(t[0]=='1')?1:-1;
        tr->move  = (t[1]=='L')?-1:(t[1]=='R')?1:0;
        tr->next  = (t[2]=='H'||t[2]=='Z')?6:(t[2]>='A'&&t[2]<='F')?t[2]-'A':-1;
    }
    return 0;
}

/* incremental count of maximal 1-runs within [plo, phi) */
static long long nruns = 0;
static inline int bit(long long p) { return p < plo || p >= phi ? 0 : buf[p - shift]; }
static void update_runs_on_write(long long p, int oldv, int newv) {
    if (oldv == newv) return;
    int l = bit(p-1), r = bit(p+1);
    if (oldv == 0 && newv == 1) nruns += 1 - l - r;      /* 0->1 */
    else if (oldv == 1 && newv == 0) nruns -= 1 - l - r; /* 1->0 (l,r unchanged around p since p was 1: l,r reflect neighbors) */
}

int main(int argc, char **argv) {
    if (argc < 3) { fprintf(stderr, "usage: %s CODE STEPS\n", argv[0]); return 2; }
    if (parse_code(argv[1])) return 2;
    long long max_steps = (long long)atof(argv[2]);
    tape_init(); wr(0, 0);
    long long head = 0; int state = 0; long long step = 0;
    while (step < max_steps) {
        /* log when exactly two 1-runs */
        if (nruns == 2) {
            /* validate & measure by scan */
            long long p = plo; long long s1 = -1, e1 = -1, s2 = -1, e2 = -1;
            int runs = 0; long long cur = -1;
            for (p = plo; p < phi; p++) {
                int v = bit(p);
                if (v && cur != 1) { runs++; if (runs == 1) s1 = p; else if (runs == 2) s2 = p; cur = 1; }
                else if (!v && cur == 1) { if (runs == 1) e1 = p - 1; else if (runs == 2) e2 = p - 1; cur = 0; }
            }
            if (runs == 2) {
                if (e2 < 0) e2 = phi - 1; /* run touches right edge of used tape */
                printf("BLK %lld %c h=%lld r1=%lld gap=%lld r2=%lld h-r1s=%lld h-r2s=%lld\n",
                    step, 'A'+state, head, e1-s1+1, s2-e1-1, e2-s2+1, head-s1, head-s2);
            }
        }
        uint8_t sy = rd(head);
        Trans tr = T[state][sy];
        if (tr.next == 6) { printf("HALT %lld\n", step); return 0; }
        if (tr.write < 0 || tr.next < 0) { printf("UNDEF %lld %c %lld\n", step, 'A'+state, head); return 2; }
        int oldv = rd(head);
        wr(head, (uint8_t)tr.write);
        update_runs_on_write(head, oldv, tr.write);
        head += tr.move; state = tr.next; step++;
    }
    printf("DONE %lld\n", step);
    return 0;
}
