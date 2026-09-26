#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
static const int N[6][2] = {{1,3},{2,4},{0,3},{1,2},{2,5},{3,-1}};
int main(void){
  printf("hello\n"); fflush(stdout);
  int x = N[0][1];
  printf("N01=%d\n", x); fflush(stdout);
  return 0;
}
