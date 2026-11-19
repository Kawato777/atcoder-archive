// https://atcoder.jp/contests/abc210/tasks/abc210_c
#include <bits/stdc++.h>
using namespace std;

int main() {
    int n, k;
    cin >> n >> k;
    vector<int> C(n);
    for (auto&& c : C) cin >> c;
    map<int, int> q;
    for (int i = 0; i < k; i++) q[C[i]]++;
    int result = (int)q.size();
    for (int i = 0; i < n - k; i++) {
        if (q[C[i]] == 1)
            q.erase(C[i]);
        else
            q[C[i]]--;
        q[C[i + k]]++;
        if (result < (int)q.size()) result = q.size();
    }
    cout << result << endl;
    return 0;
}
