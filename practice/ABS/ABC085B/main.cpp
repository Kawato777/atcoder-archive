// https://atcoder.jp/contests/abs/tasks/abc085_b
#include <bits/stdc++.h>
using namespace std;

int main() {
    int n;
    cin >> n;
    vector<int> D(n);
    for (auto&& d : D) cin >> d;
    sort(D.begin(), D.end());
    D.erase(unique(D.begin(), D.end()), D.end());
    cout << D.size() << endl;
    return 0;
}