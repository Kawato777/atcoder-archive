---
status:   解説AC            # 本番AC / 自力AC / 解説AC / 未AC
tags: [グラフ, BFS]   # 大分類と具体的な手法を両方（例: [DP, 桁DP]）
time: O(N + M)        # 時間計算量 例: O(N log N)
space: O(N + M)       # 空間計算量 例: O(N)
review: true          # 復習対象なら true
---

## 着眼点
<!-- どの条件・制約から何に気づけば解法に辿り着けるか -->

## 解法
<!-- 手順と、なぜそれで正しいか -->

## ハマった点・学び
<!-- 次に同じ型が出たとき何を思い出せばよいか。WA/TLE の原因 -->
- eraseはあまり使わない方がいいことがわかった（計算量がO(N)のため）
- 今回はindexをintで管理する形にしたが、queueだとpop,push,frontがO(1)だからそっちを選ぶという手もあるらしい
- graphのタイプは徐々に広げていくことが大切らしい

<!-- Claude の添削・解説を貼るときはこの下に「## Claude による添削・解説（AI生成）」の節を足す -->

## Claude による添削・解説（AI生成）
<!-- 2026-11-17 Claude が生成。AI 生成の節より上は本人が書いている -->
対象: [main.cpp](main.cpp)

### 判定
- 方針（1 から BFS して到達できる頂点を数える）は正しい。サンプル3つとも一致する
- TLE の原因はキューの実装。N=3×10^5 で星形グラフ（1→2..N）を入れると 3.7 秒かかる。直すと 0.1 秒

### 添削
1. **計算量（TLE の原因）**: `q.erase(q.begin())` は vector の残りの要素を全部前に詰めるので O(|q|) かかる。BFS 全体で最悪 O(N^2)。先頭の位置を添字で持てば消さずに済む
```diff
-    while (q.size() > 0) {
-        int x = q[0];
-        q.erase(q.begin());
+    int head = 0;
+    while (head < (int)q.size()) {
+        int x = q[head++];
```
   もう一つの方法は `std::queue<int>` を使うこと（`push` / `front` / `pop` はどれも O(1)）
2. **実装**: `a`, `b` を配列に取っておく必要はない。読み込みながら `graph[a-1].push_back(b-1)` すればよい（正しさには関係しない）
3. part1（積集合を使う方法）は、2 段階以上たどる交換（1→2→3→4）を表せないので、方針として誤り。part2 は `graph[i]` の i が 1..n なので、i=n のとき範囲外アクセスになる

### 解説
- **着眼点**: 「A を渡すと B がもらえる」は A→B の有向辺。手に入るアイテムは「頂点 1 から辿り着ける頂点」と同じ。持っているアイテムは何度でも使えるので、到達可能性の問題になる
- **想定解**: 隣接リストを作り、1 から BFS か DFS をする。O(N + M)
- **本人の解法との比較**: 方針は想定解と同じ。違うのはキューの実装だけ
- **別解**: 再帰 DFS でもよい。ただし深さが最大 3×10^5 になるので、スタックオーバーフローに注意する。Union-Find は向きを扱えないので使えない

### 過去ノートとの照合
- `グラフ` / `BFS` のタグは過去のノートに無い。**記録上は初出**なので `review: true` を勧める
- 計算量で落ちたという点では、ABC483 C（未AC、`データ構造`）とも関係がある。「操作 1 回あたりのコスト × 回数」を見積もる癖をつけたい

### 調べた資料（学習記録）

