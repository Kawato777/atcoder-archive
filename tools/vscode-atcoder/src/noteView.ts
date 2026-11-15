import * as path from "node:path";
import * as vscode from "vscode";
import { findRepoRoot, run } from "./process";
import { page } from "./webview";

/** scripts/note --info の出力 */
type NoteInfo = { readonly note: string; readonly exists: boolean; readonly tags: readonly string[] };

/** ノート作成時に frontmatter に入れる値（空なら雛形のまま） */
type NoteFields = { readonly status: string; readonly tags: string; readonly time: string; readonly space: string; readonly review: boolean };

type State = {
  readonly file: string | undefined; // 絶対パス
  readonly label: string | undefined; // 表示用の相対パス
  readonly note: NoteInfo | undefined;
  readonly error: string | undefined;
};

type FromWebview = { readonly type: "openNote" } | { readonly type: "createNote"; readonly fields: NoteFields };

const INITIAL: State = { file: undefined, label: undefined, note: undefined, error: undefined };

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

const parseNoteFields = (v: unknown): NoteFields | undefined =>
  isRecord(v) &&
  typeof v["status"] === "string" &&
  typeof v["tags"] === "string" &&
  typeof v["time"] === "string" &&
  typeof v["space"] === "string" &&
  typeof v["review"] === "boolean"
    ? { status: v["status"], tags: v["tags"], time: v["time"], space: v["space"], review: v["review"] }
    : undefined;

const parseMessage = (m: unknown): FromWebview | undefined => {
  if (!isRecord(m)) return undefined;
  if (m["type"] === "openNote") return { type: "openNote" };
  if (m["type"] === "createNote") {
    const fields = parseNoteFields(m["fields"]);
    return fields && { type: "createNote", fields };
  }
  return undefined;
};

const isStringArray = (v: unknown): v is readonly string[] =>
  Array.isArray(v) && v.every((t: unknown) => typeof t === "string");

const parseNoteInfo = (stdout: string): NoteInfo | undefined => {
  try {
    const v: unknown = JSON.parse(stdout);
    return isRecord(v) && typeof v["note"] === "string" && typeof v["exists"] === "boolean" && isStringArray(v["tags"])
      ? { note: v["note"], exists: v["exists"], tags: v["tags"] }
      : undefined;
  } catch {
    return undefined;
  }
};

/** 空の項目は渡さず、雛形のままにする */
const noteArgs = (f: NoteFields): readonly string[] => [
  ...(f.status === "" ? [] : ["--status", f.status]),
  ...(f.tags.trim() === "" ? [] : ["--tags", f.tags]),
  ...(f.time.trim() === "" ? [] : ["--time", f.time]),
  ...(f.space.trim() === "" ? [] : ["--space", f.space]),
  ...(f.review ? ["--review"] : []),
];

const isCpp = (doc: vscode.TextDocument): boolean => doc.uri.scheme === "file" && doc.fileName.endsWith(".cpp");

export class NoteViewProvider implements vscode.WebviewViewProvider, vscode.Disposable {
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
      void this.openNote(m.type === "createNote" ? noteArgs(m.fields) : []);
    });
    view.onDidChangeVisibility(() => {
      this.post();
      // ステータスバーやターミナルで作られた場合に備えて、表示するたびにノートの有無を取り直す
      if (view.visible && this.state.file !== undefined) void this.refresh(this.state.file);
    });
    this.post();
  }

  private track(editor: vscode.TextEditor | undefined): void {
    if (editor === undefined || !isCpp(editor.document)) return;
    const file = editor.document.fileName;
    if (file === this.state.file) return;
    const root = findRepoRoot();
    this.setState({ ...INITIAL, file, label: root ? path.relative(root, file) : path.basename(file) });
    void this.refresh(file);
  }

  /** note.md の場所・有無・既存のタグを取り直す（フォームを出すかどうかの判定に使う） */
  private async refresh(file: string): Promise<void> {
    const root = findRepoRoot();
    if (root === undefined) {
      this.setState({ error: "scripts/note があるフォルダを開いてください" });
      return;
    }
    const result = await run(path.join(root, "scripts", "note"), ["--info", file], root);
    // 待っている間に別のファイルに切り替わっていたら捨てる
    if (file !== this.state.file) return;
    if (result.code !== 0) {
      this.setState({ note: undefined, error: result.stderr.trim() || "ノートの場所を決められません" });
      return;
    }
    const note = parseNoteInfo(result.stdout);
    this.setState(
      note === undefined
        ? { note: undefined, error: `scripts/note --info の出力を読めません: ${result.stdout.trim()}` }
        : { note, error: undefined },
    );
  }

  private setState(next: Partial<State>): void {
    this.state = { ...this.state, ...next };
    this.post();
  }

  private post(): void {
    void this.view?.webview.postMessage({ type: "state", state: this.state });
  }

  /** scripts/note で note.md を作り（既存ならそのまま）、エディタで開く。args は作成時の frontmatter 指定 */
  private async openNote(args: readonly string[]): Promise<void> {
    const { file } = this.state;
    if (file === undefined) return;
    const root = findRepoRoot();
    if (root === undefined) {
      this.setState({ error: "scripts/note があるフォルダを開いてください" });
      return;
    }
    const result = await run(path.join(root, "scripts", "note"), [...args, file], root);
    if (result.code !== 0) {
      this.setState({ error: result.stderr.trim() || `scripts/note が失敗しました（終了コード ${result.code}）` });
      return;
    }
    // scripts/note は note.md の絶対パスを標準出力の最後の行に出す
    const note = result.stdout.trim().split("\n").at(-1) ?? "";
    this.setState({ error: undefined });
    await vscode.window.showTextDocument(vscode.Uri.file(note));
    await this.refresh(file);
  }
}

