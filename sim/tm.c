/*
 * Generic 6-state 2-symbol Turing machine simulator (blank tape, start state A, head at 0).
 *
 * Usage: tm <CODE> <STEPS> <CHECKPOINT_EVERY>
 *   CODE: 36 chars = 12 transitions in order (A,0)(A,1)(B,0)(B,1)...(F,0)(F,1).
 *         Each transition is 3 chars: <write 0|1|-> <dir L|R|-> <next A..F|H|->
 *         '-' or '_' means undefined/unused (TNF). 'H' = halt state.
 *   STEPS: max number of steps (decimal, may use e-notation like 1e9 via atof).
 *   CHECKPOINT_EVERY: print a configuration RLE snapshot every this many steps.
 *
 * Output lines (stdout):
 *   "CP step state head first_bit rle_runs..."   at each checkpoint
 *   "HALT step state head first_bit rle_runs..." if halts
 *   "UNDEF step ..." if an undefined transition is reached (should not happen for TNF machines)
 *   "DONE steps_run state head ..." if max steps reached without halting
 * Exit code 0 normally, 2 on parse/undef error.
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>

typedef struct { int write; int move; int next; } Trans; /* next: 0..5 states, 6 halt, -1 undef */

static Trans T[6][2];

/* growable tape: physical array covers logical [plo, phi); outside = 0 */
static uint8_t *buf = NULL;
static long long plo = 0, phi = 0;      /* logical bounds covered */
static long long allo = 0, ahi = 0;     /* physical capacity as logical bounds */
static long long shift = 0;             /* physical = logical - shift */

static void tape_init(void) {
    long long cap = 1 << 20;
    buf = (uint8_t*)calloc(cap, 1);
    if (!buf) { fprintf(stderr, "alloc fail\n"); exit(3); }
    allo = 0; ahi = cap; shift = 0;
    plo = 0; phi = 0; /* nothing covered yet; read_cell returns 0 outside */
}

static void ensure(long long lo, long long hi) {
    if (lo >= allo && hi <= ahi) return;
    long long nlo = allo, nhi = ahi;
    while (lo < nlo) nlo -= (ahi - allo) / 2;
    while (hi > nhi) nhi += (ahi - allo) / 2;
    if (nhi - nlo > (1LL << 40)) { fprintf(stderr, "tape too large\n"); exit(3); }
    uint8_t *nb = (uint8_t*)calloc(nhi - nlo, 1);
    if (!nb) { fprintf(stderr, "alloc fail (%lld cells)\n", nhi - nlo); exit(3); }
    memcpy(nb + (allo - nlo), buf + (allo - shift), ahi - allo);
    free(buf); buf = nb; allo = nlo; ahi = nhi; shift = nlo;
}

static inline uint8_t read_cell(long long p) {
    if (p < plo || p >= phi) return 0;
    return buf[p - shift];
}
static inline void write_cell(long long p, uint8_t v) {
    if (p < plo || p >= phi) { ensure(p, p + 1); if (p < plo) plo = p; if (p + 1 > phi) phi = p + 1; }
    buf[p - shift] = v;
}

static int parse_code(const char *code) {
    if (strlen(code) != 36) { fprintf(stderr, "code must be 36 chars, got %zu\n", strlen(code)); return 2; }
    for (int i = 0; i < 12; i++) {
        const char *t = code + 3 * i;
        int st = i / 2, sy = i % 2;
        Trans *tr = &T[st][sy];
        char w = t[0], d = t[1], n = t[2];
        if (w == '0') tr->write = 0; else if (w == '1') tr->write = 1; else tr->write = -1;
        if (d == 'L') tr->move = -1; else if (d == 'R') tr->move = +1; else tr->move = 0;
        if (n == 'H' || n == 'Z') tr->next = 6;
        else if (n >= 'A' && n <= 'F') tr->next = n - 'A';
        else tr->next = -1;
        if ((tr->write < 0 || tr->move == 0 || tr->next < 0) &&
            !((w=='-'||w=='_') && (d=='-'||d=='_') && (n=='-'||n=='_'||n=='H'))) {
            /* allow 'H' with dummy write/dir? Standard is like "1RH". Be strict-ish but tolerate --- */
        }
    }
    return 0;
}

