import { readFileSync } from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";
import { type CaseResult, listCases, runCase, TIME_LIMIT_MS } from "./judge";
import { findRepoRoot, run } from "./process";
import { page } from "./webview";

type Phase = "idle" | "build" | "run";

type Problem = { readonly contest: string; readonly task: string };

type State = {
  readonly file: string | undefined; // 絶対パス
  readonly label: string | undefined; // 表示用の相対パス
  readonly problem: Problem | undefined;
  readonly phase: Phase;
  readonly total: number;
  readonly results: readonly CaseResult[];
  readonly error: string | undefined;
};

type FromWebview = { readonly type: "run" | "openProblem" | "submit" };

const INITIAL: State = {
  file: undefined,
  label: undefined,
  problem: undefined,
  phase: "idle",
  total: 0,
  results: [],
  error: undefined,
};

/** scripts/new が 1 行目に書く "// https://atcoder.jp/contests/<contest>/tasks/<task>" を読む */
export const parseProblem = (source: string): Problem | undefined => {
  const m = /^\s*\/\/\s*https:\/\/atcoder\.jp\/contests\/([\w-]+)\/tasks\/([\w-]+)/.exec(source);
  return m && m[1] && m[2] ? { contest: m[1], task: m[2] } : undefined;
};

const problemUrl = (p: Problem): string => `https://atcoder.jp/contests/${p.contest}/tasks/${p.task}`;
const submitUrl = (p: Problem): string =>
  `https://atcoder.jp/contests/${p.contest}/submit?taskScreenName=${encodeURIComponent(p.task)}`;

const isMessage = (m: unknown): m is FromWebview =>
  typeof m === "object" && m !== null && "type" in m && ["run", "openProblem", "submit"].includes(String(m.type));

const isCpp = (doc: vscode.TextDocument): boolean => doc.uri.scheme === "file" && doc.fileName.endsWith(".cpp");

export class TestViewProvider implements vscode.WebviewViewProvider, vscode.Disposable {
  private view: vscode.WebviewView | undefined;
  private state: State = INITIAL;
  private readonly subscription: vscode.Disposable;

  constructor() {
    this.track(vscode.window.activeTextEditor);
    // Webview をクリックすると activeTextEditor が undefined になるので、最後に開いた .cpp を対象として保持する
    this.subscription = vscode.window.onDidChangeActiveTextEditor((e) => this.track(e));
  }

  dispose(): void {
    this.subscription.dispose();
  }

  resolveWebviewView(view: vscode.WebviewView): void {
    this.view = view;
    view.webview.options = { enableScripts: true };
    view.webview.html = page(view.webview, BODY, SCRIPT);
    view.webview.onDidReceiveMessage((m: unknown) => {
      if (!isMessage(m)) return;
      if (m.type === "run") void this.runTests();
      else if (m.type === "openProblem") void this.openProblem();
      else void this.submit();
    });
    view.onDidChangeVisibility(() => this.post());
    this.post();
  }

  private track(editor: vscode.TextEditor | undefined): void {
    if (editor === undefined || !isCpp(editor.document) || this.state.phase !== "idle") return;
    const file = editor.document.fileName;
    if (file === this.state.file) return;
    const root = findRepoRoot();
    this.setState({
      ...INITIAL,
      file,
      label: root ? path.relative(root, file) : path.basename(file),
      problem: parseProblem(editor.document.getText()),
    });
  }

  private setState(next: Partial<State>): void {
    this.state = { ...this.state, ...next };
    this.post();
  }

  private post(): void {
    void this.view?.webview.postMessage({ type: "state", state: this.state, timeLimitMs: TIME_LIMIT_MS });
  }

  /** 編集中の内容を保存してから返す */
  private async saveAndRead(file: string): Promise<string> {
    const doc = vscode.workspace.textDocuments.find((d) => d.fileName === file);
    if (doc === undefined) return readFileSync(file, "utf8");
    if (doc.isDirty) await doc.save();
    return doc.getText();
  }

