console.log('A:', /runs=(-?\d+) R (.*)$/.test("runs=7 R 1^1 \r"));
console.log('B:', /R (.*)$/.test("R 1^1 \r"));
console.log('C:', /(.*)$/.test("abc\r"));
console.log('D:', /^CP (\d+) ([A-F]) pop=(-?\d+) lo1=(-?\d+) headrel=(-?\d+) width=(-?\d+) runs=(-?\d+) R (.*)$/.test("CP 1000 D pop=21 lo1=-12 headrel=4 width=25 runs=7 R x"));
console.log('E:', /^CP (\d+) ([A-F]) pop=(-?\d+) lo1=(-?\d+) headrel=(-?\d+) width=(-?\d+) runs=(-?\d+) R/.test("CP 1000 D pop=21 lo1=-12 headrel=4 width=25 runs=7 R x"));
console.log('F:', /width=(-?\d+) runs=(-?\d+) R (.*)$/.test("width=25 runs=7 R x"));
console.log('G:', /headrel=(-?\d+) width=(-?\d+) runs=(-?\d+) R (.*)$/.test("headrel=4 width=25 runs=7 R x"));
