import * as vscode from "vscode";

/**
 * 練習モード / 本番モード。
 * 本番モード（開催中のコンテスト）では、生成 AI を呼ぶ機能（Claude で添削・Claude の出力の取り込み）と、
 * 本番中は使わない機能（過去問の取得・ノート）を止める。テスト・ランダムテスト・提出はどちらでも使える。
 * contest/ のファイルかどうかでは決めない（終了後に本番のコードを添削する流れがあるため）。
 */
export type Mode = "practice" | "contest";

const KEY = "atcoder.mode";

export class ModeManager implements vscode.Disposable {
  private readonly emitter = new vscode.EventEmitter<Mode>();
  readonly onDidChange = this.emitter.event;
  private readonly item: vscode.StatusBarItem;

  constructor(private readonly store: vscode.Memento) {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    this.item.command = "atcoder.toggleMode";
    this.render();
    this.item.show();
    void vscode.commands.executeCommand("setContext", KEY, this.mode);
  }

  get mode(): Mode {
    return this.store.get<Mode>(KEY) === "contest" ? "contest" : "practice";
  }

  get isContest(): boolean {
    return this.mode === "contest";
  }

  async set(mode: Mode): Promise<void> {
    if (mode === this.mode) return;
    await this.store.update(KEY, mode);
    await vscode.commands.executeCommand("setContext", KEY, mode);
    this.render();
    this.emitter.fire(mode);
  }

  /** ステータスバーから切り替える。本番 → 練習は誤操作を防ぐため確認する */
  async toggle(): Promise<void> {
    if (this.mode === "practice") {
      await this.set("contest");
      return;
    }
    const ok = await vscode.window.showWarningMessage(
      "練習モードに戻すと「Claude で添削」などの生成 AI の機能が使えるようになります。コンテストは終了しましたか？",
      { modal: true },
      "終了した（練習モードへ）",
    );
    if (ok !== undefined) await this.set("practice");
  }

  dispose(): void {
    this.item.dispose();
    this.emitter.dispose();
  }

  private render(): void {
    if (this.isContest) {
      this.item.text = "$(flame) 本番モード";
      this.item.tooltip = "本番モード: 生成 AI の機能とノートを止めています。クリックで練習モードへ";
      this.item.backgroundColor = new vscode.ThemeColor("statusBarItem.warningBackground");
    } else {
      this.item.text = "$(beaker) 練習モード";
      this.item.tooltip = "練習モード: すべての機能を使えます。クリックで本番モードへ";
      this.item.backgroundColor = undefined;
    }
  }
}
