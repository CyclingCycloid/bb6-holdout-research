/* escan2.c — generic (state, read-0) event scanner with RLE structure for any BB(6) code.
 * usage: escan2 CODE STATEMASK N MAXLOG   (STATEMASK = 6-bit mask of states, e.g. 8 = D only)
 * logs: EV step st=<S> off.<pos-in-zerorun> w=<zerorun width (clamped)> n=<runs> r=... g=... */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
typedef struct { int write; int move; int next; } Trans;
static Trans T[6][2];
static uint8_t *buf = NULL;
static long long plo=0, phi=0, allo=0, ahi=0, shift=0;
static void tape_init(void){ long long cap=1<<22; buf=(uint8_t*)calloc(cap,1); allo=0; ahi=cap; shift=0; plo=0; phi=0; }
static void ensure(long long lo, long long hi){
    if(lo>=allo&&hi<=ahi) return;
    long long nlo=allo,nhi=ahi,half;
    while(lo<nlo||hi>nhi){ half=(ahi-allo)/2; if(!half)half=1; if(lo<nlo)nlo-=half; if(hi>nhi)nhi+=half; }
    uint8_t *nb=(uint8_t*)calloc(nhi-nlo,1);
    memcpy(nb+(allo-nlo), buf+(allo-shift), ahi-allo);
    free(buf); buf=nb; allo=nlo; ahi=nhi; shift=nlo;
}
static inline uint8_t rd(long long p){ return (p<plo||p>=phi)?0:buf[p-shift]; }
static inline void wr(long long p, uint8_t v){ if(p<plo||p>=phi){ ensure(p,p+1); if(p<plo)plo=p; if(p+1>phi)phi=p+1; } buf[p-shift]=v; }
static int parse_code(const char*c){
    if(strlen(c)!=36) return 2;
    for(int i=0;i<12;i++){ const char*t=c+3*i; Trans*tr=&T[i/2][i%2];
        if(t[0]=='-'){ tr->write=0; tr->move=0; tr->next=6; continue; }
        tr->write=t[0]-'0'; tr->move=(t[1]=='L')?-1:1; tr->next=t[2]-'A'; }
    return 0;
}
static int rle_scan(long long*runs,long long*gaps,int max){
    long long p,first=0,last=0; int found=0;
    for(p=plo;p<phi;p++) if(rd(p)){first=p;found=1;break;}
    if(!found) return 0;
    for(p=phi-1;p>=plo;p--) if(rd(p)){last=p;break;}
    int n=0; int inone=0;
    for(p=first;p<=last;p++){
        if(rd(p)){ if(!inone){ if(n>=max)return -1; runs[n]=0;gaps[n]=0;n++; } inone=1; runs[n-1]++; }
        else { inone=0; if(n>=1)gaps[n-1]++; }
    }
    return n;
}
static long long gleft(long long p){ long long q=p; while(q-1>=plo&&rd(q-1)==0)q--; return q; }
static long long gright(long long p){ long long q=p; while(q+1<phi&&rd(q+1)==0)q++; return q; }
int main(int argc,char**argv){
    if(argc<5){fprintf(stderr,"usage: escan2 CODE MASK N MAXLOG\n");return 2;}
    if(parse_code(argv[1]))return 2;
    int mask=atoi(argv[2]); long long N=atoll(argv[3]); long long maxlog=atoll(argv[4]);
    tape_init(); wr(0,0);
    long long head=0; int st=0; long long step=0, logged=0, total=0;
    long long runs[64],gaps[64];
    while(step<N){
        if((mask>>st)&1 && rd(head)==0){
            total++;
            if(logged<maxlog){
                int n=rle_scan(runs,gaps,64);
                long long gl=gleft(head), gr=gright(head);
                printf("EV %lld st=%c L%d R%d w=%lld n=%d", step,'A'+st, rd(head-1), rd(head+1), gr-gl+1, n);
                if(n>0){ for(int i=0;i<n;i++)printf(" %lld",runs[i]); printf(" g:"); for(int i=0;i<n-1;i++)printf(" %lld",gaps[i]); }
                printf("\n"); logged++;
            }
        }
        uint8_t sy=rd(head); Trans tr=T[st][sy];
        if(tr.next==6){ printf("HALT %lld\n",step); return 0; }
        wr(head,tr.write); head+=tr.move; st=tr.next; step++;
    }
    printf("DONE %lld total-events=%lld\n",step,total);
    return 0;
}
