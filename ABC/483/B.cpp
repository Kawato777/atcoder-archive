#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main(){
    int N, Q;
    cin >> N >> Q;
    vector<int> k(Q), card(N);
    for(int i=0;i < Q;i++){
        cin >> k[i];
    }
    for(int i=0;i < N;i++){
        card[i] = i + 1;
    }
    for(int i=0;i < Q;i++){
        vector<int> mix(card.begin(), card.begin() + k[i]);
        reverse(mix.begin(),mix.end());
        for(int l=0;l < mix.size();l++){
            mix[l] *= -1;
            card[l] = mix[l];
        }
    }
    for(int i=0;i < N;i++){
        cout << card[i] << endl;
    }
}
