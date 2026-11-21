#include <bits/stdc++.h>
using namespace std;
using ll = long long;

int main() {
    int n, m;
    cin >> n >> m;
    vector<string> A(n);
    for (auto&& a : A) cin >> a;
    int l = 0, result = 0;
    bool flag = false, isFaucet = false;
    for (int i = 0; i < m; i++) {
        if (A[0][i] == 'x') {
            if (flag == true) {
                isFaucet = true;
                result = 1;
                cout << "Faucet " << result << endl;
                return 0;
            }
            if (i == 0) {
                flag = true;
            }
            l = i;
        } else {
            if (flag) {
                cout << "Drain 1" << endl;
                return 0;
            }
        }
    }

    if (l > 0) {
        cout << "Drain " << l + 1 << endl;
        return 0;
    }

    l = 0;

    for (int i = 0; i < n; i++) {
        if (A[i][0] == 'x') {
            cout << "Faucet " << i + 1 << endl;
            return 0;
        }
    }
    return 0;
}
