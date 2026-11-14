# atcoder-archive

[AtCoder](https://atcoder.jp/) の解答コード置き場（C++）。過去問の練習用。

## 目次

### AtCoder Beginners Selection (ABS)

[`ABS/`](ABS/) — [問題一覧](https://atcoder.jp/contests/abs/tasks)

### AtCoder Beginner Contest (ABC)

| コンテスト | 解答 |
| --- | --- |
| [ABC483](https://atcoder.jp/contests/abc483) | [`ABC/483`](ABC/483/) |
| [ABC484](https://atcoder.jp/contests/abc484) | [`ABC/484`](ABC/484/) |

## 使い方

環境は AtCoder の **C++23 (GCC 15.2.0)** に合わせている。macOS では次の 1 コマンドで準備できる。

```sh
./scripts/setup-mac.sh
```

VS Code の左端の **AC** アイコンから操作する。

1. **インポート**: コンテストID（例: `abc380`）を入れて問題とサンプルを取得
2. **テスト**: `main.cpp` を書いて **▶ テスト実行**
3. **コピーして提出ページへ** で提出

詳しくは [`docs/`](docs/) を参照。

- [環境構築](docs/setup.md)
- [問題を解く流れ](docs/workflow.md)
- [デバッグ](docs/debug.md)

## AI（Claude）の利用について

- リポジトリの初期化、Codespaces / devcontainer の設定、ビルドタスク、README などの **コンテストと関係ない環境まわり** は Claude を使って作成している。
- **コンテストの解答コードは自分で書いており、AI は使っていない。**
