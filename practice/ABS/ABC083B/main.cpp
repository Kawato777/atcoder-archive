// https://atcoder.jp/contests/abs/tasks/abc083_b
#include <bits/stdc++.h>
using namespace std;

int main(){
    int n,a,b,h,i,j,k,l,o;
    vector<int> c;
    cin >> n >> a >> b;

    for(int m = 1;m <= n;m++){
        h = m / 10000;
        i = (m / 1000) % 10;
        j = (m / 100) % 10;
        k = (m / 10) % 10;
        l = m % 10;
        o = h + i + j + k + l;
        if (a <= o && o <= b) c.push_back(m);
    }
    o=0;
    for(int m=0;m < c.size();m++)o+=c[m];
    cout << o;
    return 0;
}