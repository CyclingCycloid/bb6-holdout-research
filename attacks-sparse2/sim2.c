/*
 * sim2.c — generic BB(6) simulator for the sparse2 attack (adapted from
 * bb6/attacks-sparse1/sim.c; credit: same tape-engine design, no getenv in
 * hot loops). Machine code (36 chars) is REQUIRED as argv[1].
 *
 * Modes (argv[2] onwards):
 *   run N [K]        run N steps; print full RLE every K steps (default: only final)
 *   span N K         run N steps; print "S step state head lo hi span runs" every K steps
 *                    (lo/hi = leftmost/rightmost visited cell; span = hi-lo+1;
 *                     runs = number of 1-runs currently on tape)
 *   runs N K M       run N steps; every K steps print full RLE only if #1-runs <= M
 *   edgest N K       every K steps, if head==lo or head==hi (visited edge), print full RLE
 *
 * Full RLE format: "C step STATE h=head | pos:bit x len ..." from leftmost to
 * rightmost 1 (inclusive). Outside that range all cells are 0.
 * Prints "HALT step STATE h=..." when the machine halts.
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
        tr->write = (t[0]=='0')?0:(t[0]=='1')?1:-1; tr->move = (t[1]=='L')?-1:(t[1]=='R')?1:0; if (t[0]=='-' || t[1]=='-' || t[2]=='-') { tr->write=0; tr->move=0; tr->next=6; continue; }
        tr->next = (t[2]=='H'||t[2]=='Z')?6:(t[2]>='A'&&t[2]<='F')?t[2]-'A':-1; }
    return 0;
}

static long long vlo = 0, vhi = 0; /* visited bounds */
static long long nruns = 0;
static inline int bit(long long p) { return p < plo || p >= phi ? 0 : buf[p - shift]; }
static void update_runs_on_write(long long p, int oldv, int newv) {
    if (oldv == newv) return;
    int l = bit(p-1), r = bit(p+1);
    if (oldv == 0 && newv == 1) nruns += 1 - l - r;
    else if (oldv == 1 && newv == 0) nruns -= 1 - l - r;
}
static int count_runs(void) {
    int runs = 0, prev = 0;
    for (long long q = plo; q < phi; q++) { int v = bit(q); if (v && !prev) runs++; prev = v; }
    return runs;
}
static void print_rle(long long step, int state, long long head) {
    printf("C %lld %c h=%lld |", step, 'A'+state, head);
    long long p, first = 0, last = 0; int found = 0;
    for (p = plo; p < phi; p++) if (rd(p)) { first = p; found = 1; break; }
    if (!found) { printf(" EMPTY\n"); return; }
    for (p = phi - 1; p >= plo; p--) if (rd(p)) { last = p; break; }
    int cur = rd(first); long long start = first;
    for (p = first + 1; p <= last + 1; p++) {
        int v = (p <= last) ? rd(p) : (1 - cur);
        if (v != cur) { printf(" %lld:%dx%lld", start, cur, p - start); cur = v; start = p; }
    }
    printf("\n");
}

int main(int argc, char **argv) {
    if (argc < 4) { fprintf(stderr, "usage: %s CODE MODE args...\n", argv[0]); return 2; }
    if (parse_code(argv[1])) { fprintf(stderr, "bad code\n"); return 2; }
    const char *mode = argv[2];
    long long N = atoll(argv[3]);
    long long K = argc >= 5 ? atoll(argv[4]) : 0;
    long long M = argc >= 6 ? atoll(argv[5]) : 0;

    tape_init(); wr(0, 0);
    long long head = 0; int state = 0; long long step = 0;
    vlo = 0; vhi = 0; nruns = 0;
    int done = 0;
    while (step < N) {
        if (K > 0 && step % K == 0) {
            if (!strcmp(mode, "run")) print_rle(step, state, head);
            else if (!strcmp(mode, "span")) {
                int runs = count_runs();
                printf("S %lld %c h=%lld lo=%lld hi=%lld span=%lld runs=%d\n",
                    step, 'A'+state, head, vlo, vhi, vhi - vlo + 1, runs);
            }
            else if (!strcmp(mode, "runs")) { int runs = count_runs(); if (runs <= M) print_rle(step, state, head); }
            else if (!strcmp(mode, "edgest")) { if (head == vlo || head == vhi) print_rle(step, state, head); }
        }
        uint8_t sy = rd(head);
        Trans tr = T[state][sy];
        if (tr.next == 6) { printf("HALT %lld %c h=%lld\n", step, 'A'+state, head); print_rle(step, state, head); done = 1; break; }
        if (tr.write < 0 || tr.next < 0) { printf("UNDEF %lld %c h=%lld\n", step, 'A'+state, head); done = 2; break; }
        int oldv = rd(head);
        wr(head, (uint8_t)tr.write);
        update_runs_on_write(head, oldv, tr.write);
        head += tr.move; state = tr.next; step++;
        if (head < vlo) vlo = head;
        if (head > vhi) vhi = head;
    }
    if (!done) {
        if (!strcmp(mode, "run")) print_rle(step, state, head);
        printf("DONE %lld\n", step);
    }
    return 0;
}
