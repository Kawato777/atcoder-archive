// https://atcoder.jp/contests/abs/tasks/arc065_a
#include <bits/stdc++.h>
using namespace std;

int main() {
    string s;
    cin >> s;
    int a = s.size(), b = 0;
    while (b < a) {
        if (a - b <= 4) {
            cout << "NO" << endl;
            return 0;
        }
        if (s.substr(b, 5) == "dream") {
            if (a - b == 5) {
                b += 5;
                continue;
            }
            if (s.substr(b + 5, 1) == "d") {
                b += 5;
                continue;
            } else if (s.substr(b + 5, 2) == "er") {
                if (a - b == 7) {
                    b += 7;
                    continue;
                }
                if (s.substr(b + 7, 1) == "e" || s.substr(b + 7, 1) == "d") {
                    b += 7;
                    continue;
                } else if (s.substr(b + 7, 1) == "a") {
                    b += 5;
                    continue;
                } else {
                    cout << "NO" << endl;
                    return 0;
                }
            }
        } else if (s.substr(b, 5) == "erase") {
            if (a - b == 5) {
                b += 5;
                continue;
            }
            if (s.substr(b + 5, 1) == "d" || s.substr(b + 5, 1) == "e") {
                b += 5;
                continue;
            } else if (s.substr(b + 5, 1) == "r") {
                if (a - b == 6) {
                    b += 6;
                    continue;
                }
                if (s.substr(b + 6, 1) == "e" || s.substr(b + 6, 1) == "d") {
                    b += 6;
                    continue;
                } else {
                    cout << "NO" << endl;
                    return 0;
                }
            }
        }
    }
    if (b == a)
        cout << "YES" << endl;
    else
        cout << "NO" << endl;
    return 0;
}