#!/usr/bin/env bash
# macOS（Apple Silicon / Homebrew）向けの練習環境セットアップ
#   - GCC 15（AtCoder の C++23 (GCC 15.2.0) に合わせる）
#   - online-judge-tools（oj）
#   - AC Library（リポジトリ内 .lib/ac-library に取得）
set -euo pipefail

ACL_VERSION="v1.6" # AtCoder 現行ジャッジの ac-library = 1.6
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ACL_DIR="$REPO_ROOT/.lib/ac-library"

require() {
  command -v "$1" >/dev/null 2>&1 || { echo "エラー: $1 が見つかりません。$2" >&2; exit 1; }
}

require brew "https://brew.sh からインストールしてください"

echo "==> GCC 15"
brew list gcc@15 >/dev/null 2>&1 || brew install gcc@15
g++-15 --version | head -n1

echo "==> uv"
command -v uv >/dev/null 2>&1 || brew install uv

echo "==> online-judge-tools"
# oj 11.5.1 は distutils を import するため、Python 3.12 以降では setuptools を同梱しないと起動しない
uv tool install --force online-judge-tools --with setuptools
oj --version | tail -n1

echo "==> AC Library ($ACL_VERSION)"
if [[ -d "$ACL_DIR/atcoder" ]]; then
  echo "既にあります: $ACL_DIR"
else
  mkdir -p "$(dirname "$ACL_DIR")"
  git clone --depth 1 --branch "$ACL_VERSION" https://github.com/atcoder/ac-library.git "$ACL_DIR" \
    || { echo "エラー: AC Library の取得に失敗しました" >&2; exit 1; }
fi

echo "==> VS Code 拡張（サイドバー）"
if command -v npm >/dev/null 2>&1; then
  "$REPO_ROOT/scripts/install-extension.sh"
else
  echo "npm が無いのでスキップしました。Node.js を入れてから scripts/install-extension.sh を実行してください" >&2
fi

echo
echo "セットアップ完了。動作確認: ./scripts/new abc380"
