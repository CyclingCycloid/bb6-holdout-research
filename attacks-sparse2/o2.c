/* o2.c — anchor oracle for M2 = 1RB1LA0RC1RD1LC0LA1LE1RE0RB0LF---0LD.
 * Anchor: 0^inf 1^a 0 1^b 0^inf, head=D on the single gap (a,b >= 2).
 * Halt condition for M2: D on 0 with L=1,R=1 and left run length 1
 *   (then E erases, F reads 0 -> HALT).  Also D on 0 with L1 R0 (gap width 2+) can halt:
 *   D0 writes 1 moves L; E at q-1 reads 1 -> erase -> F at q-2 reads (left of run).
 * Modes:
 *   start a b maxsteps [quiet]  -> run to next 2-run anchor; print all D-events en route
 *                                  unless quiet; print "RES a' b' cost" | "HALT step" | "CAP"
 *   chain a b steps maxsteps    -> iterate the 2-run map `steps` times from (a,b), print each
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
typedef struct { int write; int move; int next; } Trans;
static Trans T[6][2];
static const char *CODE = "1RB1LA0RC1RD1LC0LA1LE1RE0RB0LF---0LD";
static uint8_t *buf=NULL; static long long plo=0,phi=0,allo=0,ahi=0,shift=0;
static void tape_init(void){ long long cap=1<<22; buf=(uint8_t*)calloc(cap,1); allo=0; ahi=cap; shift=0; plo=0; phi=0; }
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
static int parse_code(const char*c){
    if(strlen(c)!=36)return 2;
    for(int i=0;i<12;i++){const char*t=c+3*i;Trans*tr=&T[i/2][i%2];
        if(t[0]=='-'){tr->write=0;tr->move=0;tr->next=6;continue;}
        tr->write=t[0]-'0';tr->move=(t[1]=='L')?-1:1;tr->next=t[2]-'A';}
    return 0;
}
static int rle_scan(long long*runs,long long*gaps,int max){
    long long p,first=0,last=0;int found=0;
    for(p=plo;p<phi;p++)if(rd(p)){first=p;found=1;break;}
    if(!found)return 0;
    for(p=phi-1;p>=plo;p--)if(rd(p)){last=p;break;}
    int n=0,inone=0;
    for(p=first;p<=last;p++){
        if(rd(p)){if(!inone){if(n>=max)return -1;runs[n]=0;gaps[n]=0;n++;}inone=1;runs[n-1]++;}
        else{inone=0;if(n>=1)gaps[n-1]++;}
    }
    return n;
}
/* returns 0: found next 2-run anchor (*a2,*b2,*cost); 1: HALT at *cost; 2: cap */
static int run2(long long a,long long b,long long cap,int logev,long long*a2,long long*b2,long long*cost){
    tape_init();
    long long p=0;
    for(long long i=0;i<a;i++)wr(p++,1);
    wr(p++,0);
    for(long long i=0;i<b;i++)wr(p++,1);
    long long head=p-b-1; int st=3; long long step=0;
    long long runs[64],gaps[64];
    *a2=-1;*b2=-1;*cost=0;
    while(step<cap){
        if(step>0&&st==3&&rd(head)==0){
            int n=rle_scan(runs,gaps,64);
            if(n==2&&gaps[0]==1){
                /* head must be ON the single gap */
                long long q,first=0;int found=0;
                for(q=plo;q<phi;q++)if(rd(q)){first=q;break;}
                /* head on gap iff # of 1s left of head == runs[0] */
                long long cnt=0; for(q=first;q<head;q++)cnt+=rd(q);
                if(cnt==runs[0]){
                    if(runs[0]>=2){ *a2=runs[0];*b2=runs[1];*cost=step; if(logev)printf("  anchor (%lld,%lld) at +%lld\n",runs[0],runs[1],step); return 0; }
                    else { if(logev)printf("  LEFT-RUN-1 event (%lld,%lld) at +%lld -> HALT imminent\n",runs[0],runs[1],step); *cost=step; return 1; }
                }
            }
            if(logev){ printf("  ev +%lld n=%d",step,n); if(n>0){for(int i=0;i<n;i++)printf(" %lld",runs[i]);printf(" g:");for(int i=0;i<n-1;i++)printf(" %lld",gaps[i]);} printf("\n"); }
        }
        uint8_t sy=rd(head); Trans tr=T[st][sy];
        if(tr.next==6){ *cost=step; return 1; }
        wr(head,tr.write); head+=tr.move; st=tr.next; step++;
    }
    return 2;
}
int main(int argc,char**argv){
    if(parse_code(CODE))return 2;
    if(argc>=2&&!strcmp(argv[1],"grid")){
        long long amax=atoll(argv[2]),bmax=atoll(argv[3]),cap=atoll(argv[4]);
        for(long long a=2;a<=amax;a++)for(long long b=2;b<=bmax;b++){
            long long a2,b2,cost;
            int r=run2(a,b,cap,0,&a2,&b2,&cost);
            if(r==0)printf("F %lld %lld -> %lld %lld cost=%lld\n",a,b,a2,b2,cost);
            else if(r==1)printf("F %lld %lld -> HALT +%lld\n",a,b,cost);
            else printf("F %lld %lld -> CAP\n",a,b);
        }
        return 0;
    }
    if(argc>=2&&!strcmp(argv[1],"start")){
        long long a=atoll(argv[2]),b=atoll(argv[3]),cap=atoll(argv[4]);
        int quiet=argc>=6&&!strcmp(argv[5],"quiet");
        long long a2,b2,cost;
        int r=run2(a,b,cap,!quiet,&a2,&b2,&cost);
        if(r==0)printf("RES %lld %lld -> %lld %lld cost=%lld\n",a,b,a2,b2,cost);
        else if(r==1)printf("HALT-from (%lld,%lld) at +%lld\n",a,b,cost);
        else printf("CAP\n");
        return 0;
    }
    if(argc>=2&&!strcmp(argv[1],"chain")){
        long long a=atoll(argv[2]),b=atoll(argv[3]),steps=atoll(argv[4]),cap=atoll(argv[5]);
        long long t=0;
        for(long long s=0;s<steps;s++){
            long long a2,b2,cost;
            int r=run2(a,b,cap,0,&a2,&b2,&cost);
            if(r==0){ t+=cost; printf("C %lld (%lld,%lld) t+=%lld -> (%lld,%lld)\n",s,a,b,cost,a2,b2); a=a2;b=b2; }
            else if(r==1){ printf("C %lld (%lld,%lld) HALT at +%lld (abs t=%lld)\n",s,a,b,cost,t+cost); return 0; }
            else { printf("C %lld (%lld,%lld) CAP\n",s,a,b); return 0; }
        }
        return 0;
    }
    fprintf(stderr,"usage: o2 start a b cap [quiet] | o2 chain a b steps cap\n");return 2;
}
