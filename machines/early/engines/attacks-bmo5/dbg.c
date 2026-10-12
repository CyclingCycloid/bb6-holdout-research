#include <stdio.h>
static const int W[6][2] = {{1,0},{1,0},{1,1},{1,1},{1,0},{-1,0}};
static const int M[6][2] = {{+1,-1},{-1,+1},{+1,-1},{-1,-1},{+1,-1},{0,+1}};
static const int X[6][2] = {{1,3},{2,0},{0,2},{0,4},{5,2},{-1,4}};
int main(){
    #define R 40
    unsigned char t[2*R]; for(int i=0;i<2*R;i++)t[i]=0;
    int head=R, state=0;
    for(int st=0; st<40; st++){
        int s=t[head];
        printf("step %2d state %c pos %+d read %d", st, 'A'+state, head-R, s);
        int nx=X[state][s];
        if(nx<0){ printf(" -> HALT\n"); return 0; }
        printf(" -> write %d move %c goto %c\n", W[state][s], M[state][s]>0?'R':'L', 'A'+nx);
        t[head]=W[state][s]; head+=M[state][s]; state=nx;
        printf("         tape[%d..%d]: ", -8, 8);
        for(int p=R-8;p<=R+8;p++) printf("%d", t[p]);
        printf("  head %+d\n", head-R);
    }
    return 0;
}
