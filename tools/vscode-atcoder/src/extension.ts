import * as vscode from "vscode";
import { ImportViewProvider } from "./importView";
import { ModeManager } from "./mode";
import { NoteViewProvider } from "./noteView";
import { PREVIEW_SCHEME, PreviewContentProvider } from "./reviewPanel";
import { TestViewProvider } from "./testView";

export const activate = (context: vscode.ExtensionContext): void => {
  const modes = new ModeManager(context.workspaceState);
  const testView = new TestViewProvider();
  const importView = new ImportViewProvider(modes);
  // Claude で添削したときの、適用後の note.md（差分表示の右側）
  const preview = new PreviewContentProvider();
  const output = vscode.window.createOutputChannel("AtCoder: Claude");
  const noteView = new NoteViewProvider(preview, output, modes);
  context.subscriptions.push(
    modes,
    vscode.commands.registerCommand("atcoder.toggleMode", () => modes.toggle()),
    importView,
    testView,
    noteView,
    preview,
    output,
    vscode.workspace.registerTextDocumentContentProvider(PREVIEW_SCHEME, preview),
    vscode.window.registerWebviewViewProvider("atcoder.import", importView),
    // 別の欄を開いている間も実行結果を保持する
    vscode.window.registerWebviewViewProvider("atcoder.test", testView, {
      webviewOptions: { retainContextWhenHidden: true },
    }),
    // 折りたたんでも入力途中の値を保持する
    vscode.window.registerWebviewViewProvider("atcoder.note", noteView, {
      webviewOptions: { retainContextWhenHidden: true },
    }),
  );
};

export const deactivate = (): void => undefined;