const BODY = `
<div id="target" class="muted">.cpp ファイルを開いてください</div>
<div id="message" class="muted" style="margin-top:4px"></div>
<div id="form" hidden>
  <label for="status">status</label>
  <select id="status">
    <option value="">（未選択）</option>
    <option>本番AC</option>
    <option>自力AC</option>
    <option>解説AC</option>
    <option>未AC</option>
  </select>
  <label for="tags">tags（カンマ区切り）</label>
  <input id="tags" placeholder="DP, 二分探索" autocomplete="off">
  <div id="suggestions" class="muted" style="margin-top:4px"></div>
  <label for="time">時間計算量（time）</label>
  <input id="time" placeholder="O(N log N)" autocomplete="off">
  <label for="space">空間計算量（space）</label>
  <input id="space" placeholder="O(N)" autocomplete="off">
  <label><input type="checkbox" id="review" style="width:auto;vertical-align:middle"> 復習対象（review）</label>
  <button id="createNote">📝 ノートを作成して開く</button>
</div>
<button id="openNote" class="secondary" hidden>📝 ノートを開く</button>
`;

const SCRIPT = `
const $ = (id) => document.getElementById(id);

$("openNote").addEventListener("click", () => vscode.postMessage({ type: "openNote" }));
$("createNote").addEventListener("click", () => vscode.postMessage({
  type: "createNote",
  fields: {
    status: $("status").value,
    tags: $("tags").value,
    time: $("time").value,
    space: $("space").value,
    review: $("review").checked,
  },
}));

const splitTags = (text) => text.split(/[,、]/).map((t) => t.trim()).filter((t) => t !== "");

// 候補のタグを押すと入力欄に追加する（既にあれば何もしない）
$("suggestions").addEventListener("click", (e) => {
  const tag = e.target instanceof HTMLElement ? e.target.dataset.tag : undefined;
  if (tag === undefined) return;
  const tags = splitTags($("tags").value);
  if (!tags.includes(tag)) $("tags").value = [...tags, tag].join(", ");
});

// 対象のノートが変わったときだけフォームを空に戻す（入力途中の内容を消さない）
let formFor = undefined;

window.addEventListener("message", ({ data }) => {
  if (data.type !== "state") return;
  const s = data.state;
  const info = s.note;
  $("target").textContent = s.label ?? ".cpp ファイルを開いてください";
  $("form").hidden = !info || info.exists;
  $("openNote").hidden = !info || !info.exists;
  $("message").innerHTML =
    s.error ? '<div class="error">' + esc(s.error) + '</div>' :
    !info ? "" :
    info.exists ? "note.md 作成済み" : "note.md はまだありません。値は空のままでもよい（作成後に編集できる）";
  if (info && info.note !== formFor) {
    formFor = info.note;
    $("status").value = "";
    $("tags").value = "";
    $("time").value = "";
    $("space").value = "";
    $("review").checked = false;
  }
  $("suggestions").innerHTML = !info || info.tags.length === 0 ? "" :
    "候補: " + info.tags.map((t) => '<span class="link" data-tag="' + esc(t) + '">' + esc(t) + '</span>').join(" ");
});
`;
