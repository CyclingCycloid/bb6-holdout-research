const s1 = "R 1^1 \r";
console.log('s1 codes:', [...s1].map(c => c.charCodeAt(0)).join(','));
console.log('R(.*)$ on "R abc\r":', /R (.*)$/.test("R abc\r"));
console.log('R(.*)$ on s1:', /R (.*)$/.test(s1));
console.log('R(.*) on s1 (no $):', /R (.*)/.test(s1));
console.log('1\^1:', /1\^1/.test(s1));
console.log('literal CR check:', /R 1\^1 \r$/.test(s1));
