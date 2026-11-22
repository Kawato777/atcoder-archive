# テンプレート（base.cpp）の使い方

`scripts/new`（サイドバーの **過去問を取得** / **コンテスト用に作成**）で作るファイルは、すべて `base.cpp` のコピーから始まる。ここでは `base.cpp` に入っている道具を、使い方の例と一緒にまとめる。

- `base.cpp` は提出コードにそのまま入るため、[AtCoder生成AI対策ルール](https://info.atcoder.jp/entry/llm-rules-ja)に従い、変更したら **コンテスト開始前に main へマージして公開** する（1 行目の URL が公開先）
- 例の出力は GCC 15（`-std=gnu++23`）で実際に動かして確かめたもの

| 道具 | 一言で |
| --- | --- |
| [`rep`](#rep-ループ) | `for` を短く書く |
| [`dbg`](#dbg-デバッグ出力) | 変数の中身を名前付きで標準エラーに出す（提出時は消える） |
| [`inf` / `infl`](#inf--infl-大きな値) | 「まだ届いていない」「最小値の初期値」に使う大きな値 |
| [`dx` / `dy`](#dx--dy-と-is_in_grid-グリッドの-4-方向) | グリッドの上下左右 |
| [`cin >> v`](#cin--v-vector--pair-をまとめて読む) | `vector` / `pair` をまとめて読む |
| [`chmin` / `chmax`](#chmin--chmax-最小値最大値の更新) | 小さく（大きく）なったときだけ更新する |
| [`floor_div` / `ceil_div`](#floor_div--ceil_div-負の数でも正しい切り捨て切り上げ) | 負の数でも正しい切り捨て・切り上げ |
| [`is_in_grid`](#dx--dy-と-is_in_grid-グリッドの-4-方向) | グリッドの範囲内か |
| [`yes_no`](#yes_no-yes--no-の出力) | `Yes` / `No` を出す |

`main` の先頭にある `ios::sync_with_stdio(false); cin.tie(nullptr);` は入出力を速くするための 2 行。消さない。これを入れたら `printf` / `scanf` と `cin` / `cout` を混ぜて使わないこと（出力の順番が崩れる）。

---

## `rep`: ループ

```cpp
rep(i, n)     // for (ll i = 0; i < n; ++i)    … [0, n)
rep(i, l, r)  // for (ll i = l; i < r; ++i)    … [l, r)
```

```cpp
rep(i, 3) cout << i << ' ';     // 0 1 2
rep(i, 2, 5) cout << i << ' ';  // 2 3 4
```

- ループ変数は `ll`。`v.size()` と比べても符号の警告は出ない
- 逆順や 2 つ飛ばしは普通に `for` を書く: `for (ll i = n - 1; i >= 0; --i)`

## `dbg`: デバッグ出力

変数を名前と行番号付きで **標準エラー** に出す。`-DLOCAL` 付きでビルドしたとき（サイドバーのテスト・`scripts/test`・ランダムテスト）だけ動き、提出したコードでは何もしない（`((void)0)` になる）。**提出前に消さなくてよい**。

```cpp
ll n = 4;
vector<ll> a = {3, 1, 4, 1};
vector<pair<ll, ll>> ps = {{1, 2}, {3, 4}};
dbg(n, a, ps);
// [L12] n = 4, a = [3, 1, 4, 1], ps = [(1, 2), (3, 4)]

map<string, int> mp{{"a", 1}};
set<int> st{3, 1};
dbg(mp, st);
// [L16] mp = {"a": 1}, st = [1, 3]
```

- 出せるもの: 数値・`bool`・`char`・`string`、`pair` / `tuple`、`vector` / `set` / `map` などのコンテナ（入れ子も可）、`queue` / `stack` / `priority_queue`（コピーして中身を出す）
- 標準エラーに出るので、サンプルの判定（標準出力だけを比べる）には影響しない
- 本体は `include/debug.hpp`。提出コードには入らない

## `inf` / `infl`: 大きな値

```cpp
constexpr int inf = 1073741823;  // 2^30 - 1（約 1.07 × 10^9）
constexpr ll infl = 1LL << 60;   // 約 1.15 × 10^18
```

**`inf + inf`、`infl + infl` でも溢れない**ように選んである（`inf + inf = 2147483646` は `int` の最大値 `2147483647` 以下）。そのため、`dist[u] + cost` のように INF に何かを足す処理でも、1 回なら溢れない。

```cpp
// BFS の距離（int で足りるとき）。「まだ届いていない」を inf で表す
vector<int> dist(n, inf);
dist[0] = 0;
if (dist[v] == inf) cout << -1 << '\n';

// 最小値を求めるときの初期値（値が 10^9 を超えうるなら infl）
ll best = infl;
for (ll x : a) chmin(best, x);

// 最大値なら -infl から始める
ll mx = -infl;
```

| 使い分け | |
| --- | --- |
| `inf` | 答えや距離が 10^9 未満に収まる、`vector<int>` でメモリを節約したい |
| `infl` | コストの合計が 10^9 を超えうる（ダイクストラ・DP の和など）。迷ったらこちら |

- `infl * 2` や `infl + infl + infl` は溢れる。掛け算や 3 回以上の足し算をする前に `if (d == infl) continue;` で弾く
- `int` の変数に `infl` を入れない（値が壊れる）

## `dx` / `dy` と `is_in_grid`: グリッドの 4 方向

```cpp
constexpr int dx[4] = {1, 0, -1, 0};  // 下, 右, 上, 左（i を行、j を列とした場合）
constexpr int dy[4] = {0, 1, 0, -1};
bool is_in_grid(ll i, ll j, ll h, ll w);  // 0 <= i < h かつ 0 <= j < w
```

```cpp
// H × W のグリッドで、(i, j) から上下左右に進める '.' のマスを列挙する
ll h = 2, w = 3;
vector<string> g = {"..#",
                    "#.."};
ll i = 0, j = 1;
rep(d, 4) {
    ll ni = i + dx[d], nj = j + dy[d];
    if (!is_in_grid(ni, nj, h, w) || g[ni][nj] == '#') continue;
    cout << "(" << ni << "," << nj << ") ";
}
// (1,1) (0,0)
```

- `is_in_grid` を先に判定してから `g[ni][nj]` を読む（順番を逆にすると範囲外アクセス）
- 8 方向が必要なときは、その場で `dx8` / `dy8` を書く

## `cin >> v`: `vector` / `pair` をまとめて読む

**大きさを先に決めてから** `cin >> v` すると、要素をすべて読む。

```cpp
// 入力:
// 4
// 3 1 4 1
// 1 2
// 3 4
ll n;
cin >> n;
vector<ll> a(n);
cin >> a;                       // a = {3, 1, 4, 1}
vector<pair<ll, ll>> ps(2);
cin >> ps;                      // ps = {(1, 2), (3, 4)}
```

- 2 次元も同じ: `vector<vector<ll>> b(h, vector<ll>(w)); cin >> b;`
- グリッドは `vector<string> g(h); cin >> g;`
- 1-indexed で読みたいときや、`a` と `b` が交互に並ぶ入力（`A_1 B_1 A_2 B_2 …`）は普通に `rep` で読む

## `chmin` / `chmax`: 最小値・最大値の更新

```cpp
chmin(a, b);  // b < a なら a = b にして true、そうでなければ何もせず false
chmax(a, b);  // a < b なら a = b にして true
```

```cpp
ll best = infl;
for (ll x : a) chmin(best, x);   // best = 1（a = {3, 1, 4, 1}）

// 更新されたかどうかで処理を分ける（ダイクストラで「より短い経路が見つかったら push」など）
ll mx = -infl;
for (ll x : a) if (chmax(mx, x)) cout << "update " << mx << '\n';
// update 3
// update 4

// DP の遷移
chmin(dp[i + 1], dp[i] + cost);
```

- `a` と `b` は同じ型にする。`chmin(best, 0)` のように `ll` と `int` を混ぜるとコンパイルエラーになるので `chmin(best, 0LL)` と書く

## `floor_div` / `ceil_div`: 負の数でも正しい切り捨て・切り上げ

C++ の `/` は **0 の方向に** 丸めるので、負の数では切り捨て（floor）にならない。`floor_div` / `ceil_div` は数学どおりの値を返す（`b` は 0 以外）。

```cpp
floor_div(7, 2)   //  3
ceil_div(7, 2)    //  4
floor_div(-7, 2)  // -4   （-3.5 以下で最大の整数）
ceil_div(-7, 2)   // -3
-7 / 2            // -3   ← C++ の / は floor ではない
```

```cpp
// 「x * k >= t となる最小の k」（k は整数、x > 0、t は負もありうる）
ll k = ceil_div(t, x);

// 「何周したか」を負の座標でも正しく求める（周期 m）
ll lap = floor_div(pos, m);
```

- 正の数どうしなら `(a + b - 1) / b` でも切り上げられるが、負の数が混ざると壊れる。迷ったら `ceil_div` を使う

## `yes_no`: `Yes` / `No` の出力

```cpp
yes_no(n % 2 == 0);  // n = 4 なら "Yes"、n = 3 なら "No"（改行付き）
```

- AtCoder でよく使う表記 `Yes` / `No`（先頭だけ大文字）で出す。問題によっては `YES` や `yes` を求めるので、問題文の出力例と見比べる
- 出力したあとで終わりたいときは `yes_no(ok); return 0;`

---

## ビルドについて

- ローカルのビルド（サイドバー・`scripts/test`・`scripts/stress`）は `-DLOCAL -I include` 付き。だから `dbg` が動き、`debug.hpp` が見つかる
- 提出時は `LOCAL` が無いので `#include "debug.hpp"` は読まれず、`dbg(...)` は何もしない。`base.cpp` の残りは提出コードに含まれる
- ランダムテスト（`scripts/stress`）はさらに `-D_GLIBCXX_DEBUG` 付き。詳しくは [ランダムテスト](stress.md)
