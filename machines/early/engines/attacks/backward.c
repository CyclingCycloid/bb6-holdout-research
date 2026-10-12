// P4: Backward BFS from the halt set of the BMO1 macro recurrence.
// Halt set: diagonal {(z,z): z>=1}. Inverse branches (exact, verified by hand):
//   T1^{-1}(a',b') = (a' + (b'-2)/4, (b'-2)/4)   valid iff b' ≡ 2 (mod 4), b' >= 6, a' >= 1
//      (branch condition a>b at preimage: a'+(b'-2)/4 > (b'-2)/4  <=>  a' > 0 : automatic)
//   T2^{-1}(a',b') = ((a'-1)/2, b' + (a'-1)/2)   valid iff a' odd, a' >= 1, b' >= 1
//      (branch condition a<b at preimage: (a'-1)/2 < b'+(a'-1)/2  <=>  b' > 0 : automatic)
// We BFS backwards with caps; every node found is a state that provably HALTS
// (it reaches the diagonal by construction). We look for (1,2), census the halt
// set in boxes, and track closest-to-diagonal points ("fractal approach").
#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <string.h>

typedef uint64_t u64;
#define VALCAP 0xFFFFFFFFULL        // values must be <= this to be stored (fits key)
#define HT_BITS 25
#define HT_SIZE (1ULL << HT_BITS)
#define NODE_CAP 50000000ULL        // max total stored nodes

static u64 *ht;                      // hash table of keys, 0 = empty (key 0 impossible: a,b>=1)
static u64 nodes = 0;

static inline u64 key(u64 a, u64 b) { return (a << 32) | b; }

static int insert(u64 a, u64 b) {    // returns 1 if newly inserted
    if (a > VALCAP || b > VALCAP) return 0;
    u64 k = key(a, b);
    u64 h = (k * 0x9E3779B97F4A7C15ULL) >> (64 - HT_BITS);
    while (ht[h]) {
        if (ht[h] == k) return 0;
        h = (h + 1) & (HT_SIZE - 1);
    }
    if (nodes >= NODE_CAP) return 0;
    ht[h] = k; nodes++;
    return 1;
}

typedef struct { u64 a, b; } Pair;

