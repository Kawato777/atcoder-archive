import * as vscode from "vscode";
import { splitBlock } from "./claudeStream";
import { page } from "./webview";

/** vscode.diff の右側（適用後の note.md）に出す仮想ドキュメント */
export const PREVIEW_SCHEME = "atcoder-review";

export class PreviewContentProvider implements vscode.TextDocumentContentProvider {
  private readonly contents = new Map<string, string>();
  private readonly changed = new vscode.EventEmitter<vscode.Uri>();
  readonly onDidChange = this.changed.event;

  /** 内容を登録して URI を返す（同じ path なら差し替えて再表示させる） */
  set(pathInRepo: string, content: string): vscode.Uri {
    const uri = vscode.Uri.from({ scheme: PREVIEW_SCHEME, path: `/${pathInRepo}` });
    this.contents.set(uri.toString(), content);
    this.changed.fire(uri);
    return uri;
  }

  provideTextDocumentContent(uri: vscode.Uri): string {
    return this.contents.get(uri.toString()) ?? "";
  }

  dispose(): void {
    this.changed.dispose();
  }
}

export type PanelAction = "diff" | "apply" | "applyOverwrite";

export type PanelContent = {
  readonly label: string; // 対象の .cpp（リポジトリ相対）
  readonly block: string;
  /** scripts/note --apply --dry-run の要約（標準エラー出力） */
  readonly summary: string;
  readonly costUsd: number | undefined;
};

const parseAction = (m: unknown): PanelAction | undefined => {
  if (typeof m !== "object" || m === null) return undefined;
  const type: unknown = (m as Record<string, unknown>)["type"];
  return type === "diff" || type === "apply" || type === "applyOverwrite" ? type : undefined;
};

const esc = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);

/** VS Code 標準の Markdown 拡張で HTML にする。使えなければ整形済みテキストで出す */
const renderMarkdown = async (markdown: string): Promise<string> => {
  try {
    const html = await vscode.commands.executeCommand<unknown>("markdown.api.render", markdown);
    if (typeof html === "string") return html;
  } catch {
    // 下で整形済みテキストにする
  }
  return `<pre>${esc(markdown)}</pre>`;
};

const STYLE = `
<style>
  body { max-width: 900px; padding: 8px 20px 24px; line-height: 1.6; }
  .toolbar { position: sticky; top: 0; padding: 6px 0; background: var(--vscode-editor-background);
             border-bottom: 1px solid var(--vscode-panel-border); }
  .md pre { white-space: pre; }
  .md code { font-family: var(--vscode-editor-font-family); }
  .md :not(pre) > code { background: var(--vscode-textCodeBlock-background); padding: 0 3px; }
  .md h2 { border-bottom: 1px solid var(--vscode-panel-border); }
  table { border-collapse: collapse; }
  td { padding: 0 12px 0 0; }
  .summary { white-space: pre-wrap; font-family: var(--vscode-editor-font-family); }
</style>`;

const SCRIPT = `
for (const id of ["diff", "apply", "applyOverwrite"]) {
  document.getElementById(id).addEventListener("click", () => vscode.postMessage({ type: id }));
}
window.addEventListener("message", ({ data }) => {
  if (data.type !== "applied") return;
  document.getElementById("status").textContent = data.text;
  for (const id of ["apply", "applyOverwrite"]) document.getElementById(id).disabled = data.disable;
});
`;

/** 添削・解説を Markdown で表示し、差分表示・適用のボタンを置くパネル */
export class ReviewPanel {
  private readonly panel: vscode.WebviewPanel;

  private constructor(
    content: PanelContent,
    html: string,
    onAction: (action: PanelAction) => void,
  ) {
    this.panel = vscode.window.createWebviewPanel(
      "atcoder.claudeReview",
      `添削: ${content.label}`,
      { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
      { enableScripts: true, retainContextWhenHidden: true },
    );
    this.panel.webview.html = page(this.panel.webview, STYLE + html, SCRIPT);
    this.panel.webview.onDidReceiveMessage((m: unknown) => {
      const action = parseAction(m);
      if (action !== undefined) onAction(action);
    });
  }

  static async open(content: PanelContent, onAction: (action: PanelAction) => void): Promise<ReviewPanel> {
    const { frontmatter, body } = splitBlock(content.block);
    const rows = frontmatter
      .map((l) => l.split(/:(.*)/s))
      .map(([k, v]) => `<tr><td class="muted">${esc(k ?? "")}</td><td>${esc((v ?? "").trim())}</td></tr>`)
      .join("");
    const cost = content.costUsd === undefined ? "" : `（${content.costUsd.toFixed(3)} USD）`;
    const html = `
<div class="toolbar">
  <button id="diff" class="secondary">差分を表示</button>
  <button id="apply">適用</button>
  <button id="applyOverwrite" class="secondary" title="tags / time / space / review に値が入っていても Claude の提案で上書きする">上書きして適用</button>
  <span id="status" class="muted"></span>
</div>
<h3>frontmatter の提案</h3>
<table>${rows}</table>
<div class="summary muted">${esc(content.summary.trim())}</div>
<div class="muted">対象: ${esc(content.label)} ${esc(cost)}</div>
<div class="md">${await renderMarkdown(body)}</div>`;
    return new ReviewPanel(content, html, onAction);
  }

  /** 適用後の表示。disable: 適用ボタンを押せなくする */
  showStatus(text: string, disable: boolean): void {
    void this.panel.webview.postMessage({ type: "applied", text, disable });
  }
}
