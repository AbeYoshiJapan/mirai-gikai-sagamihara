"""議案集・議提議案・委員会提出議案・陳情の PDF を、議案ごとの本文に分ける。

議案集（2026_gian_65-93.pdf など）は 1 議案ごとにページが改まり、先頭行が「議案第６５号」。
「議案第６５号関係資料」のページは改正の概要などで、解説生成の良い材料になるので別に持つ。
予算書・決算書（2026_gian_99.pdf など）は 1 冊の本で議案ごとの区切りが無いので、
番号ごとに同じ PDF を資料として付け、本文は冒頭だけを持つ（text_quality = "book"）。
陳情はスキャン PDF のことが多く、OCR して「陳情番号 第 N 号」で分ける。
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path

from ..model import DocumentText
from ..numbers import NumberRef, is_materials_label, parse_number_label
from ..pdfs import OcrMode, PageText, extract_pages, file_sha256
from ..text import (
    clean_title,
    collapse_spaces,
    halfwidth_digits,
    normalize_key,
    parse_era_date,
    strip_page_numbers,
)

# 解説生成のプロンプトに渡せる上限（packages/shared の MAX_SOURCE_TEXT_CHARS と同じ）
MAX_TEXT_CHARS = 60_000
# 予算書・決算書のような本は、冒頭のこのページ数・文字数だけ本文に残す（番号ごとに複製されるため小さめに）
BOOK_HEAD_PAGES = 30
BOOK_MAX_TEXT_CHARS = 20_000
# 先頭にこれ以上のページがあり、番号の見出しが 1 つも無ければ「本」とみなす
BOOK_MIN_PAGES = 10

_SUBMITTED_RE = re.compile(r"((?:令和|平成)\s*[0-9０-９元]+\s*年\s*[0-9０-９]+\s*月\s*[0-9０-９]+\s*日)\s*提出")
_PROPOSER_RE = re.compile(r"^\s*(?:提出者|賛成者)\s*(?:相模原市議会議員)?\s*(.+?)\s*$")
_MAYOR_RE = re.compile(r"^\s*相模原市長\s*(.+?)\s*$")
_REASON_RE = re.compile(r"^\s*提\s*案\s*(?:の)?\s*理\s*由\s*$")
_PETITION_NUMBER_RE = re.compile(r"第\s*([0-9０-９]+)\s*号")
_PETITION_SECTION_RE = re.compile(r"^(陳情の趣旨|陳情の趣旨及び理由|陳情事項|陳情の項目|陳情理由|陳情の理由)")
# 陳情者の個人情報が並ぶ行。本文には要らないので捨てる
_PERSONAL_RE = re.compile(
    r"(陳情者|請願者|提出者|代表者|住\s*所|氏\s*名|電\s*話|ＴＥＬ|TEL|〒|受理年月日|受理番号|陳情番号)"
)
_GARBAGE_CHARS = re.compile(r"[^\w\s、。，．・（）()「」『』〔〕［］【】《》〈〉―－ー～〜:：;；!！?？%％/／]")


@dataclass
class Segment:
    """PDF の中の 1 議案分。"""

    number: NumberRef | None
    pages: list[int] = field(default_factory=list)
    material_pages: list[int] = field(default_factory=list)
    lines: list[str] = field(default_factory=list)
    material_lines: list[str] = field(default_factory=list)
    sources: set[str] = field(default_factory=set)


@dataclass
class BillCollection:
    path: str
    sha256: str
    page_count: int
    is_book: bool
    segments: list[Segment]
    warnings: list[str] = field(default_factory=list)


def _page_lines(page: PageText) -> list[str]:
    return strip_page_numbers(page.lines)


def _is_number_only_line(line: str) -> NumberRef | None:
    """「議案第６５号」だけの行（後ろに件名が続いていない）。"""
    ref = parse_number_label(line)
    if ref is None:
        return None
    rest = normalize_key(line)[len(normalize_key(ref.label)) :]
    # 「議案第１ １ ３ 号」は正規化で空白が消えるので rest は空になる
    return ref if rest == "" else None


_PETITION_FORM_RE = re.compile(r"^.{0,3}情番号")


def _petition_start(lines: list[str]) -> tuple[bool, NumberRef | None]:
    """陳情の様式の先頭「陳情番号 件 名 / 第 4 号 / 受理年月日 …」。
    OCR で「陳情番号」が崩れても様式の見出しなら区切りとみなし、番号が読めなければ None。"""
    head = normalize_key("".join(lines[:4]))
    if not _PETITION_FORM_RE.match(head):
        return False, None
    match = _PETITION_NUMBER_RE.search(head[:40])
    if not match:
        return True, None
    return True, NumberRef("petition", int(halfwidth_digits(match.group(1))))


def _segment_pages(pages: list[PageText]) -> tuple[list[Segment], bool]:
    """ページを番号の見出しで区切る。戻り値の bool は「本」かどうか。"""
    segments: list[Segment] = []
    current: Segment | None = None
    found_start = False

    for page in pages:
        lines = _page_lines(page)
        first = lines[0] if lines else ""
        materials_of = None
        start_ref = None
        is_start = False
        if lines:
            if is_materials_label(first):
                materials_of = parse_number_label(first)
            else:
                start_ref = _is_number_only_line(first)
                is_start = start_ref is not None
                if not is_start:
                    is_start, start_ref = _petition_start(lines)

        if materials_of is not None:
            found_start = True
            target = current
            if target is None or (target.number is not None and target.number != materials_of):
                # 関係資料だけ別の議案のものなら、その議案の区分を探す
                target = next((s for s in segments if s.number == materials_of), None)
            if target is None:
                target = Segment(number=materials_of)
                segments.append(target)
                current = target
            target.material_pages.append(page.number)
            target.material_lines.extend(lines[1:])
            target.sources.add(page.source)
            continue

        if is_start:
            found_start = True
            current = Segment(number=start_ref)
            segments.append(current)
            body = lines[1:] if _is_number_only_line(first) else lines
            current.pages.append(page.number)
            current.lines.extend(body)
            current.sources.add(page.source)
            continue

        if current is None:
            current = Segment(number=None)
            segments.append(current)
        current.pages.append(page.number)
        current.lines.extend(lines)
        current.sources.add(page.source)

    is_book = not found_start and len(pages) >= BOOK_MIN_PAGES
    return segments, is_book


def _assign_missing_numbers(segments: list[Segment], expected: list[NumberRef]) -> list[str]:
    """番号を読めなかった区分に、リンク文字列から分かる番号を順に当てる。"""
    warnings: list[str] = []
    detected = {s.number for s in segments if s.number is not None}
    remaining = [ref for ref in expected if ref not in detected]
    for segment in segments:
        if segment.number is None and remaining:
            segment.number = remaining.pop(0)
            warnings.append(
                f"{segment.number.label}: 番号の見出しが読めず、リンクの順番から推定しました (p.{segment.pages[:1]})"
            )
    if remaining:
        warnings.append("PDF の中に見つからなかった番号: " + ", ".join(r.label for r in remaining))
    return warnings


def _unbalanced_parens(text: str) -> bool:
    opened = text.count("(") + text.count("（")
    closed = text.count(")") + text.count("）")
    return opened > closed


def _title_complete(text: str) -> bool:
    key = normalize_key(text)
    if _unbalanced_parens(key):
        return False
    return bool(re.search(r"(について|意見書|決議)", key)) or bool(
        re.search(r"(条例|予算|決算|規則)$", key)
    )


def _extract_title(lines: list[str]) -> str | None:
    """番号の次の行が件名。括弧が閉じていない・「…について」が無いときは次の行もつなぐ（最大 3 行）。"""
    if not lines:
        return None
    title_lines = [lines[0]]
    for candidate in lines[1:3]:
        if _title_complete("".join(title_lines)):
            # 「…する条例」で行が終わり、次の行が「について」だけのこともある
            tail = normalize_key(candidate)
            if re.fullmatch(r"(について|ついて|いて|て)", tail):
                title_lines.append(candidate)
            break
        if re.match(r"^\s*(次の|上記|令和|平成|相模原市長|提出者|地方自治法)", candidate):
            break
        title_lines.append(candidate)
    return clean_title("\n".join(title_lines)) or None


def _extract_submitted_on(lines: list[str]) -> str | None:
    """「令和８年５月２９日提出」。市長提出は冒頭、議員提出は末尾にあるので全行を見る。"""
    for line in lines:
        match = _SUBMITTED_RE.search(normalize_key(line))
        if match:
            return parse_era_date(match.group(1))
    return None


def _extract_proposers(lines: list[str]) -> list[str]:
    """「提出者 相模原市議会議員 ○○」「提出者 相模原市議会議会運営委員会委員長 ○○」。"""
    proposers: list[str] = []
    for line in lines:
        match = _PROPOSER_RE.match(line)
        if not match:
            continue
        name = collapse_spaces(match.group(1))
        if name and name not in proposers:
            proposers.append(name)
    return proposers


def _extract_reason(lines: list[str]) -> str | None:
    for index, line in enumerate(lines):
        if _REASON_RE.match(line):
            reason = " ".join(l.strip() for l in lines[index + 1 :])
            reason = re.sub(r"\s+", "", reason)
            return reason or None
    return None


def _is_garbage(line: str) -> bool:
    """OCR のノイズ行（記号ばかり）。"""
    stripped = line.strip()
    if len(stripped) < 4:
        return False
    bad = len(_GARBAGE_CHARS.findall(stripped))
    return bad / len(stripped) > 0.3


def _drop_petition_form_header(lines: list[str]) -> list[str]:
    """様式の見出し（陳情番号・受理年月日・折り返した件名）を落とし、「陳情の趣旨」から始める。
    文字層と OCR で見出しが二重になるので、冒頭 12 行のうち最後の節見出しから始める。
    見出しが OCR で崩れていて見つからなければそのまま。"""
    start = None
    for index, line in enumerate(lines[:12]):
        key = normalize_key(line)
        if len(key) <= 14 and _PETITION_SECTION_RE.search(key):
            start = index
    return lines[start:] if start is not None else lines


def sanitize_petition_lines(lines: list[str]) -> list[str]:
    """陳情書から、陳情者の住所・氏名などの行とノイズ行を落とす。"""
    kept: list[str] = []
    skip_next = False
    for line in lines:
        if skip_next:
            skip_next = False
            continue
        if _PERSONAL_RE.search(line) and not _PETITION_SECTION_RE.match(normalize_key(line)):
            # 「住所」「氏名」の見出しの次の行に値が来る様式に備え、次の行も捨てる
            skip_next = bool(re.search(r"(住\s*所|氏\s*名)\s*$", line))
            continue
        if _is_garbage(line):
            continue
        kept.append(line)
    return kept


def _join_text(lines: list[str]) -> str:
    cleaned = [re.sub(r"[ 　\t]+", " ", line).strip() for line in lines]
    return "\n".join(line for line in cleaned if line)


def _cap(text: str, limit: int = MAX_TEXT_CHARS) -> tuple[str, bool]:
    if len(text) <= limit:
        return text, False
    return text[:limit], True


def _quality(sources: set[str]) -> str:
    if not sources or sources == {"none"}:
        return "none"
    if sources == {"text"}:
        return "text"
    if sources == {"ocr"}:
        return "ocr"
    return "mixed"


def parse_bill_collection(
    path: str | Path,
    *,
    expected: list[NumberRef] | None = None,
    ocr: OcrMode = "auto",
) -> BillCollection:
    pages = extract_pages(path, ocr=ocr)
    segments, is_book = _segment_pages(pages)
    warnings: list[str] = []

    if is_book:
        # 予算書・決算書。番号ごとの区切りは無いので区分は 1 つだけにし、呼び出し側で番号ごとに複製する
        head = [line for page in pages[:BOOK_HEAD_PAGES] for line in _page_lines(page)]
        segments = [
            Segment(
                number=None,
                pages=[p.number for p in pages],
                lines=head,
                sources={p.source for p in pages[:BOOK_HEAD_PAGES]},
            )
        ]
    elif expected:
        warnings.extend(_assign_missing_numbers(segments, expected))

    for segment in segments:
        if segment.number is not None and segment.number.kind == "petition":
            segment.lines = sanitize_petition_lines(_drop_petition_form_header(segment.lines))

    return BillCollection(
        path=str(path),
        sha256=file_sha256(path),
        page_count=len(pages),
        is_book=is_book,
        segments=segments,
        warnings=warnings,
    )


def segment_to_document(
    collection: BillCollection,
    segment: Segment,
    *,
    url: str | None,
    file_name: str,
) -> DocumentText:
    lines = segment.lines
    is_petition = segment.number is not None and segment.number.kind == "petition"
    # 陳情の件名は様式の OCR が不安定なので持たない（付議事件一覧の件名を使う）
    title = None if is_petition else _extract_title(lines)

    text, truncated = _cap(
        _join_text(lines), BOOK_MAX_TEXT_CHARS if collection.is_book else MAX_TEXT_CHARS
    )
    materials = _join_text(segment.material_lines) or None
    pages = (
        [min(segment.pages + segment.material_pages), max(segment.pages + segment.material_pages)]
        if (segment.pages or segment.material_pages)
        else None
    )
    return DocumentText(
        url=url,
        file=file_name,
        pages=pages,
        title=title,
        text=text,
        text_quality="book" if collection.is_book else _quality(segment.sources),
        proposal_reason=None if (is_petition or collection.is_book) else _extract_reason(lines),
        materials_text=materials,
        sha256=collection.sha256,
        truncated=truncated,
    )


def segment_metadata(segment: Segment) -> tuple[str | None, list[str]]:
    """(提出日, 提出者の議員名)。"""
    return _extract_submitted_on(segment.lines), _extract_proposers(segment.lines)
