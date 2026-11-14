/** インポート欄のプルダウンに出すコンテストの種類 */
export type ContestKind = {
  readonly id: string;
  readonly label: string;
  /**
   * series: 番号を入力して "<id><3桁の番号>" にする（abc + 42 -> abc042）。コンテスト用の作成ができる
   * fixed:  ID が決まっているので入力不要
   * other:  ID 全体を入力する
   */
  readonly input: "series" | "fixed" | "other";
};

export const CONTEST_KINDS: readonly ContestKind[] = [
  { id: "abc", label: "ABC", input: "series" },
  { id: "arc", label: "ARC", input: "series" },
  { id: "agc", label: "AGC", input: "series" },
  { id: "ahc", label: "AHC", input: "series" },
  { id: "typical90", label: "典型90問", input: "fixed" },
  { id: "dp", label: "EDPC（DP まとめ）", input: "fixed" },
  { id: "tessoku-book", label: "鉄則本", input: "fixed" },
  { id: "abs", label: "ABS", input: "fixed" },
  { id: "math-and-algorithm", label: "アルゴリズムと数学", input: "fixed" },
  { id: "other", label: "その他（ID を入力）", input: "other" },
];

export type ContestIdResult = { readonly ok: true; readonly id: string } | { readonly ok: false; readonly error: string };

/** プルダウンの種類と入力値から AtCoder のコンテストIDを作る */
export const buildContestId = (kindId: string, value: string): ContestIdResult => {
  const kind = CONTEST_KINDS.find((k) => k.id === kindId);
  const v = value.trim().toLowerCase();
  if (kind === undefined) return { ok: false, error: "コンテストの種類を選んでください" };
  switch (kind.input) {
    case "fixed":
      return { ok: true, id: kind.id };
    case "series":
      return /^\d{1,4}$/.test(v)
        ? { ok: true, id: `${kind.id}${v.padStart(3, "0")}` }
        : { ok: false, error: `${kind.label} の番号を数字で入力してください（例: 380）` };
    case "other":
      // "-" で始まるとオプションと解釈されるので受け付けない
      return /^[a-z0-9][a-z0-9_-]*$/.test(v)
        ? { ok: true, id: v }
        : { ok: false, error: "コンテストIDを入力してください（例: hhkb2020。URL の contests/ の後ろ）" };
  }
};

export const canCreateForContest = (kindId: string): boolean =>
  CONTEST_KINDS.some((k) => k.id === kindId && k.input === "series");
