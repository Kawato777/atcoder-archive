// https://atcoder.jp/contests/abc163/tasks/abc163_c
#include <bits/stdc++.h>
using namespace std;

int main() {
    int n;
    cin >> n;
    vector<int> A(n, 0);
    for (int i = 0; i < n - 1; i++) {
        int j;
        cin >> j;
        A[j - 1]++;
    }
    for (auto&& a : A) cout << a << "\n";
    return 0;
}
