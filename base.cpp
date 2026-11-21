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
constexpr ll INF = 1LL << 60;  // 足し算しても溢れにくい大きな値
constexpr int dx[4] = {1, 0, -1, 0};
constexpr int dy[4] = {0, 1, 0, -1};

// ---- 入力: cin >> v で vector を、cin >> p で pair をまとめて読む ----
template <class T, class U> istream& operator>>(istream& is, pair<T, U>& p);
template <class T> istream& operator>>(istream& is, vector<T>& v);
template <class T, class U> istream& operator>>(istream& is, pair<T, U>& p) { return is >> p.first >> p.second; }
template <class T> istream& operator>>(istream& is, vector<T>& v) {
    for (auto& x : v) is >> x;
    return is;
}

// ---- 更新: 小さく（大きく）なったときだけ代入し、代入したかを返す ----
template <class T> bool chmin(T& a, const T& b) { return b < a ? (a = b, true) : false; }
template <class T> bool chmax(T& a, const T& b) { return a < b ? (a = b, true) : false; }

// ---- 整数の割り算: 負の数でも数学的な floor / ceil を返す（b != 0）----
ll floor_div(ll a, ll b) { return a / b - (a % b != 0 && ((a < 0) != (b < 0))); }
ll ceil_div(ll a, ll b) { return a / b + (a % b != 0 && ((a < 0) == (b < 0))); }

// ---- グリッド: (i, j) が H×W の内側か ----
bool is_in_grid(ll i, ll j, ll h, ll w) { return 0 <= i && i < h && 0 <= j && j < w; }

// ---- 出力: Yes / No ----
void yes_no(bool ok) { cout << (ok ? "Yes" : "No") << '\n'; }

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    return 0;
}