int main(int argc, char **argv) {
    u64 seedZ = argc > 1 ? strtoull(argv[1], 0, 10) : 4000000ULL;   // diagonal seeds z <= seedZ
    u64 depth = argc > 2 ? strtoull(argv[2], 0, 10) : 44;
    ht = calloc(HT_SIZE, sizeof(u64));
    if (!ht) { fprintf(stderr, "alloc fail\n"); return 1; }

    Pair *cur = malloc(sizeof(Pair) * 8000000ULL);
    Pair *nxt = malloc(sizeof(Pair) * 8000000ULL);
    if (!cur || !nxt) { fprintf(stderr, "alloc fail\n"); return 1; }
    u64 ncur = 0;

    // layer 0: diagonal seeds
    for (u64 z = 1; z <= seedZ; z++) { insert(z, z); cur[ncur].a = z; cur[ncur].b = z; ncur++; }
    fprintf(stderr, "layer 0: %llu seeds\n", (unsigned long long)ncur);

    int found12 = 0;
    u64 totalNew = 0;
    for (u64 d = 1; d <= depth; d++) {
        u64 nnxt = 0, newc = 0;
        for (u64 i = 0; i < ncur; i++) {
            u64 a = cur[i].a, b = cur[i].b;
            // T1^{-1}
            if ((b & 3) == 2 && b >= 6 && a >= 1 && a <= VALCAP && b <= VALCAP) {
                u64 y = (b - 2) >> 2, x = a + y;
                if (insert(x, y)) {
                    if (x == 1 && y == 2) { found12 = 1; fprintf(stderr, ">>> FOUND (1,2) at depth %llu!\n", (unsigned long long)d); }
                    if (nnxt < 8000000ULL) { nxt[nnxt].a = x; nxt[nnxt].b = y; nnxt++; }
                    newc++;
                }
            }
            // T2^{-1}
            if ((a & 1) == 1 && a >= 1 && b >= 1 && a <= VALCAP && b <= VALCAP) {
                u64 x = (a - 1) >> 1, y = b + x;
                if (insert(x, y)) {
                    if (x == 1 && y == 2) { found12 = 1; fprintf(stderr, ">>> FOUND (1,2) at depth %llu!\n", (unsigned long long)d); }
                    if (nnxt < 8000000ULL) { nxt[nnxt].a = x; nxt[nnxt].b = y; nnxt++; }
                    newc++;
                }
            }
            if (nodes >= NODE_CAP) { fprintf(stderr, "node cap hit at depth %llu\n", (unsigned long long)d); goto done; }
        }
        totalNew += newc;
        fprintf(stderr, "depth %llu: new=%llu frontier=%llu total=%llu\n",
                (unsigned long long)d, (unsigned long long)newc, (unsigned long long)nnxt, (unsigned long long)nodes);
        Pair *t = cur; cur = nxt; nxt = t; ncur = nnxt;
        if (!ncur) break;
    }
done:
    fprintf(stderr, "total nodes=%llu  found(1,2)=%d\n", (unsigned long long)nodes, found12);

    // Pass over hash table: census in boxes, closest-to-diagonal points
    u64 box6 = 0, box7 = 0, box8 = 0, box9 = 0;
    u64 mindiff = ~0ULL; u64 mda = 0, mdb = 0;
    u64 mindiff8 = ~0ULL, mda8 = 0, mdb8 = 0; // closest to diagonal among a,b<=1e8
    for (u64 h = 0; h < HT_SIZE; h++) {
        if (!ht[h]) continue;
        u64 a = ht[h] >> 32, b = ht[h] & 0xFFFFFFFFULL;
        if (a <= 1000000ULL && b <= 1000000ULL) box6++;
        if (a <= 10000000ULL && b <= 10000000ULL) box7++;
        if (a <= 100000000ULL && b <= 100000000ULL) box8++;
        if (a <= 1000000000ULL && b <= 1000000000ULL) box9++;
        u64 dif = a > b ? a - b : b - a;
        if (a != b) {
            if (dif < mindiff) { mindiff = dif; mda = a; mdb = b; }
            if (a <= 100000000ULL && b <= 100000000ULL && dif < mindiff8) { mindiff8 = dif; mda8 = a; mdb8 = b; }
        }
    }
    printf("CENSUS halting states (lower bound, seeds z<=%llu, depth<=%llu):\n", (unsigned long long)seedZ, (unsigned long long)depth);
    printf("  total stored        : %llu\n", (unsigned long long)nodes);
    printf("  in [1,1e6]^2        : %llu  (density %.3e)\n", (unsigned long long)box6, box6 / 1.0e12);
    printf("  in [1,1e7]^2        : %llu  (density %.3e)\n", (unsigned long long)box7, box7 / 1.0e14);
    printf("  in [1,1e8]^2        : %llu  (density %.3e)\n", (unsigned long long)box8, box8 / 1.0e16);
    printf("  in [1,1e9]^2        : %llu  (density %.3e)\n", (unsigned long long)box9, box9 / 1.0e18);
    printf("  min |a-b| overall   : %llu at (%llu,%llu) slope a/b = %.6f\n",
           (unsigned long long)mindiff, (unsigned long long)mda, (unsigned long long)mdb, mda / (double)mdb);
    printf("  min |a-b| in 1e8 box: %llu at (%llu,%llu) slope a/b = %.6f\n",
           (unsigned long long)mindiff8, (unsigned long long)mda8, (unsigned long long)mdb8, mda8 / (double)mdb8);
    printf("  found (1,2): %d\n", found12);
    return 0;
}
