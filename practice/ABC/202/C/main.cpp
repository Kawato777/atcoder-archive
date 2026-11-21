// https://atcoder.jp/contests/abc202/tasks/abc202_c
#include <bits/stdc++.h>
using namespace std;
using ll = long long;

int main() {
    int n;
    ll result = 0;
    cin >> n;
    vector<int> A(n), B(n), C(n);
    for (auto&& a : A) cin >> a;
    for (auto&& b : B) cin >> b;
    for (auto&& c : C) cin >> c;
    map<int, vector<int>> D;
    for (int i = 0; i < n; i++) D[B[C[i] - 1]].push_back(i);
    for (auto&& a : A) {
        int i = (int)D[a].size();
        if (i >= 1) result += i;
    }
    cout << result << endl;
    return 0;
}