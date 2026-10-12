// Fast BFS over the BMO10 rewrite game in C.
// State: canonical string S over {0,1,#} (word = ...10#10# S 0^inf).
// Dedup: 64-bit hash set (probabilistic; false merges astronomically unlikely with
// 2 independent hashes - we store both: 128-bit key, open addressing).
// Tracks: goal detection, max run lengths by depth, tail-head set, state counts.
//
// Usage: bfs.exe <maxdepth> <maxstates_M> <out-prefix>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>

#define MAXS 1200
#define PAD 12
#define LEFTCTX "10#10#"

/* ---------- 128-bit hash set ---------- */
static uint64_t *keys; static size_t cap, used;
static void hs_init(size_t n) { cap = n; keys = calloc(2 * n, sizeof(uint64_t)); used = 0; }
static inline uint64_t mix(uint64_t x) { x += 0x9e3779b97f4a7c15ULL; x = (x ^ (x >> 30)) * 0xbf58476d1ce4e5b9ULL; x = (x ^ (x >> 27)) * 0x94d049bb133111ebULL; return x ^ (x >> 31); }
static int hs_add(const char *s) { // returns 1 if newly added
  uint64_t h1 = 1469598103934665603ULL, h2 = 14695981039346656037ULL;
  for (const char *p = s; *p; p++) { h1 = (h1 ^ (unsigned char)*p) * 1099511628211ULL; h2 = (h2 ^ ((unsigned char)*p + 7)) * 14029467366897019727ULL; }
  h1 = mix(h1); h2 = mix(h2 ^ 0x1234567);
  size_t i = h1 & (cap - 1);
  for (;;) {
    if (keys[2 * i] == 0 && keys[2 * i + 1] == 0) { keys[2 * i] = h1 | 1; keys[2 * i + 1] = h2; used++; return 1; }
    if (keys[2 * i] == (h1 | 1) && keys[2 * i + 1] == h2) return 0;
    i = (i + 1) & (cap - 1);
  }
}

/* ---------- game ops ---------- */
static char V[MAXS * 2 + 64];
/* canonicalize in place into out; returns out */
static char *canon(const char *in, char *out) {
  const char *s = in;
  while (s[0] == '1' && s[1] == '0' && s[2] == '#') s += 3;
  size_t n = strlen(s);
  while (n > 0 && s[n - 1] == '0') n--;
  memcpy(out, s, n); out[n] = 0;
  return out;
}
/* build window; return length */
static size_t window(const char *S) {
  size_t n = strlen(S);
  memcpy(V, LEFTCTX, 6); memcpy(V + 6, S, n); memset(V + 6 + n, '0', PAD);
  return 6 + n + PAD;
}
/* rule id matching at '#' V[i], or -1 */
static int matchAt(size_t i) {
  const char c1 = V[i + 1], c2 = V[i + 2], c3 = V[i + 3], c4 = V[i + 4];
  if (c1 == '0') return 0;                       /* #0 -> 1 */
  if (c1 == '1' && c2 == '0' && c3 == '0') return 1; /* #100 -> 000# */
  if (c1 == '1' && c2 == '1' && c3 == '0') return 2; /* #110 -> 000# */
  if (c1 == '1' && c2 == '0' && c3 == '1' && c4 == '0') return 3; /* #1010 -> 1010## */
  return -1;
}
static const char *RHS[4] = {"1", "000#", "000#", "1010##"};
static int LHL[4] = {2, 4, 4, 5};

/* apply at V-index i into tmp then canon into out */
static char tmp[MAXS * 2 + 64];
static char *applyAt(const char *S, size_t i, int rule, char *out) {
  size_t n = window(S);
  size_t lh = LHL[rule];
  memcpy(tmp, V, i); strcpy(tmp + i, RHS[rule]); memcpy(tmp + i + strlen(RHS[rule]), V + i + lh, n - i - lh + 1);
  return canon(i == 5 ? tmp + 3 : tmp + 6, out);
}

