#include <bits/stdc++.h>
using namespace std;

int main(){
    int n,m=0;
    cin >> n;
    vector<int> a(n);
    for(int i=0;i<n;i++){
        cin >> a[i];
    }
    for(int i=0;i<n;i++){
        if(i==0){
            m++;
        }else{

            for(int l= i - 1;l < 0;l--){
                if(a[l] == a[i]) break;
                m++;
            }
        }
    }

    cout << m << endl;
    return 0;
}