"""付議事件一覧 PDF（例: 2026_hugi_0930.pdf）の解析。

表の列は「番号 / 件名 / 所管委員会」。見出しに会議名と「○月○日現在」がある。
「※」が付いた行は「今回の追加分」。前の会議から継続審査になった陳情は番号順から外れて先頭に並ぶ。
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path

import pdfplumber

from ..classify import committee_full_name, infer_bill_kind, infer_proposer_kind, is_known_committee
from ..numbers import NumberRef, carried_over_flags, parse_number_label
from ..text import clean_title, collapse_spaces, normalize_key
from ..meeting import meeting_year_of, parse_meeting_header
from ..model import ImportItem, Meeting

_ADDED_RE = re.compile(r"^\s*※\s*(.+)$")
_SUBCOMMITTEE_RE = re.compile(r"[（(]?([^（）()]+分科会)[）)]?")


@dataclass
class AgendaRow:
    number: NumberRef | None
    raw_number: str
    name: str
    committees: list[str] = field(default_factory=list)
    subcommittees: list[str] = field(default_factory=list)
    added_this_time: bool = False
    carried_over: bool = False
    page: int = 0


@dataclass
class AgendaList:
    meeting: Meeting
    rows: list[AgendaRow]
    warnings: list[str] = field(default_factory=list)

    @property
    def numbered_rows(self) -> list[AgendaRow]:
        return [row for row in self.rows if row.number is not None]


def parse_committee_cell(cell: str | None) -> tuple[list[str], list[str]]:
    """「決算特別⏎（民生分科会）」「民 生⏎市民環境経済⏎建 設」「―」→ (委員会, 分科会)。"""
    if not cell:
        return [], []
    committees: list[str] = []
    subcommittees: list[str] = []
    pending = ""
    for raw_line in cell.splitlines():
        line = normalize_key(raw_line)
        if not line or line in {"―", "-", "－", "—"}:
            continue
        line = pending + line
        pending = ""
        sub = _SUBCOMMITTEE_RE.fullmatch(line)
        if sub:
            subcommittees.append(sub.group(1))
            continue
        if not is_known_committee(line):
            # 「こども文⏎教」のように折り返されていれば次の行とつなぐ
            pending = line
            continue
        name = committee_full_name(line)
        if name not in committees:
            committees.append(name)
    if pending:
        name = committee_full_name(pending)
        if name not in committees:
            committees.append(name)
    return committees, subcommittees


def _added_labels(page_text: str) -> set[str]:
    """ページ本文で「※」の後ろに続く番号表記（表のセルには出ない）。"""
    labels: set[str] = set()
    for line in page_text.splitlines():
        match = _ADDED_RE.match(line)
        if not match:
            continue
        ref = parse_number_label(match.group(1))
        if ref:
            labels.add(ref.label)
    return labels


def _mark_carried_over(rows: list[AgendaRow]) -> None:
    """同じ種類の中で、後ろにより小さい番号があるものは前の年からの継続分。"""
    for row, flag in zip(rows, carried_over_flags([row.number for row in rows]), strict=True):
        row.carried_over = flag


def parse_agenda_pdf(path: str | Path) -> AgendaList:
    rows: list[AgendaRow] = []
    warnings: list[str] = []
    meeting = Meeting()
    added: set[str] = set()

    with pdfplumber.open(str(path)) as pdf:
        for page_index, page in enumerate(pdf.pages):
            page_text = page.extract_text() or ""
            if page_index == 0:
                meeting = parse_meeting_header(page_text)
            added |= _added_labels(page_text)
            for table in page.extract_tables():
                for cells in table:
                    if len(cells) < 2:
                        continue
                    raw_number = (cells[0] or "").strip()
                    raw_name = cells[1] or ""
                    committee_cell = cells[2] if len(cells) > 2 else None
                    if normalize_key(raw_number) in {"番号", ""} and normalize_key(raw_name) in {
                        "件名",
                        "",
                    }:
                        continue
                    number = parse_number_label(raw_number)
                    name = clean_title(raw_name)
                    if not name:
                        continue
                    committees, subcommittees = parse_committee_cell(committee_cell)
                    rows.append(
                        AgendaRow(
                            number=number,
                            raw_number=collapse_spaces(raw_number),
                            name=name,
                            committees=committees,
                            subcommittees=subcommittees,
                            page=page_index + 1,
                        )
                    )

    if meeting.council_year is None:
        warnings.append("見出しから会期の年を読めませんでした（手で指定してください）")
    if not rows:
        warnings.append("表を読めませんでした（PDF の書式が変わった可能性）")

    for row in rows:
        if row.number is not None and row.number.label in added:
            row.added_this_time = True
    _mark_carried_over(rows)
    return AgendaList(meeting=meeting, rows=rows, warnings=warnings)


def number_year_of(meeting: Meeting) -> int | None:
    """番号が属する暦年。議案・陳情の番号は暦年ごとに振り直されるので、
    会議の年（3 月定例会議は前年の定例会に属するが番号は新年のもの）を使う。"""
    return meeting_year_of(meeting)


def agenda_rows_to_items(agenda: AgendaList, number_year: int) -> list[ImportItem]:
    """付議事件一覧の行を取込 JSON の items にする（議案書の本文は別途足す）。
    継続分（前の年の番号）は number_year - 1 の番号として扱う。"""
    items: list[ImportItem] = []
    for row in agenda.rows:
        if row.number is None:
            # 「常任委員会委員の選任」など番号のない議事は取り込まない
            continue
        bill_kind = infer_bill_kind(row.number.kind, row.name)
        year = number_year - 1 if row.carried_over else number_year
        items.append(
            ImportItem(
                key=row.number.key(year),
                kind=row.number.kind,
                number=row.number.number,
                number_label=row.number.label,
                number_year=year,
                citation=row.number.citation(year),
                name=row.name,
                bill_kind=bill_kind,
                proposer_kind=infer_proposer_kind(row.number.kind),
                committees=list(row.committees),
                subcommittees=list(row.subcommittees),
                added_this_time=row.added_this_time,
                carried_over=row.carried_over,
            )
        )
    return items
