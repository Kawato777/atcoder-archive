#!/usr/bin/env python3
# ランダムテストの入力生成器: python3 gen.py [seed] -> 入力を 1 つ標準出力に出す
# 「▶ ランダムテスト」（または scripts/stress）が seed を変えながら何度も呼ぶ
# 制約を満たさない入力は assert で捨てられる（例: assert len(set(C)) >= 2）。gen.py が失敗した seed は飛ばす
import random
import sys

random.seed(int(sys.argv[1]) if len(sys.argv) > 1 else None)
rnd = random.randint
SIZE_MAX = 8  # 個数（N, M, H, W, 文字列の長さなど）の上限。愚直解が間に合う程度に小さくする


def edge(lo, hi):
    """lo 以上 hi 以下。1/3 の確率で端（lo か hi）を返す"""
    return random.choice([lo, hi]) if random.random() < 1 / 3 else rnd(lo, hi)


def size(lo, hi):
    """個数用。制約 [lo, hi] のうち小さい側（lo から SIZE_MAX 個分）だけを使い、端を出やすくする"""
    return edge(lo, max(lo, min(hi, lo + SIZE_MAX - 1)))


def val(lo, hi):
    """値用。ふだんは 0 に近い狭い範囲（同じ値が並びやすい）、1/10 で制約の端（オーバーフロー確認用）"""
    if random.random() < 0.1:
        return random.choice([lo, hi])
    c = min(max(0, lo), hi)
    return rnd(max(lo, c - 2), min(hi, c + 3))


def arr(n, lo, hi):
    return [val(lo, hi) for _ in range(n)]


def distinct(n, lo, hi):
    """相異なる n 個（範囲が足りなければ例外）"""
    return random.sample(range(lo, hi + 1), n)


def perm(n):
    """1..n の順列"""
    return random.sample(range(1, n + 1), n)


def string(n, chars="ab"):
    return "".join(random.choice(chars) for _ in range(n))


def grid(h, w, chars=".#"):
    return [string(w, chars) for _ in range(h)]


def tree(n):
    """頂点 1..n の木の辺（n-1 本）"""
    return [(random.randint(1, i - 1), i) for i in range(2, n + 1)]


# ---- ここから問題ごと（scripts/gen-init が https://atcoder.jp/contests/abc477/tasks/abc477_c の入力形式と制約から生成）----
# TODO: 次は自動では反映していない。必要なら直すか、出力の前に assert で条件を書く（満たさない入力は捨てられる）
#   - 「query_1」の行は形式を読み取れないので手で書く（例: クエリ）
Q = size(1, 2*10**5)
S = string(size(1, 4*10**5), 'abc')
T = string(size(1, 10), 'abc')

print(Q)
print(S)
print(T)
for _ in range(Q):
    L=edge(1,len(S))
    R=edge(L,len(S))
    print(L,R)  # TODO: クエリを 1 行出す
