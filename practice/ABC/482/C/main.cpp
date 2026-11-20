// https://atcoder.jp/contests/abc482/tasks/abc482_c
#include <bits/stdc++.h>
using namespace std;
using ll = long long;

/* 解説あり+claude */
int main() {
    int h, w, n, q;
    cin >> h >> w >> n >> q;
    vector<int> A(n), B(n);
    for (int i = 0; i < n; i++) {
        cin >> A[i] >> B[i];
    }
    sort(A.begin(), A.end());
    sort(B.begin(), B.end());
    for (int i = 0; i < q; i++) {
        int j, k, l;
        cin >> j >> k >> l;
        if (j == 1) {
            cout << upper_bound(A.begin(), A.end(), l) - lower_bound(A.begin(), A.end(), k) << "\n";
        } else {
            cout << upper_bound(B.begin(), B.end(), l) - lower_bound(B.begin(), B.end(), k) << "\n";
        }
    }
    return 0;
}

/* 解説あり */
/*
int main() {
    int h, w, n, q;
    cin >> h >> w >> n >> q;
    vector<int> A(h, 0), B(w, 0);
    for (int i = 0; i < n; i++) {
        cin >> A[i] >> B[i];
    }
    sort(A.begin(), A.end());
    sort(B.begin(), B.end());
    for (int i = 0; i < q; i++) {
        int j, k, l;
        cin >> j >> k >> l;
        if (j == 1) {
            cout << count_if(A.begin(), A.end(), [&k, &l](int m) {
                return m >= k && m <= l;
            }) << "\n";
        } else {
            cout << count_if(B.begin(), B.end(), [&k, &l](int m) {
                return m >= k && m <= l;
            }) << "\n";
        }
    }
    return 0;
}
*/

/* 自力 */
/*
int main() {
    int h, w, n, q;
    cin >> h >> w >> n >> q;
    vector<int> c(h, 0), d(w, 0), e(h + 1, 0), f(w + 1, 0);
    for (int i = 0; i < n; i++) {
        int a, b;
        cin >> a >> b;
        c[a - 1]++;
        d[b - 1]++;
    }
    for (int i = 0; i < h; i++) {
        e[i + 1] = e[i] + c[i];
    }
    for (int i = 0; i < w; i++) {
        f[i + 1] = f[i] + d[i];
    }
    for (int i = 0; i < q; i++) {
        int j, k, l, sum = 0;
        cin >> j >> k >> l;
        if (j == 1) {
            sum = e[l] - e[k - 1];
        } else {
            sum = f[l] - f[k - 1];
        }
        cout << sum << endl;
    }
    return 0;
}
*/
