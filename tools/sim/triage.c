/*
 * triage.c — batch behavioral triage for 6-state 2-symbol TMs (blank tape, state A, head 0).
 *
 * Usage:
 *   triage <FAMILY_LABEL> <CODEFILE> <CAP_STEPS>            batch mode -> TSV lines to stdout
 *   triage DETAIL <CODE> <CAP_STEPS> [D0MAX]                single machine, verbose checkpoints + D-on-0 events
 *
 * CODE format: 36 chars (12 transitions x3: write,dir,next), '_'/'-' stripped/ignored.
 *
 * Per machine (batch): simulate up to CAP steps with geometric checkpoints (t_k = 1000*1.25^k).
 * At each checkpoint record: step, state, head, true 1-span [lo1,hi1], pop, FNV64 fingerprint
 * of [lo1..hi1] content mixed with head-lo1 and pop, and an RLE prefix (<=48 runs).
 * After the run: translation-cycle detection (pairwise checkpoint compare: equal fp/pop/width/
 * head-rel  <=>  config at t_j is a translate of config at t_i  <=>  provable infinite loop),
 * growth exponents (least-squares log-log fit over last checkpoints), transition usage histogram,
 * count of (state D, symbol 0) decision events, and final RLE prefix.
 *
 * Status: HALT / UNDEF / CYCLE / TAPEHUGE / DONE
 * Output TSV (batch), one line per machine:
 *  family idx code status steps span_v pop lo1 hi1 head headstate
 *  alpha_span alpha_pop cyc_period cyc_drift cyc_pairs cps d0events
 *  runs_total rle(<=48 runs, ';'-separated, '^'=len)
 *  tr_top3 (usage% of 12 transitions)
 *
 * Notes: cycle detection is FNV64-hash-level (collision prob ~ cps^2/2^64, negligible; not
 * re-verified by re-simulation) — flagged as heuristic in downstream docs. Tape capped at
 * 2^27 cells (128MB); exceeding => TAPEHUGE (chaotic-suspect). lo1/hi1 scans share a cell-budget.
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include <math.h>

typedef struct { int write; int move; int next; } Trans; /* next: 0..5 states, 6 halt, -1 undef */
static Trans T[6][2];

#define TAPE_CAP  (1LL<<27)
#define MAXCP     256
#define RLE_MAX   48
#define D0REC_MAX 4096
#define SCAN_BUDGET (2LL<<30)

static uint8_t *buf = NULL;
static long long allo0 = 0, ahi1 = 0, shift = 0;
static long long vis_lo = 0, vis_hi = -1;   /* visited (written) bounds */
static long long pop1 = 0;                  /* number of 1s */
static int tape_toobig = 0;

typedef struct {
    long long step, lo1, hi1, head; long long pop;
    unsigned long long fp; int state; int valid;
    int rle_n; long long rle[RLE_MAX]; long long runs_total;
} CP;

static CP cps[MAXCP]; static int ncp = 0;
static long long cp_times[MAXCP]; static int ncp_times = 0;

static unsigned long long tr_use[6][2];
static long long d0_events = 0;

/* D-on-0 event records (only first D0REC_MAX) */
typedef struct { long long step, head; long long pop; long long spanv; int runs_n; long long lr[2*RLE_MAX]; } D0E;
static D0E d0rec[D0REC_MAX]; static int nd0rec = 0; static int d0_overflow = 0;
static int detail_mode = 0;

static void tape_init(void) {
    long long cap = 1 << 22;
    buf = (uint8_t*)calloc((size_t)cap, 1);
    if (!buf) { fprintf(stderr, "alloc fail\n"); exit(3); }
    allo0 = 0; ahi1 = cap; shift = 0; vis_lo = 0; vis_hi = -1; pop1 = 0; tape_toobig = 0;
}

static void ensure(long long lo, long long hi) {
    if (lo >= allo0 && hi <= ahi1) return;
    long long nlo = allo0, nhi = ahi1;
    while (lo < nlo) nlo -= (ahi1 - allo0) / 2;
    while (hi > nhi) nhi += (ahi1 - allo0) / 2;
    if (nhi - nlo > TAPE_CAP || (nhi - nlo) / 2 > TAPE_CAP) { tape_toobig = 1; return; }
    uint8_t *nb = (uint8_t*)calloc((size_t)(nhi - nlo), 1);
    if (!nb) { fprintf(stderr, "alloc fail (%lld cells)\n", nhi - nlo); exit(3); }
    memcpy(nb + (allo0 - nlo), buf + (allo0 - shift), (size_t)(ahi1 - allo0));
    free(buf); buf = nb; allo0 = nlo; ahi1 = nhi; shift = nlo;
}

