// https://atcoder.jp/contests/abc186/tasks/abc186_d
#include <bits/stdc++.h>
using namespace std;
using ll = long long;

/* 解説あり */
int main() {
    int n;
    ll result = 0;
    cin >> n;
    vector<ll> A(n), B(n + 1, 0);
    for (int i = 0; i < n; i++) cin >> A[i];
    sort(A.begin(), A.end());
    for (int i = 0; i < n; i++) {
        B[i + 1] = B[i] + A[i];
    }
    for (int i = 0; i < n; i++) result += A[i] * i - B[i];
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
