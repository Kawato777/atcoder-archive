# 環境構築

## 環境

AtCoder の現行ジャッジ **C++23 (GCC 15.2.0)** に合わせている（[言語一覧](https://img.atcoder.jp/file/language-update/2025-10/language-list.html)）。

| 項目 | ローカル (macOS) | AtCoder |
| --- | --- | --- |
| コンパイラ | Homebrew `gcc@15` (`g++-15`) | GCC 15.2.0 |
| オプション | `-std=gnu++23 -O2 -Wall -Wextra -DLOCAL` | `-std=gnu++23 -O2 -Wall -Wextra ...` |
| AC Library | v1.6（`.lib/ac-library`） | 1.6 |
| サンプル取得・テスト | [online-judge-tools](https://github.com/online-judge-tools/oj)（`oj`） | — |

AtCoder へのログインは不要（過去問の問題ページとサンプルは公開されているため）。提出だけはブラウザで行う。

## macOS（メイン）

前提: [Homebrew](https://brew.sh/)、Node.js、VS Code。

```sh
./scripts/setup-mac.sh
```

以下が入る。

| もの | 説明 |
| --- | --- |
| `gcc@15` | `#include <bits/stdc++.h>` がそのまま使える |
| `oj` | `uv tool` でインストール。oj 11.5.1 は Python 3.12 以降で `distutils` が無く落ちるので `setuptools` を同梱している |
| AC Library v1.6 | `.lib/ac-library` に取得。`#include <atcoder/all>` が使える |
| サイドバー拡張 | このリポジトリ専用の VS Code 拡張（[`tools/vscode-atcoder`](../tools/vscode-atcoder/)）をビルドしてインストール |

続けて VS Code でリポジトリを開き、次を行う。

1. 右下に出る「推奨拡張機能」をインストールする（C/C++、CodeLLDB、Task Buttons）
2. コマンドパレット（**Cmd + Shift + P**）で **Developer: Reload Window** を実行する
3. 左端に **AC** アイコンが出ていれば完了

## Dev Container / Codespaces（予備）

`.devcontainer/` に公式 `gcc:15.2` イメージを使った設定がある。「Dev Containers: Reopen in Container」または Codespaces で開くと、`.devcontainer/setup.sh` が同じツールを入れ、接続後にサイドバー拡張もインストールされる。

## サイドバー拡張を更新する

`tools/vscode-atcoder/src/` を変更したら、バージョンを上げてから入れ直す。

```sh
cd tools/vscode-atcoder && npm version patch --no-git-tag-version && cd -
./scripts/install-extension.sh
```

その後 **Developer: Reload Window** を実行する。同じバージョンのまま上書きすると、アイコンなどが VS Code のキャッシュで古いまま表示されることがある。

## 困ったとき

| 症状 | 対処 |
| --- | --- |
| 左端に AC アイコンが出ない | **Developer: Reload Window** を実行する。それでも出なければ `./scripts/install-extension.sh` を実行する |
| アイコンや見た目が更新されない | 上の「サイドバー拡張を更新する」の手順でバージョンを上げて入れ直す |
| `g++-15` / `oj` が見つからない | `./scripts/setup-mac.sh` を実行する |
| `oj` が `No module named 'distutils'` で落ちる | `uv tool install --force online-judge-tools --with setuptools` で入れ直す |
| `#include <atcoder/...>` が見つからない | `.lib/ac-library` が無い。`./scripts/setup-mac.sh` を実行する |
