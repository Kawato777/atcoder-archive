// https://atcoder.jp/contests/abs/tasks/arc089_a
#include <bits/stdc++.h>
using namespace std;

int main() {
    int n;
    cin >> n;
    vector<int> T(n + 1), X(n + 1), Y(n + 1);
    T[0] = 0;
    X[0] = 0;
    Y[0] = 0;
    for (int i = 1; i <= n; i++) {
        cin >> T[i] >> X[i] >> Y[i];
    }
    for (int i = 1; i <= n; i++) {
        int dt = T[i] - T[i - 1], dx = abs(X[i] - X[i - 1]), dy = abs(Y[i] - Y[i - 1]);
        int d = dt - (dx + dy);
        if (d >= 0 && d % 2 == 0)
            continue;
        else {
            cout << "No" << endl;
            return 0;
        }
    }
    cout << "Yes" << endl;
    return 0;
}