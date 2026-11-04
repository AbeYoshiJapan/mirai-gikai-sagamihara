"""文字列の正規化。議会の PDF は全角数字・字間の空白・ルビ行が混ざるので、
表示用（件名）と照合用（キー）の 2 段階で整える。"""

from __future__ import annotations

import re
import unicodedata

_FULLWIDTH_DIGITS = str.maketrans("０１２３４５６７８９", "0123456789")
_KANA_ONLY = re.compile(r"^[ぁ-ゖァ-ヺー]+$")
_PAGE_NUMBER = re.compile(r"^\s*[-－‐]?\s*[0-9０-９]{1,3}\s*[-－‐]?\s*$")


def halfwidth_digits(text: str) -> str:
    """全角数字だけを半角にする（括弧などはそのまま）。"""
    return text.translate(_FULLWIDTH_DIGITS)


def collapse_spaces(text: str) -> str:
    """字間の空白（「総 務」「本 村 賢 太 郎」）を取り除く。
    英数字の間の空白は 1 つに詰める。"""
    text = re.sub(r"[ 　\t]+", " ", text).strip()
    # 日本語文字（CJK・かな・記号）の前後の空白は字間として消す
    text = re.sub(r"(?<=[^\x00-\x7f]) (?=[^\x00-\x7f])", "", text)
    text = re.sub(r"(?<=[^\x00-\x7f]) (?=[0-9A-Za-z])", "", text)
    text = re.sub(r"(?<=[0-9A-Za-z]) (?=[^\x00-\x7f])", "", text)
    return text


def is_ruby_line(line: str) -> bool:
    """「もり」のような、漢字の読みだけの短い行（PDF のルビ）。"""
    stripped = line.strip()
    return 0 < len(stripped) <= 6 and bool(_KANA_ONLY.match(stripped))


def is_page_number_line(line: str) -> bool:
    return bool(_PAGE_NUMBER.match(line))


def _looks_like_ruby(lines: list[str], index: int) -> bool:
    """ルビは漢字の行の「上」に置かれるので、最後の行ではなく、次の行が漢字を含むときだけルビ扱い。
    折り返しの末尾（「…条例につい」「て」）を消さないための条件。"""
    if index >= len(lines) - 1:
        return False
    line = lines[index].strip()
    if not (0 < len(line) <= 4 and _KANA_ONLY.match(line)):
        return False
    following = lines[index + 1]
    return bool(re.search(r"[\u4e00-\u9fff]", following))


def join_wrapped_lines(lines: list[str]) -> str:
    """表のセルや段落で折り返された行を 1 本につなぐ。ルビ行は捨てる。"""
    kept = [
        collapse_spaces(line)
        for index, line in enumerate(lines)
        if not _looks_like_ruby(lines, index)
    ]
    return "".join(part for part in kept if part)


# CJK 部首補助（U+2E80〜）は NFKC で漢字に戻らないので、見かけることのあるものだけ手で対応づける
_RADICAL_SUPPLEMENT = str.maketrans({"⺠": "民", "⺟": "母", "⺾": "艹", "⻑": "長", "⻄": "西", "⻘": "青", "⻝": "食", "⻤": "鬼", "⻨": "麦", "⻩": "黄"})


def fix_radicals(text: str) -> str:
    """康熙部首・CJK 部首補助（⼀ ⽴ ⺠ など）を通常の漢字に戻す。
    フォント置換でこれらの符号が混ざった PDF がある。NFKC は括弧なども変えるので、この範囲だけに当てる。"""
    return "".join(
        unicodedata.normalize("NFKC", ch) if "\u2f00" <= ch <= "\u2fdf" else ch
        for ch in text.translate(_RADICAL_SUPPLEMENT)
    )


def normalize_key(text: str) -> str:
    """照合用。部首記号を漢字に戻し、NFKC 正規化のうえ、空白をすべて取り除く。"""
    return re.sub(r"\s+", "", unicodedata.normalize("NFKC", fix_radicals(text)))


def clean_title(raw: str) -> str:
    """件名の表示用文字列。折り返しをつなぎ、字間の空白とルビを除き、数字を半角にする。"""
    joined = join_wrapped_lines(raw.splitlines())
    return fix_radicals(halfwidth_digits(joined)).strip()


_ERA_BASE = {"令和": 2018, "平成": 1988, "昭和": 1925}
_ERA_DATE = re.compile(
    r"(令和|平成|昭和)\s*([0-9０-９]+|元)\s*年\s*([0-9０-９]+)\s*月\s*([0-9０-９]+)\s*日"
)
_ERA_YEAR = re.compile(r"(令和|平成|昭和)\s*([0-9０-９]+|元)\s*年")


def era_year_to_western(era: str, year_text: str) -> int:
    year = 1 if year_text == "元" else int(halfwidth_digits(year_text))
    return _ERA_BASE[era] + year


def parse_era_date(text: str) -> str | None:
    """「令和８年９月３０日」→ "2026-09-30"。見つからなければ None。"""
    match = _ERA_DATE.search(text)
    if not match:
        return None
    era, year, month, day = match.groups()
    western = era_year_to_western(era, year)
    return f"{western:04d}-{int(halfwidth_digits(month)):02d}-{int(halfwidth_digits(day)):02d}"


def parse_era_year(text: str) -> tuple[str, int] | None:
    """「令和８年…」→ ("令和8年", 2026)。"""
    match = _ERA_YEAR.search(text)
    if not match:
        return None
    era, year = match.groups()
    western = era_year_to_western(era, year)
    label_year = "元" if year == "元" else halfwidth_digits(year)
    return f"{era}{label_year}年", western


def strip_page_numbers(lines: list[str]) -> list[str]:
    """ページ下部のノンブル（数字だけの行）を落とす。"""
    return [line for line in lines if not is_page_number_line(line)]
