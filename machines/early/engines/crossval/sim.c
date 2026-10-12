// Cross-validation TM simulator for BMO 1 = 1RB1RE_1LC0RA_0RD1LB_---1RC1LF1RE_0LB0LE
// Written from scratch (independent of the team's sim/*.c). Win32 / gcc.
//
// Modes:
//   sim run   <maxsteps>              blank tape; assert no halt; detect & verify D-anchors
//   sim grid  <seed>                  30 random (a,b) a in [0,60], b in [2,100] + 3 halt cases
//   sim b1    <a>                     start from f(a,1), report steps until halt
//   sim start <a> <b> <cap>           single run from anchor f(a,b)
//
// Anchor definition (formal-reduction.md 1.1): global tape exactly 0^inf (10)^a 1^b 0^inf,
// state D, head on the FIRST 1 of the 1^b block. Step number = number of executed transitions.
#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <string.h>

static int W[6][2], MV[6][2], NS[6][2]; // write, move(+1 R / -1 L), next state (-1 = halt)

static void parseMachine(const char *code) { // 36 chars, no underscores
    const char *p = code;
    for (int s = 0; s < 6; s++) for (int r = 0; r < 2; r++) {
        if (p[0] == '-') { W[s][r] = 0; MV[s][r] = 1; NS[s][r] = -1; }
        else { W[s][r] = p[0] - '0'; MV[s][r] = (p[1] == 'R') ? 1 : -1; NS[s][r] = p[2] - 'A'; }
        p += 3;
    }
}

#define CAPBITS 26
#define CAP (1LL << CAPBITS)
#define MID (CAP >> 1)
static uint8_t *T;

static long long fullChecks = 0, precheckHits = 0;

// Is the global tape exactly (10)^A 1^B (nonzero cells contiguous)?  Returns 1 and fills A,B,lo.
static int checkPattern(long long LOv, long long HIv, long long *Aout, long long *Bout, long long *loOut) {
    long long lo = -1, hi = -1;
    for (long long p = LOv; p <= HIv; p++) if (T[p]) { if (lo < 0) lo = p; hi = p; }
    if (lo < 0) return 0;
    long long a = 0, p = lo;
    while (p + 2 <= hi && T[p] == 1 && T[p + 1] == 0 && T[p + 2] == 1) { a++; p += 2; }
    long long b = 0;
    while (p <= hi && T[p] == 1) { b++; p++; }
    if (p != hi + 1) return 0;
    if (b < 1) return 0;
    *Aout = a; *Bout = b; *loOut = lo;
    return 1;
}

// try to detect an anchor at current (state, head). 1 = anchor found (fills a,b)
static int detectAnchor(int state, long long h, long long LOv, long long HIv, long long *a, long long *b) {
    if (state != 3) return 0;                       // state D
    if (T[h] != 1) return 0;
    if (T[h + 1] != 1) return 0;                    // b >= 2 (block starts with >=2 ones)
    if (!(h == LOv || T[h - 1] == 0)) return 0;     // cell left of block start is 0 or at left edge
    precheckHits++;
    long long A, B, lo;
    fullChecks++;
    if (!checkPattern(LOv, HIv, &A, &B, &lo)) return 0;
    if (h != lo + 2 * A) return 0;                  // head on first cell of 1^b block
    *a = A; *b = B;
    return 1;
}

static void predict(long long a, long long b, long long *pa, long long *pb, int *halt) {
    if (b == a + 2) { *halt = 1; return; }
    *halt = 0;
    if (b < a + 2) { *pa = a - b + 1; *pb = 4 * b - 1; }
    else           { *pa = 2 * a + 2; *pb = b - a - 1; }
}

typedef void (*AnchorCB)(long long step, long long a, long long b);

static long long g_haltCompleted = -1;

