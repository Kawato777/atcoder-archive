import { existsSync, readFileSync } from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";
import { type CaseResult, listCases, type TestCase, runCase, testDirFor, TIME_LIMIT_MS } from "./judge";
import { findRepoRoot, run } from "./process";
import { companionPaths, hasCompanions, startStress, type StressRun } from "./stress";
import { page } from "./webview";

type Phase = "idle" | "build" | "run";

/** 何を実行しているか（test/ のサンプル / 自分で書いた input.txt / ランダムテスト） */
type RunKind = "samples" | "input" | "stress";

type Problem = { readonly contest: string; readonly task: string };

type State = {
  readonly file: string | undefined; // 絶対パス
  readonly label: string | undefined; // 表示用の相対パス
  readonly problem: Problem | undefined;
  readonly phase: Phase;
  readonly kind: RunKind;
  readonly total: number;
  readonly results: readonly CaseResult[];
  readonly error: string | undefined;
  /** gen.py / brute.cpp があるか */
  readonly companions: { readonly gen: boolean; readonly brute: boolean };
  /** ランダムテストの進み具合 */
  readonly stress: { readonly done: number; readonly skipped: number } | undefined;
  /** 成功時などの補足（エラーではないもの） */
  readonly notice: string | undefined;
};

const MESSAGE_TYPES = ["run", "runInput", "openProblem", "submit", "stress", "stopStress", "genInit", "openGen"] as const;
type FromWebview = { readonly type: (typeof MESSAGE_TYPES)[number] };

