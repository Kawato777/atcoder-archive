// claudeStream.ts のテスト（固定のサンプル JSONL を使い、Claude は呼ばない）
//   npm test
import * as assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as path from "node:path";
import { describe, it } from "node:test";
import {
  checkBlock,
  classifyFailure,
  describeTool,
  type Exit,
  extractBlock,
  finalText,
  outcomeOf,
  parseLine,
  reviewArgs,
  splitBlock,
  splitLines,
  type StreamEvent,
} from "../claudeStream.js";

// out/tests/ から見た test-fixtures/
const FIXTURES = path.join(__dirname, "..", "..", "test-fixtures");

const load = (name: string): readonly StreamEvent[] =>
  readFileSync(path.join(FIXTURES, name), "utf8").split("\n").flatMap((l) => parseLine(l));

const OK_EXIT: Exit = { code: 0, timedOut: false, cancelled: false, spawnError: undefined, stderr: "" };
const CTX = { command: "claude", timeoutSec: 300 };

describe("parseLine", () => {
  it("ツールの実行状況と結果を取り出す", () => {
    const events = load("stream-success.jsonl");
    const tools = events.flatMap((e) => (e.kind === "tool" ? [e.status] : []));
    assert.deepEqual(tools, [
      "ファイルを読み込み中: .claude/skills/atcoder-review/SKILL.md",
      "過去ノートを照合中",
      "ツールを準備中",
      "問題文を取得中",
      "サンプルでテスト実行中",
      "Edit を実行中",
    ]);
    assert.deepEqual(
      events.filter((e) => e.kind === "toolResult").map((e) => e.kind === "toolResult" && e.isError),
      [false, false, false, false, false, true],
    );
    const result = events.at(-1);
    assert.equal(result?.kind, "result");
    assert.equal(result?.kind === "result" && result.costUsd, 0.15);
    assert.deepEqual(events[0], { kind: "init", model: "claude-sonnet-5-5" });
  });

  it("JSON でない行・知らないイベントは無視する", () => {
    assert.deepEqual(parseLine(""), []);
    assert.deepEqual(parseLine("not json"), []);
    assert.deepEqual(parseLine("[1,2]"), []);
    assert.deepEqual(parseLine('{"type":"rate_limit_event"}'), []);
    assert.deepEqual(parseLine('{"type":"assistant","message":null}'), []);
  });
});

describe("splitLines", () => {
  it("途中で切れた行は rest に残す", () => {
    assert.deepEqual(splitLines('{"a":1}\n{"b"'), { lines: ['{"a":1}'], rest: '{"b"' });
    assert.deepEqual(splitLines("x\n"), { lines: ["x"], rest: "" });
  });
});

describe("describeTool", () => {
  it("URL やコマンドから状況を決める", () => {
    assert.equal(describeTool("WebFetch", { url: "https://atcoder.jp/contests/abc1/editorial" }), "公式解説を取得中");
    assert.equal(describeTool("Bash", { command: "./scripts/note --info x" }), "ノートの場所を確認中");
    assert.equal(describeTool("WebSearch", { query: "ABC 1 A" }), "検索中: ABC 1 A");
    assert.equal(describeTool("Read", undefined), "ファイルを読み込み中: ");
  });
});

describe("extractBlock / checkBlock", () => {
  it("最後の ```` ブロックを取り出す（中の ``` は含めたまま）", () => {
    const text = finalText(load("stream-success.jsonl"));
    assert.ok(text !== undefined);
    const block = extractBlock(text);
    assert.ok(block !== undefined);
    assert.ok(block.startsWith("---\ntags: [累積和, 二分探索]"));
    assert.ok(block.includes("```diff\n-    int sum = 0;"));
    assert.ok(block.endsWith("判断材料が足りない。"));
    assert.equal(checkBlock(block), undefined);
    const { frontmatter, body } = splitBlock(block);
    assert.deepEqual(frontmatter, ["tags: [累積和, 二分探索]", "time: O(N log N)", "space: O(N)", "review: true"]);
    assert.ok(body.startsWith("## Claude による添削・解説（AI生成）"));
  });

  it("複数あれば最後のもの、閉じていなければ無視する", () => {
    assert.equal(extractBlock("````\na\n````\n````md\nb\n`````\n"), "b");
    assert.equal(extractBlock("````\na\n````\n````\nunclosed\n"), "a");
    assert.equal(extractBlock("```\nthree\n```"), undefined);
  });

  it("形式不正を報告する", () => {
    assert.match(checkBlock("tags: []") ?? "", /frontmatter/);
    assert.match(checkBlock("---\ntags: []\n") ?? "", /閉じていません/);
    assert.match(checkBlock("---\ntags: []\n---\n## 判定\n") ?? "", /見出しがありません/);
  });

  it("ブロックが無い出力", () => {
    const text = finalText(load("stream-no-block.jsonl"));
    assert.equal(text, "コンテストが開催中のため添削できません。");
    assert.equal(extractBlock(text ?? ""), undefined);
  });
});