// Run the machine from a given config.
// Returns 0 = reached maxSteps; 1 = halted (g_haltCompleted = transitions completed before halt read);
// 2 = stopped at first detected anchor (only when stopOnAnchor).
// On return, *outStep/*outA/*outB = (first if stopOnAnchor else last) anchor detected (step>=1), or step -1.
static int simulate(long long maxSteps, int initState, long long initHead, AnchorCB cb, int stopOnAnchor,
                    long long *outStep, long long *outA, long long *outB,
                    long long initLO, long long initHI) { // scan bounds must cover initial nonblank block
    long long h = initHead, LOv = initLO, HIv = initHI;
    int state = initState;
    outStep[0] = -1; outA[0] = -1; outB[0] = -1;
    for (long long t = 1; t <= maxSteps; t++) {
        if (h < 2 || h > CAP - 3) { fprintf(stderr, "head out of bounds at step %lld\n", t); exit(3); }
        if (h < LOv) LOv = h; if (h > HIv) HIv = h;
        int sym = T[h];
        if (NS[state][sym] < 0) { g_haltCompleted = t - 1; return 1; } // halt read; transition not executed
        T[h] = (uint8_t)W[state][sym];
        h += MV[state][sym];
        state = NS[state][sym];
        // anchor check on the configuration AFTER t executed transitions
        long long aa, bb;
        if (detectAnchor(state, h, LOv, HIv, &aa, &bb)) {
            outStep[0] = t; outA[0] = aa; outB[0] = bb;
            if (cb) cb(t, aa, bb);
            if (stopOnAnchor) return 2;
        }
    }
    return 0;
}

// ---- run mode bookkeeping ----
static long long prevA, prevB, prevStep = -1, nTrans = 0, nTransOK = 0, nTransBad = 0, firstAnchorStep = -1;
static void runAnchorCB(long long step, long long a, long long b) {
    printf("ANCHOR %lld %lld %lld\n", step, a, b);
    if (firstAnchorStep < 0) { firstAnchorStep = step; if (a != 0 || b != 3 || step != 5) printf("  !! FIRST ANCHOR is f(%lld,%lld)@%lld, expected f(0,3)@5\n", a, b, step); }
    if (prevStep >= 0) {
        long long pa, pb; int halt;
        predict(prevA, prevB, &pa, &pb, &halt);
        nTrans++;
        if (halt || pa != a || pb != b) {
            nTransBad++;
            printf("  !! TRANSITION MISMATCH f(%lld,%lld)@%lld -> f(%lld,%lld)@%lld  predicted halt=%d (%lld,%lld)\n",
                   prevA, prevB, prevStep, a, b, step, halt, pa, pb);
        } else nTransOK++;
    }
    prevA = a; prevB = b; prevStep = step;
}

static void setupBlank(void) { memset(T, 0, CAP); }

// anchor tape (10)^a 1^b, state D, head on first cell of 1^b block
static long long setupAnchor(long long a, long long b) {
    memset(T, 0, CAP);
    for (long long i = 0; i < a; i++) { T[MID + 2 * i] = 1; }
    for (long long j = 0; j < b; j++) T[MID + 2 * a + j] = 1;
    return MID + 2 * a;
}

static uint64_t rngState;
static uint64_t xs64(void) {
    uint64_t x = rngState; x ^= x >> 12; x ^= x << 25; x ^= x >> 27;
    rngState = x; return x * 2685821657736338717ULL;
}

