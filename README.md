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

## 環境

AtCoder の現行ジャッジ **C++23 (GCC 15.2.0)** に合わせている（[言語一覧](https://img.atcoder.jp/file/language-update/2025-10/language-list.html)）。

| 項目 | ローカル (macOS) | AtCoder |
| --- | --- | --- |
| コンパイラ | Homebrew `gcc@15` (`g++-15`) | GCC 15.2.0 |
| オプション | `-std=gnu++23 -O2 -Wall -Wextra -DLOCAL` | `-std=gnu++23 -O2 -Wall -Wextra ...` |
| AC Library | v1.6（`.lib/ac-library`） | 1.6 |
| サンプル取得・テスト | [online-judge-tools](https://github.com/online-judge-tools/oj)（`oj`） | — |

AtCoder へのログインは不要（過去問の問題ページとサンプルは公開されているため）。提出だけはブラウザで行う。

## 環境構築

### macOS（メイン）

前提: [Homebrew](https://brew.sh/) と VS Code。

```sh
./scripts/setup-mac.sh
```

以下が入る。

- `gcc@15`（`#include <bits/stdc++.h>` がそのまま使える）
- `oj`（`uv tool` でインストール。oj 11.5.1 は Python 3.12 以降で `distutils` が無く落ちるので `setuptools` を同梱している）
- AC Library v1.6 を `.lib/ac-library` に取得（`#include <atcoder/all>` が使える）
- このリポジトリ専用の VS Code 拡張（[`tools/vscode-atcoder`](tools/vscode-atcoder/)）をビルドしてインストール（Node.js が必要）

VS Code でリポジトリを開き、「推奨拡張機能」をインストールする（C/C++、CodeLLDB、Task Buttons）。拡張を入れた直後はコマンドパレットで **Developer: Reload Window** を実行する。

拡張のコードを変更したときは、`tools/vscode-atcoder` で `npm version patch --no-git-tag-version` を実行してバージョンを上げてから `./scripts/install-extension.sh` で入れ直す（同じバージョンのまま上書きすると、アイコンなどが VS Code のキャッシュで古いまま表示されることがある）。

### Dev Container / Codespaces（予備）

`.devcontainer/` に公式 `gcc:15.2` イメージを使った設定がある。「Dev Containers: Reopen in Container」または Codespaces で開くと `.devcontainer/setup.sh` が同じツールを入れ、接続後にサイドバー拡張もインストールされる。

## 問題を解く1サイクルの流れ

基本は左端の **AtCoder アイコン**（フラスコ）を押して開くサイドバーで操作する。

```
ATCODER
├─ インポート … コンテストIDを入れて「取得」
└─ テスト     … 開いている main.cpp を「▶ テスト実行」、結果をサンプルごとに表示
```

ステータスバー（ウィンドウ最下部）の **New** / **Test** ボタンや、ターミナルのコマンドでも同じことができる。

### 1. 問題を取得する

サイドバーの **インポート** 欄にコンテストID（例: `abc380`）を入れて **取得** を押す。特定の問題だけなら「問題」欄に `a c` のように入れる。取得後は最初の問題の `main.cpp` が開き、一覧の問題名をクリックすると各問題を開ける。

ターミナルなら:

```sh
./scripts/new abc380        # 全問題
./scripts/new abc380 a c    # A と C だけ
```

次のように作られる（既存の `main.cpp` は上書きしない）。

```
ABC/380/
├── A/
│   ├── main.cpp      ← base.cpp のコピー。1行目に問題URL
│   └── test/         ← サンプルケース（git 管理外）
│       ├── sample-1.in
│       └── sample-1.out
└── B/ ...
```

### 2. 問題を読む

**テスト** 欄の **問題を開く** を押す（または `main.cpp` の1行目の URL を **Cmd + クリック**）。

### 3. 解く

`main.cpp` を編集する。保存時に自動でフォーマットされる。

### 4. サンプルでテストする

`main.cpp` を開いた状態で **テスト** 欄の **▶ テスト実行** を押す（未保存なら自動で保存される）。

- AtCoder と同じオプションでビルドし、`test/` のサンプルを 1 件ずつ実行する
- サンプルごとに **AC / WA / RE / TLE** と実行時間を表示する。AC 以外は「入力 / 期待する出力 / あなたの出力」が開いた状態で出る
- 2 秒を超えると TLE、6 秒で強制終了する
- コンパイルエラーはテスト欄にそのまま表示される

#### 出力の比較方法

AtCoder の[コンテストルール](https://atcoder.jp/contests/abc380/rules)に合わせ、**空白と改行を区別せず、単語の列が一致すれば AC** とする。

> 本来の正しい出力について、空白文字（CR/LF/Space/Tab）を別の空白文字に置き換えたり、空白文字を先頭・末尾・別の空白文字の直後に追加したものを出力した場合も正解と判定されます。

- 末尾の改行が無い、行末に空白がある、などの違いは AC になる。完全一致ではないときは「（空白・改行の違いあり）」と注記が出る
- 問題文に「このルールは適用されない」と書かれた問題は例外なので、出力形式を正確に合わせる
- 下記の Test ボタン・`scripts/test` も同じ比較（`oj t -N`）にしている。oj の既定は完全一致なので、`oj t` を直接使うと末尾の改行が無いだけで WA になる

ほかの起動方法（こちらは `oj t -N` で判定する）:

- ステータスバーの **Test** ボタン、またはコマンドパレット（**Cmd + Shift + P**）→ **Tasks: Run Test Task**
- ターミナル: `./scripts/test ABC/380/A/main.cpp`

自分で考えたケースを試すときは、`test/` に `custom-1.in` と `custom-1.out` を置くと一緒にテストされる。

小数を出力する問題（「誤差 10^-6 まで許容」など）は、サイドバーでは誤差を考慮しないため、桁数の違いだけで WA になることがある。その場合は問題のディレクトリで `oj t -e 1e-6 -c ./main.out -d test` を実行して確認する。

### 5. 提出する

**テスト** 欄の **コピーして提出ページへ** を押す。コードがクリップボードにコピーされ、ブラウザで提出ページが開くので、貼り付けて言語に **C++23 (GCC 15.2.0)** を選んで提出する。

### 6. コミットする

```sh
git add ABC/380/A/main.cpp
git commit -m "feat:ABC380 A を解いた"
```

`test/` やビルド成果物（`*.out`）は `.gitignore` で除外している。

## その他のタスク

| タスク | 内容 |
| --- | --- |
| **build**（Cmd + Shift + B） | ビルドだけ行う（`<ファイル名>.out` を生成） |
| **build & run** | ビルドして実行。入力はターミナルから打ち込む |

## デバッグ（ブレークポイント・変数の確認）

[CodeLLDB](https://marketplace.visualstudio.com/items?itemName=vadimcn.vscode-lldb) 拡張を使う。

1. デバッグしたい `.cpp` を開き、行番号の左をクリックしてブレークポイント（赤丸）を置く
2. サイドバーの **実行とデバッグ**（▷と虫のアイコン）で構成を選び、**F5** で開始する
   - デバッグ用ビルド（`-g -O0`）が自動で走り、ブレークポイントで止まる
3. 止まったら左の「変数」欄で中身を確認する。**F10** で次の行へ、**F11** で関数の中へ進む。**Shift+F5** で終了する

### 入力の渡し方

| 構成 | 入力方法 |
| --- | --- |
| **Debug (sample-1)** | 同じディレクトリの `test/sample-1.in` を標準入力として読む |
| **Debug (input.txt)** | 同じディレクトリの `input.txt` を標準入力として読む（自分で用意した入力を使うとき） |
| **Debug (手入力)** | 下部のターミナルに直接打ち込む |

- `input.txt` は `.gitignore` で除外しているのでコミットされない
- 手入力の構成で何も起きないように見えるときは、`cin` で入力待ちになっている。下部のターミナルをクリックして入力する

## 古い解答について

`ABC/483`・`ABC/484`・`ABS/` は `scripts/new` を作る前の形式（`A.cpp` を直接置く形式）。`test/` が無いので Test ボタンは使えない。build / デバッグはそのまま使える。

## AI（Claude）の利用について

- リポジトリの初期化、Codespaces / devcontainer の設定、ビルドタスク、README などの **コンテストと関係ない環境まわり** は Claude を使って作成している。
- **コンテストの解答コードは自分で書いており、AI は使っていない。**
