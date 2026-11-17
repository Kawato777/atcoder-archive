// https://atcoder.jp/contests/abc454/tasks/abc454_c
#include <bits/stdc++.h>
using namespace std;

/* 解説読んで自力作成*/
int main() {
    int n, m;
    cin >> n >> m;
    vector<bool> s(n, false);
    vector<vector<int>> graph(n);
    s[0] = true;
    for (int i = 0; i < m; i++) {
        int a, b;
        cin >> a >> b;
        graph[a - 1].push_back(b - 1);
    }
    vector<int> q;
    q.push_back(0);
    int head = 0;
    while (head < (int)q.size()) {
        int x = q[head++];
        for (auto&& i : graph[x]) {
            if (s[i] == false) {
                s[i] = true;
                q.push_back(i);
            }
        }
    }
    cout << count(s.begin(), s.end(), true) << endl;
    return 0;
}

/* part2 */
/*
int main() {
    int n, m;
    cin >> n >> m;
    vector<int> a(m + 1), b(m + 1);
    vector<vector<int>> graph(n, vector<int>());
    for (int i = 0; i < m; i++) cin >> a[i] >> b[i];
    a[m] = 1;
    b[m] = 1;
    for (int i = 1; i <= n; i++) {
        for (int j = 0; j < m + 1;) {
            auto x = a.begin();
            x += j;
            int l = distance(x, find(a.begin(), a.end(), i));
            graph[i].push_back(b[l]);
            j = l + 1;
        }
    }
    for (auto&& g : graph) {
        for (auto&& p : g) cout << p << " ";
        cout << "\n";
    }
    return 0;
}
*/

/* part1 */
/*
int main() {
    int n, m;
    cin >> n >> m;
    vector<int> a(m + 1), b(m + 1), c(m + 1), d(m + 1), result(m + 1), intersection((m + 1) * 2), difference(m + 1);
    for (int i = 0; i < m; i++) cin >> a[i] >> b[i];
    a[m] = 1;
    b[m] = 1;
    copy(a.begin(), a.end(), c.begin());
    copy(b.begin(), b.end(), d.begin());
    sort(c.begin(), c.end());
    sort(d.begin(), d.end());
    set_intersection(c.begin(), c.end(), d.begin(), d.end(), inserter(intersection, intersection.end()));
    sort(intersection.begin(), intersection.end());
    intersection.erase(unique(intersection.begin(), intersection.end()), intersection.end());
    // set_difference(c.begin(), c.end(), intersection.begin(), intersection.end(), inserter(difference, difference.end()));
    // for (auto&& C : intersection) cout << C << "\n";
    // cout << "---" << "\n";
    // for (auto&& D : difference) cout << D << "\n";
    for (auto&& p : intersection) {
        for (int i = 0; i < a.size(); i++) {
            if (a[i] == p) result.push_back(b[i]);
        }
    }
    sort(result.begin(), result.end());
    result.erase(unique(result.begin(), result.end()), result.end());
    result.erase(result.begin());
    // for (auto&& p : result) cout << p << "\n";
    cout << result.size() << endl;
    return 0;
}
*/
