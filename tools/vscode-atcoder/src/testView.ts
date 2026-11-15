import { readFileSync } from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";
import { type CaseResult, listCases, runCase, TIME_LIMIT_MS } from "./judge";
import { findRepoRoot, run } from "./process";
import { page } from "./webview";

type Phase = "idle" | "build" | "run";

type Problem = { readonly contest: string; readonly task: string };

/** scripts/note --info の出力 */
type NoteInfo = { readonly note: string; readonly exists: boolean; readonly tags: readonly string[] };

/** ノート作成時に frontmatter に入れる値（空なら雛形のまま） */
type NoteFields = { readonly status: string; readonly tags: string; readonly complexity: string; readonly review: boolean };

type State = {
  readonly file: string | undefined; // 絶対パス
  readonly label: string | undefined; // 表示用の相対パス
  readonly problem: Problem | undefined;
  readonly phase: Phase;
  readonly total: number;
  readonly results: readonly CaseResult[];
  readonly error: string | undefined;
  readonly note: NoteInfo | undefined;
  readonly noteError: string | undefined;
};

type FromWebview =
  | { readonly type: "run" | "openProblem" | "submit" | "openNote" }
  | { readonly type: "createNote"; readonly fields: NoteFields };

const INITIAL: State = {
  file: undefined,
  label: undefined,
  problem: undefined,
  phase: "idle",
  total: 0,
  results: [],
  error: undefined,
  note: undefined,
  noteError: undefined,
};

/** scripts/new が 1 行目に書く "// https://atcoder.jp/contests/<contest>/tasks/<task>" を読む */
export const parseProblem = (source: string): Problem | undefined => {
  const m = /^\s*\/\/\s*https:\/\/atcoder\.jp\/contests\/([\w-]+)\/tasks\/([\w-]+)/.exec(source);
  return m && m[1] && m[2] ? { contest: m[1], task: m[2] } : undefined;
};

const problemUrl = (p: Problem): string => `https://atcoder.jp/contests/${p.contest}/tasks/${p.task}`;
const submitUrl = (p: Problem): string =>
  `https://atcoder.jp/contests/${p.contest}/submit?taskScreenName=${encodeURIComponent(p.task)}`;

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

const parseNoteFields = (v: unknown): NoteFields | undefined =>
  isRecord(v) &&
  typeof v["status"] === "string" &&
  typeof v["tags"] === "string" &&
  typeof v["complexity"] === "string" &&
  typeof v["review"] === "boolean"
    ? { status: v["status"], tags: v["tags"], complexity: v["complexity"], review: v["review"] }
    : undefined;

const parseMessage = (m: unknown): FromWebview | undefined => {
  if (!isRecord(m)) return undefined;
  const type = m["type"];
  if (type === "run" || type === "openProblem" || type === "submit" || type === "openNote") return { type };
  if (type === "createNote") {
    const fields = parseNoteFields(m["fields"]);
    return fields && { type, fields };
  }
  return undefined;
};

const parseNoteInfo = (stdout: string): NoteInfo | undefined => {
  try {
    const v: unknown = JSON.parse(stdout);
    return isRecord(v) &&
      typeof v["note"] === "string" &&
      typeof v["exists"] === "boolean" &&
      Array.isArray(v["tags"]) &&
      v["tags"].every((t: unknown) => typeof t === "string")
      ? { note: v["note"], exists: v["exists"], tags: v["tags"] as string[] }
      : undefined;
  } catch {
    return undefined;
  }
};

