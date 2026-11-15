"""scripts/note --apply のテスト。

    python3 -m unittest discover -s scripts/tests

一時ディレクトリに scripts/note と base-note.md をコピーし、その中で実行する（リポジトリのノートには触れない）。
"""

from __future__ import annotations

import json
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
PROBLEM = "practice/ABC/999/A"

CLAUDE_OUTPUT = """\
---
tags: [DP, 二分探索]
time: O(N log N)
space: O(N)
review: true
---
## Claude による添削・解説（AI生成）
<!-- 2026-11-15 Claude が生成。この節より上は本人が書いている -->

### 判定
正しい。

```cpp
// --- コードブロック内の区切り線は無視される
int main() {}
```
"""

SECTION = CLAUDE_OUTPUT.split("---\n", 2)[2]


def linked(section: str, label: str, href: str) -> str:
    """取り込み後の節（日付コメントの次の行に、添削したコードへのリンクが入る）"""
    comment = "この節より上は本人が書いている -->\n"
    return section.replace(comment, f"{comment}対象: [{label}]({href})\n", 1)


# practice/ の main.cpp を添削した節を取り込んだ結果
APPLIED = linked(SECTION, "main.cpp", "main.cpp")

USER_NOTE = """\
---
status: 自力AC        # 本番AC / 自力AC / 解説AC / 未AC
tags: [累積和]        # 大分類と具体的な手法を両方（例: [DP, 桁DP]）
time: O(N)            # 時間計算量 例: O(N log N)
space:                # 空間計算量 例: O(N)
review: false         # 復習対象なら true
---

## 着眼点
自分で書いた本文。

## 解法
```cpp
## Claude による添削・解説（AI生成）
```
"""


