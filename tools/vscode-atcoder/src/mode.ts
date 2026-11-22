import * as vscode from "vscode";

/**
 * 練習モード / 本番モード。
 * 本番モード（開催中のコンテスト）では、生成 AI を呼ぶ機能（Claude で添削・Claude の出力の取り込み）と、
 * 本番中は使わない機能（過去問の取得・ノート）を止める。テスト・ランダムテスト・提出はどちらでも使える。
 * contest/ のファイルかどうかでは決めない（終了後に本番のコードを添削する流れがあるため）。
 * 表示と切り替えはサイドバーのインポート欄の先頭で行う（コマンドパレットの「AtCoder: 練習モード / 本番モードを切り替える」でも可）。
 */
export type Mode = "practice" | "contest";

const KEY = "atcoder.mode";

export class ModeManager implements vscode.Disposable {
  private readonly emitter = new vscode.EventEmitter<Mode>();
  readonly onDidChange = this.emitter.event;

  constructor(private readonly store: vscode.Memento) {
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
    this.emitter.fire(mode);
  }

  /** 本番 → 練習は誤操作を防ぐため確認する */
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
    this.emitter.dispose();
  }
}
