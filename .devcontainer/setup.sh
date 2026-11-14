#!/usr/bin/env bash
# Codespaces / Dev Container 作成時に AC Library をインストールする
set -euo pipefail

ACL_DIR="$(mktemp -d)"
trap 'rm -rf "$ACL_DIR"' EXIT

git clone --depth 1 https://github.com/atcoder/ac-library.git "$ACL_DIR" \
  || { echo "AC Library の取得に失敗しました" >&2; exit 1; }
sudo cp -r "$ACL_DIR/atcoder" /usr/local/include/

echo "AC Library を /usr/local/include/atcoder にインストールしました"
g++ --version | head -n1
