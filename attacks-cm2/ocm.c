// ocm.c — bare-machine oracle for cm2 = 1RB1RA1LC0RC---0LD0LE0RF1RE0RA0LF1LB
// Modes:
//   ocm run <cap>                          : blank-tape run, print HALT/DONE
//   ocm ev <Ss> <cap> <maxrec> [headonly]  : log (state,sym) events with full RLE
//   ocm cp  <cap> <step1,step2,...>        : print RLE config at given absolute steps
//   ocm from <st> <head> <cap> <rle> [evSs evcap] : constructed start; rle like "1^3,0^2,1^1" starting at pos 0
//   ocm wv  <cap> <every>                  : print compact wave snapshot every N steps (RLE + head)
// RLE convention: tokens 1^a 0^b ...; positions: first token starts at cell 0.
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
typedef struct { int write; int move; int next; } Trans;
static Trans T[6][2];
static const char *CODE = "1RB1RA1LC0RC---0LD0LE0RF1RE0RA0LF1LB";
static uint8_t *tape; static long long TB, TW; // tape[p-TB], window [TB, TB+TW)
static long long lo=0, hi=0; // 1-cell extent [lo,hi)
static inline long long rd(long long p){ return (p-TB<0||p-TB>=TW)?0:tape[p-TB]; }
static inline void wr(long long p,int v){
    if(p-TB<0||p-TB>=TW){ fprintf(stderr,"OOB p=%lld\n",p); exit(3); }
    tape[p-TB]=v;
    if(v){ if(p<lo)lo=p; if(p+1>hi)hi=p+1; }
    else { if(p==lo){ while(lo<hi&&!tape[lo-TB])lo++; } if(p+1==hi){ while(hi>lo&&!tape[hi-1-TB])hi--; } if(lo==hi){lo=0;hi=0;} }
}
static void init_tape(void){ TW=1ll<<26; TB=-(1ll<<25); tape=calloc(TW,1); }
static void parse_code(void){
    for(int i=0;i<12;i++){ const char*t=CODE+3*i; Trans*tr=&T[i/2][i%2];
        tr->write=t[0]-'0'; tr->move=t[1]=='L'?-1:1; tr->next=(t[2]=='-')?6:t[2]-'A'; }
}
// RLE of the 1-region [lo,hi) into out (malloc'd, caller frees). Returns runs count. *pop=#1s
static int rle(long long l,long long r,char **out,long long *pop){
    long long cap=64,len=0,pl=0; char *s=malloc(cap); int runs=0;
    long long p=l; *pop=0;
    while(p<r){
        int v=tape[p-TB]; long long q=p; while(q<r&&tape[q-TB]==v)q++;
        long long k=q-p; char tok[32];
        if(v){ *pop+=k; runs++; }
        int n=snprintf(tok,sizeof tok,"%s%d^%lld",p>l?" ":"",v?1:0,k);
        if(len+n+2>cap){cap*=2;s=realloc(s,cap);}
        memcpy(s+len,tok,n); len+=n; p=q;
    }
    s[len]=0; *out=s; return runs;
}
static void print_cfg(long long head,int st,long long step){
    char *s; long long pop; int runs=rle(lo,hi,&s,&pop);
    printf("CP %lld st=%c h=%lld lo=%lld hi=%lld pop=%lld width=%lld runs=%d R %s\n",
        step,'A'+st,head,lo,hi,pop,hi-lo,runs,s);
    free(s);
}
int main(int argc,char**argv){
    if(argc<2){ fprintf(stderr,"usage: run|ev|cp|from|wv ...\n"); return 2; }
    parse_code(); init_tape();
    long long head=0; int st=0; long long step=0;
    const char *mode=argv[1];
    long long evmask_st=-1, evmask_sy=-1, evmax=1ll<<60, evcount=0;
    long long wvevery=0;
    if(!strcmp(mode,"ev")){ evmask_st=argv[2][0]-'A'; evmask_sy=argv[2][1]-'0'; evmax=atoll(argv[4]); }
    if(!strcmp(mode,"alla")){ evmask_st=0; evmask_sy=-1; evmax=atoll(argv[3]); } // log all A-state visits
    if(!strcmp(mode,"wv")){ wvevery=atoll(argv[3]); }
    if(!strcmp(mode,"from")){
        st=argv[2][0]-'A'; head=atoll(argv[3]);
        long long cap=atoll(argv[4]);
        // parse rle
        long long p=0; char *r=strdup(argv[5]); char *tok=strtok(r,",");
        while(tok){ long long k=atoll(strchr(tok,'^')+1); int v=tok[0]-'0';
            for(long long i=0;i<k;i++){ if(v)wr(p+i,1); }
            p+=k; tok=strtok(NULL,","); }
        if(argc>=7){ evmask_st=argv[6][0]-'A'; evmask_sy=argv[6][1]-'0'; if(argc>=8) evmax=atoll(argv[7]); }
        // run
        while(step<cap){
            if(evmask_st>=0&&st==evmask_st&&(evmask_sy<0||rd(head)==evmask_sy)&&evcount<evmax){
                char *s; long long pop; int runs=rle(lo,hi,&s,&pop);
                printf("EV %lld %c%d h=%lld lo=%lld hi=%lld pop=%lld width=%lld runs=%d rel=%lld R %s\n",
                    step,'A'+st,rd(head),head,lo,hi,pop,hi-lo,runs,head-lo,s);
                free(s); evcount++;
            }
            uint8_t sy=rd(head); Trans tr=T[st][sy];
            if(tr.next==6){ printf("HALT at %lld\n",step); return 0; }
            wr(head,tr.write); head+=tr.move; st=tr.next; step++;
        }
        char *s; long long pop; int runs=rle(lo,hi,&s,&pop);
        printf("DONE at %lld st=%c h=%lld lo=%lld hi=%lld pop=%lld width=%lld runs=%d R %s\n",
            step,'A'+st,head,lo,hi,pop,hi-lo,runs,s); free(s);
        return 0;
    }
    long long cap=atoll(!strcmp(mode,"ev")?argv[3]:argv[2]);
    while(step<cap){
        if(evmask_st>=0&&st==evmask_st&&(evmask_sy<0||rd(head)==evmask_sy)&&evcount<evmax){
            char *s; long long pop; int runs=rle(lo,hi,&s,&pop);
            printf("EV %lld %c%d h=%lld lo=%lld hi=%lld pop=%lld width=%lld runs=%d rel=%lld R %s\n",
                step,'A'+st,rd(head),head,lo,hi,pop,hi-lo,runs,head-lo,s);
            free(s); evcount++;
        }
        if(wvevery&&(step%wvevery==0)){ char *s; long long pop; int runs=rle(lo,hi,&s,&pop);
            printf("WV %lld st=%c h=%lld pop=%lld width=%lld runs=%d rel=%lld R %s\n",step,'A'+st,head,pop,hi-lo,runs,head-lo,s); free(s); }
        uint8_t sy=rd(head); Trans tr=T[st][sy];
        if(tr.next==6){ printf("HALT at %lld\n",step); return 0; }
        wr(head,tr.write); head+=tr.move; st=tr.next; step++;
    }
    if(!strcmp(mode,"run")) printf("DONE at %lld st=%c h=%lld lo=%lld hi=%lld\n",step,'A'+st,head,lo,hi);
    else print_cfg(head,st,step);
    return 0;
}
