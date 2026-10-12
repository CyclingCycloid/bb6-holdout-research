/* 从任意 A(a,b) 宏构形启动的参考模拟器: 验证 (i) a=b -> 停机  (ii) 一步递推。
 * 初始构形: 纸带 0^inf 1 0^a 1^b 0^inf, 头在块右侧第一个空格, 状态 E。
 * 用法: macrocheck <CODE> <a> <b> <maxsteps>   打印 HALT step 或 DONE + 末态 RLE
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define OFF 200000
static unsigned char T[2 * OFF];
static int W[6][2], D[6][2], N[6][2];

int main(int argc, char **argv) {
    if (argc < 5) { fprintf(stderr, "usage: macrocheck CODE a b maxsteps\n"); return 2; }
    const char *c = argv[1];
    if (strlen(c) != 36) return 2;
    for (int i = 0; i < 12; i++) {
        const char *t = c + 3 * i;
        W[i/2][i%2] = t[0]-'0'; D[i/2][i%2] = (t[1]=='R')?1:-1;
        N[i/2][i%2] = (t[2]=='H')?-9 : t[2]-'A';
    }
    long long a0 = atoll(argv[2]), b0 = atoll(argv[3]), maxs = atoll(argv[4]);
    /* tape: 1 0^a 1^b, head at 1+a+b (first blank right of block), state E */
    long long pos = 0;
    T[pos++ + OFF] = 1;
    for (long long i = 0; i < a0; i++) T[pos++ + OFF] = 0;
    for (long long i = 0; i < b0; i++) T[pos++ + OFF] = 1;
    long long h = pos; int s = 4; /* E */
    for (long long st = 1; st <= maxs; st++) {
        int sy = T[h + OFF];
        if (N[s][sy] == -9) { printf("HALT %lld\n", st - 1); return 0; }
        if (N[s][sy] < 0 || W[s][sy] < 0) { printf("UNDEF %lld %c %lld\n", st - 1, 'A'+s, h); return 0; }
        T[h + OFF] = (unsigned char)W[s][sy];
        h += D[s][sy]; s = N[s][sy];
        if (st % 100000000L == 0) { printf("...%lld\n", st); fflush(stdout); }
    }
    /* DONE: print trimmed RLE + state */
    int lo = -OFF, hi = OFF - 1;
    for (int p = -OFF; p < OFF; p++) if (T[p+OFF]) { lo = p - 1; break; }
    for (int p = OFF - 1; p >= -OFF; p--) if (T[p+OFF]) { hi = p + 1; break; }
    printf("DONE %c h=%lld @%d ", 'A'+s, h, lo);
    printf("%d ", T[lo+OFF]);
    int cur = T[lo+OFF], cnt = 0;
    for (int p = lo; p <= hi; p++) {
        if (T[p+OFF] == cur) cnt++;
        else { printf("%d ", cnt); cur = T[p+OFF]; cnt = 1; }
    }
    printf("%d\n", cnt);
    return 0;
}
/* (anchor logging variant appended below in main2) */
