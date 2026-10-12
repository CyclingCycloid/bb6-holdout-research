// tm11c.c — fast TM runner for BMO11 machine 1RB0LD_0LC0RE_1LA0RD_0RB0LC_1RC1RF_0LD---
// States A..F; F/1 is the (undefined) halting transition --- i.e. HALT.
// Tape: byte array, growable both directions.
// Usage: tm11c.exe <steps> [reportEvery]
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>

/* transitions: [state][bit] = {write, dir(+1/-1), next(0..5), halt} */
/* A=0 B=1 C=2 D=3 E=4 F=5 */
/* A0:1RB  A1:0LD ; B0:0LC  B1:0RE ; C0:1LA  C1:0RD ; D0:0RB  D1:0LC ; E0:1RC  E1:1RF ; F0:0LD  F1:--- (HALT) */
static const int W[6][2] = {{1,0},{0,0},{1,0},{0,0},{1,1},{0,-1}};
static const int D[6][2] = {{1,-1},{-1,1},{-1,1},{1,-1},{1,1},{-1,-1}};
static const int N[6][2] = {{1,3},{2,4},{0,3},{1,2},{2,5},{3,-1}};
static const int H[6][2] = {{0,0},{0,0},{0,0},{0,0},{0,0},{0,1}};

#define LO_CAP (1<<24)
#define HI_CAP (1<<24)
static uint8_t *tape; static int64_t base; static size_t cap;
static inline uint8_t rd(int64_t p){ return tape[p + base]; }
static inline void wr(int64_t p, uint8_t v){ tape[p + base] = v; }

int main(int argc, char **argv){
  int64_t steps = argc>1? atoll(argv[1]) : 100000000;
  int64_t rep = argc>2? atoll(argv[2]) : 0;
  int64_t wlo = argc>4? atoll(argv[4]) : -1;   // window-dump: tape every step in [wlo,whi]
  int64_t whi = argc>5? atoll(argv[5]) : -1;
  cap = (size_t)LO_CAP + HI_CAP;
  tape = calloc(cap, 1);
  if(!tape){ fprintf(stderr,"oom\n"); return 3; }
  base = LO_CAP;
  int64_t head = 0; int st = 0; int64_t s;
  for(s = 1; s <= steps; s++){
    int b = rd(head);
    if(H[st][b]){ printf("HALT at step %lld (state F reading %d)\n", (long long)s, b); return 0; }
    wr(head, (uint8_t)W[st][b]);
    head += D[st][b];
    if(head + base < 1024 || head + base > (int64_t)cap - 1024){
      fprintf(stderr, "tape out of bounds at step %lld (head %lld base %lld)\n", (long long)s, (long long)head, (long long)base); return 2;
    }
    st = N[st][b];
    if(rep && s % rep == 0){
      int64_t lo=-base, hi=(int64_t)cap-1-base;
      while(lo<hi && !rd(lo)) lo++;
      while(hi>lo && !rd(hi)) hi--;
      printf("step %lld state %c head %lld span [%lld,%lld]\n",(long long)s,"ABCDEF"[st],(long long)head,(long long)lo,(long long)hi);
      fflush(stdout);
    }
    if(wlo >= 0 && s >= wlo && s <= whi){
      int64_t lo=-base, hi=(int64_t)cap-1-base;
      while(lo<hi && !rd(lo)) lo++;
      while(hi>lo && !rd(hi)) hi--;
      char buf[8192]; int64_t n=hi-lo+1;
      for(int64_t i=0;i<n;i++) buf[i]= rd(lo+i)?'1':'0';
      buf[n]=0;
      printf("TAPE %lld state %c head %lld [%lld,%lld] %s\n",(long long)s,"ABCDEF"[st],(long long)head,(long long)lo,(long long)hi,buf);
    }
    if(rep < 0 && s % (-rep) == 0){
      int64_t lo=-base, hi=(int64_t)cap-1-base;
      while(lo<hi && !rd(lo)) lo++;
      while(hi>lo && !rd(hi)) hi--;
      char buf[8192]; int64_t n=hi-lo+1;
      for(int64_t i=0;i<n;i++) buf[i]= rd(lo+i)?'1':'0';
      buf[n]=0;
      printf("TAPE %lld state %c head %lld [%lld,%lld] %s\n",(long long)s,"ABCDEF"[st],(long long)head,(long long)lo,(long long)hi,buf);
      fflush(stdout);
    }
  }
  int64_t lo=-base, hi=(int64_t)cap-1-base;
  while(lo<hi && !rd(lo)) lo++;
  while(hi>lo && !rd(hi)) hi--;
  printf("NO HALT in %lld steps; final state %c head %lld span [%lld,%lld]\n",(long long)steps,"ABCDEF"[st],(long long)head,(long long)lo,(long long)hi);
  return 1;
}
