/* sp.c — bare-metal simulator for soc-port (parameterized 6-state 2-symbol TM).
 *
 * Usage:
 *   sp <CODE> run <cap>                       : blank-tape run; print HALT step / DONE
 *   sp <CODE> from <st> <head> <cap> <rle>    : start from config; rle like "1^3,0^2,1^1" at pos 0
 *   sp <CODE> ev <Ss> <cap> <maxrec>          : log (state,sym) events: step head rle
 *   sp <CODE> wv <cap> <every>                : wave snapshot every N steps
 *   sp <CODE> cp <cap> <s1,s2,...>            : config snapshot at absolute steps
 *   sp <CODE> seg <st> <head> <steps> <rle>   : run exactly <steps> steps from config, print end config
 * Modes share the ocm.c conventions: RLE tokens 1^a 0^b ...; first token starts at cell 0.
 * CODE: 36 chars, 12 transitions x3 (write,dir,next); '-' next = halt; whole transition '---' = undef.
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
typedef struct { int write; int move; int next; } Trans; /* next 0..5, 6 halt, -1 undef */
static Trans T[6][2];
static uint8_t *tape; static long long TB, TW;
static long long lo=0, hi=0;
static inline long long rd(long long p){ return (p-TB<0||p-TB>=TW)?0:tape[p-TB]; }
static inline void wr(long long p,int v){
    if(p-TB<0||p-TB>=TW){ fprintf(stderr,"OOB p=%lld\n",p); exit(3); }
    tape[p-TB]=v;
    if(v){ if(p<lo)lo=p; if(p+1>hi)hi=p+1; }
    else { if(p==lo){ while(lo<hi&&!tape[lo-TB])lo++; } if(p+1==hi){ while(hi>lo&&!tape[hi-1-TB])hi--; } if(lo==hi){lo=0;hi=0;} }
}
static void init_tape(void){ TW=1ll<<27; TB=-(1ll<<26); tape=calloc(TW,1); }
static void parse_code(const char*C){
    if(strlen(C)<36){ fprintf(stderr,"bad code\n"); exit(2); }
    for(int i=0;i<12;i++){ const char*t=C+3*i; Trans*tr=&T[i/2][i%2];
        tr->write=t[0]=='-'?-1:t[0]-'0'; tr->move=t[1]=='L'?-1:1;
        tr->next=(t[2]=='-')?((t[0]=='-'&&t[1]=='-')?-1:6):t[2]-'A'; }
}
static int rle(long long l,long long r,char **out,long long *pop){
    long long cap=64,len=0; char *s=malloc(cap); int runs=0; long long p=l; *pop=0;
    if(l>=r){ s[0]=0; *out=s; return 0; }
    while(p<r){
        int v=tape[p-TB]; long long q=p; while(q<r&&tape[q-TB]==v)q++;
        long long k=q-p; char tok[40];
        if(v){ *pop+=k; runs++; }
        int n=snprintf(tok,sizeof tok,"%s%d^%lld",p>l?" ":"",v?1:0,k);
        if(len+n+2>cap){cap*=2;s=realloc(s,cap);}
        memcpy(s+len,tok,n); len+=n; p=q;
    }
    s[len]=0; *out=s; return runs;
}
static void print_cfg(long long head,int st,long long step){
    char *s; long long pop; int runs=rle(lo,hi,&s,&pop);
    printf("CP %lld st=%c h=%lld lo=%lld hi=%lld pop=%lld runs=%d R %s\n",
        step,'A'+st,head,lo,hi,pop,runs,s);
    free(s);
}
static void load_rle(const char*r){
    long long p=0; const char*c=r;
    while(*c){
        int v=*c-'0'; c++;
        if(*c=='^'){ c++; long long k=atoll(c); while(*c&&*c!=',')c++; while(k-->0) wr(p++,v); }
        else { wr(p++,v); }
        if(*c==',')c++;
    }
}
int main(int argc,char**argv){
    if(argc<3){ fprintf(stderr,"usage: sp <CODE> run|from|ev|wv|cp|seg ...\n"); return 2; }
    parse_code(argv[1]); init_tape();
    long long head=0; int st=0; long long step=0;
    const char*mode=argv[2];
    long long evst=-1,evsy=-1,evmax=1ll<<60,evcount=0,wvevery=0;
    if(!strcmp(mode,"ev")){ evst=argv[3][0]-'A'; evsy=argv[3][1]-'0'; evmax=atoll(argv[5]); }
    if(!strcmp(mode,"wv")) wvevery=atoll(argv[4]);
    long long cap=(argc>3)?atoll((!strcmp(mode,"ev"))?argv[4]:argv[3]):0;
    if(!strcmp(mode,"from")||!strcmp(mode,"seg")){
        st=argv[3][0]-'A'; head=atoll(argv[4]); long long cap=atoll(argv[5]);
        load_rle(argv[6]);
        long long limit=(!strcmp(mode,"from"))?cap:(head,step=0,cap), seg=0;
        /* from: run up to cap steps; seg: run exactly cap steps then print */
        long long n=0;
        while(n<cap){
            if(st<0){ printf("UNDEF %lld\n",step); return 4; }
            int sym=rd(head);
            Trans tr=T[st][sym];
            if(tr.next==-1){ printf("UNDEF %lld\n",step); return 4; }
            if(tr.next==6){ printf("HALT %lld\n",step); return 0; }
            wr(head,tr.write); head+=tr.move; st=tr.next; step++; n++;
        }
        print_cfg(head,st,step);
        return 0;
    }
    if(!strcmp(mode,"cp")){
        long long cap=atoll(argv[3]); char *arg=strdup(argv[4]);        long long targets[4096]; int nt=0; char*t=strtok(arg,",");
        while(t&&nt<4096){ targets[nt++]=atoll(t); t=strtok(NULL,","); }
        long long nexti=0;
        while(step<cap){
            if(nexti<nt&&step==targets[nexti]){ print_cfg(head,st,step); nexti++; }
            if(st<0){ printf("UNDEF %lld\n",step); return 4; }
            int sym=rd(head); Trans tr=T[st][sym];
            if(tr.next==-1){ printf("UNDEF %lld\n",step); return 4; }
            if(tr.next==6){ printf("HALT %lld\n",step); return 0; }
            wr(head,tr.write); head+=tr.move; st=tr.next; step++;
        }
        if(nexti<nt&&step==targets[nexti]) print_cfg(head,st,step);
        print_cfg(head,st,step);
        return 0;
    }
    long long cap2=cap;
    long long cens[6][2]; memset(cens,0,sizeof cens);
    long long lastev[6][2]; memset(lastev,-1,sizeof lastev);
    int cenmode=!strcmp(mode,"census");
    int tracemode=!strcmp(mode,"trace");
    long long t0=0,t1=0;
    if(tracemode){ t0=atoll(argv[3]); t1=atoll(argv[4]); cap2=t1; }
    while(step<cap2){
        if(tracemode&&step>=t0) printf("T %lld %c %lld %d\n",step,'A'+st,head,rd(head));
        if(!strcmp(mode,"ev")&&st==evst&&(evsy<0||rd(head)==evsy)&&evcount<evmax){
            char *s; long long pop; rle(lo,hi,&s,&pop);
            printf("EV %lld st=%c h=%lld pop=%lld R %s\n",step,'A'+st,head,pop,s); free(s);
            evcount++;
        }
        if(wvevery&&step%wvevery==0) print_cfg(head,st,step);
        if(st<0){ printf("UNDEF %lld\n",step); return 4; }
        int sym=rd(head); Trans tr=T[st][sym];
        if(tr.next==-1){ printf("UNDEF %lld\n",step); return 4; }
        if(tr.next==6){ if(cenmode){ cens[st][sym]++; goto censdone; } printf("HALT %lld\n",step); return 0; }
        if(cenmode){
            cens[st][sym]++;
            if(lastev[st][sym]>=0&&step-lastev[st][sym]>=40000000)
                fprintf(stderr,"GAP %c%d at %lld prev %lld\n",'A'+st,sym,step,lastev[st][sym]);
            lastev[st][sym]=step;
        }
        wr(head,tr.write); head+=tr.move; st=tr.next; step++;
    }
    if(cenmode){
censdone:
        for(int i=0;i<6;i++)printf("%c0=%lld %c1=%lld\n",'A'+i,cens[i][0],'A'+i,cens[i][1]);
        return 0;
    }
    if(tracemode) return 0;
    if(!strcmp(mode,"ev")) printf("EVEND count=%lld\n",evcount);
    else if(!strcmp(mode,"dump")){
        printf("DUMP %lld st=%c h=%lld lo=%lld hi=%lld\n",step,'A'+st,head,lo,hi);
        for(long long p=lo-2;p<hi+2;p++) putchar('0'+(int)rd(p));
        putchar('\n');
    }
    else print_cfg(head,st,step);
    return 0;
}
