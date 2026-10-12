// bfs11.c — exhaustive BFS over ALL strategies of the BMO 11 rewrite game.
//   #0->1 ; #100->010# ; #1010->1010## ; #10110->10101 ; #11->10
// State: canonical ctx6(psi)+deviation over {0,1,#} (word = periodic-left + state + 0^inf).
// Phase-aware canon identical to game11.mjs (strips maximal in-phase "10#" prefix,
// including into implicit trailing zeros, re-emits 6 pattern symbols).
// Dedup: 128-bit hash open addressing. Goal: tail of rightmost # starts 10111.
// Tallies: 111 / 10111 / 1#01 occurrences, max runs.
// Usage: bfs11c.exe <maxdepth> <hbits> <maxstatesM>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>

#define MAXS 720
#define PAD 16
static const char CYC[3] = {'1','0','#'};
static const char *CTX6[3] = {"10#10#", "0#10#1", "#10#10"};
static const char *RHS[5] = {"1", "010#", "1010##", "10101", "10"};
static int LHL[5] = {2, 4, 5, 6, 3};

/* ---------- 128-bit hash set ---------- */
static uint64_t *keys; static size_t hcap;
static inline uint64_t mix(uint64_t x) { x += 0x9e3779b97f4a7c15ULL; x = (x ^ (x >> 30)) * 0xbf58476d1ce4e5b9ULL; x = (x ^ (x >> 27)) * 0x94d049bb133111ebULL; return x ^ (x >> 31); }
static int hs_add(const char *s) {
  uint64_t h1 = 1469598103934665603ULL, h2 = 14695981039346656037ULL;
  for (const char *p = s; *p; p++) { h1 = (h1 ^ (unsigned char)*p) * 1099511628211ULL; h2 = (h2 ^ ((unsigned char)*p + 7)) * 14029467366897019727ULL; }
  h1 = mix(h1); h2 = mix(h2 ^ 0x1234567);
  size_t i = h1 & (hcap - 1);
  for (;;) {
    if (keys[2*i] == 0 && keys[2*i+1] == 0) { keys[2*i] = h1 | 1; keys[2*i+1] = h2; return 1; }
    if (keys[2*i] == (h1 | 1) && keys[2*i+1] == h2) return 0;
    i = (i + 1) & (hcap - 1);
  }
}

/* ---------- phase-aware canon ---------- */
static char Tmp[MAXS * 2 + 64];
/* canon raw (first char at phase phi) into out */
static void canon11(const char *raw, int phi, char *out) {
  size_t n = strlen(raw);
  while (n > 0 && raw[n-1] == '0') n--;
  size_t i = 0;
  for (;;) {
    char exp = CYC[(phi + (int)i) % 3];
    char act = i < n ? raw[i] : '0';
    if (exp == act) i++; else break;
  }
  int psi = (phi + (int)i) % 3;
  memcpy(out, CTX6[psi], 6);
  size_t rem = (i < n) ? n - i : 0;
  memcpy(out + 6, raw + i, rem);
  out[6 + rem] = 0;
}
static int phaseOf(const char *state) {
  for (int p = 0; p < 3; p++) if (!strncmp(state, CTX6[p], 6)) return p;
  fprintf(stderr, "bad state (no ctx6): %.20s\n", state); exit(4);
}

/* ---------- window + rules ---------- */
static char V[MAXS * 2 + 64];
static size_t window(const char *S) {
  size_t n = strlen(S);
  memcpy(V, S, n); memset(V + n, '0', PAD); V[n + PAD] = 0;
  return n + PAD;
}
static int matchAt(size_t i) { /* i indexes a '#' in V */
  char c1 = V[i+1], c2 = V[i+2], c3 = V[i+3], c4 = V[i+4], c5 = V[i+5];
  if (c1 == '0') return 0;
  if (c1 == '1' && c2 == '0' && c3 == '0') return 1;
  if (c1 == '1' && c2 == '0' && c3 == '1' && c4 == '0') return 2;
  if (c1 == '1' && c2 == '0' && c3 == '1' && c4 == '1' && c5 == '0') return 3;
  if (c1 == '1' && c2 == '1') return 4;
  return -1;
}
static void applyAt(const char *S, size_t i, int rule, char *out) {
  size_t n = window(S);
  size_t lh = LHL[rule]; size_t rl = strlen(RHS[rule]);
  memcpy(Tmp, V, i);
  memcpy(Tmp + i, RHS[rule], rl);
  memcpy(Tmp + i + rl, V + i + lh, n - i - lh + 1);
  Tmp[i + rl + (n - i - lh) + 1] = 0;
  canon11(Tmp, phaseOf(S), out);
}