describe("classifyFailure", () => {
  it("成功は undefined", () => {
    assert.equal(classifyFailure(OK_EXIT, load("stream-success.jsonl"), CTX), undefined);
  });

  it("未ログイン（is_error の result と終了コード 1）", () => {
    const message = classifyFailure({ ...OK_EXIT, code: 1 }, load("stream-not-logged-in.jsonl"), CTX);
    assert.match(message ?? "", /ログインしていません/);
    // 終了コードが 0 でも result が is_error なら失敗
    assert.match(classifyFailure(OK_EXIT, load("stream-not-logged-in.jsonl"), CTX) ?? "", /ログイン/);
  });

  it("claude が見つからない・タイムアウト・キャンセル・その他", () => {
    const enoent = { ...OK_EXIT, code: null, spawnError: { code: "ENOENT", message: "spawn claude ENOENT" } };
    assert.match(classifyFailure(enoent, [], CTX) ?? "", /claude コマンドが見つかりません/);
    assert.match(classifyFailure({ ...OK_EXIT, code: null, timedOut: true }, [], CTX) ?? "", /300 秒でタイムアウト/);
    assert.equal(classifyFailure({ ...OK_EXIT, code: null, cancelled: true }, [], CTX), "キャンセルしました");
    const other = classifyFailure({ ...OK_EXIT, code: 2, stderr: "error: unknown option '--foo'\n" }, [], CTX);
    assert.equal(other, "claude が失敗しました（終了コード 2）\nerror: unknown option '--foo'");
  });
});

describe("reviewArgs", () => {
  it("指示文は -p の直後、編集と git は禁止、危険なフラグは使わない", () => {
    const args = reviewArgs({ model: "sonnet", target: "contest/ABC/999/A.cpp", contestConfirmed: true });
    assert.equal(args[0], "-p");
    assert.equal(
      args[1],
      ".claude/skills/atcoder-review/SKILL.md の手順に従って contest/ABC/999/A.cpp を添削せよ。コンテスト終了はユーザー確認済み。",
    );
    assert.deepEqual(args.slice(2, 7), ["--output-format", "stream-json", "--verbose", "--model", "sonnet"]);
    const allowed = args.slice(args.indexOf("--allowedTools") + 1, args.indexOf("--disallowedTools"));
    assert.deepEqual(allowed, [
      "Read",
      "Glob",
      "Grep",
      "Bash(./scripts/test:*)",
      "Bash(./scripts/note --history:*)",
      "Bash(./scripts/note --info:*)",
      "WebFetch(domain:atcoder.jp)",
      "WebSearch",
    ]);
    const disallowed = args.slice(args.indexOf("--disallowedTools") + 1);
    for (const t of ["Edit", "Write", "Bash(git:*)"]) assert.ok(disallowed.includes(t), t);
    assert.ok(!args.some((a) => a.includes("dangerously")));
    assert.ok(!reviewArgs({ model: "opus", target: "x", contestConfirmed: false })[1]?.includes("確認済み"));
  });
});

describe("outcomeOf", () => {
  it("成功ならブロックと料金", () => {
    const outcome = outcomeOf(load("stream-success.jsonl"), OK_EXIT, CTX);
    assert.equal(outcome.ok, true);
    assert.ok(outcome.ok && outcome.block.startsWith("---\ntags:"));
    assert.equal(outcome.ok && outcome.costUsd, 0.15);
  });

  it("ブロックが無い・形式不正なら生の出力を付けてエラー", () => {
    const outcome = outcomeOf(load("stream-no-block.jsonl"), OK_EXIT, CTX);
    assert.deepEqual(outcome, {
      ok: false,
      error: "Claude の出力に取り込み用ブロック（````）がありません。出力を確認してください",
      raw: "コンテストが開催中のため添削できません。",
    });
    const bad = outcomeOf([{ kind: "result", isError: false, subtype: "success", text: "````\n## x\n````", costUsd: 0 }], OK_EXIT, CTX);
    assert.ok(!bad.ok && bad.error.startsWith("取り込み用ブロックの形式が不正です"));
  });

  it("未ログインは失敗として分類する", () => {
    const outcome = outcomeOf(load("stream-not-logged-in.jsonl"), { ...OK_EXIT, code: 1 }, CTX);
    assert.ok(!outcome.ok && /ログイン/.test(outcome.error));
    assert.ok(!outcome.ok && outcome.raw === "Not logged in · Please run /login");
  });
});
