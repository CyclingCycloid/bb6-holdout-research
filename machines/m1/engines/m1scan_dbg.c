/* m1scan_dbg.c — m1scan with per-step debug for first 12 steps */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
typedef struct { int write; int move; int next; } Trans;
static Trans T[6][2];
static uint8_t *buf=NULL; static long long plo=0,phi=0,allo=0,ahi=0,shift=0;
static void tape_init(void){ long long cap=1<<23; buf=(uint8_t*)calloc(cap,1); allo=0; ahi=cap; shift=0; plo=0; phi=0; }
static void ensure(long long lo,long long hi){
    if(lo>=allo&&hi<=ahi)return;
    long long nlo=allo,nhi=ahi,half;
    while(lo<nlo||hi>nhi){ half=(ahi-allo)/2; if(!half)half=1; if(lo<nlo)nlo-=half; if(hi>nhi)nhi+=half; }
    uint8_t*nb=(uint8_t*)calloc(nhi-nlo,1);
    memcpy(nb+(allo-nlo),buf+(allo-shift),ahi-allo);
    free(buf);buf=nb;allo=nlo;ahi=nhi;shift=nlo;
}
static inline uint8_t rd(long long p){ return (p<plo||p>=phi)?0:buf[p-shift]; }
static inline void wr(long long p,uint8_t v){ if(p<plo||p>=phi){ensure(p,p+1); if(p<plo)plo=p; if(p+1>phi)phi=p+1;} buf[p-shift]=v; }
static int rle_scan(long long*runs,long long*gaps,int max){
    long long p,first=-1,last=-1;
    for(p=plo;p<phi;p++)if(rd(p)){first=p;break;}
    if(first<0)return 0;
    for(p=phi-1;p>=plo;p--)if(rd(p)){last=p;break;}
    int n=0,inone=0;
    for(p=first;p<=last;p++){
        if(rd(p)){if(!inone){if(n>=max)return -1;runs[n]=0;gaps[n]=0;n++;}inone=1;runs[n-1]++;}
        else{inone=0;if(n>=1)gaps[n-1]++;}
    }
    return n;
}
int main(int argc,char**argv){
    const char*c="1RB1LA0RC0RD1LC1LA1RE1RD1LF0LA---0LE";
    for(int i=0;i<12;i++){const char*t=c+3*i;Trans*tr=&T[i/2][i%2];
        tr->write=t[0]-'0'; tr->move=(t[1]=='L')?-1:1; tr->next=(t[2]=='-')?6:t[2]-'A';}
    long long N=atoll(argv[1]);
    tape_init(); wr(0,0);
    long long head=0; int st=0; long long step=0, ev=0;
    long long runs[80],gaps[80];
    while(step<N){
        if(step<12)fprintf(stderr,"DBG t=%lld st=%d h=%lld sym=%d ev=%lld plo=%lld phi=%lld\n",step,st,head,(int)rd(head),ev,plo,phi);
        if(st==3&&rd(head)==0){
            int n=rle_scan(runs,gaps,80);
            fprintf(stderr,"  rle n=%d\n",n);
            if(n>0){
                printf("EV %lld st=D n=%d",step,n);
                for(int i=0;i<n;i++)printf(" %lld",runs[i]);
                printf("\n"); ev++;
            }
        }
        uint8_t sy=rd(head); Trans tr=T[st][sy];
        if(tr.next==6){printf("HALT %lld\n",step);return 0;}
        wr(head,tr.write); head+=tr.move; st=tr.next; step++;
    }
    printf("DONE %lld total-events=%lld\n",N,ev);
    return 0;
}
