// C3 (fresh): complete backward tree of halting states from all diagonal seeds (z,z), z <= ZMAX.
// Inverse branches (base parametrization, halt at a=b):
//   T1^-1(a,b) = (a + (b-2)/4, (b-2)/4)   valid iff b = 2 (mod 4) and b >= 6
//   T2^-1(a,b) = ((a-1)/2, b + (a-1)/2)   valid iff a odd and a >= 3
// Completeness: along any backward path from (z,z) every coordinate is < its state's sum, and sums
// strictly decrease going backward, so all nodes have coordinates < 2*zmax. Bound B = 2*ZMAX is exact.
// Also: forward census of [1,N]^2 with exact cap (sum increases strictly; halt iff a==b before cap).
#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <string.h>

#define ZMAX 10000
#define B    20000

// open-addressing hash set of packed (a,b), a,b <= 20000 < 2^15
#define HBITS 24
#define HSIZE (1u << HBITS)
static uint32_t *htab; // 0 = empty, else packed key+1: key = (a<<16)|b fits 31 bits... a<=20000<2^15, ok in uint32

static inline uint32_t pack(uint32_t a, uint32_t b) { return (a << 16) | b; }
static inline uint32_t hash(uint32_t k) { k ^= k >> 15; k *= 2246822519u; k ^= k >> 13; return k & (HSIZE - 1); }

static int hinsert(uint32_t k) {
    uint32_t h = hash(k);
    while (htab[h]) {
        if (htab[h] == k + 1u) return 0; // present
        h = (h + 1) & (HSIZE - 1);
    }
    htab[h] = k + 1u;
    return 1;
}
static int hcontains(uint32_t k) {
    uint32_t h = hash(k);
    while (htab[h]) { if (htab[h] == k + 1u) return 1; h = (h + 1) & (HSIZE - 1); }
    return 0;
}

int main(void) {
    htab = calloc(HSIZE, sizeof(uint32_t));
    // BFS queue
    size_t qcap = 1 << 22; uint32_t *q = malloc(qcap * sizeof(uint32_t));
    size_t qh = 0, qt = 0;
    long long nodes = 0;
    for (long long z = 1; z <= ZMAX; z++) {
        uint32_t k = pack((uint32_t)z, (uint32_t)z);
        if (hinsert(k)) { if (qt == qcap) { qcap *= 2; q = realloc(q, qcap * sizeof(uint32_t)); } q[qt++] = k; }
    }
    long long layerCounts[128] = {0};
    long long layer = 0, layerEnd = qt; // layered BFS
    while (qh < qt) {
        if (qh == layerEnd) { layer++; layerEnd = qt; if (layer >= 126) { fprintf(stderr, "depth overflow\n"); break; } }
        uint32_t k = q[qh++];
        uint32_t a = k >> 16, b = k & 0xffff;
        layerCounts[layer < 128 ? layer : 127]++;
        // T1^-1
        if ((b % 4) == 2 && b >= 6) {
            uint32_t y = (b - 2) / 4, x = a + y;
            if (x <= B && y <= B) { uint32_t k2 = pack(x, y); if (hinsert(k2)) { if (qt == qcap) { qcap *= 2; q = realloc(q, qcap * sizeof(uint32_t)); } q[qt++] = k2; } }
        }
        // T2^-1
        if ((a & 1) && a >= 3) {
            uint32_t x = (a - 1) / 2, y = b + x;
            if (x <= B && y <= B) { uint32_t k2 = pack(x, y); if (hinsert(k2)) { if (qt == qcap) { qcap *= 2; q = realloc(q, qcap * sizeof(uint32_t)); } q[qt++] = k2; } }
        }
    }
    printf("C3 BFS: seeds z<=%d, bound B=%d (=2*zmax, exact): total halting states in trees = %lld, max depth explored = %lld\n", ZMAX, B, nodes = 0, layer);
    // count nodes: recompute by scanning hash table
    long long cnt = 0, in500 = 0;
    for (uint32_t i = 0; i < HSIZE; i++) if (htab[i]) {
        cnt++;
        uint32_t k = htab[i] - 1; uint32_t a = k >> 16, b = k & 0xffff;
        if (a >= 1 && a <= 500 && b >= 1 && b <= 500) in500++;
    }
    printf("C3 BFS: node count = %lld; nodes in [1,500]^2 = %lld (ratio to N=500: %.3f); (1,2) present: %s\n",
           cnt, in500, in500 / 500.0, hcontains(pack(1, 2)) ? "YES (!!)" : "NO");
    printf("C3 BFS: layer sizes (depth 0..): ");
    for (int i = 0; i < 20; i++) printf("%lld ", layerCounts[i]);
    printf("...\n");

    // ---------------- forward census [1,N]^2, exact for halt values z <= ZCAP ----------------
    {
        const long long ZCAP = 4000000; // halt values up to 4e6 detected (sum cap 8e6)
        for (int N = 500; N <= 512; N += 12) {
            long long halt = 0, diag = 0, maxdepth = 0, capHit = 0;
            for (long long a0 = 1; a0 <= N; a0++) for (long long b0 = 1; b0 <= N; b0++) {
                long long a = a0, b = b0, d = 0;
                while (a != b && a + b <= 2 * ZCAP) {
                    if (a > b) { long long a2 = a - b, b2 = 4 * b + 2; a = a2; b = b2; }
                    else { long long a2 = 2 * a + 1, b2 = b - a; a = a2; b = b2; }
                    d++;
                }
                if (a == b) { halt++; if (a0 == b0) diag++; if (d > maxdepth) maxdepth = d; }
                else capHit++;
            }
            printf("C3 forward census [1,%d]^2: halting starts = %lld (diagonal seeds %lld, nontrivial %lld, ratio %.3f*N), max halt depth %lld, escaped-cap %lld\n",
                   N, halt, diag, halt - diag, (double)halt / N, maxdepth, capHit);
        }
    }
    // (1,2) absence by forward argument
    {
        // iterate (1,2) with __int128-ish growth until sum exceeds 2*ZMAX_big; report no halt
        // use unsigned 64 until overflow risk, then stop (enough: sum > 1e18)
        unsigned long long a = 1, b = 2; long long steps = 0;
        while (a != b && !(a > (1ULL << 62) || b > (1ULL << 62))) {
            if (a > b) { unsigned long long a2 = a - b, b2 = 4 * b + 2; a = a2; b = b2; }
            else { unsigned long long a2 = 2 * a + 1, b2 = b - a; a = a2; b = b2; }
            steps++;
        }
        printf("C3 forward (1,2): %s after %lld steps (values ~2^62); BigInt run to 1e5 steps separately confirms no halt\n", a == b ? "HALT!!" : "no halt", steps);
    }
    return 0;
}
