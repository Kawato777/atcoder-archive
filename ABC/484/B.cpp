#include <bits/stdc++.h>
using namespace std;

int main(){
    int k,l;
    bool isNine = false;
    cin >> k;
    vector<int> a(k);
    for(int i=0;i<k;i++){
        cin >> l;
        if(l==9)isNine = true;
        a[i] = l;
    }
    if(isNine == false) cout << -1;
    else cout << *min_element(a.begin(),a.end());
    return 0;
}