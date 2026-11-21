# atcoder-archive

[AtCoder](https://atcoder.jp/) の解答コード置き場（C++）。過去問の練習用。

## 目次

| ディレクトリ | 内容 |
| --- | --- |
| [`contest/`](contest/) | 実際に参加したコンテスト。終了時点の状態を残している |
| [`practice/`](practice/) | 過去問と、参加した回の解き直し（upsolve） |

### 参加したコンテスト

| コンテスト | 解答 |
| --- | --- |
| [ABC484](https://atcoder.jp/contests/abc484) | [`contest/ABC/484`](contest/ABC/484/) |

### 過去問

| コンテスト | 解答 |
| --- | --- |
| [AtCoder Beginners Selection](https://atcoder.jp/contests/abs) | [`practice/ABS`](practice/ABS/) |
| [ABC483](https://atcoder.jp/contests/abc483) | [`practice/ABC/483`](practice/ABC/483/) |

## 使い方

環境は AtCoder の **C++23 (GCC 15.2.0)** に合わせている。macOS では次の 1 コマンドで準備できる。

```sh
./scripts/setup-mac.sh
```

VS Code の左端の **AC** アイコンから操作する。

1. **インポート**: 種類（ABC など）と番号を選び、**過去問を取得** で問題とサンプルを `practice/` に取得（コンテスト参加時は **コンテスト用に作成** で `contest/` に `A.cpp`〜 を作成）
2. **テスト**: `main.cpp` を書いて **▶ テスト実行**
3. **コピーして提出ページへ** で提出
4. **ノート**: status・タグを選んで解法ノート（`note.md`）を作り、本文を書く

詳しくは [`docs/`](docs/) を参照。

- [環境構築](docs/setup.md)
- [問題を解く流れ](docs/workflow.md)
- [デバッグ](docs/debug.md)

## AI（Claude）の利用について

**解答コードは自分で書いており、AI は使っていない。** AI を使うのは、環境まわりの作成と、解いた後の添削・解説だけ。

| 対象 | 書いた人 |
| --- | --- |
| 解答コード（`practice/**/main.cpp`・`contest/**/*.cpp`） | **自分だけ**。AI による生成・補完・書き直しはしない（添削で受け取るのは差分の提案まで） |
| テンプレート（`base.cpp`）と `dbg` の本体（`include/debug.hpp`） | Claude を使って作成。入れる要素は自分で選んだ。`base.cpp` は解答コードの先頭に入るため、[AtCoder生成AI対策ルール](https://info.atcoder.jp/entry/llm-rules-ja)に従い、このリポジトリ（public）で**コンテスト開始前に公開**し、1 行目に参照 URL を書いている。`debug.hpp` は `-DLOCAL` のときだけ読み込まれ、提出コードには入らない |
| 解法ノート（`note.md`）の本文（着眼点／解法／ハマった点・学び）と `status` | 自分 |
| `note.md` の `tags` / `time` / `space` / `review` | 自分。Claude の提案を差分で確認して取り込むことがある |
| `note.md` の `## Claude による添削・解説（AI生成）`・`## Claude による添削・解説（AI生成・本番）` の節 | **AI 生成**（先頭に生成日のコメントと、添削したコードへのリンクが入る） |
| スクリプト（`scripts/`）・VS Code 拡張（`tools/`）・スキル（`.claude/`）・devcontainer・ドキュメントなど、コンテストと関係ない環境まわり | Claude を使って作成 |

- 開催中のコンテストでは AI を使わない（[AtCoder生成AI対策ルール](https://info.atcoder.jp/entry/llm-rules-ja)）。添削をもらうのは過去問の練習と、コンテスト終了後の振り返りだけ。
- 添削は、ノート欄の **🤖 Claude で添削** ボタン（裏で Claude Code を非対話で起動）か claude.ai のスキル `atcoder-review` で行う。ボタンから起動した Claude にはファイルの編集と git を禁止しており、`note.md` への反映は差分を見て自分で適用する（[使い方](docs/workflow.md#claude-で添削をもらう)）。
