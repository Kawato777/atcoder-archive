import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import * as vscode from "vscode";

export type ExecResult = {
  readonly code: number;
  readonly stdout: string;
  readonly stderr: string;
};

/** scripts/new があるワークスペースフォルダをリポジトリのルートとみなす */
export const findRepoRoot = (): string | undefined =>
  vscode.workspace.workspaceFolders
    ?.map((f) => f.uri.fsPath)
    .find((dir) => existsSync(path.join(dir, "scripts", "new")));

/**
 * 拡張機能ホストの PATH にはログインシェルの設定が入らないことがあるため、
 * g++-15 や oj の場所（Homebrew, uv tool）を足しておく
 */
export const toolEnv = (): NodeJS.ProcessEnv => {
  const extra = [path.join(os.homedir(), ".local", "bin"), "/opt/homebrew/bin", "/usr/local/bin"];
  const current = (process.env["PATH"] ?? "").split(path.delimiter).filter((p) => p !== "");
  const merged = [...current, ...extra.filter((p) => !current.includes(p))];
  return { ...process.env, PATH: merged.join(path.delimiter) };
};

/** input を渡すと標準入力に書き込む（省略時は何も渡さない） */
export const run = (command: string, args: readonly string[], cwd: string, input?: string): Promise<ExecResult> =>
  new Promise((resolve) => {
    const child = execFile(command, args, { cwd, env: toolEnv(), maxBuffer: 16 * 1024 * 1024 }, (error, stdout, stderr) => {
      const code = error === null ? 0 : typeof error.code === "number" ? error.code : 1;
      // コマンド自体が起動できない場合（ENOENT など）も stderr に理由を残す
      const reason = error !== null && typeof error.code !== "number" ? `${error.message}\n` : "";
      resolve({ code, stdout, stderr: reason + stderr });
    });
    if (input !== undefined) {
      // 起動失敗や先に終了したときの EPIPE はコールバック側の終了コード・stderr で報告されるので、ここでは拡張機能ホストを落とさないようにだけする
      child.stdin?.on("error", () => undefined);
      child.stdin?.end(input);
    }
  });
