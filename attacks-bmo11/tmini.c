#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#define LO_CAP (1<<24)
#define HI_CAP (1<<24)
static uint8_t *tape; static int64_t base; static size_t cap;
int main(void){
  fprintf(stderr, "A\n");
  cap = (size_t)LO_CAP + HI_CAP;
  tape = calloc(cap, 1);
  fprintf(stderr, "B tape=%p cap=%zu\n", (void*)tape, cap);
  base = LO_CAP;
  tape[base] = 1;
  fprintf(stderr, "C %d\n", tape[base]);
  return 0;
}
