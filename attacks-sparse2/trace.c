#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
typedef struct { int write; int move; int next; } Trans;
static Trans T[6][2];
static uint8_t buf[1<<20]; static long long plo=0, phi=0;
static long long rd(long long p){ return (p<plo||p>=phi)?0:buf[p]; }
static void wr(long long p,int v){ if(p<plo)plo=p; if(p+1>phi)phi=p+1; buf[p]=v; }
int main(int argc,char**argv){
    const char*c=argv[1]; long long LO=atoll(argv[2]),HI=atoll(argv[3]);
    for(int i=0;i<12;i++){const char*t=c+3*i;Trans*tr=&T[i/2][i%2];
        tr->write=t[0]=='0'?0:1; tr->move=t[1]=='L'?-1:1; tr->next=(t[2]=='H')?6:t[2]-'A';}
    wr(0,0); long long head=0; int st=0; long long step=0;
    while(step<HI){
        if(step>=LO){
            printf("t=%lld st=%c h=%lld tape[head-3..head+3]=%lld%lld%lld<%lld>%lld%lld%lld | ",step,'A'+st,head,
                rd(head-3),rd(head-2),rd(head-1),rd(head),rd(head+1),rd(head+2));
            for(long long p=plo;p<phi;p++) putchar(rd(p)?'1':'.');
            printf(" [%lld..%lld)\n",plo,phi);
        }
        uint8_t sy=rd(head); Trans tr=T[st][sy];
        if(tr.next==6){printf("HALT at %lld\n",step);return 0;}
        wr(head,tr.write); head+=tr.move; st=tr.next; step++;
    }
    return 0;
}
