#!/usr/bin/env bash
# Codespaces / Dev Container 作成時のセットアップ（gcc:15.2 イメージ前提）
#   - tasks.json / scripts/test が呼ぶ g++-15 を用意
#   - online-judge-tools（oj）
#   - AC Library（リポジトリ内 .lib/ac-library）
set -euo pipefail

ACL_VERSION="v1.6"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ACL_DIR="$REPO_ROOT/.lib/ac-library"

ln -sf "$(command -v g++)" /usr/local/bin/g++-15

if ! command -v uv >/dev/null 2>&1; then
  curl -LsSf https://astral.sh/uv/install.sh | sh \
    || { echo "uv のインストールに失敗しました" >&2; exit 1; }
fi
export PATH="$HOME/.local/bin:$PATH"
# oj 11.5.1 は distutils を import するため、Python 3.12 以降では setuptools が必要
uv tool install --force online-judge-tools --with setuptools

if [[ ! -d "$ACL_DIR/atcoder" ]]; then
  mkdir -p "$(dirname "$ACL_DIR")"
  git clone --depth 1 --branch "$ACL_VERSION" https://github.com/atcoder/ac-library.git "$ACL_DIR" \
    || { echo "AC Library の取得に失敗しました" >&2; exit 1; }
fi

# サイドバー拡張の .vsix を作る（インストールは postAttachCommand で行う）
bash "$REPO_ROOT/scripts/install-extension.sh" --build-only

g++-15 --version | head -n1
oj --version | tail -n1
