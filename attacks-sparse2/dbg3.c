#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
typedef struct { int write; int move; int next; } Trans;
static Trans T[6][2];
static uint8_t *buf = NULL;
static long long plo = 0, phi = 0, allo = 0, ahi = 0, shift = 0;
static void tape_init(void) {
    long long cap = 1 << 22;
    buf = (uint8_t*)calloc(cap, 1); if (!buf) exit(3);
    allo = 0; ahi = cap; shift = 0; plo = 0; phi = 0;
}
static void ensure(long long lo, long long hi) {
    if (lo >= allo && hi <= ahi) return;
    long long nlo = allo, nhi = ahi, half;
    while (lo < nlo || hi > nhi) {
        half = (ahi - allo) / 2; if (half == 0) half = 1;
        if (lo < nlo) nlo -= half; if (hi > nhi) nhi += half;
    }
    if (nhi - nlo > (1LL << 40)) { fprintf(stderr, "tape too large\n"); exit(3); }
    uint8_t *nb = (uint8_t*)calloc(nhi - nlo, 1); if (!nb) { fprintf(stderr, "alloc fail\n"); exit(3); }
    memcpy(nb + (allo - nlo), buf + (allo - shift), ahi - allo);
    free(buf); buf = nb; allo = nlo; ahi = nhi; shift = nlo;
}
static inline uint8_t rd(long long p) { return (p < plo || p >= phi) ? 0 : buf[p - shift]; }
static inline void wr(long long p, uint8_t v) {
    if (p < plo || p >= phi) { ensure(p, p + 1); if (p < plo) plo = p; if (p + 1 > phi) phi = p + 1; }
    buf[p - shift] = v;
}
int main(void){
    const char*c="1RB1LA1LC0RE1LF1LD0RB0LA1RC1RE---0LD";
    for(int i=0;i<12;i++){const char*t=c+3*i;Trans*tr=&T[i/2][i%2];
        tr->write=t[0]=='0'?0:1; tr->move=t[1]=='L'?-1:1; tr->next=(t[2]=='H')?6:t[2]-'A';}
    tape_init(); wr(0,0);
    long long head=0; int st=0; long long step=0;
    while(step<40){
        if(step>=25){
            printf("t=%lld st=%c h=%lld plo=%lld phi=%lld shift=%lld rd(h)=%d tape:",step,'A'+st,head,plo,phi,shift,rd(head));
            for(long long p=plo;p<phi;p++) putchar(rd(p)?'1':'.');
            printf("\n");
        }
        uint8_t sy=rd(head); Trans tr=T[st][sy];
        if(tr.next==6){printf("HALT %lld\n",step);return 0;}
        wr(head,tr.write); head+=tr.move; st=tr.next; step++;
    }
    return 0;
}
