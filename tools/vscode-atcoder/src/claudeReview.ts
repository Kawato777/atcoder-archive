import { spawn } from "node:child_process";
import { type Exit, outcomeOf, parseLine, type ReviewOutcome, reviewArgs, splitLines, type StreamEvent } from "./claudeStream";
import { toolEnv } from "./process";

export type ReviewOptions = {
  readonly command: string; // claude コマンドのパス
  readonly model: string;
  readonly timeoutSec: number;
  readonly cwd: string; // リポジトリ直下
  readonly target: string; // リポジトリ相対の .cpp
  readonly contestConfirmed: boolean;
  readonly onEvent: (event: StreamEvent) => void;
  readonly log: (line: string) => void;
};

export type ReviewRun = { readonly done: Promise<ReviewOutcome>; readonly cancel: () => void };


const KILL_GRACE_MS = 3000;
/** 本体の終了後、標準出力の残りを待つ時間（孫プロセスがパイプを開いたままでも終わらせる） */
const DRAIN_MS = 2000;

/** claude -p を起動する。cancel() かタイムアウトでプロセスを止める */
export const startReview = (o: ReviewOptions): ReviewRun => {
  const args = reviewArgs(o);
  o.log(`$ ${o.command} ${args.map((a) => (/[\s(]/.test(a) ? JSON.stringify(a) : a)).join(" ")}`);
  // 標準入力を閉じておかないと、claude が入力を待ち続けることがある。
  // claude は Bash ツールなどで子プロセスを作るので、別のプロセスグループにしてまとめて止められるようにする
  const group = process.platform !== "win32";
  const child = spawn(o.command, args, {
    cwd: o.cwd,
    env: toolEnv(),
    stdio: ["ignore", "pipe", "pipe"],
    detached: group,
  });

  let cancelled = false;
  let timedOut = false;
  let stopping = false;
  const signal = (sig: NodeJS.Signals): void => {
    if (child.pid === undefined) return;
    try {
      if (group) process.kill(-child.pid, sig);
      else child.kill(sig);
    } catch {
      // 既に終了している（ESRCH）
    }
  };
  const stop = (): void => {
    if (stopping || child.pid === undefined) return;
    stopping = true;
    signal("SIGTERM");
    // 残った子プロセスも含めて確実に止める
    setTimeout(() => signal("SIGKILL"), KILL_GRACE_MS).unref();
  };
  const timer = setTimeout(() => {
    timedOut = true;
    stop();
  }, o.timeoutSec * 1000);

  const done = new Promise<ReviewOutcome>((resolve) => {
    const events: StreamEvent[] = [];
    const stderr: Buffer[] = [];
    let rest = "";
    let settled = false;

    const handle = (line: string): void => {
      for (const e of parseLine(line)) {
        events.push(e);
        o.onEvent(e);
      }
    };

    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      const split = splitLines(rest + chunk);
      rest = split.rest;
      split.lines.forEach(handle);
    });
    child.stderr.on("data", (chunk: Buffer) => stderr.push(chunk));

    const finish = (code: number | null, spawnError?: NodeJS.ErrnoException): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      handle(rest);
      const exit: Exit = {
        code,
        timedOut,
        cancelled,
        spawnError: spawnError && { code: spawnError.code, message: spawnError.message },
        stderr: Buffer.concat(stderr).toString("utf8"),
      };
      if (exit.stderr.trim() !== "") o.log(`[stderr]\n${exit.stderr.trimEnd()}`);
      o.log(`[exit] code=${code ?? "null"} timedOut=${timedOut} cancelled=${cancelled}`);
      resolve(outcomeOf(events, exit, { command: o.command, timeoutSec: o.timeoutSec }));
    };
    child.on("error", (err: NodeJS.ErrnoException) => finish(null, err));
    child.on("close", (code) => finish(code));
    // 止めた場合はすぐ、通常の終了でも少し待ってパイプが閉じなければ終わらせる
    child.on("exit", (code) => {
      if (stopping) finish(code);
      else setTimeout(() => finish(code), DRAIN_MS).unref();
    });
  });

  return {
    done,
    cancel: () => {
      cancelled = true;
      stop();
    },
  };
};
