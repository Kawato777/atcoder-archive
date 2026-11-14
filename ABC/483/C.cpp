#include <bits/stdc++.h>
using namespace std;

#define N (int)2e+5

int main(){
    int n,m,x,y;
    pair<int,int> c1={N,-1},c2={N,-1};
    vector<int>a[N];
    int b[N]={};

    cin>>n>>m;
    for(int i=0;i<m;i++){
        cin>>x>>y;
        a[x-1].push_back(y-1);
        b[x-1]++;
    }
    for(int i=0;i<n;i++){
        if(b[i] > c1.second){
            c2=c1;
            c1={i,b[i]};
        }
        else if(b[i] > c2.second){
            c2={i,b[i]};
        }
    }

    for(int i=0;i<n;i++){
        int sz=a[i].size();
        for(int j=0;j<sz;j++){
            b[a[i][j]]++;
        }
        b[i] = 0;

        pair<int,int> c0={N,-1};
        for(int j=0; j<sz+2;j++){
            if(j<sz)x=a[i][j];
            else if(j==sz)x=c1.first;
            else x=c2.first;

            if(b[x]>c0.second)c0={x,b[x]};
            else if((b[x]==c0.second)&&(x<c0.first))c0={x,b[x]};
            cout<<(c0.first+1)<<endl;
        }

        b[i]=sz;
        for(int j=0;j<sz;j++)b[a[i][j]]--;
    }
    return 0;
}