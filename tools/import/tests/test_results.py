from gikai_import.adapters.results import map_result, parse_decided_on, parse_results_pdf, results_to_import


def test_map_result():
    assert map_result("可決（賛成多数）") == ("passed", "majority")
    assert map_result("認定（賛成総員）") == ("approved", "unanimous")
    assert map_result("不採択（賛成少数）") == ("not_adopted", "minority")
    assert map_result("採択") == ("adopted", None)
    assert map_result("継続審査") == ("continued", None)
    assert map_result("撤回") == ("withdrawn", None)
    assert map_result("同意") == ("consented", None)
    assert map_result("") == (None, None)


def test_parse_decided_on():
    assert parse_decided_on("令和８年９月３０日", None) == "2026-09-30"
    assert parse_decided_on("９月３０日", 2026) == "2026-09-30"
    assert parse_decided_on("9/30", 2026) == "2026-09-30"
    assert parse_decided_on("9/30", None) is None


def test_synthetic_results_pdf(fixtures):
    """合成した見本。本物の審議結果 PDF が手に入ったら差し替えて確かめること。"""
    results = parse_results_pdf(fixtures / "synthetic_kekka.pdf")
    assert results.warnings == []
    assert results.meeting.as_of == "2026-09-30"
    items = results_to_import(results, 2026)
    by_citation = {i.citation: i for i in items}
    assert by_citation["令和8年議案第99号"].result == "approved"
    assert by_citation["令和8年議案第126号"].committees == ["民生委員会", "市民環境経済委員会", "建設委員会"]
    assert by_citation["令和8年議案第126号"].decided_on == "2026-09-01"
    # 継続の陳情第11号は前年の番号
    assert by_citation["令和7年陳情第11号"].result == "continued"
    assert by_citation["令和8年陳情第7号"].vote_outcome == "minority"
    assert by_citation["令和8年陳情第15号"].result == "withdrawn"