**グラフ探索（ABC454 C）**
- [ABC454 C 解説](https://hello-world-494ec.firebaseapp.com/articles/abc454c.html)
  - 有向グラフで、1 から辿り着ける頂点を DFS で数える方針
  - グラフの動きを図で見せながら説明している

**検索・数え上げ**
- [std::find](https://cpprefjp.github.io/reference/algorithm/find.html)
  - 範囲 `[first, last)` で最初に一致した要素のイテレータを返す
  - 見つからなければ `last` を返す。計算量は O(範囲の長さ)
- [インデックスの取得方法](https://code.aetheria.jp/2092/)
  - `std::distance(begin, find の戻り値)` で添字が求まる
  - 先に `end()` と比べて、見つかったか確認してから使う
- [std::count](https://cpprefjp.github.io/reference/algorithm/count.html)
  - `*i == value` を満たす要素の個数を返す。型は `difference_type`
  - 計算量は O(範囲の長さ)
- [存在チェックの方法](https://zenn.dev/spacesolver/articles/68e799461eff0b)
  - 範囲 for、`find`、`count` で書ける。添字が要るときは `find` と `distance` を組み合わせる
  - C++23 では `std::ranges::contains` が一番短い

**削除・重複除去**
- [erase / remove / unique / clear の違い](https://qiita.com/messhii222/items/4a66e5f0f9ad37b2f18d)
  - `erase` は後ろの要素を前に詰め、サイズも減らす
  - → 先頭を `erase` すると O(N) かかる。今回の TLE の原因
- [remove の注意点](https://qiita.com/messhii222/items/eba5c61c4a29890f9d8e)
  - `remove` は要素を前に詰めるだけで、サイズは変わらない
  - `vec.erase(newEnd, vec.end())` と組み合わせる（erase-remove イディオム）
- [std::unique](https://qiita.com/takuya000885/items/3ead0668127033070b65)
  - 消えるのは隣り合う重複だけ。戻り値は新しい末尾の次を指すイテレータ
  - `erase` と組み合わせて余りを消す

**集合演算**
- [set_intersection（積集合）](https://minus9d.hatenablog.com/entry/20120625/1340630743)
  - 入力は2つともソートしておく必要がある
  - 出力先を空の vector のまま渡すと segfault になる
  - `inserter(v, v.end())` か `back_inserter(v)` を渡せば、事前の確保が要らない
- [積集合・和集合・差集合](https://phst.hateblo.jp/entry/2016/09/19/004249)
  - `set_intersection` / `set_union` / `set_difference` で求められる。入力はソート済みが前提
  - 結果は `back_inserter` で vector に追加できる

**コピー**
- [std::copy](https://cpprefjp.github.io/reference/algorithm/copy.html)
  - コピー先には、入力と同じ数の要素を書き込める領域が必要
  - 先に確保しない場合は `back_inserter` を使う

**vector とイテレータ**
- [vector::size](https://cpprefjp.github.io/reference/vector/vector/size.html)
  - 計算量は O(1)
  - `distance(begin(), end())` と同じ結果になる
- [vector の基本](https://techmania.jp/blog/cpp-vector/)
  - 要素へのアクセスは添字・範囲 for・イテレータの3通り
  - 追加は `push_back` / `insert`、削除は `pop_back` / `erase`
  - 補足（記事には書かれていない）: `insert` / `erase` は途中や先頭に使うと O(N)
- [vector の初期化は必要か](https://detail.chiebukuro.yahoo.co.jp/qa/question_detail/q14252421764)
  - 空で宣言して `push_back` すればよい。要素数は自動で増える
- [2次元 vector の初期化](https://qiita.com/Onsen_dev/items/28eea2dbfe606663a3fd)
  - `vector<vector<int>> dp(N, vector<int>(N, -1));` のように、第2引数で内側の vector を作って渡す
  - 型の推論を使って `vector dp(N, vector(N, -1));` とも書ける
- [イテレータ](https://rinatz.github.io/cpp-book/ch03-08-iterators/)
  - `end()` は最終要素の1つ先を指す
  - vector のイテレータは `it + 3` のように任意の位置へ進められる
  - 要素を追加・削除すると、それまでのイテレータが無効になることがある。使うと未定義動作
- [pair](https://qiita.com/i_naka/items/6c316d3c4af6229cec1d)
  - 2つの値を1つにまとめられる
  - ソートでは1番目の値を比べ、同じなら2番目の値を比べる

**TLE 対策**
- [TLE になったときの対処法](https://qiita.com/sano192/items/2e7004f9782a52946463)
  - 制約から計算量を見積もる
  - 先頭からの削除・挿入は O(N)、末尾への追加・削除は O(1)（記事は Python 向けだが、C++ の vector でも同じ）
  - 計算量に問題がなければ、無限ループや制約の端のケースを疑う
