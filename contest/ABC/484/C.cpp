#include <bits/stdc++.h>
using namespace std;

int main(){
    int n,l=0,event=0;
    bool isleft=false,isright=false;
    cin >> n;
    vector<int> a(n),b(n);
    for(int i=0;i<n;i++){
        cin >> a[i];
    }
    for(int i=0;i<n;i++){
        cin >> b[i];
    }

    for(int i=0;i<n;i++){
        if(event==0){
            if(i==n-1){
                if(a[i] == b[i])event=4;
                else event = 3;
            }
            else if(a[i] != b[i]){
                l = i;
                if(b[i] == a[i + 1]) isleft = true;
                if(a[i] == b[i + 1]) isright = true;
                event = 1;
            }
        }else if (event==1){
            if(i==n-1){
                // 左ずれ
                if(isleft && b[i] == a[l]) event = 4;
                // 右ずれ
                else if(isright && a[i] == b[l]) event = 4;
                else event = 3;
            }
            else {
                if(isleft && b[i] != a[i + 1]){
                    isleft = false;
                    if(b[i] == a[l]) event = 2;
                    else event = 3;
                }
                    
                if(isright && a[i] != b[i + 1]){
                    isright = false;
                    if(a[i] == b[l]) event = 2;
                    else event = 3;
                }
            }
        }else if(event==2){
            if(a[i] != b[i]) event = 3;
        }
    }

    if(event ==2|| event==4) cout << "Yes" << endl;
    else cout << "No" << endl;
    return 0;
}