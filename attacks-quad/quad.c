// quad.c — bare-machine oracle for the quad Mess machines (parameterized by code)
// Usage:
//   quad <code> run <cap>                          : blank-tape run, print HALT/DONE
//   quad <code> ev <Ss> <cap> <maxrec> [start]     : log (state,sym) events with full RLE
//   quad <code> cp  <cap> <step1,step2,...>        : print RLE config at given absolute steps
//   quad <code> from <st> <head> <cap> <rle> [evSs evcap] : constructed start; rle "1^3,0^2,1^1" from pos 0
//   quad <code> wv  <cap> <every>                  : compact wave snapshot every N steps
//   quad <code> stats <cap>                        : (state,sym) usage counts + halt check
//   quad <code> hcheck <cap>                       : scan for (state,sym) at halt positions:
//                                                    report every step where the READ symbol
//                                                    equals each machine's hole (state,sym)
// RLE convention: tokens 1^a 0^b ...; first token starts at cell 0 (for "from": pos 0).
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
typedef struct { int write; int move; int next; } Trans;
static Trans T[6][2];
static const char *CODE;
static uint8_t *tape; static long long TB, TW;
static long long lo=0, hi=0;
static long long usecnt[6][2];
static inline long long rd(long long p){ return (p-TB<0||p-TB>=TW)?0:tape[p-TB]; }
static inline void wr(long long p,int v){
    if(p-TB<0||p-TB>=TW){ fprintf(stderr,"OOB p=%lld\n",p); exit(3); }
    tape[p-TB]=v;
    if(v){ if(p<lo)lo=p; if(p+1>hi)hi=p+1; }
    else { if(p==lo){ while(lo<hi&&!tape[lo-TB])lo++; } if(p+1==hi){ while(hi>lo&&!tape[hi-1-TB])hi--; } if(lo==hi){lo=0;hi=0;} }
}
static void init_tape(void){ TW=1ll<<27; TB=-(1ll<<26); tape=calloc(TW,1); }
static void parse_code(const char*c){
    if(strlen(c)!=36){ fprintf(stderr,"bad code len\n"); exit(2); }
    for(int i=0;i<12;i++){ const char*t=c+3*i; Trans*tr=&T[i/2][i%2];
        tr->write=t[0]-'0'; tr->move=t[1]=='L'?-1:1; tr->next=(t[2]=='-')?6:t[2]-'A'; }
}
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
    if(argc<3){ fprintf(stderr,"usage: quad <code> run|ev|cp|from|wv|stats ...\n"); return 2; }
    CODE=argv[1]; parse_code(CODE); init_tape();
    long long head=0; int st=0; long long step=0;
    const char *mode=argv[2];
    long long evmask_st=-1, evmask_sy=-1, evmax=1ll<<60, evcount=0;
    long long wvevery=0;
    long long evstart=0;
    if(!strcmp(mode,"ev")){ evmask_st=argv[3][0]-'A'; evmask_sy=argv[3][1]-'0'; evmax=atoll(argv[5]); if(argc>=7) evstart=atoll(argv[6]); }
    long long evcevery=1; // evc mode: print every K-th event + all structural changes
    if(!strcmp(mode,"evc")){ evmask_st=argv[3][0]-'A'; evmask_sy=argv[3][1]-'0'; evcevery=atoll(argv[5]); }
    if(!strcmp(mode,"wv")){ wvevery=atoll(argv[4]); }
    if(!strcmp(mode,"from")){
        st=argv[3][0]-'A'; head=atoll(argv[4]);
        long long cap=atoll(argv[5]);
        long long p=0; char *r=strdup(argv[6]); char *tok=strtok(r,",");
        while(tok){ long long k=atoll(strchr(tok,'^')+1); int v=tok[0]-'0';
            for(long long i=0;i<k;i++){ if(v)wr(p+i,1); }
            p+=k; tok=strtok(NULL,","); }
        if(argc>=8){ evmask_st=argv[7][0]-'A'; evmask_sy=argv[7][1]-'0'; if(argc>=9) evmax=atoll(argv[8]); }
        while(step<cap){
            if(evmask_st>=0&&step>=evstart&&st==evmask_st&&(evmask_sy<0||rd(head)==evmask_sy)&&evcount<evmax){
                char *s; long long pop; int runs=rle(lo,hi,&s,&pop);
                printf("EV %lld %c%d h=%lld lo=%lld hi=%lld pop=%lld width=%lld runs=%d rel=%lld R %s\n",
                    step,'A'+st,rd(head),head,lo,hi,pop,hi-lo,runs,head-lo,s);
                free(s); evcount++;
            }
            uint8_t sy=rd(head); Trans tr=T[st][sy]; usecnt[st][sy]++;
            if(tr.next==6){ printf("HALT at %lld\n",step); return 0; }
            wr(head,tr.write); head+=tr.move; st=tr.next; step++;
        }
        char *s; long long pop; int runs=rle(lo,hi,&s,&pop);
        printf("DONE at %lld st=%c h=%lld lo=%lld hi=%lld pop=%lld width=%lld runs=%d R %s\n",
            step,'A'+st,head,lo,hi,pop,hi-lo,runs,s); free(s);
        return 0;
    }
    long long cap=atoll((!strcmp(mode,"ev")||!strcmp(mode,"evc"))?argv[4]:argv[3]);
    if(!strcmp(mode,"trace")){
        // trace <cap> <start> <len>: per-step state/head/read/write/move from start
        long long t0=atoll(argv[4]), len=atoll(argv[5]);
        while(step<cap){
            uint8_t sy=rd(head); Trans tr=T[st][sy]; usecnt[st][sy]++;
            if(step>=t0&&step<t0+len)
                printf("S %lld %c%d w%d m%d n%c\n", step,'A'+st,sy,tr.write,tr.move>0?'R':'L','A'+tr.next);
            if(tr.next==6){ printf("HALT at %lld\n",step); return 0; }
            wr(head,tr.write); head+=tr.move; st=tr.next; step++;
        }
        printf("END %lld st=%c h=%lld lo=%lld hi=%lld\n",step,'A'+st,head,lo,hi);
        return 0;
    }
    if(!strcmp(mode,"eras")){
        int eras_pst=argv[3][0]-'A', eras_psy=argv[3][1]-'0', eras_arg=4; cap=atoll(argv[4]);
        // eras <cap>: at each A0 event, parse blocks; segment eras by the working triple
        // (unique adjacent (2,2) gap pair). Print era summaries + churn-episode summaries.
        int have_era=0, era_pos=-1; long long era_start=0, era_end=0;
        long long R0=0,L0=0,Rr0=0,eL=0,eR=0,eRr=0; int n0=-1; long long era_ev=0;
        int in_churn=0; long long churn_t0=0, churn_t1=0, churn_n=0; int churn_nb=0; long long nmatch=0;
        long long pblocks[1024]; int pnb=-1;
        while(step<cap){
            uint8_t sy=rd(head); Trans tr=T[st][sy]; usecnt[st][sy]++;
            int match=(st==eras_pst&&sy==eras_psy);
            char *s=NULL; long long pop=0; int runs=0;
            long long blocks[1024], gaps[1024]; int nb=0, ng=0;
            if(match){
                runs=rle(lo,hi,&s,&pop);
                char scopy[65536]; strncpy(scopy,s,65535); scopy[65535]=0;
                for(char *t=strtok(scopy," ");t;t=strtok(NULL," ")){
                    long long k=atoll(strchr(t,'^')+1);
                    if(t[0]=='1'){ if(nb<1024) blocks[nb++]=k; } else { if(ng<1024) gaps[ng++]=k; }
                }
            }
            if(tr.next==6){ printf("HALT at %lld\n",step); return 0; }
            wr(head,tr.write); head+=tr.move; st=tr.next; step++;
            if(!match){ if(s) free(s); continue; } nmatch++;
            int pos=-1, npos=0;
            if(nb==pnb && nb>2){
                int d[1024], nd=0;
                for(int i=0;i<nb;i++) if(pblocks[i]!=blocks[i]){ if(nd<1024) d[nd++]=i; }
                if(nd==3 && d[1]==d[0]+1 && d[2]==d[0]+2
                   && blocks[d[0]]==pblocks[d[0]]+1 && blocks[d[1]]==pblocks[d[1]]-2 && blocks[d[2]]==pblocks[d[2]]+1){
                    pos=d[0]; npos=1;
                }
            }
            pnb=nb; if(nb<1024) memcpy(pblocks,blocks,sizeof(long long)*nb);
            if(npos==1&&pos>=0&&pos+2<nb){
                if(have_era&&(pos!=era_pos||nb!=n0)){
                    printf("ERA %lld %lld ev=%lld pos=%d n0=%d L0=%lld R0=%lld Rr0=%lld end=(%lld,%lld,%lld) nb=%d\n",
                        era_start, era_end, era_ev, era_pos, n0, L0, R0, Rr0, eL,eR,eRr, nb);
                    have_era=0;
                }
                if(!have_era){
                    have_era=1; era_start=step; era_pos=pos; n0=nb; era_ev=0;
                    L0=blocks[pos]; R0=blocks[pos+1]; Rr0=blocks[pos+2];
                }
                eL=blocks[pos]; eR=blocks[pos+1]; eRr=blocks[pos+2];
                era_end=step; era_ev++;
                if(in_churn){ printf("CHURNEND %lld %lld n=%lld\n", churn_t0, churn_t1, churn_n); in_churn=0; }
            } else {
                if(have_era){
                    printf("ERA %lld %lld ev=%lld pos=%d n0=%d L0=%lld R0=%lld Rr0=%lld end=(%lld,%lld,%lld) nb=%d\n",
                        era_start, era_end, era_ev, era_pos, n0, L0, R0, Rr0, eL,eR,eRr, nb);
                    have_era=0;
                }
                if(!in_churn){ in_churn=1; churn_t0=step; churn_n=0; }
                churn_t1=step; churn_n++; churn_nb=nb;
            }
            if(s) free(s);
            evcount++;
        }
        if(have_era) printf("ERA %lld %lld ev=%lld pos=%d n0=%d L0=%lld R0=%lld Rr0=%lld end=(%lld,%lld,%lld) nb=%d\n",
            era_start, era_end, era_ev, era_pos, n0, L0, R0, Rr0, eL,eR,eRr, n0);
        if(in_churn) printf("CHURNEND %lld %lld n=%lld\n", churn_t0, churn_t1, churn_n);
        printf("DONE at %lld st=%c h=%lld lo=%lld hi=%lld\n",step,'A'+st,head,lo,hi);
        return 0;
    }

    if(!strcmp(mode,"guard")){
        // guard <cap> <Ss>: count halt-precondition hits for the given machine code.
        // Detects, per step, whether the current (state, head-neighborhood) satisfies any
        // halt-path precondition derived in attack-quad.md (per hole).
        long long hits=0; long long checked=0;
        while(step<cap){
            uint8_t sy=rd(head);
            int danger=0;
            long long h=head;
            if(st==2&&sy==1&&rd(h+1)==0&&rd(h+2)==1) danger=1;          // C1 path (cm16-type)
            if(st==1&&sy==0&&rd(h+1)==1&&rd(h+2)==0&&rd(h+3)==1) danger=1; // B0 landing (cm16)
            if(st==0&&sy==1&&rd(h+1)==0&&rd(h+2)==1&&rd(h+3)==0&&rd(h+4)==1) danger=1; // A0 entry (cm16)
            // generic: hole state entered next step with lethal read
            Trans tr=T[st][sy];
            if(tr.next==6){ printf("HALT at %lld\n",step); return 0; }
            // would the NEXT state read the hole symbol? i.e. T[tr.next][rd(head+tr.move)] is hole
            long long nh=head+tr.move; int nsy=rd(nh);
            if(T[tr.next][nsy].next==6) { hits++; }
            wr(head,tr.write); head+=tr.move; st=tr.next; step++; checked++;
        }
        printf("GUARD steps=%lld hole-threats=%lld\n", checked, hits);
        return 0;
    }

    if(!strcmp(mode,"audit")){
        // audit <cap>: per step: (a) halt-precondition (hole-entry target reads hole symbol),
        // (b) island (0^1,1^1,0^1) within head+/-60 with 5-run completeness, head-distance class,
        // (c) local wave key = (state, cells h-2..h+2) -> 2^22 bitset; report distinct + last-new.
        long long dangers=0, islNear=0, islFar=0; long long lastNewKey=0, nkeys=0; long long t0=0; long long h=head;
        unsigned char *seen = calloc(1u<<22, 1);
        long long scanbuf[2*256];
        while(step<cap){
            uint8_t sy=rd(head); Trans tr=T[st][sy];
            // (a) danger: about to execute the transition whose target cell reads hole next step
            { long long nh=head+tr.move; int nsy=rd(nh);
              if(T[tr.next][nsy].next==6) dangers++; }
            // (b) island audit: runs in [h-70,h+70], islands with 5-run completeness inside [h-60,h+60]
            { long long W=70; long long lo=h-W, hi=h+W;
              int n=0; long long p=lo, rs[512], rv[512];
              while(p<hi){ long long v=rd(p); long long q=p; while(q<hi&&rd(q)==v)q++; if(n<510){rs[n]=p;rv[n]=v;} else {rs[n]=-1;rv[n]=-1;} n++; long long len=q-p; p=q; if(v){} if(n>=510) break; }
              // recount with lengths properly
              n=0; p=lo; long long lens[512], vls[512];
              while(p<hi){ long long v=rd(p); long long q=p; while(q<hi&&rd(q)==v)q++; if(n<510){lens[n]=q-p;vls[n]=v;rs[n]=p;} n++; p=q; if(n>=510) break; }
              long long alo=h-60, ahi=h+60;
              // danger pentomino: 1,0,1,0,1 (5 complete runs inside audit window)
              for(int i=2;i+2<n&&i<508;i++){
                if(vls[i]==1&&lens[i]==1&&vls[i-1]==0&&lens[i-1]==1&&vls[i+1]==0&&lens[i+1]==1
                   && vls[i-2]==1&&lens[i-2]>=1&&vls[i+2]==1&&lens[i+2]>=1
                   && rs[i-2]>=alo && rs[i+2]+lens[i+2]<=ahi){
                  long long cc=rs[i]; // island cell; halt also needs the B-landing at cc-2 (state-dependent)
                  long long bc=cc-2;
                  if(llabs(h-cc)<=1||llabs(h-(cc+1))<=1) islNear++;
                  else if(llabs(h-bc)<=2) islNear++;
                  else { islFar++; if(islFar<=8) printf("PENTFAR step=%lld cc=%lld head=%lld st=%c w=%d\n", step, cc, head, (char)('A'+st), (int)rd(head)); }
                }
              }
            }
            // (c) local key
            { unsigned long long k=2166136261ULL; k^=st; k*=16777619ULL;
              for(long long d=-2;d<=2;d++){ k^=rd(head+d); k*=16777619ULL; }
              unsigned long long b=(k>>8)&((1u<<22)-1);
              if(!seen[b]){ seen[b]=1; nkeys++; lastNewKey=step; } }
            if(tr.next==6){ printf("HALT at %lld\n",step); return 0; }
            wr(head,tr.write); head+=tr.move; st=tr.next; step++; h=head;
        }
        free(seen);
        printf("AUDIT steps=%lld dangers=%lld islNear=%lld islFar=%lld localKeys=%lld lastNewKey=%lld\n",
            step, dangers, islNear, islFar, nkeys, lastNewKey);
        return 0;
    }
    char prevkey[4096]=""; long long evinphase=0;
    while(step<cap){
        if(evmask_st>=0&&(strcmp(mode,"evc")==0||step>=evstart)&&st==evmask_st&&(evmask_sy<0||rd(head)==evmask_sy)&&evcount<evmax){
            evcount++;
            if(!strcmp(mode,"evc")){
                char *s; long long pop; int runs=rle(lo,hi,&s,&pop);
                char scopy[8192]; strncpy(scopy,s,8191); scopy[8191]=0;
                // structural key: all tokens except token positions 3,4,5,6,7 (triple + its two gaps)
                char key[4096]="0"; int tok=0;
                for(char *t=strtok(scopy," ");t;t=strtok(NULL," ")){
                    if(tok<5||tok>10||runs<9){ if(tok<200) strncat(key,t,32), strncat(key,";",2); }
                    tok++;
                }
                evinphase++;
                if(evinphase%evcevery==0){
                    printf("EV %lld %c%d h=%lld rel=%lld n=%d R %s\n", step,'A'+st,rd(head),head,head-lo,runs,s);
                }
                free(s);
                uint8_t sy2=rd(head); Trans tr2=T[st][sy2]; usecnt[st][sy2]++;
                if(tr2.next==6){ printf("HALT at %lld\n",step); return 0; }
                wr(head,tr2.write); head+=tr2.move; st=tr2.next; step++;
                continue;
            }
            if(step>=evstart){
                char *s; long long pop; int runs=rle(lo,hi,&s,&pop);
                printf("EV %lld %c%d h=%lld lo=%lld hi=%lld pop=%lld width=%lld runs=%d rel=%lld R %s\n",
                    step,'A'+st,rd(head),head,lo,hi,pop,hi-lo,runs,head-lo,s);
                free(s);
            }
        }
        if(wvevery&&(step%wvevery==0)){ char *s; long long pop; int runs=rle(lo,hi,&s,&pop);
            printf("WV %lld st=%c h=%lld pop=%lld width=%lld runs=%d rel=%lld R %s\n",step,'A'+st,head,pop,hi-lo,runs,head-lo,s); free(s); }
        uint8_t sy=rd(head); Trans tr=T[st][sy]; usecnt[st][sy]++;
        if(tr.next==6){ printf("HALT at %lld\n",step); return 0; }
        wr(head,tr.write); head+=tr.move; st=tr.next; step++;
    }
    if(!strcmp(mode,"run")) printf("DONE at %lld st=%c h=%lld lo=%lld hi=%lld\n",step,'A'+st,head,lo,hi);
    else if(!strcmp(mode,"stats")){
        for(int i=0;i<6;i++)for(int j=0;j<2;j++) if(usecnt[i][j])
            printf("USE %c%d %lld\n",'A'+i,j,usecnt[i][j]);
        print_cfg(head,st,step);
    }
    else print_cfg(head,st,step);
    return 0;
}
