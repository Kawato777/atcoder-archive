// https://atcoder.jp/contests/abc450/tasks/abc450_c
#include <bits/stdc++.h>
using namespace std;

int main() {
    int h, w;
    cin >> h >> w;
    vector<vector<string>> grid(h, vector<string>(w));
    vector<vector<bool>> checked(h, vector<bool>(w, false));
    int result = 0;
    for (auto&& g : grid) {
        string str;
        cin >> str;
        for (int i = 0; i < w; i++) {
            g[i] = str[i];
        }
    }
    for (int i = 0; i < h; i++) {
        for (int j = 0; j < w; j++) {
            if (checked[i][j]) continue;
            checked[i][j] = true;
            if (grid[i][j] == ".") {
                queue<pair<int, int>> list;
                bool isEdge = false;
                if (i == 0 || i == h - 1 || j == 0 || j == w - 1) isEdge = true;
                if (j < w - 1) {
                    if (checked[i][j + 1] == false && grid[i][j + 1] == ".") {
                        checked[i][j + 1] = true;
                        list.push(make_pair(i, j + 1));
                        if (j + 1 == w - 1) isEdge = true;
                    }
                }
                if (i < h - 1) {
                    if (checked[i + 1][j] == false && grid[i + 1][j] == ".") {
                        checked[i + 1][j] = true;
                        list.push(make_pair(i + 1, j));
                        if (i + 1 == h - 1) isEdge = true;
                    }
                }
                while (list.size() > 0) {
                    pair<int, int> p = list.front();
                    int l = p.first, m = p.second;
                    if (m < w - 1) {
                        if (checked[l][m + 1] == false && grid[l][m + 1] == ".") {
                            checked[l][m + 1] = true;
                            list.push(make_pair(l, m + 1));
                            if (m + 1 == w - 1) isEdge = true;
                        }
                    }
                    if (l < h - 1) {
                        if (checked[l + 1][m] == false && grid[l + 1][m] == ".") {
                            checked[l + 1][m] = true;
                            list.push(make_pair(l + 1, m));
                            if (l + 1 == h - 1) isEdge = true;
                        }
                    }
                    if (l > 0) {
                        if (checked[l - 1][m] == false && grid[l - 1][m] == ".") {
                            checked[l - 1][m] = true;
                            list.push(make_pair(l - 1, m));
                            if (l - 1 == 0) isEdge = true;
                        }
                    }
                    if (m > 0) {
                        if (checked[l][m - 1] == false && grid[l][m - 1] == ".") {
                            checked[l][m - 1] = true;
                            list.push(make_pair(l, m - 1));
                            if (m - 1 == 0) isEdge = true;
                        }
                    }
                    list.pop();
                }
                if (isEdge == false) result++;
            }
        }
    }

    cout << result << endl;
    return 0;
}