static inline uint8_t rd(long long p) {
    if (p < allo0 || p >= ahi1) return 0;   /* never-allocated is 0 */
    return buf[p - shift];
}
static inline void wr(long long p, uint8_t v) {
    if (p < allo0 || p >= ahi1) { ensure(p, p + 1); if (tape_toobig) return; }
    uint8_t o = buf[p - shift];
    if (o != v) { pop1 += (long long)v - (long long)o; buf[p - shift] = v; }
    if (p < vis_lo) vis_lo = p;
    if (p > vis_hi) vis_hi = p;
}

static int parse_code(const char *code) {
    if (strlen(code) != 36) return 2;
    for (int i = 0; i < 12; i++) {
        const char *t = code + 3 * i;
        Trans *tr = &T[i / 2][i % 2];
        char w = t[0], d = t[1], n = t[2];
        tr->write = (w == '1') ? 1 : (w == '0' ? 0 : -1);
        tr->move  = (d == 'R') ? 1 : (d == 'L' ? -1 : 0);
        if (n == 'H' || n == 'Z') tr->next = 6;
        else if (n >= 'A' && n <= 'F') tr->next = n - 'A';
        else tr->next = -1;
    }
    return 0;
}

static unsigned long long fnv64(const uint8_t *p, long long n) {
    unsigned long long h = 1469598103934665603ULL;
    for (long long i = 0; i < n; i++) { h ^= p[i]; h *= 1099511628211ULL; }
    return h;
}

/* build checkpoint schedule: 1000 * 1.25^k while < CAP, plus CAP */
static void build_schedule(long long cap) {
    ncp_times = 0;
    long long t = 1000;
    while (t < cap && ncp_times < MAXCP - 2) {
        cp_times[ncp_times++] = t;
        t = (long long)((double)t * 1.25) + 1;
    }
    cp_times[ncp_times++] = cap;
}

/* RLE of [lo1..hi1] starting with a 1-run; store up to RLE_MAX runs; return total runs */
static long long rle_scan(long long lo1, long long hi1, long long *out, int *out_n) {
    long long runs = 0; int n = 0; int cur = 1; long long cnt = 0;
    long long budget_local = 0;
    for (long long p = lo1; p <= hi1; p++) {
        int v = rd(p);
        budget_local++;
        if (v == cur) cnt++;
        else { runs++; if (n < RLE_MAX) out[n++] = cnt; cur = v; cnt = 1; }
    }
    runs++; if (n < RLE_MAX) out[n++] = cnt;
    *out_n = n;
    return runs;
}

/* take checkpoint at given step/state/head; returns 0 ok, -1 scan budget exhausted */
static int take_cp(long long step, int state, long long head, long long *scan_used) {
    if (ncp >= MAXCP) return 0;
    CP *c = &cps[ncp++];
    memset(c, 0, sizeof *c);
    c->step = step; c->state = state; c->head = head; c->pop = pop1;
    if (vis_hi < vis_lo) { c->valid = 0; return 0; }
    if (pop1 == 0) {
        /* all-zero visited window: geometric signature + state (zero-writing cyclers) */
        c->lo1 = vis_lo; c->hi1 = vis_hi; c->valid = 1;
        unsigned long long h = fnv64(buf + (vis_lo - shift), vis_hi - vis_lo + 1);
        h ^= 0xDEADBEEFCAFEBABEULL; /* zero-tape salt */
        h ^= (unsigned long long)(head - vis_lo) * 0x9E3779B97F4A7C15ULL;
        h ^= (unsigned long long)state * 0x100000001B3FULL;
        c->fp = h; c->rle_n = 0; c->runs_total = 0;
        return 0;
    }
    /* find true lo1: scan from vis_lo rightward. NOTE: tape addresses can be negative,
     * so the sentinel must be far below any legal address. */
    long long lo1 = -(1LL<<62);
    for (long long p = vis_lo; p <= vis_hi; p++) {
        if (rd(p)) { lo1 = p; break; }
        if (++(*scan_used) > SCAN_BUDGET) return -1;
    }
    if (lo1 == -(1LL<<62)) { c->valid = 0; return 0; }
    long long hi1 = lo1;
    for (long long p = vis_hi; p >= lo1; p--) {
        if (rd(p)) { hi1 = p; break; }
        if (++(*scan_used) > SCAN_BUDGET) return -1;
    }
    c->lo1 = lo1; c->hi1 = hi1; c->valid = 1;
    long long w = hi1 - lo1 + 1;
    unsigned long long h = fnv64(buf + (lo1 - shift), w);
    h ^= (unsigned long long)(head - lo1) * 0x9E3779B97F4A7C15ULL;
    h ^= (unsigned long long)pop1 * 0xC2B2AE3D27D4EB4FULL;
    h ^= (unsigned long long)state * 0x100000001B3FULL; /* state must be part of config identity */
    c->fp = h;
    c->rle_n = 0; c->runs_total = 0;
    if (w <= (4LL << 20)) {
        c->runs_total = rle_scan(lo1, hi1, c->rle, &c->rle_n);
    } else { c->rle_n = 0; c->runs_total = -1; }
    return 0;
}

