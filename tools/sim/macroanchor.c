/* 从任意 A(a,b) 宏构形启动 + f-锚点日志 (D 态在 (10)^a 1^b 的块首) */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define OFF 400000
static unsigned char T[2 * OFF];
static int W[6][2], D[6][2], N[6][2];

static void anchorInfo(long long step, long long h) {
    if (T[h + OFF] != 1 || T[h + 1 + OFF] != 1) return;
    long long b = 0, p = h;
    while (p < OFF && T[p + OFF] == 1) { b++; p++; }
    long long a = 0, q = h;
    while (q - 2 >= -OFF && T[q - 2 + OFF] == 1 && T[q - 1 + OFF] == 0) { a++; q -= 2; }
    for (long long r = q - 1; r >= -OFF; r--) if (T[r + OFF] != 0) return;
    printf("ANCHOR %lld %lld %lld\n", step, a, b); fflush(stdout);
}

int main(int argc, char **argv) {
    if (argc < 5) { fprintf(stderr, "usage: macroanchor CODE a b maxsteps\n"); return 2; }
    const char *c = argv[1];
    if (strlen(c) != 36) return 2;
    for (int i = 0; i < 12; i++) {
        const char *t = c + 3 * i;
        W[i/2][i%2] = t[0]-'0'; D[i/2][i%2] = (t[1]=='R')?1:-1;
        N[i/2][i%2] = (t[2]=='H')?-9 : t[2]-'A';
    }
    long long a0 = atoll(argv[2]), b0 = atoll(argv[3]), maxs = atoll(argv[4]);
    long long pos = 0;
    T[pos++ + OFF] = 1;
    for (long long i = 0; i < a0; i++) T[pos++ + OFF] = 0;
    for (long long i = 0; i < b0; i++) T[pos++ + OFF] = 1;
    long long h = pos; int s = 4; /* E */
    printf("START A(%lld,%lld) head=%lld state=E\n", a0, b0, h);
    for (long long st = 1; st <= maxs; st++) {
        int sy = T[h + OFF];
        if (N[s][sy] == -9) { printf("HALT %lld\n", st - 1); return 0; }
        if (N[s][sy] < 0 || W[s][sy] < 0) { printf("UNDEF %lld %c %lld\n", st - 1, 'A'+s, h); return 0; }
        T[h + OFF] = (unsigned char)W[s][sy];
        h += D[s][sy]; s = N[s][sy];
        if (s == 3) anchorInfo(st, h);
    }
    printf("DONE\n");
    return 0;
}
