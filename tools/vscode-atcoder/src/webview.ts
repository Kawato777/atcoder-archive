import { randomBytes } from "node:crypto";
import * as vscode from "vscode";

/** Webview の共通スタイル。色は VS Code のテーマ変数を使い、ライト/ダーク両方に追従させる */
const STYLE = `
  body { padding: 4px 8px 12px; color: var(--vscode-foreground); font-size: var(--vscode-font-size); }
  label { display: block; margin: 6px 0 2px; color: var(--vscode-descriptionForeground); }
  input { width: 100%; box-sizing: border-box; padding: 4px 6px; color: var(--vscode-input-foreground);
          background: var(--vscode-input-background); border: 1px solid var(--vscode-input-border, transparent); }
  input:focus { outline: 1px solid var(--vscode-focusBorder); }
  select { width: 100%; box-sizing: border-box; padding: 4px 6px; color: var(--vscode-dropdown-foreground);
           background: var(--vscode-dropdown-background); border: 1px solid var(--vscode-dropdown-border, transparent); }
  select:focus { outline: 1px solid var(--vscode-focusBorder); }
  button { margin: 8px 4px 0 0; padding: 4px 10px; border: none; cursor: pointer;
           color: var(--vscode-button-foreground); background: var(--vscode-button-background); }
  button:hover { background: var(--vscode-button-hoverBackground); }
  button.secondary { color: var(--vscode-button-secondaryForeground); background: var(--vscode-button-secondaryBackground); }
  button:disabled { opacity: .5; cursor: default; }
  .muted { color: var(--vscode-descriptionForeground); }
  .error { color: var(--vscode-errorForeground); white-space: pre-wrap; font-family: var(--vscode-editor-font-family); }
  .row { display: flex; gap: 6px; align-items: baseline; padding: 2px 0; }
  .link { color: var(--vscode-textLink-foreground); cursor: pointer; }
  .link:hover { text-decoration: underline; }
  .badge { display: inline-block; min-width: 34px; text-align: center; font-weight: 600; border-radius: 3px; padding: 0 4px; }
  .AC  { color: var(--vscode-testing-iconPassed); }
  .WA, .RE, .TLE { color: var(--vscode-testing-iconFailed); }
  .RUN { color: var(--vscode-descriptionForeground); }
  details { margin: 2px 0 6px 12px; }
  summary { cursor: pointer; }
  pre { margin: 2px 0 6px; padding: 4px 6px; overflow-x: auto; white-space: pre;
        background: var(--vscode-textCodeBlock-background); font-family: var(--vscode-editor-font-family); }
  h4 { margin: 6px 0 0; font-weight: 600; }
  .mode-bar { display: flex; align-items: center; justify-content: space-between; gap: 6px;
              margin: 0 -8px 6px; padding: 4px 8px; border-bottom: 1px solid var(--vscode-panel-border, transparent); }
  .mode-bar button { margin: 0; }
  .mode-bar.contest { color: var(--vscode-statusBarItem-warningForeground);
                      background: var(--vscode-statusBarItem-warningBackground); }
`;

export const nonce = (): string => randomBytes(16).toString("base64");

/** スクリプトは nonce 付きのインラインだけ許可する */
export const page = (webview: vscode.Webview, body: string, script: string): string => {
  const n = nonce();
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy"
      content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${n}';">
<style>${STYLE}</style>
</head>
<body>
${body}
<script nonce="${n}">
const vscode = acquireVsCodeApi();
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
${script}
</script>
</body>
</html>`;
};
