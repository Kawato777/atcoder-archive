#!/usr/bin/env bash
# tools/vscode-atcoder（サイドバーの「インポート」「テスト」欄）をビルドして VS Code にインストールする
#   scripts/install-extension.sh               # ビルド + インストール
#   scripts/install-extension.sh --build-only  # .vsix を作るだけ（devcontainer の作成時に使う）
#   scripts/install-extension.sh --install-only # 作成済みの .vsix を入れるだけ
#   scripts/install-extension.sh --profile NAME # 指定した VS Code プロファイルに入れる（他のオプションと併用可）
set -euo pipefail

EXT_DIR="$(cd "$(dirname "$0")/../tools/vscode-atcoder" && pwd)"
VSIX="$EXT_DIR/atcoder-practice.vsix"
MODE="all"
PROFILE_ARGS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --build-only|--install-only) MODE="$1"; shift ;;
    --profile)
      [[ $# -ge 2 && -n "$2" ]] || { echo "エラー: --profile にはプロファイル名を指定してください" >&2; exit 1; }
      PROFILE_ARGS=(--profile "$2"); shift 2 ;;
    --profile=*)
      [[ -n "${1#--profile=}" ]] || { echo "エラー: --profile にはプロファイル名を指定してください" >&2; exit 1; }
      PROFILE_ARGS=(--profile "${1#--profile=}"); shift ;;
    *) echo "エラー: 不明なオプション: $1" >&2; exit 1 ;;
  esac
done

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
  code --install-extension "$VSIX" --force ${PROFILE_ARGS[@]+"${PROFILE_ARGS[@]}"}
  echo "インストールしました。VS Code で「Developer: Reload Window」を実行すると左端に AtCoder アイコンが出ます"
else
  echo "code コマンドが見つかりません。VS Code の拡張機能ビューの「…」→「VSIX からのインストール」で $VSIX を入れてください" >&2
  exit 1
fi
