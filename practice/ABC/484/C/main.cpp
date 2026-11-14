// https://atcoder.jp/contests/abc484/tasks/abc484_c
#include <bits/stdc++.h>
using namespace std;

int main() {
    int n;
    cin >> n;
    vector<int> A(n), B(n);
    for (auto&& a : A) cin >> a;
    for (auto&& b : B) cin >> b;

    while (!A.empty() && A.back() == B.back()) {
        A.pop_back();
        B.pop_back();
    }

    ranges::reverse(A);
    ranges::reverse(B);
    while (!A.empty() && A.back() == B.back()) {
        A.pop_back();
        B.pop_back();
    }

    if (A.empty()) {
        cout << "Yes" << endl;
        return 0;
    }

    auto A_lshift = A;
    ranges::rotate(A_lshift, begin(A_lshift) + 1);
    if (A_lshift == B) {
        cout << "Yes" << endl;
        return 0;
    }

    auto A_rshift = A;
    ranges::rotate(A_rshift, end(A_rshift) - 1);
    if (A_rshift == B) {
        cout << "Yes" << endl;
        return 0;
    }

    cout << "No" << endl;
    return 0;
}