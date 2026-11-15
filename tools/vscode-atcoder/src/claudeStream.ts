/**
 * `claude -p --output-format stream-json --verbose` の出力を解釈する純粋関数（vscode に依存しない。テスト対象）
 *
 * 1 行 1 JSON。主なイベント:
 *   {"type":"system","subtype":"init","model":...}
 *   {"type":"assistant","message":{"content":[{"type":"text","text":...},{"type":"tool_use","id":...,"name":...,"input":{...}}]}}
 *   {"type":"user","message":{"content":[{"type":"tool_result","tool_use_id":...,"is_error":...}]}}
 *   {"type":"result","subtype":"success","is_error":false,"result":"<最終出力>","total_cost_usd":...}
 */

export type StreamEvent =
  | { readonly kind: "init"; readonly model: string | undefined }
  | { readonly kind: "tool"; readonly id: string; readonly name: string; readonly status: string }
  | { readonly kind: "toolResult"; readonly id: string; readonly isError: boolean }
  | { readonly kind: "text"; readonly text: string }
  | {
      readonly kind: "result";
      readonly isError: boolean;
      readonly subtype: string;
      readonly text: string;
      readonly costUsd: number | undefined;
    };

/** 条件に合う最後の要素（lib が es2022 なので Array.prototype.findLast を使わない） */
const lastOf = <T>(xs: readonly T[], pred: (x: T) => boolean): T | undefined => {
  for (let i = xs.length - 1; i >= 0; i--) {
    const x = xs[i];
    if (x !== undefined && pred(x)) return x;
  }
  return undefined;
};

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);

/** 表示用に長い文字列を詰める */
const short = (s: string, max = 60): string => (s.length <= max ? s : `${s.slice(0, max - 1)}…`);

/** リポジトリの絶対パスで渡されることもあるので、末尾の数階層だけ見せる */
/** 絶対パスで渡されるので、リポジトリ直下のディレクトリ（practice/ など）から後ろだけ見せる。見つからなければ末尾 3 階層 */
const REPO_DIRS = new Set(["practice", "contest", ".claude", "scripts", "docs"]);
const tail = (p: string): string => {
  const parts = p.split("/").filter((s) => s !== "");
  const start = parts.findIndex((s) => REPO_DIRS.has(s));
  return parts.slice(start >= 0 ? start : -3).join("/");
};

