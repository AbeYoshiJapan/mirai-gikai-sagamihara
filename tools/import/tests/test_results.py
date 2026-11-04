from dataclasses import asdict

from gikai_import.adapters.results import map_result, parse_decided_on, parse_results_pdf, results_to_import
from gikai_import.meeting import meeting_year_of
from snapshot import assert_snapshot


def test_map_result():
    assert map_result("可決（賛成多数）") == ("passed", "majority")
    assert map_result("認 定\n（賛成総員）") == ("approved", "unanimous")
    assert map_result("不 採 択\n（賛成少数）") == ("not_adopted", "minority")
    assert map_result("不採択（賛成なし）") == ("not_adopted", "minority")
    assert map_result("採択") == ("adopted", None)
    assert map_result("継続審査") == ("continued", None)
    assert map_result("撤回") == ("withdrawn", None)
    assert map_result("同 意（賛成総員）") == ("consented", "unanimous")
    assert map_result("") == (None, None)


def test_parse_decided_on():
    assert parse_decided_on("令和８年９月３０日", None) == "2026-09-30"
    assert parse_decided_on("９月３０日", 2026) == "2026-09-30"
    assert parse_decided_on("9月1日", 2026) == "2026-09-01"
    assert parse_decided_on("9/30", 2026) == "2026-09-30"
    assert parse_decided_on("9/30", None) is None


def test_september_results(fixtures, snapshots):
    results = parse_results_pdf(fixtures / "2026_kekka_9_0930.pdf")
    assert results.warnings == []
    assert results.meeting.label == "9月定例会議"
    assert meeting_year_of(results.meeting) == 2026
    items = results_to_import(results, 2026)
    assert len(items) == 50
    by_citation = {i.citation: i for i in items}
    assert by_citation["令和8年議案第99号"].result == "approved"
    assert by_citation["令和8年議案第99号"].vote_outcome == "majority"
    assert by_citation["令和8年議案第99号"].committees == ["決算特別委員会"]
    assert by_citation["令和8年議案第116号"].decided_on == "2026-08-24"
    assert by_citation["令和8年議案第126号"].committees == ["民生委員会", "市民環境経済委員会", "建設委員会"]
    assert by_citation["令和8年議案第126号"].decided_on == "2026-09-01"
    assert by_citation["令和8年議案第129号"].result == "consented"
    assert by_citation["令和8年議案第129号"].committees == []
    assert by_citation["令和8年陳情第9号"].result == "adopted"
    assert by_citation["令和8年陳情第7号"].vote_outcome == "minority"
    # 9 月の陳情第11号は令和8年の新しい陳情（前年からの継続ではない）
    assert "令和8年陳情第11号" in by_citation
    assert all(i.result is not None for i in items)
    assert_snapshot(snapshots / "results_2026_09.json", [asdict(i) for i in items])


def test_june_results_marks_carried_over_petition_and_no_votes(fixtures):
    results = parse_results_pdf(fixtures / "2026_kekka_6_0701-1.pdf")
    assert results.warnings == []
    items = results_to_import(results, meeting_year_of(results.meeting) or 0)
    by_citation = {i.citation: i for i in items}
    assert len(items) == 41
    # 前年から継続していた陳情第11号は令和7年の番号として採択
    assert by_citation["令和7年陳情第11号"].result == "adopted"
    assert by_citation["令和8年陳情第4号"].result == "adopted"
    # 「賛成なし」は賛成少数に寄せ、原文は残す
    none_in_favor = by_citation["令和8年陳情第5号"]
    assert none_in_favor.result == "not_adopted"
    assert none_in_favor.vote_outcome == "minority"
    assert "賛成なし" in none_in_favor.raw_result
    assert by_citation["令和8年議提議案第5号"].decided_on == "2026-06-30"
    # ルビ行「もり」が件名に混ざらない
    assert by_citation["令和8年議案第77号"].name == "相模原市立杜のホールはしもと条例の一部を改正する条例について"
