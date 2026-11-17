---
status: 自力AC              # 本番AC / 自力AC / 解説AC / 未AC
tags: [グラフ, BFS, グリッド, 連結成分] # 大分類と具体的な手法を両方（例: [DP, 桁DP]）
time: O(HW)           # 時間計算量 例: O(N log N)
space: O(HW)          # 空間計算量 例: O(N)
review: true          # 復習対象なら true
---

## 着眼点
<!-- どの条件・制約から何に気づけば解法に辿り着けるか -->

## 解法
<!-- 手順と、なぜそれで正しいか -->

## ハマった点・学び
<!-- 次に同じ型が出たとき何を思い出せばよいか。WA/TLE の原因 -->

<!-- Claude の添削・解説を貼るときはこの下に「## Claude による添削・解説（AI生成）」の節を足す -->

## Claude による添削・解説（AI生成）
<!-- 2026-11-17 Claude が生成。AI 生成の節より上は本人が書いている -->
対象: [main.cpp](main.cpp)

### 判定
正しい。サンプル2つ一致。H,W≤9 のランダム1500ケースで愚直解（外周から塗りつぶす方式）と全件一致。H=W=1000 の最大ケースは約0.1秒。

### 添削
- 外周判定を「近傍を push する時」に個別に行っているため、正しさが「起点が行優先で最初のマス」「外周行・列ではフラグが立ち続ける」という前提に依存している。判定を「queue から取り出したマス」の1か所にすると前提が不要になる。
- 4方向の処理が3か所に複製されている。`dx[]`/`dy[]` のループにまとめ、起点も `q.push({i, j})` で入れればシード処理は不要。
- `vector<vector<string>>` は約32MBで重い。`vector<string> grid(h)` + `cin >> g` にし、比較も `'.'`（char）にする。
- 細かい点: `list` は `std::list` と同名なので `q` などに改名。`list.size() > 0` は `!q.empty()`、`isEdge == false` は `!isEdge` に。

```diff
-    vector<vector<string>> grid(h, vector<string>(w));
+    vector<string> grid(h);
-    for (auto&& g : grid) {
-        string str;
-        cin >> str;
-        for (int i = 0; i < w; i++) {
-            g[i] = str[i];
-        }
-    }
+    for (auto&& g : grid) cin >> g;
+    const int dx[4] = {1, 0, -1, 0}, dy[4] = {0, 1, 0, -1};
-            if (grid[i][j] == ".") {
-                （queue 宣言・外周判定・右下のシード・while 内の4方向 if ×4）
+            if (grid[i][j] == '.') {
+                queue<pair<int, int>> q;
+                q.push({i, j});
+                bool isEdge = false;
+                while (!q.empty()) {
+                    auto [l, m] = q.front();
+                    q.pop();
+                    if (l == 0 || l == h - 1 || m == 0 || m == w - 1) isEdge = true;
+                    for (int d = 0; d < 4; d++) {
+                        int nl = l + dx[d], nm = m + dy[d];
+                        if (nl < 0 || nl >= h || nm < 0 || nm >= w) continue;
+                        if (checked[nl][nm] || grid[nl][nm] != '.') continue;
+                        checked[nl][nm] = true;
+                        q.push({nl, nm});
+                    }
+                }
+                if (!isEdge) result++;
```

### 解説
- 着眼点: 白マスの連結成分に分け、外周のマスを含む成分を除いて数える。
- 想定解: 各成分を BFS/DFS で調べ、取り出した各マスが外周かを見る。O(HW)。
- 本人の解法との比較: 方針は同じ。違いは外周判定の置き場所だけで、上の修正で実装が短くなる。
- 別解: 外周の白マスから多始点 BFS/DFS で塗りつぶし、残った白の連結成分数を数える。Union-Find で外周を1つの仮想頂点にまとめる方法もある。

### 学んだこと
- [競プロのための標準 C++「queue」](https://zenn.dev/reputeless/books/standard-cpp-for-competitive-programming/viewer/queue): ページ本文は取得できなかったため、以下は一般的な仕様。`push` で末尾に入れ、`front` で先頭を見て、`pop` で取り除く。`pop` は値を返さないので、先に `front` で取る。この解答では BFS の `list`（queue）で使っている（`front()` で取り出し、末尾の `pop()` で削除）。取り出す前に `empty()` / `size()` で空でないことを確かめる必要があり、空の queue に `front` や `pop` を呼ぶのは未定義動作。
- [Qiita: AtCoder で迷った C++ の文字列操作](https://qiita.com/MasahiroBW/items/3f56b22a079cd3272cd3): 添字での1文字アクセス、サイズ・空判定、連結、部分文字列、検索（見つからない場合は `string::npos`）などの基本操作をまとめた記事。この解答では、`str[i]` で1文字を取り出す部分と `grid[i][j] == "."` の比較で使っている。ただし、1文字の比較は `'.'`（char）で足りるので、添削で指摘した型の見直しとつながる。
- [競プロのための標準 C++「string」](https://zenn.dev/reputeless/books/standard-cpp-for-competitive-programming/viewer/string): ページ本文は取得できなかった。内容は推測で書かない。

### 過去ノートとの照合
- BFS は `practice/ABC/454/C`（`[グラフ, BFS]`）に一度だけ出ていて、状態は解説AC。記録上は「未定着」なので `review: true` を勧める。
- グリッド上の BFS・連結成分は記録上は初出。
- `グリッド` と `連結成分` は新規タグ。既存タグは `グラフ`、`BFS` を使った。
- タグ付きノートが18件と少なく、判断材料は十分ではない。
