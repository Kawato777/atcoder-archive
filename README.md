# atcoder-archive

[AtCoder](https://atcoder.jp/) の解答コード置き場（C++）。参加したコンテストの解答と、過去問の練習・解き直しを残している。

## 目次

| ディレクトリ | 内容 |
| --- | --- |
| [`contest/`](contest/) | 実際に参加したコンテスト。終了時点の状態を残している |
| [`practice/`](practice/) | 過去問と、参加した回の解き直し（upsolve）。問題ごとのフォルダに `main.cpp`（ノートを書いた問題は `note.md` も） |

### 参加したコンテスト

| コンテスト | 解答 |
| --- | --- |
| [ABC484](https://atcoder.jp/contests/abc484) | [`contest/ABC/484`](contest/ABC/484/) |
| [ABC485](https://atcoder.jp/contests/abc485) | [`contest/ABC/485`](contest/ABC/485/) |

### 過去問

| コンテスト | 問題 |
| --- | --- |
| [AtCoder Beginners Selection](https://atcoder.jp/contests/abs) | [`practice/ABS`](practice/ABS/)（11 問） |
| [ABC163](https://atcoder.jp/contests/abc163) | [C](practice/ABC/163/C/) |
| [ABC186](https://atcoder.jp/contests/abc186) | [D](practice/ABC/186/D/) |
| [ABC202](https://atcoder.jp/contests/abc202) | [C](practice/ABC/202/C/) |
| [ABC210](https://atcoder.jp/contests/abc210) | [C](practice/ABC/210/C/) |
| [ABC343](https://atcoder.jp/contests/abc343) | [D](practice/ABC/343/D/) |
| [ABC450](https://atcoder.jp/contests/abc450) | [C](practice/ABC/450/C/) |
| [ABC451](https://atcoder.jp/contests/abc451) | [D](practice/ABC/451/D/) |
| [ABC452](https://atcoder.jp/contests/abc452) | [C](practice/ABC/452/C/) |
| [ABC454](https://atcoder.jp/contests/abc454) | [C](practice/ABC/454/C/) |
| [ABC478](https://atcoder.jp/contests/abc478) | [C](practice/ABC/478/C/) |
| [ABC482](https://atcoder.jp/contests/abc482) | [C](practice/ABC/482/C/) |
| [ABC483](https://atcoder.jp/contests/abc483) | [A](practice/ABC/483/A/) [B](practice/ABC/483/B/) [C](practice/ABC/483/C/) |
| [ABC484](https://atcoder.jp/contests/abc484) | [A](practice/ABC/484/A/) [B](practice/ABC/484/B/) [C](practice/ABC/484/C/) [D](practice/ABC/484/D/) [E](practice/ABC/484/E/) [F](practice/ABC/484/F/) [G](practice/ABC/484/G/) |
| [ABC485](https://atcoder.jp/contests/abc485) | [A](practice/ABC/485/A/) [B](practice/ABC/485/B/) [C](practice/ABC/485/C/) |
| [AHC001](https://atcoder.jp/contests/ahc001) | [A](practice/AHC/001/A/) [A-Final](practice/AHC/001/A-Final/) |

## 使い方

環境は AtCoder の **C++23 (GCC 15.2.0)** に合わせている。macOS では次の 1 コマンドで準備できる（devcontainer も使える）。

```sh
./scripts/setup-mac.sh
```

VS Code の左端の **AC** アイコンから開くサイドバーで操作する。

```
ATCODER
├─ インポート … 先頭にモード（練習 / 本番）の表示と切り替え。種類と番号を選んで「過去問を取得」または「コンテスト用に作成」
├─ テスト     … ▶ テスト実行（サンプル）・input.txt で実行・▶ ランダムテスト・コピーして提出ページへ
└─ ノート     … 解法ノート（note.md）の作成と、Claude での添削（練習モードのみ）
```

### 過去問を解く（練習モード）

1. **インポート**: 種類（ABC など）と番号を選び、**過去問を取得** で問題とサンプルを `practice/` に取得
2. **テスト**: `main.cpp` を書いて **▶ テスト実行**。サンプルは通るのに WA なら、**🎲 雛形を作る** → 愚直解を書いて **▶ ランダムテスト**
3. **コピーして提出ページへ** で提出
4. **ノート**: status・タグを選んで `note.md` を作り、本文を書く。必要なら **🤖 Claude で添削**

### コンテストに参加する（本番モード）

1. 開始前に **インポート** で **コンテスト用に作成** を押す。`contest/` に `A.cpp`〜 が作られ、自動で **本番モード** になる（Claude の機能・ノート・過去問の取得が止まる）
2. 解いて提出する。サンプルテストは使えないが、**input.txt で実行** と **▶ ランダムテスト** は使える
3. 終了後、インポート欄の先頭の **練習モードへ** で戻し、振り返り・添削をする。解き直しは **過去問を取得** で `practice/` に取り直す

詳しくは [`docs/`](docs/) を参照。

- [環境構築](docs/setup.md)
- [問題を解く流れ](docs/workflow.md)
- [テンプレート（base.cpp）の使い方](docs/template.md) … `rep`・`dbg`・`inf` / `infl`・`chmin` / `chmax`・`floor_div` など
- [ランダムテスト](docs/stress.md) … 愚直解との比較。練習と本番での使い方の違い
- [デバッグ](docs/debug.md)

## AI（Claude）の利用について

**解答コードは自分で書いており、AI は使っていない。** AI を使うのは、環境まわりの作成と、解いた後の添削・解説だけ。

| 対象 | 書いた人 |
| --- | --- |
| 解答コード（`practice/**/main.cpp`・`contest/**/*.cpp`） | **自分だけ**。AI による生成・補完・書き直しはしない（添削で受け取るのは差分の提案まで） |
| ランダムテストの愚直解（`brute.cpp`・`<問題>.brute.cpp`） | **自分だけ**（解答コードと同じ扱い） |
| ランダムテストの入力生成器（`gen.py`・`<問題>.gen.py`） | 雛形は `scripts/gen-init` が問題ページから正規表現で作る（生成 AI は使わない）。手直しは自分 |
| テンプレート（`base.cpp`）と `dbg` の本体（`include/debug.hpp`） | Claude を使って作成。入れる要素は自分で選んだ。`base.cpp` は解答コードの先頭に入るため、[AtCoder生成AI対策ルール](https://info.atcoder.jp/entry/llm-rules-ja)に従い、このリポジトリ（public）で**コンテスト開始前に公開**し、1 行目に参照 URL を書いている。`debug.hpp` は `-DLOCAL` のときだけ読み込まれ、提出コードには入らない |
| 解法ノート（`note.md`）の本文（着眼点／解法／ハマった点・学び）と `status` | 自分 |
| `note.md` の `tags` / `time` / `space` / `review` | 自分。Claude の提案を差分で確認して取り込むことがある |
| `note.md` の `## Claude による添削・解説（AI生成）`・`## Claude による添削・解説（AI生成・本番）` の節 | **AI 生成**（先頭に生成日のコメントと、添削したコードへのリンクが入る） |
| スクリプト（`scripts/`）・VS Code 拡張（`tools/`）・スキル（`.claude/`）・devcontainer・ドキュメントなど、コンテストと関係ない環境まわり | Claude を使って作成 |

- 開催中のコンテストでは AI を使わない（[AtCoder生成AI対策ルール](https://info.atcoder.jp/entry/llm-rules-ja)）。VS Code 拡張の **本番モード**（コンテスト用に作成すると自動で入る。インポート欄の先頭で切り替える）では、生成 AI を呼ぶボタンを止めている。添削をもらうのは過去問の練習と、コンテスト終了後の振り返りだけ。
- 添削は、ノート欄の **🤖 Claude で添削** ボタン（裏で Claude Code を非対話で起動）か claude.ai のスキル `atcoder-review` で行う。ボタンから起動した Claude にはファイルの編集と git を禁止しており、`note.md` への反映は差分を見て自分で適用する（[使い方](docs/workflow.md#claude-で添削をもらう)）。
