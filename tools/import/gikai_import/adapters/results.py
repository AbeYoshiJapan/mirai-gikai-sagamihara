"""審議結果 PDF（例: 2026_kekka_9_0930.pdf）の解析。

表の列は「番号 / 件名 / 付託委員会 / 議決日 / 議決結果」の並びを想定し、見出し行の語で列を探す。
結果の語（可決・否決・認定・同意・採択・不採択・継続審査・撤回・承認）と採決区分
（賛成総員・賛成多数・賛成少数）をサイトの語彙に写す。

注意: 見本の PDF を手元で確かめていないため、列の名前や日付の書き方が違えば
見出し行の語（_COLUMN_WORDS）を直すこと。
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path

import pdfplumber

from ..meeting import parse_meeting_header
from .agenda import parse_committee_cell
from ..model import ImportResult, Meeting
from ..numbers import NumberRef, carried_over_flags, parse_number_label
from ..text import clean_title, halfwidth_digits, normalize_key, parse_era_date

_COLUMN_WORDS: dict[str, tuple[str, ...]] = {
    "number": ("番号",),
    "name": ("件名",),
    "committee": ("委員会", "付託"),
    "decided_on": ("議決日", "議決年月日", "議決月日", "年月日", "月日"),
    "result": ("結果", "議決"),
}

# 結果の語 → サイトの語彙。長い語（不採択）を先に当てる
_RESULT_WORDS: list[tuple[str, str]] = [
    ("不採択", "not_adopted"),
    ("採択", "adopted"),
    ("継続", "continued"),
    ("撤回", "withdrawn"),
    ("取り下げ", "withdrawn"),
    ("取下げ", "withdrawn"),
    ("可決", "passed"),
    ("否決", "rejected"),
    ("認定", "approved"),
    ("承認", "approved"),
    ("同意", "consented"),
    ("異議なし", "consented"),
]
_VOTE_WORDS: list[tuple[str, str]] = [
    ("賛成総員", "unanimous"),
    ("全員", "unanimous"),
    ("賛成多数", "majority"),
    ("賛成少数", "minority"),
]
_MONTH_DAY_RE = re.compile(r"([0-9０-９]{1,2})\s*[/／月]\s*([0-9０-９]{1,2})\s*日?")


@dataclass
class ResultRow:
    number: NumberRef | None
    raw_number: str
    name: str
    committees: list[str]
    decided_on: str | None
    result: str | None
    vote_outcome: str | None
    raw_result: str
    page: int


@dataclass
class ResultsList:
    meeting: Meeting
    rows: list[ResultRow]
    warnings: list[str] = field(default_factory=list)


def map_result(raw: str) -> tuple[str | None, str | None]:
    """「可決（賛成多数）」→ ("passed", "majority")。"""
    key = normalize_key(raw)
    result = next((value for word, value in _RESULT_WORDS if word in key), None)
    vote = next((value for word, value in _VOTE_WORDS if word in key), None)
    if result is None and not key:
        return None, None
    return result, vote


def parse_decided_on(raw: str, year: int | None) -> str | None:
    """「令和８年９月３０日」「9/30」「９月３０日」。年が無ければ year（会議の年）を使う。"""
    key = normalize_key(raw)
    full = parse_era_date(key)
    if full:
        return full
    match = _MONTH_DAY_RE.search(key)
    if match and year:
        month = int(halfwidth_digits(match.group(1)))
        day = int(halfwidth_digits(match.group(2)))
        return f"{year:04d}-{month:02d}-{day:02d}"
    return None


def _column_map(header: list[str | None]) -> dict[str, int] | None:
    mapping: dict[str, int] = {}
    for index, cell in enumerate(header):
        key = normalize_key(cell or "")
        if not key:
            continue
        for column, words in _COLUMN_WORDS.items():
            if column in mapping:
                continue
            if any(word in key for word in words):
                # 「議決日」は result の「議決」にも当たるので、decided_on を優先する
                if column == "result" and any(w in key for w in _COLUMN_WORDS["decided_on"]):
                    continue
                mapping[column] = index
                break
    if "number" in mapping and "name" in mapping:
        return mapping
    return None


def parse_results_pdf(path: str | Path, *, year: int | None = None) -> ResultsList:
    rows: list[ResultRow] = []
    warnings: list[str] = []
    meeting = Meeting()
    columns: dict[str, int] | None = None

    with pdfplumber.open(str(path)) as pdf:
        for page_index, page in enumerate(pdf.pages):
            text = page.extract_text() or ""
            if page_index == 0:
                meeting = parse_meeting_header(text)
            for table in page.extract_tables():
                for cells in table:
                    if not cells or all(not (c or "").strip() for c in cells):
                        continue
                    header = _column_map(cells)
                    if header:
                        columns = header
                        continue
                    if columns is None:
                        continue
                    raw_number = (cells[columns["number"]] or "").strip()
                    number = parse_number_label(raw_number)
                    name = clean_title(cells[columns["name"]] or "")
                    if number is None and not name:
                        continue
                    committee_cell = cells[columns["committee"]] if "committee" in columns else None
                    committees, _subcommittees = parse_committee_cell(committee_cell)
                    decided_raw = cells[columns["decided_on"]] if "decided_on" in columns else ""
                    result_raw = cells[columns["result"]] if "result" in columns else ""
                    result, vote = map_result(result_raw or "")
                    rows.append(
                        ResultRow(
                            number=number,
                            raw_number=raw_number,
                            name=name,
                            committees=committees,
                            decided_on=parse_decided_on(decided_raw or "", year or meeting.council_year),
                            result=result,
                            vote_outcome=vote,
                            raw_result=normalize_key(result_raw or ""),
                            page=page_index + 1,
                        )
                    )

    if columns is None:
        warnings.append("見出し行（番号・件名…）が見つからず、表を読めませんでした")
    unmapped = [row.raw_number for row in rows if row.number is not None and row.result is None]
    if unmapped:
        warnings.append("結果の語を解釈できなかった行: " + ", ".join(unmapped[:10]))
    return ResultsList(meeting=meeting, rows=rows, warnings=warnings)


def results_to_import(results: ResultsList, number_year: int) -> list[ImportResult]:
    """継続分（前の年の番号）は number_year - 1 の番号として扱う（付議事件一覧と同じ規則）。"""
    items: list[ImportResult] = []
    flags = carried_over_flags([row.number for row in results.rows])
    for row, carried in zip(results.rows, flags, strict=True):
        if row.number is None:
            continue
        year = number_year - 1 if carried else number_year
        items.append(
            ImportResult(
                key=row.number.key(year),
                kind=row.number.kind,
                number=row.number.number,
                number_label=row.number.label,
                number_year=year,
                citation=row.number.citation(year),
                name=row.name,
                committees=row.committees,
                decided_on=row.decided_on,
                result=row.result,
                vote_outcome=row.vote_outcome,
                raw_result=row.raw_result,
                warnings=[] if row.result else ["結果の語を解釈できませんでした"],
            )
        )
    return items
