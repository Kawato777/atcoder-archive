// https://atcoder.jp/contests/abc454/tasks/abc454_c
#include <bits/stdc++.h>
using namespace std;

int main() {
    int n, m;
    cin >> n >> m;
    vector<int> a(m + 1), b(m + 1), c(m + 1), d(m + 1), intersection((m + 1) * 2), difference(m + 1);
    for (int i = 0; i < m; i++) cin >> a[i] >> b[i];
    a.push_back(1);
    b.push_back(1);
    copy(a.begin(), a.end(), c.begin());
    copy(b.begin(), b.end(), d.begin());
    sort(c.begin(), c.end());
    sort(d.begin(), d.end());
    set_intersection(c.begin(), c.end(), d.begin(), d.end(), inserter(intersection, intersection.end()));
    sort(intersection.begin(), intersection.end());
    set_difference(c.begin(), c.end(), intersection.begin(), intersection.end(), inserter(difference, difference.end()));
    for (auto&& C : intersection) cout << C << "\n";
    cout << "---" << "\n";
    for (auto&& D : difference) cout << D << "\n";
    for (auto&& diff : difference) {
        for (int i = 0; i < a.size(); i++) {
            if (a[i] == diff) remove(b.begin(), b.end(), b[i]);
        }
    }
    sort(b.begin(), b.end());
    b.erase(unique(b.begin(), b.end()), b.end());
    // cout << b.size() << endl;
    return 0;
}
