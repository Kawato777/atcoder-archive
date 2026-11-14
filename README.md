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

詳しくは [`docs/`](docs/) を参照。

- [環境構築](docs/setup.md)
- [問題を解く流れ](docs/workflow.md)
- [デバッグ](docs/debug.md)

## AI（Claude）の利用について

- リポジトリの初期化、Codespaces / devcontainer の設定、ビルドタスク、README などの **コンテストと関係ない環境まわり** は Claude を使って作成している。
- **コンテストの解答コードは自分で書いており、AI は使っていない。**
