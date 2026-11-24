// https://atcoder.jp/contests/abc477/tasks/abc477_c
// template: https://github.com/Kawato777/atcoder-archive/blob/main/base.cpp
#include <bits/stdc++.h>
using namespace std;
using ll = long long;

// ---- ループ: rep(i, n) で [0, n)、rep(i, l, r) で [l, r) ----
#define REP2(i, n) for (ll i = 0; i < (ll)(n); ++i)
#define REP3(i, l, r) for (ll i = (ll)(l); i < (ll)(r); ++i)
#define REP_SELECT(_1, _2, _3, NAME, ...) NAME
#define rep(...) REP_SELECT(__VA_ARGS__, REP3, REP2)(__VA_ARGS__)

// ---- デバッグ: dbg(x, v) は LOCAL のときだけ標準エラーに出す（提出時は何もしない）----
#ifdef LOCAL
#include "debug.hpp"
#else
#define dbg(...) ((void)0)
#endif

// ---- 定数 ----
constexpr int inf = 1073741823;  // int 用の大きな値（2^30 - 1）。inf + inf でも int に収まる
constexpr ll infl = 1LL << 60;   // long long 用の大きな値。infl + infl でも long long に収まる
constexpr int dx[4] = {1, 0, -1, 0};
constexpr int dy[4] = {0, 1, 0, -1};

// ---- 入力: cin >> v で vector を、cin >> p で pair をまとめて読む ----
template <class T, class U>
istream& operator>>(istream& is, pair<T, U>& p);
template <class T>
istream& operator>>(istream& is, vector<T>& v);
template <class T, class U>
istream& operator>>(istream& is, pair<T, U>& p) { return is >> p.first >> p.second; }
template <class T>
istream& operator>>(istream& is, vector<T>& v) {
    for (auto& x : v) is >> x;
    return is;
}

// ---- 更新: 小さく（大きく）なったときだけ代入し、代入したかを返す ----
template <class T>
bool chmin(T& a, const T& b) { return b < a ? (a = b, true) : false; }
template <class T>
bool chmax(T& a, const T& b) { return a < b ? (a = b, true) : false; }

// ---- 整数の割り算: 負の数でも数学的な floor / ceil を返す（b != 0）----
ll floor_div(ll a, ll b) { return a / b - (a % b != 0 && ((a < 0) != (b < 0))); }
ll ceil_div(ll a, ll b) { return a / b + (a % b != 0 && ((a < 0) == (b < 0))); }

// ---- グリッド: (i, j) が H×W の内側か ----
bool is_in_grid(ll i, ll j, ll h, ll w) { return 0 <= i && i < h && 0 <= j && j < w; }

// ---- 出力: yes_no は Yes / No、YES_NO は YES / NO ----
void yes_no(bool ok) { cout << (ok ? "Yes" : "No") << '\n'; }
void YES_NO(bool ok) { cout << (ok ? "YES" : "NO") << '\n'; }

/* 解説あり */
int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int q;
    string s, t;
    cin >> q >> s >> t;
    int n = s.size(), m = t.size();
    vector<int> A(n, 0);
    rep(i, n) {
        if (i + m - 1 > n) break;
        if (s.substr(i, m) == t) {
            A[i] = 1;
        }
    }
    vector<int> sums = {0};
    partial_sum(A.begin(), A.end(), back_inserter(sums));

    rep(i, q) {
        int l, r;
        cin >> l >> r;
        if (r - l + 1 < m)
            yes_no(false);
        else
            yes_no(sums[r - m + 1] - sums[l - 1] > 0);
    }
    return 0;
}

/* 自力(tle) */
/*
int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int q;
    string s, t;
    cin >> q >> s >> t;
    boyer_moore_searcher searcher{
        t.cbegin(),
        t.cend()};

    rep(i, q) {
        int l, r;
        cin >> l >> r;
        string s1 = s.substr(l - 1, r - l + 1);
        auto result = searcher(s1.cbegin(), s1.cend());
        yes_no(result.first != result.second);
    }
    return 0;
}
*/
