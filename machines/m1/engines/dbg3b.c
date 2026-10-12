#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
typedef struct { int write; int move; int next; } Trans;
static Trans T[6][2];
static uint8_t *buf = NULL;
static long long plo = 0, phi = 0, allo = 0, ahi = 0, shift = 0;
static void tape_init(void) { long long cap = 1 << 22; buf = (uint8_t*)calloc(cap,1); allo=0; ahi=cap; shift=0; plo=0; phi=0; }
static void ensure(long long lo, long long hi) {
    if (lo >= allo && hi <= ahi) return;
    long long nlo = allo, nhi = ahi, half;
    while (lo < nlo || hi > nhi) { half=(ahi-allo)/2; if(!half)half=1; if(lo<nlo)nlo-=half; if(hi>nhi)nhi+=half; }
    uint8_t *nb=(uint8_t*)calloc(nhi-nlo,1);
    memcpy(nb+(allo-nlo), buf+(allo-shift), ahi-allo);
    free(buf); buf=nb; allo=nlo; ahi=nhi; shift=nlo;
}
static inline uint8_t rd(long long p) { return (p<plo||p>=phi)?0:buf[p-shift]; }
static inline void wr(long long p, uint8_t v) {
    if (p<plo||p>=phi) { ensure(p,p+1); if(p<plo)plo=p; if(p+1>phi)phi=p+1; }
    buf[p-shift]=v;
}
static int rle_scan(long long *runs, long long *gaps, int max) {
    long long p, first=-1, last=-1;
    for (p=plo;p<phi;p++) if (rd(p)) { first=p; break; }
    if (first<0) return 0;
    for (p=phi-1;p>=plo;p--) if (rd(p)) { last=p; break; }
    int n=0; int inone=0;
    for (p=first;p<=last;p++) {
        if (rd(p)) { if(!inone){ if(n>=max)return -1; runs[n]=0; gaps[n]=0; n++; } inone=1; runs[n-1]++; }
        else { inone=0; if(n>=1) gaps[n-1]++; }
    }
    return n;
}
int main(void){
    const char*c="1RB1LA1LC0RE1LF1LD0RB0LA1RC1RE---0LD";
    for(int i=0;i<12;i++){const char*t=c+3*i;Trans*tr=&T[i/2][i%2];
        tr->write=t[0]=='0'?0:1; tr->move=t[1]=='L'?-1:1; tr->next=(t[2]=='H')?6:t[2]-'A';}
    tape_init(); wr(0,0);
    long long head=0; int st=0; long long step=0;
    long long runs[64], gaps[64];
    while(step<70){
        if (st==3 && rd(head)==0) {
            int n = rle_scan(runs,gaps,64);
            int any1=0; for (long long q=head+1;q<phi;q++) if(rd(q)){any1=1;break;}
            printf("t=%lld h=%lld plo=%lld phi=%lld n=%d islast=%d first1=%d\n",
                step,head,plo,phi,n,!any1, rd(plo));
        }
        uint8_t sy=rd(head); Trans tr=T[st][sy];
        if(tr.next==6){printf("HALT %lld\n",step);return 0;}
        wr(head,tr.write); head+=tr.move; st=tr.next; step++;
    }
    return 0;
}
