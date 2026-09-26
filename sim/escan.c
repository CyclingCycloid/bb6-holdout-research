/*
 * BMO1 E(a,b,c) macro-state logger.
 * Logs, at every step where head is in state E on the blank immediately right
 * of the rightmost 1-run, the full run structure of the tape when it has the
 * canonical form:
 *   3-run: 0^inf 1 0^a 1 0^b 1^c 0^inf   -> "E3 step a b c"
 *   2-run: 0^inf 1 0^g 1^B 0^inf         -> "E2 step g B"   (= A(g,B) in A-notation)
 * Usage: escan CODE STEPS
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
    buf = (uint8_t*)calloc(cap, 1); if (!buf) exit(3);
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
    uint8_t *nb = (uint8_t*)calloc(nhi - nlo, 1); if (!nb) exit(3);
    memcpy(nb + (allo - nlo), buf + (allo - shift), ahi - allo);
    free(buf); buf = nb; allo = nlo; ahi = nhi; shift = nlo;
}
static inline uint8_t rd(long long p) { return (p < plo || p >= phi) ? 0 : buf[p - shift]; }
static inline void wr(long long p, uint8_t v) {
    if (p < plo || p >= phi) { ensure(p, p + 1); if (p < plo) plo = p; if (p + 1 > phi) phi = p + 1; }
    buf[p - shift] = v;
}
static int parse_code(const char *code) {
    if (strlen(code) != 36) return 2;
    for (int i = 0; i < 12; i++) {
        const char *t = code + 3 * i; Trans *tr = &T[i / 2][i % 2];
        tr->write = (t[0]=='0')?0:(t[0]=='1')?1:-1;
        tr->move  = (t[1]=='L')?-1:(t[1]=='R')?1:0;
        tr->next  = (t[2]=='H'||t[2]=='Z')?6:(t[2]>='A'&&t[2]<='F')?t[2]-'A':-1;
    }
    return 0;
}

int main(int argc, char **argv) {
    if (argc < 3) { fprintf(stderr, "usage: %s CODE STEPS\n", argv[0]); return 2; }
    if (parse_code(argv[1])) return 2;
    long long max_steps = (long long)atof(argv[2]);
    tape_init(); wr(0, 0);
    long long head = 0; int state = 0; long long step = 0;
    long long logged = 0;
    while (step < max_steps) {
        if (state == 4 /*E*/ && rd(head) == 0 && rd(head - 1) == 1) {
            /* collect the 1-runs of the whole tape */
            long long runs[8], starts[8]; int nr = 0;
            long long p = plo; int inrun = 0;
            /* start scan at plo-1 to catch a run starting at plo */
            for (p = plo - 1; p <= phi; p++) {
                int v = (p >= plo && p < phi) ? buf[p - shift] : 0;
                if (v && !inrun) { if (nr < 8) { starts[nr] = p; runs[nr] = 0; } inrun = 1; }
                if (v && inrun && nr < 8) runs[nr]++;
                if (!v && inrun) { inrun = 0; nr++; }
            }
            /* nr now = number of maximal 1-runs (bounded view of 8) */
            long long hend = head; /* position right after rightmost run end is head-1+1 */
            if (nr == 2 && runs[0] == 1) {
                /* 2-run: 1 0^g 1^B, head right of block */
                if (starts[1] + runs[1] == head)
                    { printf("E2 %lld %lld %lld (h=%lld s0=%lld s1=%lld)\n", step, starts[1] - starts[0] - 1, runs[1], head, starts[0], starts[1]); logged++; }
            } else if (nr == 3 && runs[0] == 1 && runs[1] == 1) {
                if (starts[2] + runs[2] == head)
                    { printf("E3 %lld %lld %lld %lld (h=%lld s0=%lld s1=%lld s2=%lld)\n", step, starts[1] - starts[0] - 1, starts[2] - starts[1] - 1, runs[2], head, starts[0], starts[1], starts[2]); logged++; }
            }
        }
        uint8_t sy = rd(head);
        Trans tr = T[state][sy];
        if (tr.next == 6) { printf("HALT %lld\n", step); return 0; }
        if (tr.write < 0 || tr.next < 0) { printf("UNDEF %lld %c %lld\n", step, 'A'+state, head); return 2; }
        wr(head, (uint8_t)tr.write);
        head += tr.move; state = tr.next; step++;
    }
    printf("DONE %lld logged=%lld\n", step, logged);
    return 0;
}