/* local RLE window around head (for D0 events) */
static void local_rle(long long head, long long *out, int *out_n) {
    long long W = 100; int n = 0;
    long long p = head - W;
    int cur = rd(p); long long cnt = 0;
    for (; p <= head + W; p++) {
        int v = rd(p);
        if (v == cur) cnt++;
        else { if (n < 2 * RLE_MAX) out[n++] = cnt; cur = v; cnt = 1; }
    }
    if (n < 2 * RLE_MAX) out[n++] = cnt;
    *out_n = n;
}

static void record_d0(long long step, long long head) {
    d0_events++;
    if (d0_events > D0REC_MAX) { d0_overflow = 1; return; }
    D0E *e = &d0rec[nd0rec++];
    e->step = step; e->head = head; e->pop = pop1;
    e->spanv = (vis_hi >= vis_lo) ? vis_hi - vis_lo + 1 : 0;
    local_rle(head, e->lr, &e->runs_n);
}

/* print recorded D-on-0 events (DETAIL mode only) */
static void print_d0recs(void) {
    printf("D0REC n=%d overflow=%d\n", nd0rec, d0_overflow);
    for (int i = 0; i < nd0rec; i++) {
        D0E *e = &d0rec[i];
        printf("D0 %lld head=%lld pop=%lld spanv=%lld R ", e->step, e->head, e->pop, e->spanv);
        for (int k = 0; k < e->runs_n && k < 2 * RLE_MAX; k++)
            printf("%lld^%lld ", (long long)(k % 2 ? 0 : 1), e->lr[k]);
        printf("\n");
    }
    fflush(stdout);
}

/* least-squares slope of ln(y) vs ln(x) over last k valid points */
static double fit_alpha(long long *xs, long long *ys, int n, int k) {    int m = 0; double sx=0, sy=0, sxx=0, sxy=0;
    for (int i = (n > k ? n - k : 0); i < n; i++) {
        if (xs[i] <= 0 || ys[i] <= 0) continue;
        double lx = log((double)xs[i]), ly = log((double)ys[i]);
        sx += lx; sy += ly; sxx += lx*lx; sxy += lx*ly; m++;
    }
    if (m < 3) return -1.0;
    double denom = (double)m * sxx - sx * sx;
    if (denom <= 0) return -1.0;
    return ((double)m * sxy - sx * sy) / denom;
}

