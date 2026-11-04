import json

from gikai_import.model import FORMAT
from gikai_import.pipeline import DocumentInput, build_agenda_bundle, build_results_bundle


def test_bundle_attaches_documents_and_reports_missing(fixtures):
    bundle = build_agenda_bundle(
        fixtures / "2026_hugi_0930.pdf",
        [DocumentInput(path=fixtures / "2026_gian_129-134.pdf", label="議案第129号〜134号（人事）", url="https://example.com/2026_gian_129-134.pdf")],
        source_url="https://example.com/page",
        agenda_url="https://example.com/2026_hugi_0930.pdf",
        ocr="never",
    )
    data = bundle.to_dict()
    assert data["format"] == FORMAT
    assert data["source"]["adapter"] == "sagamihara_agenda_pdf"
    assert [f["name"] for f in data["files"]] if "files" in data else True
    assert len(data["source"]["files"]) == 2
    items = {i["citation"]: i for i in data["items"]}
    personnel = items["令和8年議案第129号"]
    assert personnel["document"]["url"] == "https://example.com/2026_gian_129-134.pdf"
    assert personnel["document"]["text_quality"] == "text"
    assert personnel["submitted_on"] == "2026-08-28"
    assert items["令和8年議案第99号"]["document"] is None
    assert any("議案書の無い項目" in w for w in data["warnings"])
    # JSON にできる
    json.dumps(data, ensure_ascii=False)


def test_results_bundle(fixtures):
    bundle = build_results_bundle(fixtures / "synthetic_kekka.pdf", results_url="https://example.com/kekka.pdf")
    data = bundle.to_dict()
    assert data["source"]["adapter"] == "sagamihara_results_pdf"
    assert len(data["results"]) == 9
    assert data["results"][0]["citation"] == "令和8年議案第99号"