/* goal + tallies on a canonical state */
static int isGoal(const char *S) {
  const char *h = strrchr(S, '#');
  const char *t = h ? h + 1 : S;
  char buf[32]; size_t n = strlen(t); if (n > 24) n = 24;
  memcpy(buf, t, n); memset(buf + n, '0', 26 - n);
  return !strncmp(buf, "10111", 5);
}
static int has111, has10111, has1h01; /* tallies (globals reset per level in main msg) */
static void tallies(const char *S, int *z, int *hh, int *o) {
  *z = *hh = *o = 0; int cz=0,ch=0,co=0; char last=0;
  for (const char *p = S; ; p++) {
    if (*p != last) {
      if (last=='0'&&cz>*z)*z=cz; if(last=='#'&&ch>*hh)*hh=ch; if(last=='1'&&co>*o)*o=co;
      cz=ch=co=0; last=*p;
    }
    if (*p=='0')cz++; else if(*p=='#')ch++; else if(*p=='1')co++; else break;
  }
}

/* ---------- BFS ---------- */
static char *frontier, *nextf;
int main(int argc, char **argv) {
  int maxdepth = argc > 1 ? atoi(argv[1]) : 110;
  int hbits = argc > 2 ? atoi(argv[2]) : 26;
  size_t maxstates = (argc > 3 ? (size_t)atof(argv[3]) : 60) * 1000000;
  hcap = 1ULL << hbits;
  keys = calloc(2 * hcap, sizeof(uint64_t));
  size_t fcap = 15500000;
  frontier = malloc((size_t)fcap * MAXS); nextf = malloc((size_t)fcap * MAXS);
  if (!keys || !frontier || !nextf) { fprintf(stderr, "oom\n"); return 3; }
  size_t nf = 1, nf2 = 0, total = 1;
  char init[64]; canon11("", 0, init); /* "10#10#" */
  if (strcmp(init, "10#10#")) { fprintf(stderr, "canon selftest fail: %s\n", init); return 5; }
  memcpy(frontier, init, strlen(init) + 1);
  hs_add(init);
  char out[MAXS];
  long t111 = 0, t10111 = 0, t1h01 = 0;
  for (int d = 1; d <= maxdepth; d++) {
    nf2 = 0;
    int maxz = 0, maxh = 0, maxo = 0;
    for (size_t k = 0; k < nf; k++) {
      const char *S = frontier + k * MAXS;
      size_t n = window(S);
      for (size_t i = 0; i + 1 < n; i++) {
        if (V[i] != '#') continue;
        int rule = matchAt(i);
        if (rule < 0) continue;
        applyAt(S, i, rule, out);
        if (isGoal(out)) { printf("GOAL at depth %d: %s\n", d, out); fflush(stdout); return 0; }
        if (strlen(out) > MAXS - 60) { printf("state too long at depth %d: %zu\n", d, strlen(out)); fflush(stdout); return 6; }
        if (strstr(out, "111")) t111++;
        if (strstr(out, "10111")) t10111++;
        if (strstr(out, "1#01")) t1h01++;
        if (hs_add(out)) {
          if (nf2 >= fcap) { printf("frontier overflow depth %d\n", d); return 7; }
          memcpy(nextf + nf2 * MAXS, out, strlen(out) + 1); nf2++;
          int z, hh, o; tallies(out, &z, &hh, &o);
          if (z > maxz) maxz = z; if (hh > maxh) maxh = hh; if (o > maxo) maxo = o;
        }
      }
      if (total + nf2 > maxstates) { printf("state limit at depth %d\n", d); goto done; }
    }
    char *sw = frontier; frontier = nextf; nextf = sw;
    nf = nf2; total += nf2;
    printf("depth %d: frontier %zu total %zu maxruns z=%d h=%d o=%d 111=%ld 10111=%ld 1#01=%ld\n", d, nf, total, maxz, maxh, maxo, t111, t10111, t1h01);
    fflush(stdout);
    if (!nf) break;
  }
done:
  printf("DONE total states %zu (hash load %.3f)\n", total, (double)total / (double)hcap);
  return 0;
}