int main(int argc, char **argv) {
    parseMachine("1RB1RE1LC0RA0RD1LB---1RC1LF1RE0LB0LE");
    T = (uint8_t *)malloc(CAP);
    if (!T) { fprintf(stderr, "alloc failed\n"); return 2; }
    const char *mode = argc > 1 ? argv[1] : "";

    if (!strcmp(mode, "run")) {
        long long maxSteps = atoll(argv[2]);
        long long s, a, b;
        setupBlank();
        int r = simulate(maxSteps, 0, MID, runAnchorCB, 0, &s, &a, &b, MID, MID);
        if (r == 1) { printf("HALT: halt read after %lld completed transitions\n", g_haltCompleted); return 1; }
        printf("DONE %lld steps, no halt\n", maxSteps);
        printf("SUMMARY anchors=%lld transitionsOK=%lld transitionsBad=%lld firstAnchorStep=%lld\n",
               prevStep >= 0 ? nTrans + 1 : 0, nTransOK, nTransBad, firstAnchorStep);
        printf("STATS precheckHits=%lld fullChecks=%lld\n", precheckHits, fullChecks);
        return (nTransBad == 0) ? 0 : 1;
    }

    if (!strcmp(mode, "start")) {
        long long a = atoll(argv[2]), b = atoll(argv[3]), cap = atoll(argv[4]);
        long long h0 = setupAnchor(a, b);
        long long s, aa, bb;
        int r = simulate(cap, 3, h0, NULL, 1, &s, &aa, &bb, MID, MID + 2 * a + b - 1);
        long long pa, pb; int halt; predict(a, b, &pa, &pb, &halt);
        if (r == 1) {
            printf("f(%lld,%lld): HALT after %lld completed transitions; predicted halt=%d => %s\n",
                   a, b, g_haltCompleted, halt, halt ? "OK" : "UNEXPECTED");
            return halt ? 0 : 1;
        }
        int ok = (!halt && s > 0 && aa == pa && bb == pb);
        printf("f(%lld,%lld): next anchor f(%lld,%lld)@%lld; predicted f(%lld,%lld) halt=%d => %s\n",
               a, b, aa, bb, s, pa, pb, halt, ok ? "OK" : "MISMATCH");
        return ok ? 0 : 1;
    }

    if (!strcmp(mode, "b1")) {
        long long a = atoll(argv[2]);
        long long h0 = setupAnchor(a, 1);
        long long s, aa, bb;
        int r = simulate(1000000, 3, h0, NULL, 0, &s, &aa, &bb, MID, MID + 2 * a);
        if (r == 1) printf("f(%lld,1): halt read after %lld completed transitions (the would-be transition is #%lld)\n", a, g_haltCompleted, g_haltCompleted + 1);
        else printf("f(%lld,1): NO HALT in 1e6 steps!\n", a);
        return 0;
    }

    if (!strcmp(mode, "grid")) {
        rngState = (uint64_t)(argc > 2 ? atoll(argv[2]) : 12345) | 1;
        int fails = 0, halts = 0, oks = 0;
        long long cases[33][2]; int ncase = 0;
        for (int i = 0; i < 30; i++) {
            cases[ncase][0] = (long long)(xs64() % 61);        // a in [0,60]
            cases[ncase][1] = 2 + (long long)(xs64() % 99);    // b in [2,100]
            ncase++;
        }
        cases[ncase][0] = 0;  cases[ncase][1] = 2;   ncase++;   // b = a+2 halt cases
        cases[ncase][0] = 29; cases[ncase][1] = 31;  ncase++;
        cases[ncase][0] = 58; cases[ncase][1] = 60;  ncase++;
        for (int i = 0; i < ncase; i++) {
            long long a = cases[i][0], b = cases[i][1];
            long long h0 = setupAnchor(a, b);
            long long s, aa, bb;
            int r = simulate(200000000LL, 3, h0, NULL, 1, &s, &aa, &bb, MID, MID + 2 * a + b - 1);
            long long pa, pb; int halt; predict(a, b, &pa, &pb, &halt);
            if (r == 1) {
                halts++;
                if (!halt) { fails++; printf("GRID f(%lld,%lld): UNEXPECTED HALT after %lld steps\n", a, b, g_haltCompleted); }
                else printf("GRID f(%lld,%lld): halted after %lld completed transitions (predicted halt) OK\n", a, b, g_haltCompleted);
            } else {
                int ok = (!halt && s > 0 && aa == pa && bb == pb);
                if (ok) { oks++; printf("GRID f(%lld,%lld): -> f(%lld,%lld)@%lld (predicted) OK\n", a, b, aa, bb, s); }
                else { fails++; printf("GRID f(%lld,%lld): MISMATCH got f(%lld,%lld)@%lld predicted f(%lld,%lld) halt=%d\n", a, b, aa, bb, s, pa, pb, halt); }
            }
        }
        printf("GRID SUMMARY cases=%d ok=%d haltedAsPredicted=%d fails=%d\n", ncase, oks, halts, fails);
        return fails ? 1 : 0;
    }

    if (!strcmp(mode, "trace")) { // trace from anchor f(a,b): print state/head/tape each step
        long long a = atoll(argv[2]), b = atoll(argv[3]), ntr = atoll(argv[4]);
        long long h0 = setupAnchor(a, b);
        long long h = h0, LOv = h0, HIv = h0;
        int state = 3;
        static const char SN[7] = "ABCDEF";
        for (long long t = 0; t <= ntr; t++) {
            if (h < LOv) LOv = h; if (h > HIv) HIv = h;
            long long lo = -1, hi = -1;
            for (long long p = LOv; p <= HIv; p++) if (T[p]) { if (lo < 0) lo = p; hi = p; }
            printf("t=%lld state=%c headRelBlock=%lld tape=", t, SN[state], lo < 0 ? h : h - lo);
            if (lo < 0) printf("(blank)"); else for (long long p = lo; p <= hi; p++) putchar('0' + T[p]);
            printf("  headAbs=%lld\n", h);
            if (t == ntr) break;
            int sym = T[h];
            if (NS[state][sym] < 0) { printf("HALT\n"); break; }
            T[h] = (uint8_t)W[state][sym];
            h += MV[state][sym];
            state = NS[state][sym];
        }
        return 0;
    }

    fprintf(stderr, "usage: sim run|maxsteps | grid seed | b1 a | start a b cap\n");
    return 2;
}
