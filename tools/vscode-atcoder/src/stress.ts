import { type ChildProcess, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import * as path from "node:path";
import { toolEnv } from "./process";

/** scripts/stress --json が 1 行ずつ出すイベント */
export type StressEvent =
  | { readonly type: "status"; readonly phase: "build" | "run"; readonly message: string }
  | { readonly type: "progress"; readonly done: number; readonly skipped: number }
  | {
      readonly type: "found";
      readonly verdict: "WA" | "RE" | "TLE";
      readonly seed: number;
      readonly done: number;
      readonly saved: string;
      readonly input: string;
      readonly expected: string;
      readonly actual: string;
      readonly stderr: string;
      readonly timeMs: number;
      readonly bruteless?: boolean;
    }
  | {
      readonly type: "pass";
      readonly done: number;
      readonly skipped: number;
      readonly seconds: number;
      readonly gen_error: string;
      readonly bruteless?: boolean;
    }
  | { readonly type: "error"; readonly message: string; readonly detail?: string; readonly missing?: readonly string[] };

/** main.cpp -> gen.py, brute.cpp / C.cpp -> C.gen.py, C.brute.cpp（scripts/stress と同じ） */
export const companionPaths = (file: string): { readonly gen: string; readonly brute: string } => {
  const dir = path.dirname(file);
  const stem = path.basename(file, ".cpp");
  return stem === "main"
    ? { gen: path.join(dir, "gen.py"), brute: path.join(dir, "brute.cpp") }
    : { gen: path.join(dir, `${stem}.gen.py`), brute: path.join(dir, `${stem}.brute.cpp`) };
};

export const hasCompanions = (file: string): { readonly gen: boolean; readonly brute: boolean } => {
  const { gen, brute } = companionPaths(file);
  return { gen: existsSync(gen), brute: existsSync(brute) };
};

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

export const parseEvent = (line: string): StressEvent | undefined => {
  try {
    const v: unknown = JSON.parse(line);
    // scripts/stress が出す形をそのまま信じる（同じリポジトリ内のスクリプト）
    return isRecord(v) && typeof v["type"] === "string" ? (v as StressEvent) : undefined;
  } catch {
    return undefined;
  }
};

export type StressRun = { readonly done: Promise<void>; readonly cancel: () => void };

/** scripts/stress --json を起動し、イベントを順に渡す */
export const startStress = (
  root: string,
  file: string,
  options: { readonly seconds: number; readonly maxCases: number; readonly bruteless?: boolean },
  onEvent: (e: StressEvent) => void,
): StressRun => {
  const args = [
    "--json", "--seconds", String(options.seconds), "--max", String(options.maxCases),
    ...(options.bruteless === true ? ["--no-brute"] : []),
    file,
  ];
  const child: ChildProcess = spawn(path.join(root, "scripts", "stress"), args, { cwd: root, env: toolEnv() });
  let buffer = "";
  let stderr = "";
  let sawResult = false;
  const handle = (line: string): void => {
    const e = parseEvent(line);
    if (e === undefined) return;
    if (e.type === "found" || e.type === "pass" || e.type === "error") sawResult = true;
    onEvent(e);
  };
  child.stdout?.on("data", (chunk: Buffer) => {
    buffer += chunk.toString("utf8");
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    lines.forEach(handle);
  });
  child.stderr?.on("data", (chunk: Buffer) => {
    stderr += chunk.toString("utf8");
  });
  const done = new Promise<void>((resolve) => {
    child.on("error", (err) => {
      onEvent({ type: "error", message: `scripts/stress を起動できません: ${err.message}` });
      sawResult = true;
      resolve();
    });
    child.on("close", (code, signal) => {
      if (buffer !== "") handle(buffer);
      if (!sawResult) {
        onEvent(
          signal !== null
            ? { type: "error", message: "停止しました" }
            : { type: "error", message: `scripts/stress が異常終了しました（終了コード ${code}）`, detail: stderr },
        );
      }
      resolve();
    });
  });
  return { done, cancel: () => child.kill("SIGTERM") };
};
