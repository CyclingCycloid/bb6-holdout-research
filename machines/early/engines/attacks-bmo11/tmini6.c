#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
static const int W[6][2] = {{1,0},{0,0},{1,0},{0,0},{1,1},{0,-1}};
static const int D[6][2] = {{1,-1},{1,1},{-1,1},{1,1},{1,1},{-1,-1}};
static const int N[6][2] = {{1,3},{2,4},{0,3},{1,2},{2,5},{3,-1}};
static const int H[6][2] = {{0,0},{0,0},{0,0},{0,0},{0,0},{0,1}};
static uint8_t *tape; static int64_t base; static size_t cap;
static inline uint8_t rd(int64_t p){ return tape[p - base]; }
int main(int argc, char **argv){
  int64_t steps = argc>1? atoll(argv[1]) : 100;
  printf("start steps=%lld\n",(long long)steps); fflush(stdout);
  cap = (size_t)(1<<24) + (1<<24);
  tape = calloc(cap,1); base = (1<<24); if(!tape){printf("CALLOC FAILED
");return 9;} printf("tape=%p
",(void*)tape); fflush(stdout);
  printf("alloc ok\n"); fflush(stdout);
  int64_t head=0; int st=0;
  for(int64_t s=1;s<=steps;s++){
    int b = rd(head);
    if(H[st][b]){ printf("HALT\n"); return 0; }
    tape[head-base] = (uint8_t)W[st][b];
    head += D[st][b];
    st = N[st][b];
    printf("s=%lld st=%d\n",(long long)s,st); fflush(stdout);
  }
  printf("done st=%d\n", st);
  return 0;
}
