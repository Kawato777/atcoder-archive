#!/usr/bin/env bash
# tools/vscode-atcoder（サイドバーの「インポート」「テスト」欄）をビルドして VS Code にインストールする
#   scripts/install-extension.sh               # ビルド + インストール
#   scripts/install-extension.sh --build-only  # .vsix を作るだけ（devcontainer の作成時に使う）
#   scripts/install-extension.sh --install-only # 作成済みの .vsix を入れるだけ
set -euo pipefail

EXT_DIR="$(cd "$(dirname "$0")/../tools/vscode-atcoder" && pwd)"
VSIX="$EXT_DIR/atcoder-practice.vsix"
MODE="${1:-all}"

if [[ "$MODE" != "--install-only" ]]; then
  command -v npm >/dev/null || { echo "エラー: npm がありません。Node.js をインストールしてください" >&2; exit 1; }
  (
    cd "$EXT_DIR"
    npm ci --no-audit --no-fund
    npm run compile
    npm run package
  )
fi

[[ "$MODE" == "--build-only" ]] && exit 0
[[ -f "$VSIX" ]] || { echo "エラー: $VSIX がありません。先に --build-only で作成してください" >&2; exit 1; }

if command -v code >/dev/null; then
  code --install-extension "$VSIX" --force
  echo "インストールしました。VS Code で「Developer: Reload Window」を実行すると左端に AtCoder アイコンが出ます"
else
  echo "code コマンドが見つかりません。VS Code の拡張機能ビューの「…」→「VSIX からのインストール」で $VSIX を入れてください" >&2
  exit 1
fi
