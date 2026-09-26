// L3 census cross-check: among halting starts in [1,512]^2 (halt value z <= 4e6), count z = 0 mod 4.
#include <stdio.h>
int main(void){
    const long long ZCAP=4000000; const int N=512;
    long long halt=0, zmod0=0, zmod0_nondiag=0;
    for(long long a0=1;a0<=N;a0++)for(long long b0=1;b0<=N;b0++){
        long long a=a0,b=b0;
        while(a!=b && a+b<=2*ZCAP){
            if(a>b){long long a2=a-b,b2=4*b+2;a=a2;b=b2;}
            else {long long a2=2*a+1,b2=b-a;a=a2;b=b2;}
        }
        if(a==b){halt++; if(a%4==0){zmod0++; if(a0!=b0) zmod0_nondiag++;}}
    }
    printf("halting starts=%lld, z=0mod4: %lld (nontrivial: %lld)\n", halt, zmod0, zmod0_nondiag);
    return 0;
}
