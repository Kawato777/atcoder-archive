#include <bits/stdc++.h>
using namespace std;
using ll = long long;

/* part4 */
int main() {
    int n;
    cin >> n;
    vector<int> C(n), D, E(n), F(n);
    for (auto&& c : C) cin >> c;
    int counter = 0;
    D.push_back(1);
    for (int i = 1; i < n; i++) {
        if (C[i - 1] == C[i])
            D[counter]++;
        else {
            counter++;
            D.push_back(1);
        }
    }
    int j = D[0], k = 1;
    for (int i = 0; i < n; i++) {
        if (j == 0) {
            j = D[k];
            k++;
        }
        E[i] = j;
        j--;
    }
    F[0] = E[0];

    for (int i = 1; i < n; i++) {
        if (i == n - 1) {
            if (C[i] == C[i - 1]) {
                F[i] = F[i - 1] + 1;
            } else {
                F[i] = 1;
            }
        } else {
            if (C[i] == C[i - 1]) {
                F[i] = min(F[i - 1] + 1, E[i]);
            } else {
                F[i] = 1;
            }
        }
    }
    for (auto&& f : F) cout << f << " ";
    return 0;
}

/* part3 */
/*

int main() {
    int n;
    cin >> n;
    vector<int> C(n), D, E(n), F(n);
    for (auto&& c : C) cin >> c;
    int counter = 0;
    D.push_back(1);
    for (int i = 1; i < n; i++) {
        if (C[i - 1] == C[i])
            D[counter]++;
        else {
            counter++;
            D.push_back(1);
        }
    }
    int j = D[0], k = 1;
    for (int i = 0; i < n; i++) {
        if (j == 0) {
            j = D[k];
            k++;
        }
        E[i] = j;
        j--;
    }
    reverse(D.begin(), D.end());
    j = D[0], k = 1;
    for (int i = 0; i < n; i++) {
        if (j == 0) {
            j = D[k];
            k++;
        }
        F[i] = j;
        j--;
    }
    reverse(F.begin(), F.end());

    cout << E[0] << " ";
    for (int i = 1; i < n - 1; i++) {
        if (E[0])
            cout << min(E[i], F[i]) << " ";
    }
    cout << F[n - 1] << " ";
    return 0;
}
*/

/* part2 */
/*

int main() {
    int n;
    cin >> n;
    vector<int> C(n), D(n), R(n);
    for (auto&& c : C) cin >> c;
    D[0] = 1;
    for (int i = 0; i < n - 1; i++) {
        if (C[i] == C[i + 1])
            D[i + 1] = D[i] + 1;
        else
            D[i + 1] = 1;
    }
    int distance = 1;
    for (int i = 0; i < n - 1; i++) {
        if (C[i] != C[i + 1]) {
            break;
        }
        distance++;
    }
    R[0] = distance;
    for (int i = 1; i < n - 1; i++) {
        R[i] = min(D[i], D[i + 1]);
    }
    R[n - 1] = D[n - 1];
    for (auto&& r : R) cout << r << " ";

    return 0;
}
*/

/* part1 */
/*

int main() {
int n;
cin >> n;
vector<int> C(n), D(n);
for (auto&& c : C) cin >> c;
for (int i = 0; i < n; i++) {
    int distance = 1;
    if (i == 0) {
        for (int l = i; l < n - 1; l++) {
            if (C[l] != C[l + 1]) break;
            distance++;
        }
        D[i] = distance;
    } else if (i == n - 1) {
        if (C[i] == C[i - 1]) {
            D[i] = D[i - 1] + 1;
        } else {
            D[i] = 1;
        }
    } else {
        for (int l = i; l < n - 1; l++) {
            if (C[l] != C[l + 1]) break;
            distance++;
        }
        if (C[i] == C[i - 1]) {
            D[i] = min(D[i - 1] + 1, distance);
        } else {
            D[i] = 1;
        }
    }
}
for (auto&& d : D) cout << d << " ";
return 0;
}
*/