static void print_rle(long long head) {
    /* RLE over [plo-1, phi+1) treating outside as 0 */
    long long lo = plo - 1, hi = phi + 1;
    int first = read_cell(lo);
    printf("@%lld %d ", lo, first);
    long long count = 0; int cur = first; long long runs = 0;
    for (long long p = lo; p < hi; p++) {
        int v = read_cell(p);
        if (v == cur) count++;
        else { printf("%lld ", count); runs++; if (runs > 5000) { printf("...(truncated) "); break; } cur = v; count = 1; }
    }
    if (runs <= 5000) printf("%lld ", count);
    printf("| runs~%lld span=%lld", runs + 1, hi - lo);
}

/* Macro-state detector (argv[4] == "detect"):
 * Fires when state==E, head sits at the first 0 right after a 1^b block,
 * and the whole tape matches 0^k 1 0^a 1^b (k>=0, a>=1, b>=1).
 * Prints: "MACRO step a b k head". */
static int detect_mode = 0;
static long long last_macro_step = -1;
static long long snap_lo = -1, snap_hi = -1; /* print full config for steps in [snap_lo, snap_hi] */

static void snap(long long step, int state, long long head) {
    if (snap_lo < 0 || step < snap_lo || step > snap_hi) return;
    printf("S %lld %c %lld ", step, 'A' + state, head);
    print_rle(head);
    printf("\n");
}

static void try_detect(long long step, int state, long long head) {
    if (!detect_mode || state != 4 /* E */) return;
    /* Variant A: head at first 0 right of block */
    if (read_cell(head) == 0 && read_cell(head - 1) == 1) {
        long long p = head - 1; long long b = 0;
        while (p >= plo && read_cell(p) == 1) { b++; p--; }
        if (b >= 1) {
            long long a = 0;
            while (p >= plo && read_cell(p) == 0) { a++; p--; }
            if (a >= 1 && p >= plo && read_cell(p) == 1) {
                p--;
                while (p >= plo && read_cell(p) == 0) p--;
                if (p < plo)
                    printf("MACROA %lld %lld %lld\n", step, a, b);
            }
        }
    }
    /* Variant B: head on the last 1 of the block (right neighbor 0) */
    if (read_cell(head) == 1 && read_cell(head + 1) == 0) {
        long long b = 1; long long p = head - 1;
        while (p >= plo && read_cell(p) == 1) { b++; p--; }
        long long a = 0;
        while (p >= plo && read_cell(p) == 0) { a++; p--; }
        if (a >= 1 && p >= plo && read_cell(p) == 1) {
            p--;
            while (p >= plo && read_cell(p) == 0) p--;
            if (p < plo)
                printf("MACROB %lld %lld %lld\n", step, a, b);
        }
    }
    fflush(stdout);
}

int main(int argc, char **argv) {
    if (argc < 4) { fprintf(stderr, "usage: %s CODE STEPS CHECKPOINT_EVERY [detect]\n", argv[0]); return 2; }
    if (parse_code(argv[1])) return 2;
    long long max_steps = (long long)atof(argv[2]);
    long long cp = (long long)atof(argv[3]);
    if (argc >= 5 && strcmp(argv[4], "detect") == 0) detect_mode = 1;
    if (argc >= 5 && strncmp(argv[4], "snap:", 5) == 0) sscanf(argv[4] + 5, "%lld:%lld", &snap_lo, &snap_hi);
    tape_init();
    write_cell(0, 0); /* touch origin so plo/phi sane */
    long long head = 0; int state = 0; long long step = 0;
    while (step < max_steps) {
        if (cp > 0 && step > 0 && step % cp == 0) {
            printf("CP %lld %c %lld ", step, 'A' + state, head);
            print_rle(head); printf("\n"); fflush(stdout);
        }
        uint8_t sy = read_cell(head);
        Trans tr = T[state][sy];
        if (tr.next == 6) { printf("HALT %lld %c %lld ", step, 'A' + state, head); print_rle(head); printf("\n"); return 0; }
        if (tr.write < 0 || tr.next < 0) { printf("UNDEF %lld %c %lld\n", step, 'A' + state, head); return 2; }
        write_cell(head, (uint8_t)tr.write);
        head += tr.move;
        state = tr.next;
        step++;
        if (detect_mode) try_detect(step, state, head);
        snap(step, state, head);
    }
    printf("DONE %lld %c %lld ", step, 'A' + state, head); print_rle(head); printf("\n");
    return 0;
}
