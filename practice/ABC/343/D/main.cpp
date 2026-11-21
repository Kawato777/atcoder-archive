// https://atcoder.jp/contests/abc343/tasks/abc343_d
#include <bits/stdc++.h>
using namespace std;
using ll = long long;

int main() {
    int n, t;
    cin >> n >> t;
    vector<int> A(t);
    vector<ll> B(t), C(t, 0);
    for (int i = 0; i < t; i++) cin >> A[i] >> B[i];
    map<ll, int> map;
    map[0] = n;
    for (int i = 0; i < t; i++) {
        ll p, q;
        p = C[A[i] - 1];
        C[A[i] - 1] += B[i];
        q = C[A[i] - 1];
        if (--map[p] == 0) {
            map.erase(p);
        }
        map[q]++;
        cout << map.size() << "\n";
    }
    return 0;
}
