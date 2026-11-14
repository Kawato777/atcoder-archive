import * as vscode from "vscode";
import { ImportViewProvider } from "./importView";
import { TestViewProvider } from "./testView";

export const activate = (context: vscode.ExtensionContext): void => {
  const testView = new TestViewProvider();
  context.subscriptions.push(
    testView,
    vscode.window.registerWebviewViewProvider("atcoder.import", new ImportViewProvider()),
    // 別の欄を開いている間も実行結果を保持する
    vscode.window.registerWebviewViewProvider("atcoder.test", testView, {
      webviewOptions: { retainContextWhenHidden: true },
    }),
  );
};

export const deactivate = (): void => undefined;