/** ツールの呼び出しを、サイドバーに出す状況の文に変える */
export const describeTool = (name: string, input: unknown): string => {
  const i = isRecord(input) ? input : {};
  switch (name) {
    case "WebFetch": {
      const url = str(i["url"]) ?? "";
      if (/\/editorial/.test(url)) return "公式解説を取得中";
      if (/\/tasks\//.test(url)) return "問題文を取得中";
      return `ページを取得中: ${short(url)}`;
    }
    case "WebSearch":
      return `検索中: ${short(str(i["query"]) ?? "")}`;
    case "Read":
      return `ファイルを読み込み中: ${tail(str(i["file_path"]) ?? "")}`;
    case "Glob":
    case "Grep":
      return `ファイルを検索中: ${short(str(i["pattern"]) ?? "")}`;
    case "Bash": {
      const command = str(i["command"]) ?? "";
      if (command.startsWith("./scripts/test")) return "サンプルでテスト実行中";
      if (command.includes("--history")) return "過去ノートを照合中";
      if (command.includes("--info")) return "ノートの場所を確認中";
      return `コマンド実行: ${short(command)}`;
    }
    case "Skill":
      return "スキルを読み込み中";
    case "ToolSearch":
      return "ツールを準備中";
    default:
      return `${name} を実行中`;
  }
};

const contentEvents = (type: "assistant" | "user", content: unknown): readonly StreamEvent[] => {
  if (!Array.isArray(content)) return [];
  return content.flatMap((c: unknown): StreamEvent[] => {
    if (!isRecord(c)) return [];
    if (type === "assistant" && c["type"] === "text") {
      const text = str(c["text"]);
      return text === undefined ? [] : [{ kind: "text", text }];
    }
    if (type === "assistant" && c["type"] === "tool_use") {
      const name = str(c["name"]) ?? "?";
      return [{ kind: "tool", id: str(c["id"]) ?? "", name, status: describeTool(name, c["input"]) }];
    }
    if (type === "user" && c["type"] === "tool_result") {
      return [{ kind: "toolResult", id: str(c["tool_use_id"]) ?? "", isError: c["is_error"] === true }];
    }
    return [];
  });
};

/** 1 行を解釈する。JSON でない行・知らないイベントは空配列 */
export const parseLine = (line: string): readonly StreamEvent[] => {
  if (line.trim() === "") return [];
  let v: unknown;
  try {
    v = JSON.parse(line);
  } catch {
    return [];
  }
  if (!isRecord(v)) return [];
  switch (v["type"]) {
    case "system":
      return v["subtype"] === "init" ? [{ kind: "init", model: str(v["model"]) }] : [];
    case "assistant":
    case "user": {
      const message = v["message"];
      return isRecord(message) ? contentEvents(v["type"], message["content"]) : [];
    }
    case "result":
      return [
        {
          kind: "result",
          isError: v["is_error"] === true,
          subtype: str(v["subtype"]) ?? "",
          text: str(v["result"]) ?? "",
          costUsd: typeof v["total_cost_usd"] === "number" ? v["total_cost_usd"] : undefined,
        },
      ];
    default:
      return [];
  }
};

/** チャンク単位で届く標準出力を行に分ける。戻り値の rest は次のチャンクの先頭につなぐ */
export const splitLines = (buffer: string): { readonly lines: readonly string[]; readonly rest: string } => {
  const parts = buffer.split("\n");
  return { lines: parts.slice(0, -1), rest: parts.at(-1) ?? "" };
};

/** 最終出力の文字列。result イベントが無ければ、最後の assistant の文章 */
export const finalText = (events: readonly StreamEvent[]): string | undefined => {
  const result = lastOf(events, (e) => e.kind === "result");
  if (result?.kind === "result" && result.text !== "") return result.text;
  const text = lastOf(events, (e) => e.kind === "text");
  return text?.kind === "text" ? text.text : undefined;
};

/**
 * 最後の ```` ブロック（バッククォート 4 つ以上で囲んだもの）の中身を取り出す。無ければ undefined
 * 閉じのフェンスは開きと同じ数以上のバッククォートだけの行（CommonMark と同じ）
 */
export const extractBlock = (text: string): string | undefined => {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  let last: string | undefined;
  let open: { readonly ticks: number; readonly start: number } | undefined;
  lines.forEach((line, i) => {
    const m = /^ {0,3}(`{4,})(.*)$/.exec(line);
    if (m === null) return;
    const ticks = m[1]?.length ?? 0;
    const info = (m[2] ?? "").trim();
    if (open === undefined) {
      open = { ticks, start: i + 1 };
    } else if (ticks >= open.ticks && info === "") {
      last = lines.slice(open.start, i).join("\n");
      open = undefined;
    }
  });
  return last;
};

export const AI_HEADING = "## Claude による添削・解説（AI生成）";

/** 取り込み用ブロックの最低限の形式チェック（詳しい検証は scripts/note --apply --dry-run が行う）。問題なければ undefined */
export const checkBlock = (block: string): string | undefined => {
  const lines = block.trim().split("\n");
  if (lines[0]?.trim() !== "---") return "先頭が frontmatter（---）ではありません";
  const end = lines.findIndex((l, i) => i > 0 && l.trim() === "---");
  if (end < 0) return "frontmatter が閉じていません";
  if (!lines.slice(end + 1).some((l) => l.trimEnd() === AI_HEADING)) return `「${AI_HEADING}」の見出しがありません`;
  return undefined;
};

/** frontmatter を除いた本文（Webview に Markdown として出す部分）と、frontmatter の行 */
export const splitBlock = (block: string): { readonly frontmatter: readonly string[]; readonly body: string } => {
  const lines = block.trim().split("\n");
  const end = lines.findIndex((l, i) => i > 0 && l.trim() === "---");
  return lines[0]?.trim() === "---" && end > 0
    ? { frontmatter: lines.slice(1, end), body: lines.slice(end + 1).join("\n").trim() }
    : { frontmatter: [], body: block };
};

/** 実行の終わり方 */
export type Exit = {
  readonly code: number | null;
  readonly timedOut: boolean;
  readonly cancelled: boolean;
  /** spawn 自体の失敗（ENOENT など） */
  readonly spawnError: { readonly code: string | undefined; readonly message: string } | undefined;
  readonly stderr: string;
};

const LOGIN_PATTERN = /not logged in|please run \/login|invalid api key|oauth token|authentication_error|\/login/i;

/** 失敗の理由を、利用者が次に何をすればよいか分かる文にする。成功なら undefined */
export const classifyFailure = (
  exit: Exit,
  events: readonly StreamEvent[],
  ctx: { readonly command: string; readonly timeoutSec: number },
): string | undefined => {
  if (exit.cancelled) return "キャンセルしました";
  if (exit.spawnError !== undefined) {
    return exit.spawnError.code === "ENOENT"
      ? `claude コマンドが見つかりません（${ctx.command}）。Claude Code をインストールするか、設定 atcoder.claude.path にフルパスを指定してください`
      : `claude を起動できません: ${exit.spawnError.message}`;
  }
  if (exit.timedOut) return `${ctx.timeoutSec} 秒でタイムアウトしました（設定 atcoder.claude.timeoutSec で変更できます）`;
  const result = lastOf(events, (e) => e.kind === "result");
  const message = [result?.kind === "result" ? result.text : "", exit.stderr].join("\n");
  const failed = exit.code !== 0 || (result?.kind === "result" && result.isError);
  if (!failed) return undefined;
  if (LOGIN_PATTERN.test(message)) {
    return "Claude Code にログインしていません。ターミナルで claude を起動して /login してください";
  }
  if (result?.kind === "result" && result.subtype === "error_max_turns") return "Claude の試行回数の上限に達しました";
  const detail = message.trim().split("\n").slice(-5).join("\n");
  return `claude が失敗しました（終了コード ${exit.code ?? "?"}）${detail === "" ? "" : `\n${detail}`}`;
};

/** 添削で Claude に許すツール。読むこと・サンプル実行・過去ノートの参照・AtCoder の取得だけ */
export const ALLOWED_TOOLS: readonly string[] = [
  "Read",
  "Glob",
  "Grep",
  "Bash(./scripts/test:*)",
  "Bash(./scripts/note --history:*)",
  "Bash(./scripts/note --info:*)",
  "WebFetch(domain:atcoder.jp)",
  "WebSearch",
];

/** ファイルの編集と git は明示的に禁止する（許可していないツールも -p では自動で拒否される） */
export const DISALLOWED_TOOLS: readonly string[] = ["Edit", "Write", "NotebookEdit", "Bash(git:*)"];

export type ReviewOutcome =
  | { readonly ok: true; readonly block: string; readonly costUsd: number | undefined }
  /** raw: 利用者に見せる生の出力（最終出力、無ければ標準エラー出力） */
  | { readonly ok: false; readonly error: string; readonly raw: string };

export const reviewPrompt = (target: string, contestConfirmed: boolean): string =>
  `.claude/skills/atcoder-review/SKILL.md の手順に従って ${target} を添削せよ。` +
  (contestConfirmed ? "コンテスト終了はユーザー確認済み。" : "");

export const reviewArgs = (o: { readonly model: string; readonly target: string; readonly contestConfirmed: boolean }): readonly string[] => [
  // --allowedTools などは可変長なので、指示文は -p の直後に置く
  "-p",
  reviewPrompt(o.target, o.contestConfirmed),
  "--output-format",
  "stream-json",
  "--verbose",
  "--model",
  o.model,
  "--allowedTools",
  ...ALLOWED_TOOLS,
  "--disallowedTools",
  ...DISALLOWED_TOOLS,
];

/** 終了後のイベント列と終わり方から結果を決める（純粋関数） */
export const outcomeOf = (events: readonly StreamEvent[], exit: Exit, ctx: { command: string; timeoutSec: number }): ReviewOutcome => {
  const text = finalText(events) ?? "";
  const raw = text !== "" ? text : exit.stderr;
  const failure = classifyFailure(exit, events, ctx);
  if (failure !== undefined) return { ok: false, error: failure, raw };
  const block = extractBlock(text);
  if (block === undefined) {
    return { ok: false, error: "Claude の出力に取り込み用ブロック（````）がありません。出力を確認してください", raw };
  }
  const invalid = checkBlock(block);
  if (invalid !== undefined) return { ok: false, error: `取り込み用ブロックの形式が不正です: ${invalid}`, raw };
  const result = events.find((e) => e.kind === "result");
  return { ok: true, block, costUsd: result?.kind === "result" ? result.costUsd : undefined };
};
