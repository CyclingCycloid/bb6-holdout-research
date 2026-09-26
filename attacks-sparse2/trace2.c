/* trace2.c — micro-tracer for M1: start from P(n) = 1^n 0 1^n, state D on the
 * fresh 0 immediately right of the right block. Prints every step (tape RLE
 * around head) up to HI steps or next pure anchor. argv: n HI */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
typedef struct { int write; int move; int next; } Trans;
static Trans T[6][2];
static const char *CODE = "1RB1LA0RC0RD1LC1LA1RE1RD1LF0LA---0LE";
static uint8_t buf[1<<22]; static long long plo=0, phi=0;
static long long rd(long long p){ return (p<plo||p>=phi)?0:buf[p]; }
static void wr(long long p,int v){ if(p<plo)plo=p; if(p+1>phi)phi=p+1; buf[p]=v; }
/* print tape as RLE: runs and gaps, plus head position marked */
static void prtape(long long head,int st,long long step){
    printf("t=%lld st=%c head=%lld | ",step,'A'+st,head);
    long long p=plo;
    if(head<plo){printf("H<left> ");}
    for(p=plo;p<phi && p<head+30;p++){
        if(p==head)printf("<%c>",rd(p)?'1':'.');
        else printf("%c",rd(p)?'1':'.');
    }
    if(head>=phi)printf(" <H-right>");
    printf("  [%lld..%lld)\n",plo,phi);
}
int main(int argc,char**argv){
    for(int i=0;i<12;i++){const char*t=CODE+3*i;Trans*tr=&T[i/2][i%2];
        tr->write=t[0]-'0'; tr->move=(t[1]=='L')?-1:1; tr->next=(t[2]=='-')?6:t[2]-'A';}
    long long n=atoll(argv[1]), HI=atoll(argv[2]);
    long long p=0;
    for(long long i=0;i<n;i++)wr(p++,1);
    wr(p++,0);
    for(long long i=0;i<n;i++)wr(p++,1);
    long long head=p; int st=3; long long step=0;
    while(step<HI){
        prtape(head,st,step);
        uint8_t sy=rd(head); Trans tr=T[st][sy];
        if(tr.next==6){printf("HALT at %lld\n",step);return 0;}
        wr(head,tr.write); head+=tr.move; st=tr.next; step++;
    }
    return 0;
}
