/*
 * anchor3.c — anchor-map oracle for M3 = 1RB1LA1LC0RE1LF1LD0RB0LA1RC1RE---0LD.
 * (Adapted from bb6/attacks-sparse1/astart.c design.)
 *
 * M3 transition table:
 *   A: 0->1RB 1->1LA   B: 0->1LC 1->0RE   C: 0->1LF 1->1LD
 *   D: 0->0RB 1->0LA   E: 0->1RC 1->1RE   F: 0->HALT 1->0LD
 * HALT iff D reads 0 with both neighbors 0 (see analysis).
 *
 * ANCHOR family: tape = 0^inf 1^{r1} 0 1^{r2} 0 ... 0 1^{rn} 0^inf  (n >= 2,
 * every gap EXACTLY width 1), head (state D) on the LAST gap (between
 * r_{n-1} and r_n).  D-on-last-gap = "wall reflection" heartbeat.
 *
 * Modes:
 *   scan N [K]     from blank, run N steps; log every clean anchor
 *                  "ANCH step n r1 r2 ... rn"; every D-on-0 event with
 *                  surrounding gap structure "DZ step w=<gapwidth around head> ...";
 *                  HALT.  K = print every K-th DZ event only (default 0 = all).
 *   start r1 .. rn maxsteps   constructed anchor -> next anchor / halt / cap:
 *                  prints "RES cost n' r'1..r'n'" | "HALT step" | "CAP".
 *   dscan N LO HI  log D-on-0 events with full RLE for steps in [LO,HI)
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>

typedef struct { int write; int move; int next; } Trans;
static Trans T[6][2];
static const char *CODE = "1RB1LA1LC0RE1LF1LD0RB0LA1RC1RE---0LD";

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
        tr->write = (t[0]=='0')?0:(t[0]=='1')?1:-1; tr->move = (t[1]=='L')?-1:(t[1]=='R')?1:0; if (t[0]=='-' || t[1]=='-' || t[2]=='-') { tr->write=0; tr->move=0; tr->next=6; continue; }
        tr->next = (t[2]=='H'||t[2]=='Z')?6:(t[2]>='A'&&t[2]<='F')?t[2]-'A':-1; }
    return 0;
}

/* RLE scan: runs[] = lengths of 1-runs, gaps[] = widths of 0-runs between them,
 * from leftmost 1 to rightmost 1.  Returns #runs, or -1 if > max. */
static int rle_scan(long long *runs, long long *gaps, int max) {
    long long p, first = 0, last = 0; int found = 0;
    for (p = plo; p < phi; p++) if (rd(p)) { first = p; found = 1; break; }
    if (!found) return 0;
    for (p = phi - 1; p >= plo; p--) if (rd(p)) { last = p; break; }
    int n = 0; int inone = 0;
    for (p = first; p <= last; p++) {
        if (rd(p)) { if (!inone) { if (n >= max) return -1; runs[n] = 0; gaps[n] = 0; n++; } inone = 1; runs[n-1]++; }
        else { inone = 0; if (n >= 1) gaps[n-1]++; }
    }
    return n;
}
/* zero-run bounds clamped to visited window [plo,phi); unvisited cells read 0
 * and would loop forever, so we stop at the window edge (width flagged >=). */
static long long gleft(long long p) { long long q = p; while (q - 1 >= plo && rd(q-1) == 0) q--; return q; }
static long long gright(long long p) { long long q = p; while (q + 1 < phi && rd(q+1) == 0) q++; return q; }

