/*
 * o3.c — constructed-anchor oracle for M3 = 1RB1LA1LC0RE1LF1LD0RB0LA1RC1RE---0LD.
 * (Design adapted from bb6/attacks-sparse1/astart.c.)
 *
 * Anchor types (state D reading 0):
 *   A1(N)   : 0^inf 1^N 0^inf,            D immediately LEFT of the block
 *   A2(a,b) : 0^inf 1^a 0 1^b 0^inf,      D immediately left of block a
 *   A3(a,b) : 0^inf 1^a 0 0 1^b 0^inf,    D on the LEFT cell of the 2-gap
 * Runs the raw machine; at every later D-on-0 event records the full config
 * (runs, gaps, gap-index+offset of head); the NEXT such event ends the run.
 * HALT is reported if the machine halts first.
 *
 * Output line: "A <type-args> -> <cost> <next-desc> | HALT <step> | CAP"
 * where <next-desc> = "g<i>.<o> w=<w> n=<n> r=... g=..."
 *
 * Modes:
 *   t1 N maxsteps         single A1(N)
 *   t2 a b maxsteps       single A2(a,b)
 *   t3 a b maxsteps       single A3(a,b)
 *   g1 Nmax maxsteps      sweep A1(N), N=1..Nmax
 *   g2 amax bmax maxsteps sweep A2(a,b) (a,b >= 1)
 *   g3 amax bmax maxsteps sweep A3(a,b) (a>=1, b>=1)
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
    long long cap = 1 << 20;
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
static long long gleft(long long p) { long long q = p; while (q - 1 >= plo && rd(q-1) == 0) q--; return q; }
static long long gright(long long p) { long long q = p; while (q + 1 < phi && rd(q+1) == 0) q++; return q; }

/* run from constructed anchor; print result. type: 1,2,3 */
static void run_anchor(int type, long long x, long long y, long long cap, int terse) {
    tape_init();
    long long head = 0; int state = 3; /* D */
    if (type == 1) {
        long long p = 0; for (long long i = 0; i < x; i++) wr(p++, 1);
        head = -1;
    } else if (type == 2) {
        long long p = 0;
        for (long long i = 0; i < x; i++) wr(p++, 1);
        wr(p++, 0);
        for (long long i = 0; i < y; i++) wr(p++, 1);
        head = -1;
    } else {
        long long p = 0;
        for (long long i = 0; i < x; i++) wr(p++, 1);
        wr(p++, 0); wr(p++, 0);
        for (long long i = 0; i < y; i++) wr(p++, 1);
        head = x; /* left cell of 2-gap (0-indexed: after x ones) */
    }
    if (terse < 0) { /* raw mode: run to HALT or cap, ignore D-events */
        long long step = 0;
        while (step < cap) {
            uint8_t sy = rd(head);
            Trans tr = T[state][sy];
            if (tr.next == 6) { printf("RAW t%d %lld %lld -> HALT %lld\n", type, x, y, step); return; }
            if (tr.write < 0 || tr.next < 0) { printf("RAW UNDEF\n"); return; }
            wr(head, (uint8_t)tr.write);
            head += tr.move; state = tr.next; step++;
        }
        printf("RAW t%d %lld %lld -> NOHALT within %lld\n", type, x, y, cap);
        return;
    }
    long long step = 0;
    long long runs[64], gaps[64];
    while (step < cap) {
        if (step > 0 && state == 3 && rd(head) == 0) {
            int n = rle_scan(runs, gaps, 64);
            long long gw = gright(head) - gleft(head) + 1;
            int gidx = 0;
            long long p, first = 0; int found = 0;
            for (p = plo; p < phi; p++) if (rd(p)) { first = p; found = 1; break; }
            if (!found) gidx = -1;
            else if (head < first) gidx = 0;
            else { int cnt = 0; int prev1 = 0;
                for (p = first; p < head; p++) { if (rd(p) && !prev1) cnt++; prev1 = rd(p); }
                gidx = cnt; }
            if (terse) {
                if (n == 1) printf("OK g%d.%lld n=1 %lld %lld\n", gidx, head - gleft(head), runs[0], step);
                else if (n == 2) printf("OK g%d.%lld n=2 %lld %lld w=%lld %lld\n", gidx, head - gleft(head), runs[0], runs[1], gaps[0], step);
                else printf("OK g%d.%lld n=%d %lld %lld %lld w=%lld %lld\n", gidx, head - gleft(head), n, runs[0], n>1?runs[1]:0, n>2?runs[2]:0, n>1?gaps[0]:0, step);
            } else {
                printf("A t%d %lld %lld -> cost=%lld g%d.%lld w=%lld n=%d", type, x, y, step, gidx, head - gleft(head), gw, n);
                for (int i = 0; i < n; i++) printf(" %lld", runs[i]);
                for (int i = 0; i < n - 1; i++) printf(" g%d=%lld", i + 1, gaps[i]);
                printf("\n");
            }
            return;
        }
        uint8_t sy = rd(head);
        Trans tr = T[state][sy];
        if (tr.next == 6) { printf(type==1?"A t1 %lld 0 -> HALT %lld\n":(type==2?"A t2 %lld %lld -> HALT %lld\n":"A t3 %lld %lld -> HALT %lld\n"), x, y, step); if (!terse) {} return; }
        if (tr.write < 0 || tr.next < 0) { printf("UNDEF\n"); return; }
        wr(head, (uint8_t)tr.write);
        head += tr.move; state = tr.next; step++;
    }
    printf("CAP t%d %lld %lld\n", type, x, y);
}

