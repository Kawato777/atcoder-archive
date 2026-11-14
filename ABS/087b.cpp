#include <bits/stdc++.h>
using namespace std;

int main(){
    int a,b,c,x,d,e,f,n;
    cin>>a>>b>>c>>x;
    for(int i=0;i<=a;i++){
        d = x;
        d -= 500 * i;
        if (d < 0) continue;
        for(int j=0;j<=b;j++){
            e = d;
            e -= 100 * j;
            if (e < 0) continue;
            for(int k=0;k<=c;k++){
                f = e;
                f -= 50 * k;
                if(f == 0) n++;
            }
        }
    }
    cout << n;
    return 0;
}