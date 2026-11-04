"""付議事件一覧と議案書 PDF を 1 つの取込 JSON（ImportBundle）にまとめる。"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from pathlib import Path

from .adapters.agenda import agenda_rows_to_items, number_year_of, parse_agenda_pdf
from .adapters.bills import parse_bill_collection, segment_metadata, segment_to_document
from .adapters.results import parse_results_pdf, results_to_import
from .meeting import meeting_year_of
from .model import ImportBundle, ImportItem, SourceFile
from .numbers import NumberRef, expand_label_ranges
from .pdfs import OcrMode, file_sha256, page_count

log = logging.getLogger(__name__)

ADAPTER_AGENDA = "sagamihara_agenda_pdf"
ADAPTER_RESULTS = "sagamihara_results_pdf"


@dataclass
class DocumentInput:
    """議案書 PDF の指定。label はサイトのリンク文字列（番号の範囲が分かる）。"""

    path: Path
    label: str
    url: str | None = None


def build_agenda_bundle(
    agenda_pdf: Path,
    documents: list[DocumentInput],
    *,
    source_url: str | None = None,
    agenda_url: str | None = None,
    ocr: OcrMode = "auto",
    number_year: int | None = None,
) -> ImportBundle:
    agenda = parse_agenda_pdf(agenda_pdf)
    year = number_year or number_year_of(agenda.meeting)
    if year is None:
        raise ValueError("番号の年が分かりません。--number-year を指定してください")

    bundle = ImportBundle(adapter=ADAPTER_AGENDA, source_url=source_url, meeting=agenda.meeting)
    bundle.warnings.extend(agenda.warnings)
    bundle.files.append(
        SourceFile(
            name=agenda_pdf.name,
            url=agenda_url,
            sha256=file_sha256(agenda_pdf),
            pages=page_count(agenda_pdf),
            label="付議事件一覧",
        )
    )
    bundle.items = agenda_rows_to_items(agenda, year)
    by_number: dict[tuple[str, int], ImportItem] = {(i.kind, i.number): i for i in bundle.items}

    for document in documents:
        expected = expand_label_ranges(document.label)
        if not expected:
            bundle.warnings.append(f"{document.path.name}: リンク文字列から番号を読めません ({document.label})")
            continue
        log.info("議案書を読み込み: %s (%s)", document.path.name, document.label)
        collection = parse_bill_collection(document.path, expected=expected, ocr=ocr)
        bundle.warnings.extend(f"{document.path.name}: {w}" for w in collection.warnings)
        bundle.files.append(
            SourceFile(
                name=document.path.name,
                url=document.url,
                sha256=collection.sha256,
                pages=collection.page_count,
                label=document.label,
            )
        )
        if collection.is_book:
            # 予算書・決算書は番号ごとに同じ資料を付ける
            segment = collection.segments[0]
            for ref in expected:
                _attach(by_number, ref, bundle, collection, segment, document)
            continue
        for segment in collection.segments:
            if segment.number is None:
                bundle.warnings.append(
                    f"{document.path.name}: 番号の分からない部分があります (p.{segment.pages[:1]})"
                )
                continue
            _attach(by_number, segment.number, bundle, collection, segment, document)

    missing = [i.citation for i in bundle.items if i.document is None and i.kind != "request"]
    if missing:
        bundle.warnings.append("議案書の無い項目: " + ", ".join(missing))
    return bundle


def _attach(by_number, ref: NumberRef, bundle: ImportBundle, collection, segment, document: DocumentInput) -> None:  # noqa: ANN001
    item = by_number.get((ref.kind, ref.number))
    doc = segment_to_document(collection, segment, url=document.url, file_name=document.path.name)
    if item is None:
        bundle.warnings.append(f"{document.path.name}: {ref.label} は付議事件一覧に無いので本文だけ読み飛ばしました")
        return
    if item.document is not None:
        item.warnings.append(f"議案書が複数あります（{item.document.file} と {document.path.name}）")
    item.document = doc
    submitted_on, proposers = segment_metadata(segment)
    if submitted_on and not collection.is_book:
        item.submitted_on = submitted_on
    if proposers:
        item.proposers = proposers
    if collection.is_book:
        item.warnings.append("予算書・決算書のため本文は冒頭だけです。必要なら解説生成時に補足を貼ってください")
    elif doc.text_quality in ("ocr", "mixed"):
        item.warnings.append("本文は OCR なので誤字があります")
    elif doc.text_quality == "none":
        item.warnings.append("本文の文字を取り出せませんでした（スキャン PDF。OCR には tesseract が必要）")


def build_results_bundle(
    results_pdf: Path,
    *,
    source_url: str | None = None,
    results_url: str | None = None,
    number_year: int | None = None,
) -> ImportBundle:
    results = parse_results_pdf(results_pdf, year=number_year)
    year = number_year or meeting_year_of(results.meeting)
    if year is None:
        raise ValueError("番号の年が分かりません。--number-year を指定してください")
    bundle = ImportBundle(adapter=ADAPTER_RESULTS, source_url=source_url, meeting=results.meeting)
    bundle.warnings.extend(results.warnings)
    bundle.files.append(
        SourceFile(
            name=results_pdf.name,
            url=results_url,
            sha256=file_sha256(results_pdf),
            pages=page_count(results_pdf),
            label="審議結果",
        )
    )
    bundle.results = results_to_import(results, year)
    return bundle
