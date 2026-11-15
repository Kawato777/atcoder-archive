// https://atcoder.jp/contests/abs/tasks/abc085_c
#include <bits/stdc++.h>
using namespace std;

int main() {
    int n, y, a = 0, b = 0, c = 0, d = 0, e = 0;
    cin >> n >> y;
    y /= 1000;
    a = y / 10;
    b = (y - 10 * (y / 10)) / 5;
    c = (y - 10 * (y / 10)) % 5;
    // cout << a << " " << b << " " << c << endl;

    if (a + b + c > n) {
        cout << -1 << " " << -1 << " " << -1 << endl;
        return 0;
    }
    for (int i = a; i >= 0; i--) {
        d = b + 2 * (a - i);
        for (int j = d; j >= 0; j--) {
            e = c + 5 * (d - j);
            if (i + j + e == n) {
                cout << i << " " << j << " " << e << endl;
                return 0;
            }
        }
    }
    cout << -1 << " " << -1 << " " << -1 << endl;
    return 0;
}