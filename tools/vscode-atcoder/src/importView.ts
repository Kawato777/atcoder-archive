import * as path from "node:path";
import * as vscode from "vscode";
import { findRepoRoot, run } from "./process";
import { page } from "./webview";

/** scripts/new の 1 行（例: "  A: ABC/380/A/main.cpp (作成), サンプル: 4 件取得"） */
type ImportedTask = {
  readonly label: string;
  readonly file: string; // リポジトリルートからの相対パス
  readonly source: string;
  readonly samples: string;
};

type State = {
  readonly running: boolean;
  readonly tasks: readonly ImportedTask[];
  readonly error: string | undefined;
};

type FromWebview =
  | { readonly type: "import"; readonly contest: string; readonly tasks: string }
  | { readonly type: "open"; readonly file: string };

const LINE = /^\s*(\S+): (\S+) \((.+?)\), サンプル: (.+)$/;

export const parseNewOutput = (stdout: string): readonly ImportedTask[] =>
  stdout.split("\n").flatMap((line) => {
    const m = LINE.exec(line);
    return m && m[1] && m[2] && m[3] && m[4] ? [{ label: m[1], file: m[2], source: m[3], samples: m[4] }] : [];
  });

const isMessage = (m: unknown): m is FromWebview =>
  typeof m === "object" && m !== null && "type" in m && (m.type === "import" || m.type === "open");

/** 引数は英数字だけ許可する（シェルを通さないが念のため） */
const words = (s: string): readonly string[] => s.trim().split(/\s+/).filter((w) => w !== "");
const isSafeWord = (w: string): boolean => /^[A-Za-z0-9_-]+$/.test(w);

export class ImportViewProvider implements vscode.WebviewViewProvider {
  private view: vscode.WebviewView | undefined;
  private state: State = { running: false, tasks: [], error: undefined };

  resolveWebviewView(view: vscode.WebviewView): void {
    this.view = view;
    view.webview.options = { enableScripts: true };
    view.webview.html = page(view.webview, BODY, SCRIPT);
    view.webview.onDidReceiveMessage((m: unknown) => {
      if (!isMessage(m)) return;
      if (m.type === "import") void this.import(m.contest, m.tasks);
      else void this.open(m.file);
    });
    this.post();
  }

  private setState(next: Partial<State>): void {
    this.state = { ...this.state, ...next };
    this.post();
  }

  private post(): void {
    void this.view?.webview.postMessage({ type: "state", state: this.state });
  }

  /** 過去問として practice/ に取得する（参加した回の記録はターミナルで scripts/new --contest を使う） */
  private async import(contestInput: string, tasksInput: string): Promise<void> {
    if (this.state.running) return;
    const root = findRepoRoot();
    if (root === undefined) {
      this.setState({ error: "scripts/new があるフォルダを開いてください" });
      return;
    }
    const args = [...words(contestInput).slice(0, 1), ...words(tasksInput)];
    // "-" で始まる語はオプションと解釈されるので入力欄からは受け付けない
    if (args.length === 0 || !args.every((w) => isSafeWord(w) && !w.startsWith("-"))) {
      this.setState({ error: "コンテストIDを入力してください（例: abc380）" });
      return;
    }

    this.setState({ running: true, tasks: [], error: undefined });
    const result = await run(path.join(root, "scripts", "new"), args, root);
    const tasks = parseNewOutput(result.stdout);
    this.setState({
      running: false,
      tasks,
      error: result.code === 0 ? undefined : result.stderr.trim() || `scripts/new が失敗しました（終了コード ${result.code}）`,
    });

    const first = tasks[0];
    if (first) await this.open(first.file);
  }

  private async open(file: string): Promise<void> {
    const root = findRepoRoot();
    if (root === undefined) return;
    const doc = await vscode.workspace.openTextDocument(path.join(root, file));
    await vscode.window.showTextDocument(doc);
  }
}

const BODY = `
<form id="form">
  <label for="contest">コンテストID</label>
  <input id="contest" placeholder="abc380" autocomplete="off">
  <label for="tasks">問題（空なら全部）</label>
  <input id="tasks" placeholder="a c" autocomplete="off">
  <button id="submit" type="submit">取得</button>
</form>
<div id="result"></div>
`;

const SCRIPT = `
const form = document.getElementById("form");
const contest = document.getElementById("contest");
const tasks = document.getElementById("tasks");
const submit = document.getElementById("submit");
const result = document.getElementById("result");

const saved = vscode.getState();
if (saved) { contest.value = saved.contest ?? ""; tasks.value = saved.tasks ?? ""; }

form.addEventListener("submit", (e) => {
  e.preventDefault();
  vscode.setState({ contest: contest.value, tasks: tasks.value });
  vscode.postMessage({ type: "import", contest: contest.value, tasks: tasks.value });
});

result.addEventListener("click", (e) => {
  const file = e.target.closest("[data-file]")?.dataset.file;
  if (file) vscode.postMessage({ type: "open", file });
});

window.addEventListener("message", ({ data }) => {
  if (data.type !== "state") return;
  const { running, tasks: list, error } = data.state;
  submit.disabled = running;
  submit.textContent = running ? "取得中…" : "取得";
  result.innerHTML =
    list.map((t) =>
      '<div class="row"><span class="link" data-file="' + esc(t.file) + '">' + esc(t.label) + ': ' + esc(t.file) + '</span></div>' +
      '<div class="muted" style="margin-left:12px">' + esc(t.source) + ' / サンプル ' + esc(t.samples) + '</div>'
    ).join("") +
    (error ? '<p class="error">' + esc(error) + '</p>' : "");
});
`;
