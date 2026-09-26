// stateseq.c - print (step,state,head,delta-config) sequence for cm2
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
typedef struct { int write; int move; int next; } Trans;
static Trans T[6][2];
static const char *CODE = "1RB1RA1LC0RC---0LD0LE0RF1RE0RA0LF1LB";
static uint8_t *tape; static long long TB, TW;
static inline int rd(long long p){ return (p-TB<0||p-TB>=TW)?0:tape[p-TB]; }
static inline void wr(long long p,int v){ tape[p-TB]=v; }
int main(int argc,char**argv){
    long long LO=atoll(argv[1]),HI=atoll(argv[2]);
    for(int i=0;i<12;i++){const char*t=CODE+3*i;Trans*tr=&T[i/2][i%2];
        tr->write=t[0]-'0'; tr->move=t[1]=='L'?-1:1; tr->next=(t[2]=='-')?6:t[2]-'A';}
    TW=1ll<<24; TB=-(1ll<<23); tape=calloc(TW,1);
    long long head=0; int st=0; long long step=0;
    while(step<HI){
        int sy=rd(head);
        if(step>=LO) printf("%lld %c%d %lld %d%d%d%d%d\n",step,'A'+st,sy,head,
            rd(head-2),rd(head-1),rd(head),rd(head+1),rd(head+2));
        Trans tr=T[st][sy];
        if(tr.next==6){ printf("HALT at %lld\n",step); return 0; }
        wr(head,tr.write); head+=tr.move; st=tr.next; step++;
    }
    return 0;
}
