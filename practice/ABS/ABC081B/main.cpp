// https://atcoder.jp/contests/abs/tasks/abc081_b
#include <bits/stdc++.h>
using namespace std;

int main(){
    int n,m=-1;
    cin >> n;
    vector<int> a(n);
    for (int i=0;i < n;i++)cin >> a[i];
    bool flag = true;
    while(flag){
        m++;
        for(int i=0;i<n;i++){
            if(a[i] % 2 == 1){
                flag = false;
                break;
            }
            a[i]/=2;
        }
    }
    cout << m;
    return 0;
}