static void print_batch_line(const char *fam, int idx, const char *code,
                             const char *status, long long steps, int state, long long head) {
    long long spanv = (vis_hi >= vis_lo) ? vis_hi - vis_lo + 1 : 0;
    /* cycle detection: earliest pair (i<j) with equal fp, pop, width, head-rel */
    long long cyc_p = -1, cyc_d = 0; int cyc_pairs = 0;
    for (int i = 0; i < ncp; i++) {
        if (!cps[i].valid) continue;
        for (int j = i + 1; j < ncp; j++) {
            if (!cps[j].valid) continue;
            if (cps[i].fp == cps[j].fp && cps[i].pop == cps[j].pop &&
                cps[i].hi1 - cps[i].lo1 == cps[j].hi1 - cps[j].lo1 &&
                cps[i].head - cps[i].lo1 == cps[j].head - cps[j].lo1) {
                cyc_pairs++;
                if (cyc_p < 0) {
                    cyc_p = cps[j].step - cps[i].step;
                    cyc_d = cps[j].lo1 - cps[i].lo1;
                }
            }
        }
    }
    (void)cyc_pairs;
    /* growth exponents from (step, span_v) of checkpoints */
    long long xs[MAXCP], ys[MAXCP], yp[MAXCP]; int n = 0;
    for (int i = 0; i < ncp; i++) {
        long long sv = (i == 0) ? 1 : 0;
        /* use visited span recomputed? we did not store it per cp; approximate with hi1-lo1 or skip */
        long long sp = cps[i].valid ? (cps[i].hi1 - cps[i].lo1 + 1) : 0;
        if (sp <= 0) sp = sv;
        if (sp <= 0) continue;
        xs[n] = cps[i].step; ys[n] = sp; yp[n] = cps[i].pop; n++;
    }
    double a_span = (n >= 3) ? fit_alpha(xs, ys, n, 10) : -1.0;
    double a_pop  = (n >= 3) ? fit_alpha(xs, yp, n, 10) : -1.0;
    /* transition usage top3 */
    struct { int st, sy; unsigned long long c; } top[3] = {{0,0,0},{0,0,0},{0,0,0}};
    unsigned long long tot = 0;
    for (int s = 0; s < 6; s++) for (int y = 0; y < 2; y++) {
        tot += tr_use[s][y];
        for (int k = 0; k < 3; k++) {
            if (tr_use[s][y] > top[k].c) {
                for (int kk = 2; kk > k; kk--) top[kk] = top[kk-1];
                top[k] = (typeof(top[0])){s, y, tr_use[s][y]}; break;
            }
        }
    }
    char trbuf[128]; trbuf[0] = 0;
    for (int k = 0; k < 3 && top[k].c > 0; k++) {
        char piece[48];
        double pct = tot ? 100.0 * (double)top[k].c / (double)tot : 0.0;
        snprintf(piece, sizeof piece, "%c%c:%.1f%%", 'A' + top[k].st, '0' + top[k].sy, pct);
        if (k) strcat(trbuf, ";");
        strcat(trbuf, piece);
    }
    /* final rle from last valid cp */
    long long runs_total = -1; char rlebuf[512]; rlebuf[0] = 0;
    for (int i = ncp - 1; i >= 0; i--) {
        if (cps[i].valid && cps[i].runs_total > 0) {
            runs_total = cps[i].runs_total;
            char piece[32];
            for (int k = 0; k < cps[i].rle_n && k < RLE_MAX; k++) {
                snprintf(piece, sizeof piece, "%s%lld^%lld", k ? ";" : "", (long long)(k % 2 ? 0 : 1), cps[i].rle[k]);
                strcat(rlebuf, piece);
            }
            break;
        }
    }
    char headstate_c = 'A' + state;
    printf("%s\t%d\t%s\t%s\t%lld\t%lld\t%lld\t%lld\t%lld\t%lld\t%c\t%.3f\t%.3f\t%lld\t%lld\t%d\t%d\t%lld\t%lld\t%s\t%s\n",
           fam, idx, code, status, steps, spanv, pop1,
           (ncp ? cps[ncp-1].lo1 : 0), (ncp ? cps[ncp-1].hi1 : 0), head, headstate_c,
           a_span, a_pop, cyc_p, cyc_d, cyc_pairs, ncp, d0_events, runs_total,
           rlebuf[0] ? rlebuf : "NA", trbuf[0] ? trbuf : "NA");
    fflush(stdout);
}

/* EVENT mode: record full-config RLE at every visit of a chosen (state,symbol) BEFORE execution.
 * Usage: triage EVENT CODE CAP ST SY MAXREC
 * Output: "EV step st sy head pop width R rle..." (runs<=64, else runs=-1 + prefix) */
static int ev_state = -1, ev_sym = 0; static long long ev_maxrec = 300, ev_count = 0;

