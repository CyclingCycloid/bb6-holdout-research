#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
static const int W[6][2] = {{1,0},{0,0},{1,0},{0,0},{1,1},{0,-1}};
static uint8_t *tape; static int64_t base;
static inline uint8_t rd(int64_t p){ return tape[p - base]; }
int main(void){
  printf("hello\n"); fflush(stdout);
  return 0;
}
