// https://atcoder.jp/contests/abc186/tasks/abc186_d
#include <bits/stdc++.h>
using namespace std;
using ll = long long;

/* 解説あり */
int main() {
    int n, result = 0;
    cin >> n;
    vector<int> A(n), B(n + 1);
    for (int i = 0; i < n; i++) cin >> A[i];
    sort(A.begin(), A.end());
    B[0] = 0;
    for (int i = 1; i < n + 1; i++) {
        B[i] = B[i - 1] + A[i - 1];
    }
    for (int i = 0; i < n - 1; i++) {
        result += (B[n] - B[i + 1]) - (n - i - 1) * A[i];
    }
    cout << result << endl;
    return 0;
}

/* 解説なし */
/*
int main() {
    int n;
    cin >> n;
    vector<ll> A(n);
    for (auto&& a : A) cin >> a;
    ll result = 0;
    for (int i = 0; i < n - 1; i++) {
        for (int j = i + 1; j < n; j++) result += abs(A[i] - A[j]);
    }
    cout << result << endl;
    return 0;
}
*/
