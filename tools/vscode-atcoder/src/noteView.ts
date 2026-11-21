import { existsSync } from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";
import { type ReviewRun, startReview } from "./claudeReview";
import { type PanelAction, type PreviewContentProvider, ReviewPanel } from "./reviewPanel";
import { findRepoRoot, run } from "./process";
import { page } from "./webview";

/** scripts/note --info の出力 */
type NoteInfo = { readonly note: string; readonly exists: boolean; readonly tags: readonly string[] };

type State = {
  readonly file: string | undefined; // 絶対パス
  readonly label: string | undefined; // 表示用の相対パス
  readonly note: NoteInfo | undefined;
  readonly error: string | undefined;
  /** Claude Code で添削中なら、その対象と実行状況（新しいものが後ろ） */
  readonly claude: { readonly label: string; readonly steps: readonly string[] } | undefined;
};

/** scripts/note --apply で変えなかったキー（既に値が入っていたもの） */
type KeptField = { readonly key: string; readonly current: string; readonly proposed: string };

type FromWebview =
  | { readonly type: "openNote" }
  | { readonly type: "applyClaude" }
  | { readonly type: "reviewClaude" }
  | { readonly type: "cancelClaude" };

const INITIAL: State = { file: undefined, label: undefined, note: undefined, error: undefined, claude: undefined };

/** サイドバーに出す実行状況の行数 */
const MAX_STEPS = 8;

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

