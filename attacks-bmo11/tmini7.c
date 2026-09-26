#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
int main(void){
  size_t cap = (size_t)(1<<24) + (1<<24);
  uint8_t *tape = calloc(cap,1);
  printf("tape=%p cap=%zu\n",(void*)tape,cap); fflush(stdout);
  if(!tape) return 9;
  int64_t base = (1<<24);
  tape[base] = 7;
  printf("ok %d\n", tape[base]); fflush(stdout);
  return 0;
}
