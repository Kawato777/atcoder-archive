# atcoder-archive

[AtCoder](https://atcoder.jp/) の解答コード置き場（C++）。

## 目次

### AtCoder Beginners Selection (ABS)

[`ABS/`](ABS/) — [問題一覧](https://atcoder.jp/contests/abs/tasks)

### AtCoder Beginner Contest (ABC)

| コンテスト | 解答 |
| --- | --- |
| [ABC483](https://atcoder.jp/contests/abc483) | [`ABC/483`](ABC/483/) |
| [ABC484](https://atcoder.jp/contests/abc484) | [`ABC/484`](ABC/484/) |

## 環境構築

### GitHub Codespaces（推奨）

1. リポジトリページの **Code → Codespaces → Create codespace on main** を押す
2. 初回起動時に `.devcontainer/setup.sh` が実行され、以下が揃う
   - GCC（`#include <bits/stdc++.h>` が使える）
   - [AC Library](https://github.com/atcoder/ac-library)（`#include <atcoder/all>` が使える）
   - VS Code C/C++ 拡張

ローカルの VS Code + Docker でも「Dev Containers: Reopen in Container」で同じ環境を使える。

### ビルドと実行

VS Code で `.cpp` を開いた状態で:

- **Cmd/Ctrl + Shift + B** … ビルド（同じディレクトリに `<ファイル名>.out` を生成）
- **Terminal → Run Task… → build & run** … ビルドして実行（標準入力はターミナルから入力）

コマンドラインの場合:

```sh
g++ -std=gnu++20 -O2 -Wall -Wextra ABC/484/A.cpp -o a.out && ./a.out
```

新しい問題を始めるときは `base.cpp` をコピーして使う。

## AI（Claude）の利用について

- リポジトリの初期化、Codespaces / devcontainer の設定、ビルドタスク、README などの **コンテストと関係ない環境まわり** は Claude を使って作成している。
- **コンテストの解答コードは自分で書いており、AI は使っていない。**