int main(int argc, char **argv) {
    if (parse_code(CODE)) return 2;
    if (argc >= 2 && !strcmp(argv[1], "t1")) { run_anchor(1, atoll(argv[2]), 0, atoll(argv[3]), 0); return 0; }
    if (argc >= 2 && !strcmp(argv[1], "r1")) { run_anchor(1, atoll(argv[2]), 0, atoll(argv[3]), -1); return 0; }
    if (argc >= 2 && !strcmp(argv[1], "r2")) { run_anchor(2, atoll(argv[2]), atoll(argv[3]), atoll(argv[4]), -1); return 0; }
    if (argc >= 2 && !strcmp(argv[1], "r3")) { run_anchor(3, atoll(argv[2]), atoll(argv[3]), atoll(argv[4]), -1); return 0; }
    if (argc >= 2 && !strcmp(argv[1], "t2")) { run_anchor(2, atoll(argv[2]), atoll(argv[3]), atoll(argv[4]), 0); return 0; }
    if (argc >= 2 && !strcmp(argv[1], "t3")) { run_anchor(3, atoll(argv[2]), atoll(argv[3]), atoll(argv[4]), 0); return 0; }
    if (argc >= 2 && !strcmp(argv[1], "g1")) {
        long long nmax = atoll(argv[2]), cap = atoll(argv[3]);
        for (long long n = 1; n <= nmax; n++) run_anchor(1, n, 0, cap, 0);
        return 0;
    }
    if (argc >= 2 && !strcmp(argv[1], "g2")) {
        long long amax = atoll(argv[2]), bmax = atoll(argv[3]), cap = atoll(argv[4]);
        for (long long a = 1; a <= amax; a++) for (long long b = 1; b <= bmax; b++) run_anchor(2, a, b, cap, 0);
        return 0;
    }
    if (argc >= 2 && !strcmp(argv[1], "g3")) {
        long long amax = atoll(argv[2]), bmax = atoll(argv[3]), cap = atoll(argv[4]);
        for (long long a = 1; a <= amax; a++) for (long long b = 1; b <= bmax; b++) run_anchor(3, a, b, cap, 0);
        return 0;
    }
    fprintf(stderr, "usage: o3 t1|t2|t3 x y maxsteps | o3 g1 Nmax cap | o3 g2 amax bmax cap | o3 g3 amax bmax cap\n");
    return 2;
}
