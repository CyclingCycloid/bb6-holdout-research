#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
static const int W[6][2] = {{1,0},{0,0},{1,0},{0,0},{1,1},{0,-1}};
static const int D[6][2] = {{1,-1},{1,1},{-1,1},{1,1},{1,1},{-1,-1}};
static const int N[6][2] = {{1,3},{2,4},{0,3},{1,2},{2,5},{3,-1}};
static const int H[6][2] = {{0,0},{0,0},{0,0},{0,0},{0,0},{0,1}};
#define LO_CAP (1<<24)
static uint8_t *tape; static int64_t base; static size_t cap;
static inline uint8_t rd(int64_t p){ return tape[p - base]; }
int main(int argc, char **argv){
  int64_t steps = argc>1? atoll(argv[1]) : 100;
  fprintf(stderr,"start steps=%lld\n",(long long)steps);
  cap = (size_t)(1<<24) + (1<<24);
  tape = calloc(cap,1); base = (1<<24);
  int64_t head=0; int st=0;
  for(int64_t s=1;s<=steps;s++){
    int b = rd(head);
    fprintf(stderr,"s=%lld st=%d b=%d\n",(long long)s,st,b);
    if(H[st][b]){ printf("HALT\n"); return 0; }
    wr_dummy: ;
    tape[head-base] = (uint8_t)W[st][b];
    head += D[st][b];
    st = N[st][b];
  }
  printf("done st=%d\n", st);
  return 0;
}