/* goal: tail after rightmost # starts with 111 or 1011 */
static int isGoal(const char *S) {
  const char *h = strrchr(S, '#');
  const char *t = h ? h + 1 : S;
  char buf[32]; size_t n = strlen(t); if (n > 20) n = 20;
  memcpy(buf, t, n); memset(buf + n, '0', 24 - n);
  return !strncmp(buf, "111", 3) || !strncmp(buf, "1011", 4);
}

/* ---------- BFS ---------- */
static char *frontier, *nextf; static size_t fcap;
int main(int argc, char **argv) {
  int maxdepth = argc > 1 ? atoi(argv[1]) : 100;
  size_t maxstates = (argc > 2 ? (size_t)atof(argv[2]) : 20) * 1000000;
  int hbits = argc > 3 ? atoi(argv[3]) : 25;
  hs_init(1ULL << hbits);
  fcap = 1200000;
  frontier = malloc(fcap * MAXS); nextf = malloc(fcap * MAXS);
  if (!frontier || !nextf) { fprintf(stderr, "oom\n"); return 3; }
  size_t nf = 1, nf2 = 0;
  frontier[0] = 0; /* empty S */
  hs_add("");
  size_t total = 1;
  char out[MAXS];
  static char tailset[200000][24]; static size_t ntail = 0;
  for (int d = 1; d <= maxdepth; d++) {
    nf2 = 0;
    int maxz = 0, maxh = 0, maxo = 0;
    for (size_t k = 0; k < nf; k++) {
      const char *S = frontier + k * MAXS;
      size_t n = window(S);
      for (size_t i = 5; i + 1 < n; i++) {
        if (V[i] != '#') continue;
        int rule = matchAt(i);
        if (rule < 0) continue;
        applyAt(S, i, rule, out);
        if (isGoal(out)) { printf("GOAL at depth %d: %s\n", d, out); fflush(stdout); return 0; }
        if (strlen(out) > MAXS - 40) continue;
        if (hs_add(out)) {
          memcpy(nextf + nf2 * MAXS, out, strlen(out) + 1); nf2++;
          /* run stats */
          int z = 0, h2 = 0, o = 0, cz = 0, ch = 0, co = 0;
          char last = 0;
          for (const char *p = out; ; p++) {
            if (*p != last) {
              if (last == '0' && cz > z) z = cz;
              if (last == '#' && ch > h2) h2 = ch;
              if (last == '1' && co > o) o = co;
              cz = ch = co = 0; last = *p;
            }
            if (*p == '0') cz++;
            else if (*p == '#') ch++;
            else if (*p == '1') co++;
            else break;
          }
          if (z > maxz) maxz = z; if (h2 > maxh) maxh = h2; if (o > maxo) maxo = o;
          /* tail head */
          const char *hh = strrchr(out, '#'); const char *t = hh ? hh + 1 : out;
          int found = 0;
          for (size_t q = 0; q < ntail; q++) if (!strncmp(tailset[q], t, 12)) { found = 1; break; }
          if (!found && ntail < 200000) { size_t L = strlen(t); if (L > 12) L = 12; memcpy(tailset[ntail], t, L); memset(tailset[ntail] + L, '0', 12 - L); ntail++; }
        }
      }
      if (total + nf2 > maxstates) { printf("state limit at depth %d\n", d); goto done; }
    }
    char *sw = frontier; frontier = nextf; nextf = sw;
    nf = nf2; total += nf;
    printf("depth %d: frontier %zu total %zu maxruns z=%d h=%d o=%d\n", d, nf, total, maxz, maxh, maxo);
    fflush(stdout);
    if (!nf) break;
  }
done:
  printf("total states %zu; distinct tail heads %zu\n", total, ntail);
  for (size_t q = 0; q < ntail; q++) printf("TAIL %s\n", tailset[q]);
  return 0;
}