  private async runTests(): Promise<void> {
    const { file, phase } = this.state;
    if (file === undefined || phase !== "idle") return;
    const root = findRepoRoot();
    if (root === undefined) {
      this.setState({ error: "scripts/test があるフォルダを開いてください" });
      return;
    }

    const source = await this.saveAndRead(file);
    const dir = path.dirname(file);
    const cases = listCases(path.join(dir, "test"));
    if (cases.length === 0) {
      this.setState({ results: [], error: "test/ にサンプルがありません。インポート欄から問題を取得してください" });
      return;
    }

    this.setState({ phase: "build", total: cases.length, results: [], error: undefined, problem: parseProblem(source) });
    const build = await run(path.join(root, "scripts", "test"), ["--build-only", file], dir);
    if (build.code !== 0) {
      this.setState({ phase: "idle", error: build.stderr.trim() || "コンパイルに失敗しました" });
      return;
    }
    const binary = build.stdout.trim().split("\n").at(-1) ?? "";

    this.setState({ phase: "run" });
    // 実行時間を正しく測るため 1 件ずつ順番に実行する
    const results = await cases.reduce<Promise<readonly CaseResult[]>>(async (acc, c) => {
      const done = await acc;
      const next = [...done, await runCase(binary, dir, c)];
      this.setState({ results: next });
      return next;
    }, Promise.resolve([]));
    this.setState({ phase: "idle", results });
  }

  private async openProblem(): Promise<void> {
    const { problem } = this.state;
    if (problem) await vscode.env.openExternal(vscode.Uri.parse(problemUrl(problem)));
  }

  /** コードをクリップボードにコピーして提出ページを開く（提出はブラウザで手動） */
  private async submit(): Promise<void> {
    const { file, problem } = this.state;
    if (file === undefined || problem === undefined) return;
    await vscode.env.clipboard.writeText(await this.saveAndRead(file));
    await vscode.env.openExternal(vscode.Uri.parse(submitUrl(problem)));
    void vscode.window.showInformationMessage("コードをコピーしました。提出ページに貼り付けて、言語に C++23 (GCC 15.2.0) を選んでください");
  }
}

const BODY = `
<div id="target" class="muted">.cpp ファイルを開いてください</div>
<div>
  <button id="run">▶ テスト実行</button>
  <button id="openProblem" class="secondary">問題を開く</button>
  <button id="submit" class="secondary">コピーして提出ページへ</button>
</div>
<div id="status" class="muted" style="margin-top:8px"></div>
<div id="results"></div>
`;

const SCRIPT = `
const $ = (id) => document.getElementById(id);
for (const type of ["run", "openProblem", "submit"]) {
  $(type).addEventListener("click", () => vscode.postMessage({ type }));
}

const block = (title, text) => '<h4>' + title + '</h4><pre>' + esc(text === "" ? "（空）" : text) + '</pre>';

const caseHtml = (r) => {
  const head = '<span class="badge ' + r.verdict + '">' + r.verdict + '</span>' +
               '<span>' + esc(r.name) + '</span><span class="muted">' + r.timeMs + ' ms</span>' +
               (r.whitespaceDiff ? '<span class="muted" title="AtCoder のルールでは空白・改行の違いは正解扱い">（空白・改行の違いあり）</span>' : "");
  const body = block("入力", r.input) +
               (r.expected === null || r.expected === undefined ? "" : block("期待する出力", r.expected)) +
               block("あなたの出力", r.actual) +
               (r.stderr ? block("標準エラー出力", r.stderr) : "");
  // AC 以外は最初から開いておく
  return '<details' + (r.verdict === "AC" ? "" : " open") + '><summary class="row">' + head + '</summary>' + body + '</details>';
};

window.addEventListener("message", ({ data }) => {
  if (data.type !== "state") return;
  const s = data.state;
  $("target").textContent = s.label ?? ".cpp ファイルを開いてください";
  $("run").disabled = !s.file || s.phase !== "idle";
  $("run").textContent = s.phase === "build" ? "ビルド中…" : s.phase === "run" ? "実行中…" : "▶ テスト実行";
  $("openProblem").disabled = !s.problem;
  $("submit").disabled = !s.problem || s.phase !== "idle";

  const ac = s.results.filter((r) => r.verdict === "AC").length;
  const judged = s.results.filter((r) => r.verdict !== "RUN").length;
  $("status").innerHTML =
    s.error ? '<div class="error">' + esc(s.error) + '</div>' :
    s.phase === "run" ? esc(s.results.length + " / " + s.total + " 件実行") :
    s.results.length === 0 ? "" :
    '<span class="badge ' + (ac === judged ? "AC" : "WA") + '">' + (ac === judged ? "全て AC" : "AC " + ac + " / " + judged) + '</span>' +
    ' <span class="muted">（' + data.timeLimitMs / 1000 + ' 秒を超えると TLE）</span>';
  $("results").innerHTML = s.results.map(caseHtml).join("");
});
`;
