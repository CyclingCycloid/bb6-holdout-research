/* 从锚点构形 f(a,b) = (10)^a D> 1^b (D 在块首) 启动, 验证 f-递推的归纳步:
 *   b < a+2  -> 到达锚点 (a-b+1, 4b-1)
 *   b > a+2  -> 到达锚点 (2a+2, b-a-1)
 *   b == a+2 -> 停机 (UNDEF D/0)
 * 模式: anchorstart CODE a b maxsteps          单点
 *       anchorstart CODE grid Amax Bmax maxsteps  网格
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define OFF 400000
static unsigned char T[2 * OFF];
static int W[6][2], D[6][2], N[6][2];

/* 返回: 0=继续, 1=halt(UNDEF), 2=超界; *aa,*bb=若为锚点则填参数 */
static int step1_anchor(long long *aa, long long *bb) { return 0; }

static long long run_from(long long a0, long long b0, long long maxs,
                          int *result, long long *ra, long long *rb, long long *halt_step) {
    /* 构带: (10)^a 1^b, D 在块首 */
    memset(T, 0, sizeof(T));
    long long pos = 0;
    for (long long i = 0; i < a0; i++) { T[pos++ + OFF] = 1; T[pos++ + OFF] = 0; }
    for (long long i = 0; i < b0; i++) T[pos++ + OFF] = 1;
    long long h = pos - b0; int s = 3; /* D on block start */
    for (long long st = 1; st <= maxs; st++) {
        int sy = T[h + OFF];
        if (N[s][sy] == -9) { *result = 1; *halt_step = st - 1; return st - 1; }
        if (N[s][sy] < 0 || W[s][sy] < 0) { *result = 1; *halt_step = st - 1; return st - 1; }
        T[h + OFF] = (unsigned char)W[s][sy];
        h += D[s][sy]; s = N[s][sy];
        if (s == 3 && T[h + OFF] == 1 && T[h + 1 + OFF] == 1) {
            /* candidate anchor: count block, walk (10) prefix, left clean */
            long long b = 0, p = h;
            while (p < OFF && T[p + OFF] == 1) { b++; p++; }
            long long a = 0, q = h;
            while (q - 2 >= -OFF && T[q - 2 + OFF] == 1 && T[q - 1 + OFF] == 0) { a++; q -= 2; }
            long long okLeft = 1;
            for (long long r = q - 1; r >= -OFF; r--) if (T[r + OFF] != 0) { okLeft = 0; break; }
            if (okLeft) { *result = 0; *ra = a; *rb = b; return st; }
        }
        if (h <= -OFF + 8 || h >= OFF - 8) { *result = 2; return st; }
    }
    *result = 3; return maxs; /* timeout */
}

int main(int argc, char **argv) {
    if (argc < 5) { fprintf(stderr, "usage: anchorstart CODE a b maxsteps | CODE grid Amax Bmax maxsteps\n"); return 2; }
    const char *c = argv[1];
    if (strlen(c) != 36) return 2;
    for (int i = 0; i < 12; i++) {
        const char *t = c + 3 * i;
        W[i/2][i%2] = t[0]-'0'; D[i/2][i%2] = (t[1]=='R')?1:-1;
        N[i/2][i%2] = (t[2]=='H')?-9 : t[2]-'A';
    }
    if (strcmp(argv[2], "grid") == 0) {
        long long Amax = atoll(argv[3]), Bmax = atoll(argv[4]), maxs = atoll(argv[5]);
        long long ncase = 0, okc = 0, haltc = 0, badc = 0, to = 0;
        for (long long a = 0; a <= Amax; a++)
            for (long long b = 1; b <= Bmax; b++) {
                int result; long long ra = 0, rb = 0, hs = 0;
                long long st = run_from(a, b, maxs, &result, &ra, &rb, &hs);
                ncase++;
                if (result == 1) {
                    if (b == a + 2) { haltc++; }
                    else { badc++; if (badc <= 10) printf("BAD-HALT f(%lld,%lld) halted@%lld (expected continue)\n", a, b, hs); }
                } else if (result == 0) {
                    long long ea, eb;
                    if (b < a + 2) { ea = a - b + 1; eb = 4 * b - 1; }
                    else { ea = 2 * a + 2; eb = b - a - 1; }
                    if (b == a + 2) { badc++; if (badc <= 10) printf("BAD-CONT f(%lld,%lld) reached anchor (%lld,%lld) but expected halt\n", a, b, ra, rb); }
                    else if (ra == ea && rb == eb) okc++;
                    else { badc++; if (badc <= 10) printf("BAD-RULE f(%lld,%lld) -> (%lld,%lld), expected (%lld,%lld)\n", a, b, ra, rb, ea, eb); }
                } else { to++; if (to <= 10) printf("TIMEOUT/OOB f(%lld,%lld) result=%d\n", a, b, result); }
            }
        printf("GRID DONE: cases=%lld ok=%lld halt-expected=%lld bad=%lld timeout=%lld\n", ncase, okc, haltc, badc, to);
        return badc ? 1 : 0;
    } else {
        long long a = atoll(argv[2]), b = atoll(argv[3]), maxs = atoll(argv[4]);
        int result; long long ra = 0, rb = 0, hs = 0;
        long long st = run_from(a, b, maxs, &result, &ra, &rb, &hs);
        if (result == 1) printf("f(%lld,%lld): HALT at step %lld (expected %s)\n", a, b, hs, b == a + 2 ? "HALT" : "CONTINUE");
        else if (result == 0) {
            long long ea, eb;
            if (b < a + 2) { ea = a - b + 1; eb = 4 * b - 1; } else { ea = 2 * a + 2; eb = b - a - 1; }
            printf("f(%lld,%lld): anchor (%lld,%lld)@%lld expected (%lld,%lld) %s\n", a, b, ra, rb, st, ea, eb, (ra == ea && rb == eb) ? "OK" : "MISMATCH");
        } else printf("f(%lld,%lld): result=%d (timeout/oob)\n", a, b, result);
        return 0;
    }
}
