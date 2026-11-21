// https://atcoder.jp/contests/abc478/tasks/abc478_c
#include <bits/stdc++.h>
using namespace std;

/* part3 */
int main() {
    int n, k;
    cin >> n >> k;
    vector<int> A(n);
    for (auto&& a : A) cin >> a;
    int l = 0, m = n - 1;
    for (int i = 0; i < n - 1; i++) {
        if (A.at(i) > A.at(i + 1)) break;
        l++;
    }
    for (int i = n - 1; i > 0; i--) {
        if (A.at(i) < A.at(i - 1)) break;
        m--;
    }

    if (l > m) {
        cout << "Yes" << endl;
        return 0;
    }

    auto minmax = minmax_element(A.begin() + l, A.begin() + m);
    if (l > 0) {
        for (int i = l; i > 0; i--) {
            if (A.at(i - 1) > *minmax.first)
                l--;
            else
                break;
        }
    }
    if (m < n - 1) {
        for (int i = m; i < n - 1; i++) {
            if (A.at(i + 1) < *minmax.second)
                m++;
            else
                break;
        }
    }

    if (m - l + 1 <= k)
        cout << "Yes" << endl;
    else
        cout << "No" << endl;

    return 0;
}

/* part2 */
/*

int main() {
    int n, k;
    cin >> n >> k;
    vector<int> A(n), B;
    for (auto&& a : A) cin >> a;
    bool flag = true;
    for (int i = 0; i < n - 1; i++) {
        if (flag) {
            if (A[i] > A[i + 1]) {
                flag = false;
                B.push_back(i);
            }
        } else {
            if (A[i] < A[i + 1]) {
                flag = true;
                B.push_back(i);
            }
        }
    }

    cout << "min:" << B.back() - B.front() + 2 << endl;
    if (B.back() - B.front() + 2 <= k) {
        cout << "Yes" << endl;
    } else {
        cout << "No" << endl;
    }

    return 0;
}
*/

/* part1 */
/*
int main() {
    int n, k;
    cin >> n >> k;
    vector<int> A(n);
    for (auto&& a : A) cin >> a;
    int l = 0, m = n - 1;
    for (int i = 0; i < n - 1; i++) {
        if (A[i] > A[i + 1]) break;
        l++;
    }
    for (int i = n - 1; i > 0; i--) {
        if (A[i] < A[i - 1]) break;
        m--;
    }

    if (m - l + 1 <= k)
        cout << "Yes" << endl;
    else
        cout << "No" << endl;

    return 0;
}
*/
