const good = "CP 1000 D pop=21 lo1=-12 headrel=4 width=25 runs=7 R 1^1 0^1 1^8 0^2 1^1 0^1 1^11 \r";
console.log('T1:', /^CP (\d+) ([A-F]) pop=(-?\d+)/.test(good));
console.log('T2:', /^CP (\d+) ([A-F]) pop=(-?\d+) lo1=(-?\d+) headrel=(-?\d+) width=(-?\d+)/.test(good));
console.log('T3:', /^CP (\d+) ([A-F]) pop=(-?\d+) lo1=(-?\d+) headrel=(-?\d+) width=(-?\d+) runs=(-?\d+) R/.test(good));
console.log('T4:', /^CP (\d+) ([A-F])/.test(good));
console.log('T5:', /^CP (\d+)/.test(good));
console.log('T6:', /^CP /.test(good));