const INITIAL: State = {
  file: undefined,
  label: undefined,
  problem: undefined,
  phase: "idle",
  kind: "samples",
  total: 0,
  results: [],
  error: undefined,
  companions: { gen: false, brute: false },
  stress: undefined,
  notice: undefined,
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
  typeof m === "object" && m !== null && "type" in m && MESSAGE_TYPES.some((t) => t === m.type);

const isCpp = (doc: vscode.TextDocument): boolean => doc.uri.scheme === "file" && doc.fileName.endsWith(".cpp");

export class TestViewProvider implements vscode.WebviewViewProvider, vscode.Disposable {
  private view: vscode.WebviewView | undefined;
  private state: State = INITIAL;
  private readonly subscriptions: readonly vscode.Disposable[];
  private stressRun: StressRun | undefined;

  constructor() {
    this.track(vscode.window.activeTextEditor);
    this.subscriptions = [
      // Webview をクリックすると activeTextEditor が undefined になるので、最後に開いた .cpp を対象として保持する
      vscode.window.onDidChangeActiveTextEditor((e) => this.track(e)),
      // 1 行目の URL を後から書き換えても「問題を開く」「提出」に反映させる
      vscode.workspace.onDidChangeTextDocument((e) => this.refreshProblem(e.document)),
      // gen.py / brute.cpp を作ったり消したりしたらボタンを切り替える
      vscode.workspace.onDidCreateFiles(() => this.refreshCompanions()),
      vscode.workspace.onDidDeleteFiles(() => this.refreshCompanions()),
    ];
  }

  dispose(): void {
    this.subscriptions.forEach((d) => d.dispose());
    this.stressRun?.cancel();
  }

  resolveWebviewView(view: vscode.WebviewView): void {
    this.view = view;
    view.webview.options = { enableScripts: true };
    view.webview.html = page(view.webview, BODY, SCRIPT);
    view.webview.onDidReceiveMessage((m: unknown) => {
      if (!isMessage(m)) return;
      if (m.type === "run") void this.runTests();
      else if (m.type === "runInput") void this.runInput();
      else if (m.type === "openProblem") void this.openProblem();
      else if (m.type === "stress") void this.runStress();
      else if (m.type === "stopStress") this.stressRun?.cancel();
      else if (m.type === "genInit") void this.genInit();
      else if (m.type === "openGen") void this.openCompanions();
      else void this.submit();
    });
    view.onDidChangeVisibility(() => this.post());
    this.post();
  }

  private track(editor: vscode.TextEditor | undefined): void {
    if (editor === undefined || !isCpp(editor.document) || this.state.phase !== "idle") return;
    const file = editor.document.fileName;
    if (file === this.state.file) {
      this.refreshProblem(editor.document);
      return;
    }
    const root = findRepoRoot();
    this.setState({
      ...INITIAL,
      file,
      label: root ? path.relative(root, file) : path.basename(file),
      problem: parseProblem(editor.document.getText()),
      companions: hasCompanions(file),
    });
  }

  private refreshCompanions(): void {
    if (this.state.file !== undefined) this.setState({ companions: hasCompanions(this.state.file) });
  }

  private refreshProblem(doc: vscode.TextDocument): void {
    if (doc.fileName !== this.state.file) return;
    const problem = parseProblem(doc.getText());
    const same = problem?.contest === this.state.problem?.contest && problem?.task === this.state.problem?.task;
    if (!same) this.setState({ problem });
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

    const cases = listCases(testDirFor(root, file));
    if (cases.length === 0) {
      this.setState({ results: [], error: "test/ にサンプルがありません。インポート欄から問題を取得してください" });
      return;
    }
    await this.buildAndRun(root, file, "samples", cases);
  }

  /** ソースと同じフォルダの input.txt（デバッグ構成「Debug (input.txt)」と同じファイル）を入力にして実行する */
  private async runInput(): Promise<void> {
    const { file, phase } = this.state;
    if (file === undefined || phase !== "idle") return;
    const root = findRepoRoot();
    if (root === undefined) {
      this.setState({ error: "scripts/test があるフォルダを開いてください" });
      return;
    }
    const inputFile = path.join(path.dirname(file), "input.txt");
    if (!existsSync(inputFile)) {
      this.setState({ results: [], error: `input.txt がありません: ${path.relative(root, inputFile)}` });
      return;
    }
    const input = await this.saveAndRead(inputFile);
    await this.buildAndRun(root, file, "input", [{ name: "input.txt", input, expected: undefined }]);
  }

  /** scripts/test --build-only でビルドし、ケースを 1 件ずつ実行して結果を流す */
  private async buildAndRun(root: string, file: string, kind: RunKind, cases: readonly TestCase[]): Promise<void> {
    const source = await this.saveAndRead(file);
    const dir = path.dirname(file);
    this.setState({
      phase: "build", kind, total: cases.length, results: [], error: undefined, notice: undefined, stress: undefined,
      problem: parseProblem(source),
    });
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

  /** scripts/stress で、gen.py の入力に対する brute.cpp と自分の解の出力を比べる */
  private async runStress(): Promise<void> {
    const { file, phase } = this.state;
    if (file === undefined || phase !== "idle") return;
    const root = findRepoRoot();
    if (root === undefined) {
      this.setState({ error: "scripts/stress があるフォルダを開いてください" });
      return;
    }
    const companions = hasCompanions(file);
    if (!companions.gen || !companions.brute) {
      this.setState({ companions, results: [], error: "gen.py と brute.cpp が必要です。「🎲 雛形を作る」で作ってください" });
      return;
    }
    // 編集中のファイルを保存してから回す
    const { gen, brute } = companionPaths(file);
    await Promise.all([file, gen, brute].map((f) => this.saveAndRead(f)));

    const config = vscode.workspace.getConfiguration("atcoder.stress");
    this.setState({
      phase: "build", kind: "stress", total: 0, results: [], error: undefined, notice: undefined,
      stress: { done: 0, skipped: 0 },
    });
    this.stressRun = startStress(
      root,
      file,
      { seconds: config.get<number>("seconds", 10), maxCases: config.get<number>("maxCases", 1000) },
      (e) => {
        if (e.type === "status") this.setState({ phase: e.phase });
        else if (e.type === "progress") this.setState({ stress: { done: e.done, skipped: e.skipped } });
        else if (e.type === "pass") {
          this.setState({
            stress: { done: e.done, skipped: e.skipped },
            notice: `${e.done} 件すべて一致（${e.seconds.toFixed(1)} 秒）` +
              (e.skipped > 0 ? `。gen.py が失敗して飛ばした seed: ${e.skipped}（最後のエラー: ${e.gen_error}）` : ""),
          });
        } else if (e.type === "found") {
          const saved = path.basename(e.saved);
          this.setState({
            stress: { done: e.done, skipped: this.state.stress?.skipped ?? 0 },
            notice: `seed ${e.seed}（${e.done} 件目）で ${e.verdict}。${e.saved}.in/.out に保存しました` +
              (e.saved.includes(`${path.sep}test${path.sep}`) || e.saved.includes("/test/") ? "（以後「▶ テスト実行」にも含まれます）" : ""),
            results: [{
              name: saved, verdict: e.verdict, timeMs: e.timeMs, input: e.input, expected: e.expected,
              actual: e.actual, stderr: e.stderr, whitespaceDiff: false,
            }],
          });
        } else {
          this.setState({ error: e.detail ? `${e.message}\n${e.detail}` : e.message, companions: hasCompanions(file) });
        }
      },
    );
    await this.stressRun.done;
    this.stressRun = undefined;
    this.setState({ phase: "idle" });
  }

  /** scripts/gen-init で gen.py と brute.cpp の雛形を作り、開く */
  private async genInit(): Promise<void> {
    const { file, phase } = this.state;
    if (file === undefined || phase !== "idle") return;
    const root = findRepoRoot();
    if (root === undefined) return;
    await this.saveAndRead(file);
    this.setState({ phase: "build", kind: "stress", results: [], error: undefined, notice: "問題ページから雛形を作成中…" });
    const result = await run(path.join(root, "scripts", "gen-init"), [file], root);
    this.setState({
      phase: "idle",
      companions: hasCompanions(file),
      notice: result.stdout.trim() || undefined,
      error: result.code === 0 ? undefined : result.stderr.trim() || "雛形を作れませんでした",
    });
    if (result.code === 0) await this.openCompanions();
  }

  /** gen.py と brute.cpp を右側に開く */
  private async openCompanions(): Promise<void> {
    const { file } = this.state;
    if (file === undefined) return;
    const { gen, brute } = companionPaths(file);
    for (const f of [brute, gen]) {
      if (existsSync(f)) {
        await vscode.window.showTextDocument(vscode.Uri.file(f), { viewColumn: vscode.ViewColumn.Beside, preview: false });
      }
    }
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
  <button id="runInput" class="secondary" title="ソースと同じフォルダの input.txt を入力にして実行する">▶ input.txt で実行</button>
  <button id="openProblem" class="secondary">問題を開く</button>
  <button id="submit" class="secondary">コピーして提出ページへ</button>
</div>
<div>
  <button id="stress" title="gen.py の小さい入力で brute.cpp（愚直解）と出力を比べる">▶ ランダムテスト</button>
  <button id="stopStress" class="secondary" hidden>停止</button>
  <button id="genInit" class="secondary" title="問題ページの入力形式と制約から gen.py と brute.cpp の雛形を作る">🎲 雛形を作る</button>
  <button id="openGen" class="secondary" hidden>gen.py / brute.cpp を開く</button>
</div>
<div id="notice" class="muted" style="margin-top:6px; white-space: pre-wrap"></div>
<div id="status" class="muted" style="margin-top:8px"></div>
<div id="results"></div>
`;

const SCRIPT = `
const $ = (id) => document.getElementById(id);
for (const type of ["run", "runInput", "openProblem", "submit", "stress", "stopStress", "genInit", "openGen"]) {
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
  const busy = (kind, idle) => s.phase === "idle" || s.kind !== kind ? idle : s.phase === "build" ? "ビルド中…" : "実行中…";
  $("run").disabled = !s.file || s.phase !== "idle";
  $("run").textContent = busy("samples", "▶ テスト実行");
  $("runInput").disabled = !s.file || s.phase !== "idle";
  $("runInput").textContent = busy("input", "▶ input.txt で実行");
  $("openProblem").disabled = !s.problem;
  $("submit").disabled = !s.problem || s.phase !== "idle";
  const ready = s.companions.gen && s.companions.brute;
  const stressing = s.kind === "stress" && s.phase !== "idle";
  $("stress").disabled = !s.file || s.phase !== "idle" || !ready;
  $("stress").textContent = !stressing ? "▶ ランダムテスト"
    : s.phase === "build" ? "準備中…" : "実行中… " + (s.stress ? s.stress.done : 0) + " 件";
  $("stopStress").hidden = !stressing || !s.stress;
  $("genInit").hidden = ready;
  $("genInit").disabled = !s.file || s.phase !== "idle";
  $("openGen").hidden = !ready;
  $("notice").textContent = s.notice ?? "";

  const ac = s.results.filter((r) => r.verdict === "AC").length;
  const judged = s.results.filter((r) => r.verdict !== "RUN").length;
  $("status").innerHTML =
    s.error ? '<div class="error">' + esc(s.error) + '</div>' :
    s.kind === "stress" ? "" :
    s.phase === "run" ? esc(s.results.length + " / " + s.total + " 件実行") :
    s.results.length === 0 ? "" :
    // input.txt や .out の無いケースは正誤を判定できないので、結果のバッジ（RUN / RE / TLE）だけにする
    s.kind === "input" || judged === 0 ? '<span class="muted">（' + data.timeLimitMs / 1000 + ' 秒を超えると TLE）</span>' :
    '<span class="badge ' + (ac === judged ? "AC" : "WA") + '">' + (ac === judged ? "全て AC" : "AC " + ac + " / " + judged) + '</span>' +
    ' <span class="muted">（' + data.timeLimitMs / 1000 + ' 秒を超えると TLE）</span>';
  $("results").innerHTML = s.results.map(caseHtml).join("");
});
`;
