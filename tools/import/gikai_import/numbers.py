"""議案番号（「議案第９９号」「陳情第 ７号」「委員会提出議案第1号〜第2号」）の解釈。"""

from __future__ import annotations

import re
from collections.abc import Sequence
from dataclasses import dataclass

from .text import halfwidth_digits, normalize_key

# 長い接頭辞から順に照合する（「議案」が「議提議案」「委員会提出議案」に含まれるため）
KIND_PREFIXES: list[tuple[str, str]] = [
    ("committee_bill", "委員会提出議案"),
    ("member_bill", "議提議案"),
    ("bill", "議案"),
    ("petition", "陳情"),
    ("request", "請願"),
]
PREFIX_BY_KIND = {kind: prefix for kind, prefix in KIND_PREFIXES}
KIND_LABELS = {
    "bill": "議案",
    "member_bill": "議提議案",
    "committee_bill": "委員会提出議案",
    "petition": "陳情",
    "request": "請願",
}

_PREFIX_ALTERNATION = "|".join(prefix for _, prefix in KIND_PREFIXES)
_LABEL_RE = re.compile(rf"^\s*({_PREFIX_ALTERNATION})\s*第\s*([0-9０-９]+)\s*号")
_NUMBER_TOKEN_RE = re.compile(
    r"(?:第\s*)?([0-9０-９]+)\s*号(?:\s*[～〜~－\-]\s*(?:第\s*)?([0-9０-９]+)\s*号)?"
)
_HINT_RE = re.compile(r"[（(]([^）)]+)[）)]")


@dataclass(frozen=True)
class NumberRef:
    kind: str
    number: int

    @property
    def label(self) -> str:
        """正規化した番号表記（半角数字・空白なし）。DB の bill_number にはこれを入れる。"""
        return f"{PREFIX_BY_KIND[self.kind]}第{self.number}号"

    def key(self, number_year: int) -> str:
        return f"{number_year}:{self.kind}:{self.number}"

    def citation(self, number_year: int) -> str:
        """「令和8年議案第99号」。番号の年を元号で前置した正式な呼び方。"""
        return f"{era_year_label(number_year)}{self.label}"


def era_year_label(western_year: int) -> str:
    """西暦 → 「令和8年」（2019 年以降は令和、それ以前は平成）。"""
    if western_year >= 2019:
        year = western_year - 2018
        return "令和元年" if year == 1 else f"令和{year}年"
    year = western_year - 1988
    return "平成元年" if year == 1 else f"平成{year}年"


def kind_from_prefix(prefix: str) -> str | None:
    for kind, candidate in KIND_PREFIXES:
        if candidate == prefix:
            return kind
    return None


def parse_number_label(text: str) -> NumberRef | None:
    """行頭の「議案第９９号」「陳情第 ７号」「議案第１ １ ３ 号」などを読む。
    番号表記でなければ None。"""
    compact = normalize_key(text)
    match = _LABEL_RE.match(compact)
    if not match:
        return None
    kind = kind_from_prefix(match.group(1))
    if kind is None:
        return None
    return NumberRef(kind, int(halfwidth_digits(match.group(2))))


def is_materials_label(text: str) -> bool:
    """「議案第６５号関係資料」「議案第１１８号関係資料(その１)」のような関係資料の見出し。"""
    compact = normalize_key(text)
    return bool(_LABEL_RE.match(compact)) and "関係資料" in compact


def expand_label_ranges(link_text: str) -> list[NumberRef]:
    """議会サイトのリンク文字列「議案第100号～110号（特別会計…）」
    「陳情第7号〜14号、16号〜18号」「委員会提出議案第1号〜第2号」を番号の一覧にする。"""
    compact = normalize_key(link_text)
    match = re.match(rf"^({_PREFIX_ALTERNATION})", compact)
    if not match:
        return []
    kind = kind_from_prefix(match.group(1))
    if kind is None:
        return []
    rest = compact[match.end() :]
    # 括弧内の種別ヒントは番号ではないので外す
    rest = _HINT_RE.sub("", rest)
    refs: list[NumberRef] = []
    for start_text, end_text in _NUMBER_TOKEN_RE.findall(rest):
        start = int(halfwidth_digits(start_text))
        end = int(halfwidth_digits(end_text)) if end_text else start
        if end < start:
            start, end = end, start
        for number in range(start, end + 1):
            ref = NumberRef(kind, number)
            if ref not in refs:
                refs.append(ref)
    return refs


def category_hint(link_text: str) -> str | None:
    """リンク文字列の括弧内（「（条例）」「（補正予算）」「（人事）」）。"""
    match = _HINT_RE.search(normalize_key(link_text))
    if not match:
        return None
    hint = match.group(1).strip()
    return hint or None


def carried_over_flags(refs: Sequence[NumberRef | None]) -> list[bool]:
    """一覧の並びから「前の年から継続している番号」を見つける。
    同じ種類の中で、後ろにより小さい番号があるものは継続分（例: 陳情第11号, 第4号, 第5号 → 第11号が継続）。"""
    flags = [False] * len(refs)
    by_kind: dict[str, list[int]] = {}
    for index, ref in enumerate(refs):
        if ref is not None:
            by_kind.setdefault(ref.kind, []).append(index)
    for indexes in by_kind.values():
        for position, index in enumerate(indexes):
            ref = refs[index]
            assert ref is not None
            later = [refs[j].number for j in indexes[position + 1 :] if refs[j] is not None]  # type: ignore[union-attr]
            if later and ref.number > min(later):
                flags[index] = True
    return flags