class NoteApplyTest(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        (self.root / "scripts").mkdir()
        shutil.copy(REPO_ROOT / "scripts" / "note", self.root / "scripts" / "note")
        shutil.copy(REPO_ROOT / "base-note.md", self.root / "base-note.md")
        (self.root / PROBLEM).mkdir(parents=True)
        (self.root / PROBLEM / "main.cpp").write_text("// https://atcoder.jp/contests/abc999/tasks/abc999_a\n")
        self.note = self.root / PROBLEM / "note.md"

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def run_note(self, *args: str, stdin: str = "") -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [str(self.root / "scripts" / "note"), *args],
            cwd=self.root,
            input=stdin,
            capture_output=True,
            text=True,
            check=False,
        )

    def apply(self, stdin: str = CLAUDE_OUTPUT, *extra: str) -> dict[str, object]:
        result = self.run_note("--apply", "--from", "-", *extra, PROBLEM, stdin=stdin)
        self.assertEqual(result.returncode, 0, result.stderr)
        parsed: object = json.loads(result.stdout)
        assert isinstance(parsed, dict)
        return parsed

    def fm(self, key: str) -> str:
        line = next(l for l in self.note.read_text().splitlines() if l.startswith(f"{key}:"))
        return line

    def test_creates_note_when_missing(self) -> None:
        out = self.apply()
        self.assertTrue(out["created"])
        self.assertEqual(out["section"], "added")
        self.assertEqual(out["filled"], ["tags", "time", "space", "review"])
        text = self.note.read_text()
        template = (self.root / "base-note.md").read_text()
        # 本文は雛形のまま、空行 1 つの後に節が続く
        body = template.split("---\n", 2)[2]
        self.assertTrue(text.endswith(body + "\n" + APPLIED), text)
        # コメントは残り、列もそろう
        self.assertEqual(self.fm("tags"), "tags: [DP, 二分探索]  # 大分類と具体的な手法を両方（例: [DP, 桁DP]）")
        self.assertEqual(self.fm("time"), "time: O(N log N)      # 時間計算量 例: O(N log N)")
        self.assertEqual(self.fm("review"), "review: true          # 復習対象なら true")
        self.assertEqual(self.fm("status"), "status:               # 本番AC / 自力AC / 解説AC / 未AC")

    def test_fills_empty_frontmatter(self) -> None:
        self.run_note(PROBLEM)
        out = self.apply()
        self.assertFalse(out["created"])
        self.assertEqual(out["filled"], ["tags", "time", "space", "review"])
        self.assertEqual(out["kept"], [])

    def test_keeps_existing_values_and_reports_diff(self) -> None:
        self.note.write_text(USER_NOTE)
        out = self.apply()
        self.assertEqual(out["filled"], ["space", "review"])
        self.assertEqual(
            out["kept"],
            [
                {"key": "tags", "current": "[累積和]", "proposed": "[DP, 二分探索]"},
                {"key": "time", "current": "O(N)", "proposed": "O(N log N)"},
            ],
        )
        self.assertEqual(self.fm("tags"), "tags: [累積和]        # 大分類と具体的な手法を両方（例: [DP, 桁DP]）")
        self.assertEqual(self.fm("status"), "status: 自力AC        # 本番AC / 自力AC / 解説AC / 未AC")
        # コードブロック内の見出しは本人の本文として扱い、節は末尾に追加する
        text = self.note.read_text()
        self.assertEqual(out["section"], "added")
        # 見出しより上の本文は 1 文字も変わらない
        self.assertEqual(text.split("---\n", 2)[2], USER_NOTE.split("---\n", 2)[2] + "\n" + APPLIED)

    def test_overwrite(self) -> None:
        self.note.write_text(USER_NOTE)
        out = self.apply(CLAUDE_OUTPUT, "--overwrite")
        self.assertEqual(out["overwritten"], ["tags", "time"])
        self.assertEqual(out["kept"], [])
        self.assertEqual(self.fm("time"), "time: O(N log N)      # 時間計算量 例: O(N log N)")
        self.assertEqual(self.fm("status"), "status: 自力AC        # 本番AC / 自力AC / 解説AC / 未AC")

    def test_status_in_input_is_ignored(self) -> None:
        self.note.write_text(USER_NOTE)
        out = self.apply(CLAUDE_OUTPUT.replace("---\ntags", "---\nstatus: 解説AC\ntags", 1), "--overwrite")
        self.assertEqual(out["ignored"], ["status"])
        self.assertEqual(self.fm("status"), "status: 自力AC        # 本番AC / 自力AC / 解説AC / 未AC")

    def test_second_apply_replaces_section_idempotently(self) -> None:
        self.note.write_text(USER_NOTE)
        self.apply()
        first = self.note.read_text()
        out = self.apply()
        self.assertEqual(out["section"], "replaced")
        self.assertEqual(self.note.read_text(), first)
        # 内容が変わったら節だけ差し替わる
        self.apply(CLAUDE_OUTPUT.replace("正しい。", "惜しい。"))
        self.assertEqual(self.note.read_text(), first.replace("正しい。", "惜しい。"))

    def test_contest_and_practice_sections_are_kept_separately(self) -> None:
        contest = "contest/ABC/999/A.cpp"
        (self.root / "contest/ABC/999").mkdir(parents=True)
        (self.root / contest).write_text("int main() {}\n")
        self.note.write_text(USER_NOTE)
        contest_heading = "## Claude による添削・解説（AI生成・本番）"

        def apply_to(path: str, stdin: str) -> dict[str, object]:
            result = self.run_note("--apply", "--from", "-", path, stdin=stdin)
            self.assertEqual(result.returncode, 0, result.stderr)
            parsed: object = json.loads(result.stdout)
            assert isinstance(parsed, dict)
            return parsed

        # contest/ を指定すると本番の見出しになる
        self.assertEqual(apply_to(contest, CLAUDE_OUTPUT.replace("正しい。", "本番1"))["section"], "added")
        # practice/ の節（復習）は別に追加され、本番の節は残る
        self.assertEqual(apply_to(PROBLEM, CLAUDE_OUTPUT.replace("正しい。", "復習1"))["section"], "added")
        # 復習の節だけ置き換わる
        self.assertEqual(apply_to(PROBLEM, CLAUDE_OUTPUT.replace("正しい。", "復習2"))["section"], "replaced")
        # 本番の節だけ置き換わる（見出しが本番なら practice/ を指定しても本番の節）
        contest_output = CLAUDE_OUTPUT.replace("## Claude による添削・解説（AI生成）", contest_heading)
        self.assertEqual(apply_to(PROBLEM, contest_output.replace("正しい。", "本番2"))["section"], "replaced")

        # 本番の節を practice/ から取り込んだので、リンクは今のもの（contest/ の .cpp）を引き継ぐ
        body = USER_NOTE.split("---\n", 2)[2]
        contest_section = linked(SECTION, "contest/ABC/999/A.cpp", "../../../../contest/ABC/999/A.cpp").replace(
            "## Claude による添削・解説（AI生成）", contest_heading
        )
        expected = (
            body
            + "\n"
            + contest_section.replace("正しい。", "本番2")
            + "\n"
            + APPLIED.replace("正しい。", "復習2")
        )
        self.assertEqual(self.note.read_text().split("---\n", 2)[2], expected)
        # contest/ から取り込み直しても、本番の節のリンクは contest/ の .cpp
        apply_to(contest, CLAUDE_OUTPUT.replace("正しい。", "本番3"))
        self.assertIn(
            contest_section.replace("正しい。", "本番3")
            + "\n"
            + APPLIED.replace("正しい。", "復習2"),
            self.note.read_text(),
        )

    def test_contest_section_goes_before_practice_section(self) -> None:
        self.note.write_text(USER_NOTE)
        self.apply(CLAUDE_OUTPUT.replace("正しい。", "復習"))
        contest_output = CLAUDE_OUTPUT.replace("## Claude による添削・解説（AI生成）", "## Claude による添削・解説（AI生成・本番）")
        self.assertEqual(self.apply(contest_output.replace("正しい。", "本番"))["section"], "added")
        text = self.note.read_text()
        self.assertLess(text.index("本番"), text.index("復習"))

    def test_link_from_claude_is_replaced(self) -> None:
        self.note.write_text(USER_NOTE)
        comment = "この節より上は本人が書いている -->\n"
        self.apply(CLAUDE_OUTPUT.replace(comment, f"{comment}対象: [x.cpp](x.cpp)\n"))
        text = self.note.read_text()
        self.assertTrue(text.endswith(APPLIED), text)
        self.assertNotIn("x.cpp", text)

    def test_rejects_invalid_input(self) -> None:
        self.note.write_text(USER_NOTE)
        cases = {
            "frontmatter なし": SECTION,
            "見出しなし": CLAUDE_OUTPUT.replace("## Claude による添削・解説（AI生成）", "## 判定"),
            "関係ない内容": "int main() {}\n",
            "空": "",
        }
        for name, stdin in cases.items():
            with self.subTest(name):
                result = self.run_note("--apply", "--from", "-", PROBLEM, stdin=stdin)
                self.assertEqual(result.returncode, 1)
                self.assertIn("エラー", result.stderr)
                self.assertEqual(self.note.read_text(), USER_NOTE)

    def test_invalid_input_does_not_create_note(self) -> None:
        result = self.run_note("--apply", "--from", "-", PROBLEM, stdin="hello\n")
        self.assertEqual(result.returncode, 1)
        self.assertFalse(self.note.exists())

    def test_dry_run_prints_result_without_writing(self) -> None:
        self.note.write_text(USER_NOTE)
        result = self.run_note("--apply", "--dry-run", "--from", "-", PROBLEM, stdin=CLAUDE_OUTPUT)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.note.read_text(), USER_NOTE)
        self.assertIn("--dry-run", result.stderr)
        # 標準出力は実際に取り込んだときの全文と一致する
        self.apply()
        self.assertEqual(result.stdout, self.note.read_text())

    def test_dry_run_does_not_create_note(self) -> None:
        result = self.run_note("--apply", "--dry-run", "--overwrite", "--from", "-", PROBLEM, stdin=CLAUDE_OUTPUT)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertFalse(self.note.exists())
        self.assertTrue(result.stdout.startswith("---\nstatus:"), result.stdout)
        self.assertTrue(result.stdout.endswith(APPLIED))
        # 問題のディレクトリも作らない（contest/ から作る場合）
        (self.root / "contest/ABC/998").mkdir(parents=True)
        (self.root / "contest/ABC/998/B.cpp").write_text("int main() {}\n")
        result = self.run_note("--apply", "--dry-run", "--from", "-", "contest/ABC/998/B.cpp", stdin=CLAUDE_OUTPUT)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("url: https://atcoder.jp/contests/abc998/tasks/abc998_b", result.stdout)
        self.assertIn("対象: [contest/ABC/998/B.cpp](../../../../contest/ABC/998/B.cpp)\n", result.stdout)
        self.assertFalse((self.root / "practice/ABC/998").exists())

    def test_dry_run_requires_apply(self) -> None:
        result = self.run_note("--dry-run", PROBLEM)
        self.assertEqual(result.returncode, 2)
        self.assertFalse(self.note.exists())

    def test_history(self) -> None:
        self.note.write_text(USER_NOTE)
        other = self.root / "practice/ABC/998/B/note.md"
        other.parent.mkdir(parents=True)
        other.write_text("---\nurl: https://atcoder.jp/contests/abc998/tasks/abc998_b\nstatus:   # c\ntags: []\n---\n")
        result = self.run_note("--history")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(
            json.loads(result.stdout),
            [
                {
                    "path": "practice/ABC/998/B/note.md",
                    "url": "https://atcoder.jp/contests/abc998/tasks/abc998_b",
                    "status": None,
                    "tags": [],
                },
                {
                    "path": f"{PROBLEM}/note.md",
                    "url": "https://atcoder.jp/contests/abc999/tasks/abc999_a",
                    "status": "自力AC",
                    "tags": ["累積和"],
                },
            ],
        )
        self.assertEqual(self.run_note("--history", PROBLEM).returncode, 2)

    def test_create_and_info_unchanged(self) -> None:
        info = json.loads(self.run_note("--info", PROBLEM).stdout)
        self.assertEqual(info, {"note": str(self.note.resolve()), "exists": False, "tags": []})
        result = self.run_note("--status", "自力AC", "--tags", "DP,桁DP", PROBLEM)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout.strip().splitlines()[-1], str(self.note.resolve()))
        self.assertEqual(self.fm("tags"), "tags: [DP, 桁DP]      # 大分類と具体的な手法を両方（例: [DP, 桁DP]）")


if __name__ == "__main__":
    unittest.main()