/** 空の項目は渡さず、雛形のままにする */
const noteArgs = (f: NoteFields): readonly string[] => [
  ...(f.status === "" ? [] : ["--status", f.status]),
  ...(f.tags.trim() === "" ? [] : ["--tags", f.tags]),
  ...(f.complexity.trim() === "" ? [] : ["--complexity", f.complexity]),
  ...(f.review ? ["--review"] : []),
];

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
    view.webview.onDidReceiveMessage((raw: unknown) => {
      const m = parseMessage(raw);
      if (m === undefined) return;
      if (m.type === "run") void this.runTests();
      else if (m.type === "openProblem") void this.openProblem();
      else if (m.type === "openNote") void this.openNote([]);
      else if (m.type === "createNote") void this.openNote(noteArgs(m.fields));
      else void this.submit();
    });
    view.onDidChangeVisibility(() => {
      this.post();
      // ステータスバーやターミナルで作られた場合に備えて、表示するたびにノートの有無を取り直す
      if (view.visible && this.state.file !== undefined) void this.refreshNote(this.state.file);
    });
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
    void this.refreshNote(file);
  }

  /** note.md の場所・有無・既存のタグを取り直す（フォームを出すかどうかの判定に使う） */
  private async refreshNote(file: string): Promise<void> {
    const root = findRepoRoot();
    if (root === undefined) return;
    const result = await run(path.join(root, "scripts", "note"), ["--info", file], root);
    // 待っている間に別のファイルに切り替わっていたら捨てる
    if (file !== this.state.file) return;
    if (result.code !== 0) {
      this.setState({ note: undefined, noteError: result.stderr.trim() || "ノートの場所を決められません" });
      return;
    }
    const note = parseNoteInfo(result.stdout);
    this.setState(
      note === undefined
        ? { note: undefined, noteError: `scripts/note --info の出力を読めません: ${result.stdout.trim()}` }
        : { note, noteError: undefined },
    );
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

  /** scripts/note で note.md を作り（既存ならそのまま）、エディタで開く。args は作成時の frontmatter 指定 */
  private async openNote(args: readonly string[]): Promise<void> {
    const { file } = this.state;
    if (file === undefined) return;
    const root = findRepoRoot();
    if (root === undefined) {
      this.setState({ noteError: "scripts/note があるフォルダを開いてください" });
      return;
    }
    const result = await run(path.join(root, "scripts", "note"), [...args, file], root);
    if (result.code !== 0) {
      this.setState({ noteError: result.stderr.trim() || `scripts/note が失敗しました（終了コード ${result.code}）` });
      return;
    }
    // scripts/note は note.md の絶対パスを標準出力の最後の行に出す
    const note = result.stdout.trim().split("\n").at(-1) ?? "";
    this.setState({ noteError: undefined });
    await vscode.window.showTextDocument(vscode.Uri.file(note));
    await this.refreshNote(file);
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
<div id="noteSection" style="margin-top:16px" hidden>
  <h4>ノート</h4>
  <div id="noteMessage" class="muted"></div>
  <div id="noteForm" hidden>
    <label for="noteStatus">status</label>
    <select id="noteStatus">
      <option value="">（未選択）</option>
      <option>本番AC</option>
      <option>自力AC</option>
      <option>解説AC</option>
      <option>未AC</option>
    </select>
    <label for="noteTags">tags（カンマ区切り）</label>
    <input id="noteTags" placeholder="DP, 二分探索" autocomplete="off">
    <div id="tagSuggestions" class="muted" style="margin-top:4px"></div>
    <label for="noteComplexity">complexity</label>
    <input id="noteComplexity" placeholder="O(N log N)" autocomplete="off">
    <label><input type="checkbox" id="noteReview" style="width:auto;vertical-align:middle"> 復習対象（review）</label>
    <button id="createNote">📝 ノートを作成して開く</button>
  </div>
  <button id="openNote" class="secondary" hidden>📝 ノートを開く</button>
</div>
`;

const SCRIPT = `
const $ = (id) => document.getElementById(id);
for (const type of ["run", "openProblem", "submit", "openNote"]) {
  $(type).addEventListener("click", () => vscode.postMessage({ type }));
}

$("createNote").addEventListener("click", () => vscode.postMessage({
  type: "createNote",
  fields: {
    status: $("noteStatus").value,
    tags: $("noteTags").value,
    complexity: $("noteComplexity").value,
    review: $("noteReview").checked,
  },
}));

const splitTags = (text) => text.split(/[,、]/).map((t) => t.trim()).filter((t) => t !== "");

// 候補のタグを押すと入力欄に追加する（既にあれば何もしない）
$("tagSuggestions").addEventListener("click", (e) => {
  const tag = e.target instanceof HTMLElement ? e.target.dataset.tag : undefined;
  if (tag === undefined) return;
  const tags = splitTags($("noteTags").value);
  if (!tags.includes(tag)) $("noteTags").value = [...tags, tag].join(", ");
});

// 対象のノートが変わったときだけフォームを空に戻す（入力途中の内容を消さない）
let formFor = undefined;
const renderNote = (s) => {
  $("noteSection").hidden = !s.file;
  const info = s.note;
  $("noteForm").hidden = !info || info.exists;
  $("openNote").hidden = !info || !info.exists;
  $("noteMessage").innerHTML =
    s.noteError ? '<div class="error">' + esc(s.noteError) + '</div>' :
    !info ? "" :
    info.exists ? "note.md 作成済み" : "note.md はまだありません。値は空のままでもよい（作成後に編集できる）";
  if (info && info.note !== formFor) {
    formFor = info.note;
    $("noteStatus").value = "";
    $("noteTags").value = "";
    $("noteComplexity").value = "";
    $("noteReview").checked = false;
  }
  $("tagSuggestions").innerHTML = !info || info.tags.length === 0 ? "" :
    "候補: " + info.tags.map((t) => '<span class="link" data-tag="' + esc(t) + '">' + esc(t) + '</span>').join(" ");
};

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
  renderNote(s);

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
