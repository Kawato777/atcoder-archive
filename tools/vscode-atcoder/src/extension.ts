import * as vscode from "vscode";
import { ImportViewProvider } from "./importView";
import { NoteViewProvider } from "./noteView";
import { TestViewProvider } from "./testView";

export const activate = (context: vscode.ExtensionContext): void => {
  const testView = new TestViewProvider();
  const noteView = new NoteViewProvider();
  context.subscriptions.push(
    testView,
    noteView,
    vscode.window.registerWebviewViewProvider("atcoder.import", new ImportViewProvider()),
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