int main(int argc, char **argv) {
    if (parse_code(CODE)) return 2;
    if (argc >= 2 && !strcmp(argv[1], "scan")) {
        long long N = atoll(argv[2]);
        long long K = argc >= 4 ? atoll(argv[3]) : 0;
        tape_init(); wr(0, 0);
        long long head = 0; int state = 0; long long step = 0;
        long long runs[64], gaps[64];
        long long dzcnt = 0;
        while (step < N) {
            if (state == 3 /*D*/ && rd(head) == 0) {
                int n = rle_scan(runs, gaps, 64);
                long long gw = gright(head) - gleft(head) + 1;
                /* head's gap index: 0 = left of all runs, i = in gap i (between
                 * run i and run i+1), n = right of all runs */
                int gidx = 0;
                {
                    /* walk from leftmost 1: count how many run-starts are left of head */
                    long long p, first = 0; int found = 0;
                    for (p = plo; p < phi; p++) if (rd(p)) { first = p; found = 1; break; }
                    if (!found) gidx = -1;
                    else if (head < first) gidx = 0;
                    else {
                        int cnt = 0; int prev1 = 0;
                        for (p = first; p < head; p++) {
                            if (rd(p) && !prev1) cnt++;
                            prev1 = rd(p);
                        }
                        /* cnt = number of runs that START at or before head-1 */
                        gidx = cnt; /* if head is inside gap between run cnt-1 and cnt, index cnt */
                        if (rd(head - 1) == 1) gidx = cnt; /* just left of a run start? then between cnt-1 and cnt */
                    }
                }
                printf("DZ %lld g%d.%lld w=%lld n=%d", step, gidx, head - gleft(head), gw, n);
                if (n > 0) { for (int i = 0; i < n; i++) printf(" %lld", runs[i]); printf(" g:"); for (int i = 0; i < n - 1; i++) printf(" %lld", gaps[i]); }
                printf("\n");
            }
            uint8_t sy = rd(head);
            Trans tr = T[state][sy];
            if (tr.next == 6) { printf("HALT %lld h=%lld\n", step, head); return 0; }
            if (tr.write < 0 || tr.next < 0) { printf("UNDEF %lld\n", step); return 2; }
            wr(head, (uint8_t)tr.write);
            head += tr.move; state = tr.next; step++;
        }
        printf("DONE %lld\n", step);
        return 0;
    }
    if (argc >= 3 && !strcmp(argv[1], "start")) {
        int n = argc - 3;
        long long runs[64];
        for (int i = 0; i < n; i++) runs[i] = atoll(argv[2 + i]);
        long long cap = atoll(argv[2 + n]);
        tape_init();
        long long p = 0;
        for (int i = 0; i < n; i++) { for (long long j = 0; j < runs[i]; j++) wr(p++, 1); if (i < n - 1) wr(p++, 0); }
        long long head = p - 1 - runs[n-1] - 1; /* last gap = cell right after run n-1 ends minus 1 */
        head = p - runs[n-1] - 1;
        int state = 3 /*D*/; long long step = 0;
        long long runs2[64], gaps2[64];
        while (step < cap) {
            if (step > 0 && state == 3 && rd(head) == 0) {
                int nn = rle_scan(runs2, gaps2, 64);
                int islast = 1;
                for (long long q = head + 1; q < phi; q++) if (rd(q)) { islast = 0; break; }
                int clean = 0;
                if (nn >= 2 && islast) { clean = 1; for (int i = 0; i < nn - 1; i++) if (gaps2[i] != 1) clean = 0; }
                if (clean) { printf("RES cost=%lld n=%d", step, nn); for (int i = 0; i < nn; i++) printf(" %lld", runs2[i]); printf("\n"); return 0; }
            }
            uint8_t sy = rd(head);
            Trans tr = T[state][sy];
            if (tr.next == 6) { printf("HALT %lld\n", step); return 0; }
            if (tr.write < 0 || tr.next < 0) { printf("UNDEF %lld\n", step); return 2; }
            wr(head, (uint8_t)tr.write);
            head += tr.move; state = tr.next; step++;
        }
        printf("CAP\n");
        return 0;
    }
    fprintf(stderr, "usage: anchor3 scan N [K] | anchor3 start r1..rn maxsteps\n");
    return 2;
}
