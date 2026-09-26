/*
 * BMO1 f-anchor logger (fast): logs every config where tape == (10)^a 1^b globally,
 * state == D, head on first cell of the 1^b block (offset 2a). Candidate filter:
 * state D reading 1 with right neighbor 1.
 * Usage: anchor CODE STEPS
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
    long long cap = 1 << 23;
    buf = (uint8_t*)calloc(cap, 1); if (!buf) exit(3);
    allo = 0; ahi = cap; shift = 0; plo = 0; phi = 0;
}
static void ensure(long long lo, long long hi) {
    if (lo >= allo && hi <= ahi) return;
    long long nlo = allo, nhi = ahi, half;
    do { half = (ahi - allo) / 2; if (!half) half = 1;
        if (lo < nlo) nlo -= half; if (hi > nhi) nhi += half;
    } while (lo < nlo || hi > nhi);
    if (nhi - nlo > (1LL << 41)) { fprintf(stderr, "tape too large\n"); exit(3); }
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
static void check_anchor(long long step, long long head) {
    if (rd(head) != 1 || rd(head + 1) != 1) return;      /* candidate: inside/at block start */
    /* block 1^b */
    long long b = 0, p = head;
    while (p < phi && rd(p) == 1) { b++; p++; }
    /* alternating (10)^a prefix immediately left, then all-0 to left edge */
    long long a = 0, q = head;
    while (q - 2 >= plo && rd(q - 2) == 1 && rd(q - 1) == 0) { a++; q -= 2; }
    /* downward scan: everything left of pattern start must be 0 */
    for (long long r = q - 1; r >= plo; r--) if (rd(r) != 0) return;
    printf("ANCHOR %lld %lld %lld\n", step, a, b);
    fflush(stdout);
}
int main(int argc, char **argv) {
    if (argc < 3) { fprintf(stderr, "usage: %s CODE STEPS\n", argv[0]); return 2; }
    if (parse_code(argv[1])) return 2;
    long long max_steps = (long long)atof(argv[2]);
    tape_init(); wr(0, 0);
    long long head = 0; int state = 0; long long step = 0;
    while (step < max_steps) {
        if (state == 3 /*D*/) check_anchor(step, head);
        uint8_t sy = rd(head);
        Trans tr = T[state][sy];
        if (tr.next == 6) { printf("HALT %lld\n", step); return 0; }
        if (tr.write < 0 || tr.next < 0) { printf("UNDEF-HALT %lld %c %lld\n", step, 'A'+state, head); return 0; }
        wr(head, (uint8_t)tr.write);
        head += tr.move; state = tr.next; step++;
    }
    printf("DONE %lld\n", step);
    return 0;
}
