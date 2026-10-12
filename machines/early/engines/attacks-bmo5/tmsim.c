// BMO 5 TM sanity simulator: 1RB0LD_1LC0RA_1RA1LB_1LA1LE_1RF0LC_---0RE
// halt = state F reading 0. Run N steps, report whether it halted.
// tape: buffer of size 2*cap, origin at index cap; grow (double) when head would leave.
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int main(int argc, char **argv) {
    unsigned long long N = (argc > 1) ? strtoull(argv[1], 0, 10) : 1000000000ULL;
    size_t cap = 1u << 20;
    unsigned char *tape;
    size_t origin, head;
    tape = calloc(2 * cap, 1); origin = cap; head = cap;
    if (!tape) { puts("alloc fail"); return 1; }
    int state = 0; // A..F
    unsigned long long steps = 0;
    static const int W[6][2] = {{1,0},{1,0},{1,1},{1,1},{1,0},{-1,0}};
    static const int M[6][2] = {{+1,-1},{-1,+1},{+1,-1},{-1,-1},{+1,-1},{0,+1}};
    static const int X[6][2] = {{1,3},{2,0},{0,1},{0,4},{5,2},{-1,4}};
    size_t lo = head, hi = head + 1;
    for (;;) {
        if (steps >= N) { printf("NO HALT in %llu steps (state=%c, visited=%zd)\n", steps, 'A'+state, (ssize_t)(hi-lo)); break; }
        int s = tape[head];
        int nx = X[state][s];
        if (nx < 0) { printf("HALT at step %llu (F read 0)\n", steps); return 0; }
        tape[head] = (unsigned char)W[state][s];
        long long tp = (long long)head + M[state][s];
        if (tp < 0 || (size_t)tp >= 2 * cap) {
            size_t ncap = cap * 2;
            unsigned char *nt = calloc(2 * ncap, 1);
            if (!nt) { puts("alloc fail"); return 1; }
            memcpy(nt + (ncap - origin), tape, 2 * cap);
            head = head + (ncap - origin);
            tp = (long long)head + M[state][s];
            free(tape); tape = nt; origin = ncap; cap = ncap;
        }
        head = (size_t)tp;
        if (head < lo) lo = head;
        if (head + 1 > hi) hi = head + 1;
        state = nx;
        steps++;
    }
    size_t ones = 0; for (size_t p = lo; p < hi; p++) ones += tape[p];
    printf("visited window=%zd ones=%zd head_offset=%zd\n", (ssize_t)(hi-lo), (ssize_t)ones, (ssize_t)(head-origin));
    return 0;
}