const parseMessage = (m: unknown): FromWebview | undefined => {
  if (!isRecord(m)) return undefined;
  if (m["type"] === "openNote") return { type: "openNote" };
  if (m["type"] === "applyClaude") return { type: "applyClaude" };
  if (m["type"] === "reviewClaude") return { type: "reviewClaude" };
  if (m["type"] === "cancelClaude") return { type: "cancelClaude" };
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

const parseKeptField = (k: unknown): KeptField | undefined =>
  isRecord(k) && typeof k["key"] === "string" && typeof k["current"] === "string" && typeof k["proposed"] === "string"
    ? { key: k["key"], current: k["current"], proposed: k["proposed"] }
    : undefined;

const parseKept = (v: unknown): readonly KeptField[] | undefined => {
  if (!Array.isArray(v)) return undefined;
  const fields = v.map((k: unknown) => parseKeptField(k));
  return fields.every((f): f is KeptField => f !== undefined) ? fields : undefined;
};

/** scripts/note --apply の出力（標準出力の JSON）から note.md の場所と変えなかったキーを取り出す */
const parseApplyResult = (stdout: string): { readonly note: string; readonly kept: readonly KeptField[] } | undefined => {
  try {
    const v: unknown = JSON.parse(stdout);
    if (!isRecord(v) || typeof v["note"] !== "string") return undefined;
    const kept = parseKept(v["kept"]);
    return kept && { note: v["note"], kept };
  } catch {
    return undefined;
  }
};

const isCpp = (doc: vscode.TextDocument): boolean => doc.uri.scheme === "file" && doc.fileName.endsWith(".cpp");

export class NoteViewProvider implements vscode.WebviewViewProvider, vscode.Disposable {
  private view: vscode.WebviewView | undefined;
  private state: State = INITIAL;
  private readonly subscription: vscode.Disposable;
  /** 実行中の claude -p（1 つだけ） */
  private review: ReviewRun | undefined;

  constructor(
    private readonly preview: PreviewContentProvider,
    private readonly output: vscode.OutputChannel,
  ) {
    this.track(vscode.window.activeTextEditor);
    // Webview をクリックすると activeTextEditor が undefined になるので、最後に開いた .cpp を対象として保持する
    this.subscription = vscode.window.onDidChangeActiveTextEditor((e) => this.track(e));
  }

  dispose(): void {
    this.subscription.dispose();
    this.review?.cancel();
  }

  resolveWebviewView(view: vscode.WebviewView): void {
    this.view = view;
    view.webview.options = { enableScripts: true };
    view.webview.html = page(view.webview, BODY, SCRIPT);
    view.webview.onDidReceiveMessage((raw: unknown) => {
      const m = parseMessage(raw);
      if (m === undefined) return;
      if (m.type === "openNote") void this.openNote();
      else if (m.type === "applyClaude") void this.applyClaude();
      else if (m.type === "reviewClaude") void this.reviewClaude();
      else this.review?.cancel();
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
    // 添削の実行状況は対象を切り替えても残す
    this.setState({ ...INITIAL, file, label: root ? path.relative(root, file) : path.basename(file), claude: this.state.claude });
    void this.refresh(file);
  }

  /** note.md の場所・有無を取り直す（ボタンを出すかどうかの判定に使う） */
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

  /** 作成済みの note.md をエディタで開く */
  private async openNote(): Promise<void> {
    const { note } = this.state;
    if (note === undefined || !note.exists) return;
    await vscode.window.showTextDocument(vscode.Uri.file(note.note));
  }

  /** クリップボードの Claude（atcoder-review）の出力を scripts/note --apply で note.md に取り込み、開く */
  private async applyClaude(): Promise<void> {
    const { file } = this.state;
    if (file === undefined) return;
    const root = findRepoRoot();
    if (root === undefined) {
      this.setState({ error: "scripts/note があるフォルダを開いてください" });
      return;
    }
    const clipboard = await vscode.env.clipboard.readText();
    const apply = (overwrite: boolean) =>
      run(path.join(root, "scripts", "note"), ["--apply", "--from", "-", ...(overwrite ? ["--overwrite"] : []), file], root, clipboard);

    const result = await apply(false);
    if (result.code !== 0) {
      this.setState({ error: result.stderr.trim() || `scripts/note --apply が失敗しました（終了コード ${result.code}）` });
      return;
    }
    const parsed = parseApplyResult(result.stdout);
    if (parsed === undefined) {
      this.setState({ error: `scripts/note --apply の出力を読めません: ${result.stdout.trim()}` });
      return;
    }
    this.setState({ error: undefined });
    await vscode.window.showTextDocument(vscode.Uri.file(parsed.note));
    await this.refresh(file);
    if (parsed.kept.length === 0) {
      void vscode.window.showInformationMessage("Claude の出力を note.md に取り込みました");
      return;
    }

    const diff = parsed.kept.map((k) => `${k.key}: ${k.current} → ${k.proposed}`).join(" / ");
    const choice = await vscode.window.showInformationMessage(
      `取り込みました。値が入っていたキーは変えていません（${diff}）`,
      "上書きする",
    );
    if (choice !== "上書きする") return;
    // 1 回目と同じ内容で取り込み直す（節の置き換えは何度やっても同じ結果になる）
    const again = await apply(true);
    if (again.code !== 0) {
      this.setState({ error: again.stderr.trim() || `scripts/note --apply --overwrite が失敗しました（終了コード ${again.code}）` });
      return;
    }
    void vscode.window.showInformationMessage(`上書きしました: ${parsed.kept.map((k) => k.key).join(", ")}`);
  }

  /** サイドバーの実行状況に 1 行足す */
  private pushStep(step: string): void {
    const current = this.state.claude;
    if (current === undefined) return;
    this.setState({ claude: { ...current, steps: [...current.steps, step].slice(-MAX_STEPS) } });
  }

  /** エラーをサイドバーと通知に出し、生の出力を出力パネルに残す */
  private fail(error: string, raw: string): void {
    if (raw.trim() !== "") this.output.appendLine(`[Claude の出力]\n${raw.trimEnd()}`);
    this.setState({ error });
    void vscode.window.showErrorMessage(error.split("\n")[0] ?? error, "出力を表示").then((choice) => {
      if (choice === "出力を表示") this.output.show(true);
    });
  }

  /** 今開いている解答を Claude Code（claude -p）で添削し、結果を Markdown のパネルと note.md の差分で見せる */
  private async reviewClaude(): Promise<void> {
    const { file, note } = this.state;
    if (file === undefined || note === undefined || this.review !== undefined) return;
    const root = findRepoRoot();
    if (root === undefined) {
      this.setState({ error: "scripts/note があるフォルダを開いてください" });
      return;
    }
    const target = path.relative(root, file).split(path.sep).join("/");
    const isContest = target.startsWith("contest/");
    if (isContest) {
      const answer = await vscode.window.showWarningMessage(
        "コンテストは終了していますか？",
        {
          modal: true,
          detail: "AtCoder生成AI対策ルールにより、開催中の ABC / ARC / AGC では AI を使えません。終了後に添削してください。",
        },
        "終了している",
      );
      if (answer !== "終了している") return;
    }

    const config = vscode.workspace.getConfiguration("atcoder.claude");
    const command = config.get<string>("path", "claude").trim() || "claude";
    const model = config.get<string>("model", "sonnet");
    const timeoutSec = Math.max(30, config.get<number>("timeoutSec", 300));
    this.output.appendLine(`\n=== ${new Date().toLocaleString()} ${target}（${model}） ===`);
    this.setState({ error: undefined, claude: { label: target, steps: ["Claude Code を起動中"] } });

    const review = startReview({
      command,
      model,
      timeoutSec,
      cwd: root,
      target,
      contestConfirmed: isContest,
      log: (line) => this.output.appendLine(line),
      onEvent: (e) => {
        if (e.kind === "init") this.pushStep(`開始（${e.model ?? model}）`);
        else if (e.kind === "tool") {
          this.output.appendLine(`[tool] ${e.name}: ${e.status}`);
          this.pushStep(e.status);
        } else if (e.kind === "toolResult" && e.isError) this.output.appendLine(`[tool] ${e.id}: 失敗または拒否`);
        else if (e.kind === "result") this.pushStep("出力をまとめています");
      },
    });
    this.review = review;
    const outcome = await review.done;
    this.review = undefined;
    this.setState({ claude: undefined });
    if (!outcome.ok) {
      this.fail(outcome.error, outcome.raw);
      return;
    }
    this.output.appendLine(`[取り込み用ブロック]\n${outcome.block}`);

    // 適用後の全文を作り（書き込まない）、今の note.md と並べる
    const script = path.join(root, "scripts", "note");
    const dryRun = await run(script, ["--apply", "--dry-run", "--from", "-", file], root, outcome.block);
    if (dryRun.code !== 0) {
      this.fail(dryRun.stderr.trim() || `scripts/note --apply --dry-run が失敗しました（終了コード ${dryRun.code}）`, outcome.block);
      return;
    }
    const noteRel = path.relative(root, note.note).split(path.sep).join("/");
    const showDiff = async (): Promise<void> => {
      const right = this.preview.set(`${noteRel}`, dryRun.stdout);
      const left = existsSync(note.note) ? vscode.Uri.file(note.note) : this.preview.set(`（新規）/${noteRel}`, "");
      await vscode.commands.executeCommand("vscode.diff", left, right, `${noteRel} ↔ 適用後（Claude の添削）`, {
        preview: true,
      });
    };
    await showDiff();

    const panel = await ReviewPanel.open(
      { label: target, block: outcome.block, summary: dryRun.stderr, costUsd: outcome.costUsd },
      (action: PanelAction) => {
        if (action === "diff") void showDiff();
        else void this.applyBlock(root, file, outcome.block, action === "applyOverwrite", panel);
      },
    );
  }

  /** パネルの［適用］［上書きして適用］: scripts/note --apply で取り込み、note.md を開く */
  private async applyBlock(root: string, file: string, block: string, overwrite: boolean, panel: ReviewPanel): Promise<void> {
    const args = ["--apply", "--from", "-", ...(overwrite ? ["--overwrite"] : []), file];
    const result = await run(path.join(root, "scripts", "note"), args, root, block);
    const parsed = result.code === 0 ? parseApplyResult(result.stdout) : undefined;
    if (parsed === undefined) {
      const error =
        result.code !== 0
          ? result.stderr.trim() || `scripts/note --apply が失敗しました（終了コード ${result.code}）`
          : `scripts/note --apply の出力を読めません: ${result.stdout.trim()}`;
      panel.showStatus(error, false);
      this.setState({ error });
      return;
    }
    await vscode.window.showTextDocument(vscode.Uri.file(parsed.note));
    if (this.state.file !== undefined) await this.refresh(this.state.file);
    if (parsed.kept.length === 0) {
      panel.showStatus(overwrite ? "上書きして適用しました" : "適用しました", true);
      return;
    }
    const diff = parsed.kept.map((k) => `${k.key}: ${k.current} → ${k.proposed}`).join(" / ");
    panel.showStatus(`適用しました。値が入っていたキーは変えていません（${diff}）。反映するには［上書きして適用］`, false);
  }
}

const BODY = `
<div id="target" class="muted">.cpp ファイルを開いてください</div>
<div id="message" class="muted" style="margin-top:4px"></div>
<button id="openNote" class="secondary" hidden>📝 ノートを開く</button>
<button id="applyClaude" class="secondary" hidden title="claude.ai の atcoder-review の出力をコピーしてから押す">📋 Claude の出力を取り込む</button>
<button id="reviewClaude" class="secondary" hidden title="Claude Code（claude -p）で今の解答を添削し、note.md への差分を表示する">🤖 Claude で添削</button>
<div id="claude" hidden>
  <h4 id="claudeTitle"></h4>
  <div id="claudeSteps"></div>
  <button id="cancelClaude" class="secondary">キャンセル</button>
</div>
`;

const SCRIPT = `
const $ = (id) => document.getElementById(id);

$("openNote").addEventListener("click", () => vscode.postMessage({ type: "openNote" }));
$("applyClaude").addEventListener("click", () => vscode.postMessage({ type: "applyClaude" }));
$("reviewClaude").addEventListener("click", () => vscode.postMessage({ type: "reviewClaude" }));
$("cancelClaude").addEventListener("click", () => vscode.postMessage({ type: "cancelClaude" }));
window.addEventListener("message", ({ data }) => {
  if (data.type !== "state") return;
  const s = data.state;
  const info = s.note;
  $("target").textContent = s.label ?? ".cpp ファイルを開いてください";
  $("openNote").hidden = !info || !info.exists;
  $("applyClaude").hidden = !info;
  // 実行中は 1 つだけ。状況は新しいものほど下に出す（最後の行が実行中）
  const c = s.claude;
  $("reviewClaude").hidden = !info || !!c;
  $("claude").hidden = !c;
  if (c) {
    $("claudeTitle").textContent = "🤖 添削中: " + c.label;
    $("claudeSteps").innerHTML = c.steps
      .map((t, i) => '<div class="row"><span>' + (i === c.steps.length - 1 ? "⏳" : "✓") + "</span><span>" + esc(t) + "</span></div>")
      .join("");
  }
  $("message").innerHTML =
    s.error ? '<div class="error">' + esc(s.error) + '</div>' :
    !info ? "" :
    info.exists ? "note.md 作成済み" : "note.md はまだありません（取り込み・添削の適用時に作成されます）";
});
`;
