/* Dead-simple reference simulator: fixed tape array [-OFF, OFF), no cleverness. */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define OFF 4096
static unsigned char T[2 * OFF]; /* logical pos p -> T[p + OFF] */
static int W[6][2], D[6][2], N[6][2];

int main(int argc, char **argv) {
    if (argc < 3) { fprintf(stderr, "usage: ref CODE STEPS [FROM]\n"); return 2; }
    const char *c = argv[1];
    if (strlen(c) != 36) return 2;
    for (int i = 0; i < 12; i++) {
        const char *t = c + 3 * i;
        W[i/2][i%2] = t[0]-'0'; D[i/2][i%2] = (t[1]=='R')?1:-1;
        N[i/2][i%2] = (t[2]=='H')?-9 : t[2]-'A';
    }
    long long maxs = atoll(argv[2]);
    long long from = (argc >= 4) ? atoll(argv[3]) : 0;
    long long h = 0; int s = 0;
    for (long long st = 1; st <= maxs; st++) {
        int sy = T[h + OFF];
        if (N[s][sy] == -9) { printf("HALT %lld\n", st - 1); return 0; }
        if (N[s][sy] < 0 || W[s][sy] < 0) { printf("UNDEF %lld %c\n", st - 1, 'A'+s); return 0; }
        T[h + OFF] = (unsigned char)W[s][sy];
        h += D[s][sy]; s = N[s][sy];
        if (st >= from) {
            int lo = -OFF, hi = OFF - 1;
            for (int p = -OFF; p < OFF; p++) if (T[p+OFF]) { lo = p - 2; break; }
            for (int p = OFF - 1; p >= -OFF; p--) if (T[p+OFF]) { hi = p + 2; break; }
            printf("R %lld %c %lld @%d ", st, 'A'+s, h, lo);
            printf("%d ", T[lo+OFF]);
            int cur = T[lo+OFF], cnt = 0;
            for (int p = lo; p <= hi; p++) {
                if (T[p+OFF] == cur) cnt++;
                else { printf("%d ", cnt); cur = T[p+OFF]; cnt = 1; }
            }
            printf("%d\n", cnt);
        }
    }
    return 0;
}
