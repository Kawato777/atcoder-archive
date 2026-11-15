---
status:   本番AC            # 本番AC / 自力AC / 解説AC / 未AC
tags: [実装, Ad-hoc]  # 大分類と具体的な手法を両方（例: [DP, 桁DP]）
time: O(K)            # 時間計算量 例: O(N log N)
space: O(K)           # 空間計算量 例: O(N)
review: false         # 復習対象なら true
---

## 着眼点
<!-- どの条件・制約から何に気づけば解法に辿り着けるか -->

## 解法
<!-- 手順と、なぜそれで正しいか -->

## ハマった点・学び
<!-- 次に同じ型が出たとき何を思い出せばよいか。WA/TLE の原因 -->

<!-- Claude の添削・解説を貼るときはこの下に「## Claude による添削・解説（AI生成）」の節を足す -->

## Claude による添削・解説（AI生成・本番）
<!-- 2026-11-15 Claude が生成。AI 生成の節より上は本人が書いている -->
対象: [contest/ABC/484/B.cpp](../../../../contest/ABC/484/B.cpp)

### 判定
正しいと思う。制約（K ≤ 9、A_i は互いに異なる 1〜9）の範囲で WA になる入力は見つからなかった。`scripts/test` の結果は 3/3 AC（practice 側のサンプルを使用）。

### 添削
指摘なし（正当性・オーバーフロー・計算量いずれも問題なし）。以下は任意の簡略化。

- `l` を読んですぐ `a[i]` に入れており、`isNine` との二重管理になっている。9 の有無は `find` や `count` で判定でき、`isNine` と `l` を省ける。
- 最小値が必要なだけなので、`vector` を作らず入力しながら最小値を更新する形でもよい。

```diff
-    int k,l;
-    bool isNine = false;
-    cin >> k;
-    vector<int> a(k);
-    for(int i=0;i<k;i++){
-        cin >> l;
-        if(l==9)isNine = true;
-        a[i] = l;
-    }
-    if(isNine == false) cout << -1;
-    else cout << *min_element(a.begin(),a.end());
+    int k;
+    cin >> k;
+    vector<int> a(k);
+    for(auto &x : a) cin >> x;
+    if(ranges::count(a, 9) == 0) cout << -1 << endl;
+    else cout << ranges::min(a) << endl;
```

出力末尾の改行は無くても AtCoder では通るが、付けておくほうが安全。

### 解説
- **着眼点**: 9 番が残っていなければ -1、残っていれば残りの最小値を答える、という 2 分岐だけで済む。
- **想定解**: 9 の有無を調べ、最小値を取る。K ≤ 9 なので計算量は O(K)。
- **本人の解法との比較**: 方針は想定解と同じ。`min_element` を使っていて簡潔。9 の判定を別フラグで持つ点だけが、上の差分と異なる。

### 過去ノートとの照合
典型は単純な条件分岐＋最小値の取得で、タグは `実装` と `Ad-hoc` が妥当。同タグの過去問は次のとおり。
- `practice/ABC/484/A`（https://atcoder.jp/contests/abc484/tasks/abc484_a）: status 未記入
- `practice/ABS/ABC086C`（https://atcoder.jp/contests/abs/tasks/arc089_a）: 解説AC

タグ付きの過去ノートが少なく、定着度の判断材料は足りない。ただし内容が易しく、本番で AC できているため `review: false` でよいと思う。
