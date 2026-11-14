#include <bits/stdc++.h>
using namespace std;

#define N (int)1e+3

int main(){
    int x,y;
    cin >> x >> y;
    if(x * y % 2==0)cout<<"Even";
    else cout<<"Odd";
    return 0;
}