static void print_ev(long long step, int state, long long head) {
    ev_count++;
    if (ev_count > ev_maxrec) return;
    long long lo1 = -(1LL << 62), hi1;
    for (long long p = vis_lo; p <= vis_hi; p++) if (rd(p)) { lo1 = p; break; }
    if (lo1 == -(1LL << 62)) { printf("EV %lld %c%d %lld pop=0 width=0 R -\n", step, 'A' + state, ev_sym, head); return; }
    hi1 = lo1;
    for (long long p = vis_hi; p >= lo1; p--) if (rd(p)) { hi1 = p; break; }
    long long w = hi1 - lo1 + 1;
    printf("EV %lld %c%d %lld pop=%lld width=%lld headrel=%lld R ", step, 'A' + state, ev_sym, head, pop1, w, head - lo1);
    if (w <= (8LL << 20)) {
        long long rr[RLE_MAX]; int rn = 0;
        long long tot = rle_scan(lo1, hi1, rr, &rn);
        printf("%lld|", tot);
        for (int k = 0; k < rn && k < RLE_MAX; k++) printf("%lld^%lld ", (long long)(k % 2 ? 0 : 1), rr[k]);
    } else printf("-1|");
    printf("\n");
    fflush(stdout);
}

int main(int argc, char **argv) {
    if (argc < 4) { fprintf(stderr, "usage: %s FAM CODEFILE CAP | %s DETAIL CODE CAP [D0MAX]\n", argv[0], argv[0]); return 2; }
    if (strcmp(argv[1], "DETAIL") == 0) detail_mode = 1;

    if (detail_mode) {
        const char *code = argv[2];
        for (const char *p = code; *p; ) {
            if (*p == '_') { memmove((char*)p, p + 1, strlen(p)); continue; } /* strip underscores in place */
            p++;
        }
        long long cap = (long long)atof(argv[3]);
        int d0max = (argc >= 5) ? atoi(argv[4]) : D0REC_MAX;
        if (parse_code(code)) { fprintf(stderr, "bad code\n"); return 2; }
        build_schedule(cap);
        tape_init();
        long long head = 0; int state = 0; long long step = 0; int cpi = 0;
        wr(0, 0);
        while (step < cap) {
            if (cpi < ncp_times && step >= cp_times[cpi]) {
                long long su = 0;
                take_cp(step, state, head, &su);
                CP *c = &cps[ncp - 1];
                if (c->valid && c->runs_total >= 0) {
                    printf("CP %lld %c pop=%lld lo1=%lld headrel=%lld width=%lld runs=%lld R ",
                           c->step, 'A' + c->state, c->pop, c->lo1, c->head - c->lo1, c->hi1 - c->lo1 + 1, c->runs_total);
                    for (int k = 0; k < c->rle_n; k++) printf("%lld^%lld ", (long long)(k % 2 ? 0 : 1), c->rle[k]);
                    printf("\n");
                } else {
                    printf("CP %lld %c pop=%lld span_v=%lld (no-fp)\n", c->step, 'A' + c->state, c->pop,
                           vis_hi >= vis_lo ? vis_hi - vis_lo + 1 : 0);
                }
                fflush(stdout);
                cpi++;
            }
            uint8_t sy = rd(head);
            Trans tr = T[state][sy];
            if (tr.next == 6) { printf("HALT %lld %c %lld\n", step, 'A' + state, head); print_d0recs(); return 0; }
            if (tr.write < 0 || tr.next < 0) { printf("UNDEF %lld %c %lld\n", step, 'A' + state, head); print_d0recs(); return 0; }
            if (state == 3 && sy == 0 && nd0rec < d0max) record_d0(step, head);
            wr(head, (uint8_t)tr.write);
            head += tr.move; state = tr.next; step++;
            if (tape_toobig) { printf("TAPEHUGE %lld\n", step); return 0; }
        }
        long long su = 0; take_cp(step, state, head, &su);
        print_d0recs();
        printf("DONE %lld %c %lld pop=%lld span_v=%lld\n", step, 'A' + state, head, pop1,
               vis_hi >= vis_lo ? vis_hi - vis_lo + 1 : 0);
        return 0;
    }

    if (strcmp(argv[1], "EVENT") == 0) {
        const char *code = argv[2];
        for (char *p = (char*)code; *p; ) { if (*p == '_') { memmove((char*)p, p + 1, strlen(p)); continue; } p++; }
        long long cap = (long long)atof(argv[3]);
        ev_state = argv[4][0] - 'A';
        ev_sym = argv[4][1] - '0';
        if (argc >= 6) ev_maxrec = atoll(argv[5]);
        if (parse_code(code) || ev_state < 0 || ev_state > 5 || ev_sym < 0 || ev_sym > 1) { fprintf(stderr, "bad code or state\n"); return 2; }
        tape_init();
        long long head = 0; int state = 0; long long step = 0;
        wr(0, 0);
        while (step < cap) {
            uint8_t sy = rd(head);
            Trans tr = T[state][sy];
            if (tr.next == 6) { printf("HALT %lld %c%d\n", step, 'A' + state, sy); return 0; }
            if (tr.write < 0 || tr.next < 0) { printf("UNDEF %lld %c%d\n", step, 'A' + state, sy); return 0; }
            if (state == ev_state && sy == (uint8_t)ev_sym) print_ev(step, state, head);
            wr(head, (uint8_t)tr.write);
            head += tr.move; state = tr.next; step++;
            if (tape_toobig) { printf("TAPEHUGE %lld\n", step); return 0; }
        }
        printf("DONE %lld\n", step);
        return 0;
    }

    /* batch mode */
    const char *fam = argv[1];
    FILE *f = fopen(argv[2], "r");
    if (!f) { fprintf(stderr, "cannot open %s\n", argv[2]); return 2; }
    long long cap = (long long)atof(argv[3]);
    char line[512];
    int idx = 0;
    fprintf(stdout, "#family\tidx\tcode\tstatus\tsteps\tspan_v\tpop\tlo1\thi1\thead\theadstate\talpha_span\talpha_pop\tcyc_period\tcyc_drift\tcyc_pairs\tcps\td0events\truns_total\trle\ttr_top\n");
    while (fgets(line, sizeof line, f)) {
        for (char *p = line; *p; p++) if (*p == '\n' || *p == '\r') { *p = 0; break; }
        /* strip underscores */
        char code[64]; int L = 0;
        for (char *p = line; *p && L < 63; p++) if (*p != '_') code[L++] = *p;
        code[L] = 0;
        if (L == 0) continue;
        idx++;
        if (parse_code(code)) { printf("%s\t%d\t%s\tPARSE-ERR\t0\t0\t0\t0\t0\t0\t?\t-1\t-1\t-1\t0\t0\t0\t0\t0\tNA\tNA\n", fam, idx, code); continue; }
        build_schedule(cap);
        tape_init();
        memset(tr_use, 0, sizeof tr_use);
        d0_events = 0; nd0rec = 0; d0_overflow = 0;
        ncp = 0;
        long long head = 0; int state = 0; long long step = 0; int cpi = 0;
        long long scan_used = 0;
        wr(0, 0);
        const char *status = "DONE"; long long done_step = cap; int done_state = state; long long done_head = 0;
        int aborted = 0;
        while (step < cap) {
            if (cpi < ncp_times && step >= cp_times[cpi]) {
                if (take_cp(step, state, head, &scan_used) < 0) { /* budget out: stop recording cps */ cpi = ncp_times; continue; }
                cpi++;
            }
            uint8_t sy = rd(head);
            Trans tr = T[state][sy];
            tr_use[state][sy != 0]++;
            if (tr.next == 6) { status = "HALT"; done_step = step; done_state = state; done_head = head; aborted = 1; break; }
            if (tr.write < 0 || tr.next < 0) { status = "UNDEF"; done_step = step; done_state = state; done_head = head; aborted = 1; break; }
            if (state == 3 && sy == 0) record_d0(step, head);
            wr(head, (uint8_t)tr.write);
            if (tape_toobig) { status = "TAPEHUGE"; done_step = step; done_state = state; done_head = head; aborted = 1; break; }
            head += tr.move; state = tr.next; step++;
        }
        if (!aborted) { done_step = step; done_state = state; done_head = head; }
        fprintf(stderr, "[%s %d] %s step=%lld pop=%lld span=%lld cps=%d d0=%lld\n",
                fam, idx, status, done_step, pop1,
                vis_hi >= vis_lo ? vis_hi - vis_lo + 1 : 0, ncp, d0_events);
        print_batch_line(fam, idx, code, status, done_step, done_state, done_head);
    }
    fclose(f);
    return 0;
}
