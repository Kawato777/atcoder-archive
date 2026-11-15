// https://atcoder.jp/contests/abs/tasks/abc088_b
#include <bits/stdc++.h>
using namespace std;

int main() {
    int n, alice = 0, bob = 0;
    cin >> n;
    vector<int> a(n);
    for (auto&& A : a) cin >> A;
    sort(a.begin(), a.end(), greater<int>());
    for (int i = 0; i < n; i++) {
        if (i % 2 == 0)
            alice += *a.begin();
        else
            bob += *a.begin();
        a.erase(a.begin());
    }
    cout << alice - bob << endl;
    return 0;
}