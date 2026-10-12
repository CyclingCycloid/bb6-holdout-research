/*
 * sim.c — simulator for BB(6) holdout SPARSE1 = 1RB0RB1LB0LC1RD1LC1RE0RA0RF1RA---1LB
 * (code is the DEFAULT; argv[1] may override, must be 36 chars).
 *
 * Modes (argv after code):
 *   blk N            replicate blockscan 2-run logging for N steps (validation)
 *   run N            run N steps, print final full RLE config (and HALT if any)
 *   dumpwin LO HI K  print full RLE config every K steps for steps in [LO,HI)
 *   dumpwin2 LO HI K like dumpwin but only steps where config's 1-run count == R? no:
 *                    print every K-th *step* but only if head state==D (sweep checkpoints)
 *   find S LO HI     print full RLE at steps where state==S occurs first after LO (diagnostic)
 *
 * Full RLE format: "C step STATE head | p0:bit x len p1:bit x len ..." from first to last 1.
 * Everything outside printed range is 0.
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

/* full RLE print from leftmost 1 to rightmost 1 (if tape empty: "EMPTY") */
static void print_rle(long long step, int state, long long head) {
    printf("C %lld %c h=%lld |", step, 'A'+state, head);
    long long p;
    /* find first and last 1 within visited bounds */
    long long first = 0, last = 0; int found = 0;
    for (p = plo; p < phi; p++) if (rd(p)) { first = p; found = 1; break; }
    if (!found) { printf(" EMPTY\n"); return; }
    for (p = phi - 1; p >= plo; p--) if (rd(p)) { last = p; break; }
    int cur = rd(first); long long start = first;
    for (p = first + 1; p <= last + 1; p++) {
        int v = (p <= last) ? rd(p) : (1 - cur); /* force flush */
        if (v != cur) {
            printf(" %lld:%dx%lld", start, cur, p - start);
            cur = v; start = p;
        }
    }
    printf("\n");
}

/* ---- 2-run incremental counting (blockscan replication) ---- */
static long long nruns = 0;
static inline int bit(long long p) { return p < plo || p >= phi ? 0 : buf[p - shift]; }
static void update_runs_on_write(long long p, int oldv, int newv) {
    if (oldv == newv) return;
    int l = bit(p-1), r = bit(p+1);
    if (oldv == 0 && newv == 1) nruns += 1 - l - r;
    else if (oldv == 1 && newv == 0) nruns -= 1 - l - r;
}
static void log_blk(long long step, int state, long long head) {
    if (nruns != 2) return;
    long long p, s1=-1, e1=-1, s2=-1, e2=-1; int runs = 0, cur = -1;
    for (p = plo; p < phi; p++) {
        int v = bit(p);
        if (v && cur != 1) { runs++; if (runs==1) s1=p; else if (runs==2) s2=p; cur=1; }
        else if (!v && cur == 1) { if (runs==1) e1=p-1; else if (runs==2) e2=p-1; cur=0; }
    }
    if (runs == 2) {
        if (e2 < 0) e2 = phi - 1;
        printf("BLK %lld %c h=%lld r1=%lld gap=%lld r2=%lld h-r1s=%lld h-r2s=%lld\n",
            step, 'A'+state, head, e1-s1+1, s2-e1-1, e2-s2+1, head-s1, head-s2);
    }
}

int main(int argc, char **argv) {
    const char *DEFAULT_CODE = "1RB0RB1LB0LC1RD1LC1RE0RA0RF1RA---1LB";
    const char *code = DEFAULT_CODE;
    int argi = 1;
    if (argc >= 2 && strlen(argv[1]) == 36) { code = argv[1]; argi = 2; }
    if (argi >= argc) { fprintf(stderr, "usage: %s [CODE] MODE args...\n", argv[0]); return 2; }
    if (parse_code(code)) return 2;
    const char *mode = argv[argi++];
    long long N = 0, LO = 0, HI = 0, K = 1;
    if (!strcmp(mode, "blk") || !strcmp(mode, "run") || !strcmp(mode, "dumpwin") || !strcmp(mode, "dumpwin2") || !strcmp(mode, "cfills") || !strcmp(mode, "anchors")) {
        if (!strcmp(mode, "dumpwin") || !strcmp(mode, "dumpwin2")) {
            LO = atoll(argv[argi]); HI = atoll(argv[argi+1]); K = atoll(argv[argi+2]); N = HI;
        } else N = atoll(argv[argi]);
    } else { fprintf(stderr, "unknown mode %s\n", mode); return 2; }

    tape_init(); wr(0, 0);
    long long head = 0; int state = 0; long long step = 0;
    int isblk = !strcmp(mode, "blk");
    int isdw  = !strcmp(mode, "dumpwin");
    int isdw2 = !strcmp(mode, "dumpwin2");
    int iscf  = !strcmp(mode, "cfills");
    int isan  = !strcmp(mode, "anchors");
    while (step < N) {
        if (isblk) log_blk(step, state, head);
        if (iscf && state == 2 /*C*/ && rd(head) == 0) print_rle(step, state, head); /* C fills gap */
        if (isan && state == 2 /*C*/ && rd(head) == 0 && rd(head-1) == 1 && rd(head+1) == 1) {
            /* C at a gap with both neighbors 1: require clean family
             *   0^inf 1^x 0 1^m [0^d 1^k] 0^inf   (x >= 1, m >= 1, optional deco)
             * left of head-1: one clean 1-run then only zeros;
             * right of head+1: one 1-run, then optional 0^d 1^k, then only zeros. */
            long long p = head - 1, x = 0;
            while (rd(p) == 1) { x++; p--; }
            long long leftok = 1;
            for (long long q = p; q >= plo; q--) if (rd(q)) { leftok = 0; break; }
            long long m = 0; p = head + 1;
            while (rd(p) == 1) { m++; p++; }
            long long d = 0, k = 0, rightok = 1;
            while (rd(p) == 0 && p < phi + 1) { d++; p++; }
            if (d > 0) {
                while (rd(p) == 1) { k++; p++; }
                for (long long q = p; q < phi; q++) if (rd(q)) { rightok = 0; break; }
            } else { k = 0; }
            if (leftok && rightok) {
                if (x == 1) printf("ANCH %lld h=%lld x=%lld m=%lld d=%lld k=%lld\n", step, head, x, m, d, k);
                else printf("ICYC %lld h=%lld x=%lld m=%lld d=%lld k=%lld\n", step, head, x, m, d, k);
            }
        }
        if ((isdw || isdw2) && step >= LO && step < HI && (step - LO) % K == 0) {
            if (!isdw2 || state == 3 /*D*/) print_rle(step, state, head);
        }
        uint8_t sy = rd(head);
        Trans tr = T[state][sy];
        if (tr.next == 6) { printf("HALT %lld %c h=%lld\n", step, 'A'+state, head); print_rle(step, state, head); return 0; }
        if (tr.write < 0 || tr.next < 0) { printf("UNDEF %lld %c h=%lld\n", step, 'A'+state, head); return 2; }
        int oldv = rd(head);
        wr(head, (uint8_t)tr.write);
        if (isblk) update_runs_on_write(head, oldv, tr.write);
        head += tr.move; state = tr.next; step++;
    }
    if (!isblk) print_rle(step, state, head);
    printf("DONE %lld\n", step);
    return 0;
}
