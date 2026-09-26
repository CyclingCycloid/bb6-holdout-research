// Fresh BigInt orbit generator for the BMO1 two-counter recurrence.
// A(a,b): a>b -> (a-b, 4b+2); a<b -> (2a+1, b-a); a=b -> HALT. Start (1,2).
export function* orbit(N) {
    let a = 1n, b = 2n;
    for (let n = 1; n <= N; n++) {
        yield [a, b, n];
        if (a === b) { console.error(`HALT at n=${n}`); return; }
        if (a > b) { const a2 = a - b, b2 = 4n * b + 2n; a = a2; b = b2; }
        else        { const a2 = 2n * a + 1n, b2 = b - a; a = a2; b = b2; }
    }
}

export function* orbitStates(N) { // yields [a,b] indexed from state 0 = (1,2) (0-based)
    let a = 1n, b = 2n;
    for (let n = 0; n <= N; n++) {
        yield [a, b];
        if (a === b) { console.error(`HALT at state ${n}`); return; }
        if (a > b) { const a2 = a - b, b2 = 4n * b + 2n; a = a2; b = b2; }
        else        { const a2 = 2n * a + 1n, b2 = b - a; a = a2; b = b2; }
    }
}
