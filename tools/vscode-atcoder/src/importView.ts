import * as path from "node:path";
import * as vscode from "vscode";
import { buildContestId, canCreateForContest, CONTEST_KINDS } from "./contestKind";
import { findRepoRoot, run } from "./process";
import { page } from "./webview";

/**
 * scripts/new の 1 行
 *   過去問:         "  A: practice/ABC/380/A/main.cpp (作成), サンプル: 4 件取得"
 *   コンテスト参加: "  A: contest/ABC/485/A.cpp (作成)"
 */
type ImportedTask = {
  readonly label: string;
  readonly file: string; // リポジトリルートからの相対パス
  readonly source: string;
  readonly samples: string | undefined;
};

type Mode = "practice" | "contest";

type State = {
  readonly running: Mode | undefined;
  readonly tasks: readonly ImportedTask[];
  readonly error: string | undefined;
};

type ImportMessage = {
  readonly type: "import";
  readonly mode: Mode;
  readonly kind: string;
  readonly value: string;
  readonly tasks: string;
};

type FromWebview = ImportMessage | { readonly type: "open"; readonly file: string };

const LINE = /^\s*(\S+): (\S+) \((.+?)\)(?:, サンプル: (.+))?$/;

export const parseNewOutput = (stdout: string): readonly ImportedTask[] =>
  stdout.split("\n").flatMap((line) => {
    const m = LINE.exec(line);
    return m && m[1] && m[2] && m[3] ? [{ label: m[1], file: m[2], source: m[3], samples: m[4] }] : [];
  });

const isMessage = (m: unknown): m is FromWebview =>
  typeof m === "object" && m !== null && "type" in m && (m.type === "import" || m.type === "open");

/** 問題ラベルは英数字だけ許可する（"-" 始まりはオプションと解釈されるので不可） */
const words = (s: string): readonly string[] => s.trim().split(/\s+/).filter((w) => w !== "");
const isLabel = (w: string): boolean => /^[A-Za-z0-9]+$/.test(w);

export class ImportViewProvider implements vscode.WebviewViewProvider {
  private view: vscode.WebviewView | undefined;
  private state: State = { running: undefined, tasks: [], error: undefined };

  resolveWebviewView(view: vscode.WebviewView): void {
    this.view = view;
    view.webview.options = { enableScripts: true };
    view.webview.html = page(view.webview, BODY, script());
    view.webview.onDidReceiveMessage((m: unknown) => {
      if (!isMessage(m)) return;
      if (m.type === "import") void this.import(m);
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

  private async import(m: ImportMessage): Promise<void> {
    if (this.state.running !== undefined) return;
    const root = findRepoRoot();
    if (root === undefined) {
      this.setState({ error: "scripts/new があるフォルダを開いてください" });
      return;
    }
    const contest = buildContestId(m.kind, m.value);
    if (!contest.ok) {
      this.setState({ tasks: [], error: contest.error });
      return;
    }
    if (m.mode === "contest" && !canCreateForContest(m.kind)) {
      this.setState({ tasks: [], error: "コンテスト用の作成は ABC / ARC / AGC / AHC だけに対応しています" });
      return;
    }
    const labels = words(m.tasks);
    if (!labels.every(isLabel)) {
      this.setState({ tasks: [], error: "問題は英数字で、空白区切りで入力してください（例: a c）" });
      return;
    }

    this.setState({ running: m.mode, tasks: [], error: undefined });
    const flags = m.mode === "contest" ? ["--contest"] : [];
    const result = await run(path.join(root, "scripts", "new"), [...flags, contest.id, ...labels], root);
    const tasks = parseNewOutput(result.stdout);
    this.setState({
      running: undefined,
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
  <label for="kind">種類</label>
  <select id="kind"></select>
  <div id="valueRow">
    <label id="valueLabel" for="value">番号</label>
    <input id="value" autocomplete="off">
  </div>
  <div id="preview" class="muted"></div>
  <label for="tasks">問題（空なら全部）</label>
  <input id="tasks" placeholder="a c" autocomplete="off">
  <button id="practice" type="submit">過去問を取得</button>
  <button id="contest" type="button" class="secondary">コンテスト用に作成</button>
  <div id="note" class="muted"></div>
</form>
<div id="result"></div>
`;

const script = (): string => `
const KINDS = ${JSON.stringify(CONTEST_KINDS)};
const $ = (id) => document.getElementById(id);
const kind = $("kind"), value = $("value"), tasks = $("tasks");
const practiceBtn = $("practice"), contestBtn = $("contest");

kind.innerHTML = KINDS.map((k) => '<option value="' + esc(k.id) + '">' + esc(k.label) + '</option>').join("");

const saved = vscode.getState();
if (saved) { kind.value = saved.kind ?? "abc"; value.value = saved.value ?? ""; tasks.value = saved.tasks ?? ""; }

const current = () => KINDS.find((k) => k.id === kind.value) ?? KINDS[0];

// 入力欄の表示と、実際に使われるコンテストIDのプレビュー（検証は拡張側で行う）
const refresh = () => {
  const k = current();
  const v = value.value.trim().toLowerCase();
  $("valueRow").style.display = k.input === "fixed" ? "none" : "";
  $("valueLabel").textContent = k.input === "series" ? "番号" : "コンテストID";
  value.placeholder = k.input === "series" ? "380" : "hhkb2020";
  const id = k.input === "fixed" ? k.id
    : k.input === "series" ? (/^\\d{1,4}$/.test(v) ? k.id + v.padStart(3, "0") : "")
    : v;
  $("preview").textContent = id ? "→ " + id : "";
  contestBtn.disabled = k.input !== "series";
  $("note").textContent = k.input === "series"
    ? "コンテスト用に作成: 通信せず base.cpp から contest/ に A.cpp〜 を作る"
    : "コンテスト用の作成は ABC / ARC / AGC / AHC のみ";
};

const send = (mode) => {
  vscode.setState({ kind: kind.value, value: value.value, tasks: tasks.value });
  vscode.postMessage({ type: "import", mode, kind: kind.value, value: value.value, tasks: tasks.value });
};

kind.addEventListener("change", refresh);
value.addEventListener("input", refresh);
$("form").addEventListener("submit", (e) => { e.preventDefault(); send("practice"); });
contestBtn.addEventListener("click", () => send("contest"));
refresh();

$("result").addEventListener("click", (e) => {
  const file = e.target.closest("[data-file]")?.dataset.file;
  if (file) vscode.postMessage({ type: "open", file });
});

window.addEventListener("message", ({ data }) => {
  if (data.type !== "state") return;
  const { running, tasks: list, error } = data.state;
  practiceBtn.disabled = running !== undefined && running !== null;
  practiceBtn.textContent = running === "practice" ? "取得中…" : "過去問を取得";
  contestBtn.textContent = running === "contest" ? "作成中…" : "コンテスト用に作成";
  if (running) contestBtn.disabled = true; else refresh();
  $("result").innerHTML =
    list.map((t) =>
      '<div class="row"><span class="link" data-file="' + esc(t.file) + '">' + esc(t.label) + ': ' + esc(t.file) + '</span></div>' +
      '<div class="muted" style="margin-left:12px">' + esc(t.source) + (t.samples ? ' / サンプル ' + esc(t.samples) : '') + '</div>'
    ).join("") +
    (error ? '<p class="error">' + esc(error) + '</p>' : "");
});
`;
