import { spawn } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import * as path from "node:path";
import { toolEnv } from "./process";

export type TestCase = {
  readonly name: string;
  readonly input: string;
  readonly expected: string | undefined; // .out が無いケースは出力を表示するだけ
};

export type Verdict = "AC" | "WA" | "RE" | "TLE" | "RUN";

export type CaseResult = {
  readonly name: string;
  readonly verdict: Verdict;
  readonly timeMs: number;
  readonly input: string;
  readonly expected: string | undefined;
  readonly actual: string;
  readonly stderr: string;
  /** AC だが期待する出力と完全一致ではない（空白・改行だけが違う） */
  readonly whitespaceDiff: boolean;
};

/** AtCoder の多くの問題の実行時間制限 */
export const TIME_LIMIT_MS = 2000;
/** 無限ループ対策でこの時間を過ぎたら強制終了する */
const KILL_AFTER_MS = 6000;
/** Webview に送る出力の上限（巨大な出力で固まらないように） */
const DISPLAY_LIMIT = 64 * 1024;

/** contest/<種類>/<番号>/<問題>.cpp -> practice/<種類>/<番号>/<問題>/test（それ以外は undefined） */
export const practiceTestDir = (root: string, file: string): string | undefined => {
  const relative = path.relative(root, file).split(path.sep).join("/");
  const m = /^contest\/([A-Z]+\/\d+)\/([A-Za-z0-9]+)\.cpp$/.exec(relative);
  return m && m[1] && m[2] ? path.join(root, "practice", ...m[1].split("/"), m[2].toUpperCase(), "test") : undefined;
};

/** ソースの隣の test/。contest/ で隣に無ければ practice/ 側で取得したサンプル（scripts/test と同じ） */
export const testDirFor = (root: string, file: string): string => {
  const beside = path.join(path.dirname(file), "test");
  const practice = practiceTestDir(root, file);
  return !existsSync(beside) && practice !== undefined && existsSync(practice) ? practice : beside;
};

export const listCases = (testDir: string): readonly TestCase[] => {
  if (!existsSync(testDir)) return [];
  const read = (file: string): string | undefined => {
    const p = path.join(testDir, file);
    return existsSync(p) ? readFileSync(p, "utf8") : undefined;
  };
  return readdirSync(testDir)
    .filter((f) => f.endsWith(".in"))
    .map((f) => f.slice(0, -".in".length))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((name) => ({ name, input: read(`${name}.in`) ?? "", expected: read(`${name}.out`) }));
};

const tokens = (s: string): readonly string[] => s.split(/[ \t\r\n]+/).filter((t) => t !== "");

/**
 * AtCoder の公式ルールに合わせた比較（oj t -N 相当）。
 * 「空白文字（CR/LF/Space/Tab）を別の空白文字に置き換えたり、先頭・末尾・別の空白文字の直後に追加しても正解」
 * なので、空白文字で区切った単語の列が一致すれば AC とする。
 * 問題文で例外が明記されている問題には当てはまらない。
 */
export const matchesAtCoder = (expected: string, actual: string): boolean => {
  const [e, a] = [tokens(expected), tokens(actual)];
  return e.length === a.length && e.every((t, i) => t === a[i]);
};

/** oj t の既定（crlf-insensitive-exact-match）と同じ完全一致 */
export const exactlyEqual = (expected: string, actual: string): boolean =>
  expected.replaceAll("\r\n", "\n") === actual.replaceAll("\r\n", "\n");

const truncate = (s: string): string =>
  s.length > DISPLAY_LIMIT ? `${s.slice(0, DISPLAY_LIMIT)}\n...（${s.length - DISPLAY_LIMIT} 文字省略）` : s;

const judge = (testCase: TestCase, code: number | null, timeMs: number, killed: boolean, actual: string): Verdict => {
  if (killed || timeMs > TIME_LIMIT_MS) return "TLE";
  if (code !== 0) return "RE";
  if (testCase.expected === undefined) return "RUN";
  return matchesAtCoder(testCase.expected, actual) ? "AC" : "WA";
};

export const runCase = (binary: string, cwd: string, testCase: TestCase): Promise<CaseResult> =>
  new Promise((resolve) => {
    const started = performance.now();
    const child = spawn(binary, [], { cwd, env: toolEnv() });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    let killed = false;
    const timer = setTimeout(() => {
      killed = true;
      child.kill("SIGKILL");
    }, KILL_AFTER_MS);

    child.stdout.on("data", (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => stderr.push(chunk));
    // 入力を読まずに終了するプログラムでも落ちないように EPIPE を無視する
    child.stdin.on("error", () => undefined);
    child.stdin.end(testCase.input);

    const finish = (code: number | null, spawnError?: Error): void => {
      clearTimeout(timer);
      const timeMs = Math.round(performance.now() - started);
      const actual = Buffer.concat(stdout).toString("utf8");
      const err = (spawnError ? `${spawnError.message}\n` : "") + Buffer.concat(stderr).toString("utf8");
      const verdict = judge(testCase, code, timeMs, killed, actual);
      resolve({
        name: testCase.name,
        verdict,
        whitespaceDiff:
          verdict === "AC" && testCase.expected !== undefined && !exactlyEqual(testCase.expected, actual),
        timeMs,
        input: truncate(testCase.input),
        expected: testCase.expected === undefined ? undefined : truncate(testCase.expected),
        actual: truncate(actual),
        stderr: truncate(err),
      });
    };
    child.on("error", (e) => finish(null, e));
    child.on("close", (code) => finish(code));
  });
