"""scripts/gen-init と scripts/stress のテスト（通信しない）。

    python3 -m unittest discover -s scripts/tests

問題ページの代わりに、AtCoder と同じ形の HTML を組み立てて渡す。
"""

from __future__ import annotations

import importlib.machinery
import importlib.util
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]


def load(name: str):
    loader = importlib.machinery.SourceFileLoader(name.replace("-", "_"), str(REPO_ROOT / "scripts" / name))
    spec = importlib.util.spec_from_loader(loader.name, loader)
    module = importlib.util.module_from_spec(spec)
    sys.modules[loader.name] = module
    loader.exec_module(module)
    return module


gi = load("gen-init")


def page(input_pre: str, constraints: list[str]) -> str:
    """問題ページの日本語部分と同じ形の HTML"""
    lis = "".join(f"<li>{c}</li>" for c in constraints)
    return (f'<span class="lang-ja"><h3>制約</h3><ul>{lis}</ul><h3>入力</h3>'
            f"<p>入力は以下の形式で標準入力から与えられる。</p><pre>{input_pre}</pre><h3>出力</h3></span>")


def body(html: str) -> str:
    gi.fetch = lambda _url: html
    return gi.generate_body("https://atcoder.jp/contests/abc999/tasks/abc999_c")


def run_gen(code: str, seeds: range = range(100)) -> list[str]:
    with tempfile.TemporaryDirectory() as d:
        path = Path(d) / "gen.py"
        path.write_text(gi.GEN_HEADER + code)
        outs = []
        for seed in seeds:
            r = subprocess.run([sys.executable, str(path), str(seed)], capture_output=True, text=True, check=True)
            outs.append(r.stdout)
        return outs


class GenInitTest(unittest.TestCase):
    def test_array_with_bounds(self) -> None:
        b = body(page("<var>N</var>\n<var>A_1</var> <var>A_2</var> <var>\\ldots</var> <var>A_N</var>\n",
                      ["<var>2 \\leq N \\leq 3 \\times 10^5</var>", "<var>1 \\leq A_i \\leq N</var>"]))
        self.assertIn("N = size(2, 3*10**5)", b)
        self.assertIn("A = [val(1, N) for i in range(1, N + 1)]", b)
        for out in run_gen(b):
            n, *rest = out.split("\n")
            a = list(map(int, rest[0].split()))
            self.assertTrue(2 <= int(n) <= 9)
            self.assertEqual(len(a), int(n))
            self.assertTrue(all(1 <= x <= int(n) for x in a))

    def test_rows_and_strict_chain(self) -> None:
        b = body(page("<var>N</var> <var>K</var>\n<var>u_1</var> <var>v_1</var>\n<var>\\vdots</var>\n<var>u_K</var> <var>v_K</var>\n",
                      ["<var>1\\le K\\lt N\\le2\\times10 ^ 5</var>", "<var>1 \\leq u_i \\lt v_i \\leq N</var>"]))
        self.assertIn("K = size(1, N-1)", b)
        self.assertIn("大小関係", b)  # u_i < v_i は TODO に残る
        for out in run_gen(b):
            lines = out.strip().split("\n")
            n, k = map(int, lines[0].split())
            self.assertTrue(1 <= k < n)
            self.assertEqual(len(lines) - 1, k)

    def test_grid_and_string(self) -> None:
        b = body(page("<var>H</var> <var>W</var>\n<var>S_{1,1}S_{1,2}\\dots S_{1,W}</var>\n<var>\\vdots</var>\n"
                      "<var>S_{H,1}S_{H,2}\\dots S_{H,W}</var>\n<var>T</var>\n",
                      ["<var>1 \\leq H,W \\leq 10^3</var>", "<var>S_{i,j}</var> は <code>#</code> か <code>.</code>",
                       "<var>T</var> は英小文字からなる長さ <var>1</var> 以上 <var>10</var> 以下の文字列"]))
        self.assertIn("S = grid(H, W, '#.')", b)
        self.assertIn("T = string(size(1, 10), 'abc')", b)
        for out in run_gen(b):
            lines = out.strip().split("\n")
            h, w = map(int, lines[0].split())
            self.assertEqual(len(lines), h + 2)
            self.assertTrue(all(len(row) == w and set(row) <= set("#.") for row in lines[1 : h + 1]))

    def test_unknown_lines_become_todo(self) -> None:
        b = body(page("<var>Q</var>\n<var>\\mathrm{query}_1</var>\n<var>\\vdots</var>\n<var>\\mathrm{query}_Q</var>\n",
                      ["<var>1 \\leq Q \\leq 10^5</var>", "各クエリは以下のいずれかの形式"]))
        self.assertIn("# TODO", b)
        self.assertIn("for _ in range(Q):", b)

    def test_text_notes_are_kept(self) -> None:
        b = body(page("<var>N</var>\n<var>A_1</var> <var>\\ldots</var> <var>A_N</var>\n",
                      ["<var>1 \\leq N \\leq 10</var>", "<var>A_i \\neq A_j</var> (<var>i \\neq j</var>)",
                       "<var>1 \\leq A_i \\leq 10^9</var>", "入力は全て整数"]))
        self.assertIn("#   - A_i \\neq A_j", b)
        self.assertNotIn("入力は全て整数", b)


class StressTest(unittest.TestCase):
    def test_finds_wrong_answer_and_saves_case(self) -> None:
        with tempfile.TemporaryDirectory(dir=REPO_ROOT / "practice") as d:
            problem = Path(d)
            (problem / "gen.py").write_text("import random, sys\nrandom.seed(int(sys.argv[1]))\n"
                                            "n = random.randint(1, 5)\nprint(n)\nprint(*[random.randint(-3, 3) for _ in range(n)])\n")
            solve = "#include <bits/stdc++.h>\nint main(){{int n;std::cin>>n;long long s=0;for(int i=0;i<n;i++){{long long a;std::cin>>a;s+={};}}std::cout<<s<<'\\n';}}\n"
            (problem / "brute.cpp").write_text(solve.format("a"))
            (problem / "main.cpp").write_text(solve.format("std::max(a, 0LL)"))  # 負の数で間違える
            r = subprocess.run([str(REPO_ROOT / "scripts" / "stress"), "--seconds", "20", str(problem / "main.cpp")],
                               capture_output=True, text=True)
            self.assertEqual(r.returncode, 1, r.stdout + r.stderr)
            self.assertIn("WA", r.stdout)
            self.assertTrue((problem / "test" / "hack-000.in").exists())


if __name__ == "__main__":
    unittest.main()
