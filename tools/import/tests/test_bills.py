import pytest

from gikai_import.adapters.bills import parse_bill_collection, sanitize_petition_lines, segment_metadata, segment_to_document
from gikai_import.numbers import expand_label_ranges
from gikai_import.pdfs import ocr_available


def test_personnel_bills_split_per_page(fixtures):
    collection = parse_bill_collection(fixtures / "2026_gian_129-134.pdf", expected=expand_label_ranges("議案第129号〜134号（人事）"), ocr="never")
    assert not collection.is_book
    assert [s.number.label for s in collection.segments] == [f"議案第{n}号" for n in range(129, 135)]
    doc = segment_to_document(collection, collection.segments[0], url="https://example.com/x.pdf", file_name="2026_gian_129-134.pdf")
    assert doc.title == "教育委員会の委員の選任について"
    assert doc.pages == [1, 1]
    assert doc.text_quality == "text"
    assert doc.proposal_reason is not None and doc.proposal_reason.startswith("地方教育行政の組織及び運営に関する法律")
    submitted_on, proposers = segment_metadata(collection.segments[0])
    assert submitted_on == "2026-08-28"
    assert proposers == []


def test_ordinance_with_materials(fixtures):
    collection = parse_bill_collection(fixtures / "2026_gian_97.pdf", expected=expand_label_ranges("議案第97号（条例）"), ocr="never")
    [segment] = collection.segments
    assert segment.pages == [1]
    assert segment.material_pages == [2]
    doc = segment_to_document(collection, segment, url=None, file_name="2026_gian_97.pdf")
    assert doc.title == "相模原市立学校体育施設使用料条例の一部を改正する条例について"
    assert doc.materials_text is not None and "改正の概要" in doc.materials_text
    assert doc.pages == [1, 2]


def test_member_bill_proposers_and_date(fixtures):
    collection = parse_bill_collection(fixtures / "2026_gitei_5.pdf", expected=expand_label_ranges("議提議案第5号"), ocr="never")
    [segment] = collection.segments
    doc = segment_to_document(collection, segment, url=None, file_name="2026_gitei_5.pdf")
    assert doc.title == "折笠正治議員に対する議員辞職勧告決議"
    submitted_on, proposers = segment_metadata(segment)
    assert submitted_on == "2026-06-30"
    assert proposers[:2] == ["渡部俊明", "森繁之"]


def test_sanitize_petition_lines_drops_personal_info():
    lines = ["陳情の趣旨", "○○を求めます。", "陳情者 住所", "相模原市○○1-2-3", "氏名", "山田太郎", "電話 042-000-0000", "陳情理由", "理由です。"]
    assert sanitize_petition_lines(lines) == ["陳情の趣旨", "○○を求めます。", "陳情理由", "理由です。"]


@pytest.mark.skipif(not ocr_available(), reason="tesseract（jpn）が無いと OCR できない")
def test_scanned_petitions_are_split_with_ocr(fixtures):
    collection = parse_bill_collection(fixtures / "2026_tinjo_9_1920.pdf", expected=expand_label_ranges("陳情第19号、20号"), ocr="auto")
    assert [s.number.label for s in collection.segments] == ["陳情第19号", "陳情第20号"]
    doc = segment_to_document(collection, collection.segments[0], url=None, file_name="2026_tinjo_9_1920.pdf")
    assert doc.text_quality == "ocr"
    assert doc.title is None
    assert "生活保護" in doc.text
    assert "受理年月日" not in doc.text


def test_scanned_pdf_without_ocr_reports_none(fixtures, monkeypatch):
    monkeypatch.setattr("gikai_import.pdfs.ocr_available", lambda: False)
    collection = parse_bill_collection(fixtures / "2026_tinjo_9_1920.pdf", expected=expand_label_ranges("陳情第19号、20号"), ocr="auto")
    assert collection.segments[0].sources == {"none"}
