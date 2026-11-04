from dataclasses import asdict

from gikai_import.adapters.agenda import agenda_rows_to_items, number_year_of, parse_agenda_pdf, parse_committee_cell
from snapshot import assert_snapshot


def test_parse_committee_cell():
    assert parse_committee_cell("決算特別\n（民生分科会）") == (["決算特別委員会"], ["民生分科会"])
    assert parse_committee_cell("民 生\n市民環境経済\n建 設") == (
        ["民生委員会", "市民環境経済委員会", "建設委員会"],
        [],
    )
    assert parse_committee_cell("―") == ([], [])
    assert parse_committee_cell("こども文\n教") == (["こども文教委員会"], [])


def test_september_agenda(fixtures, snapshots):
    agenda = parse_agenda_pdf(fixtures / "2026_hugi_0930.pdf")
    assert agenda.warnings == []
    assert agenda.meeting.council_year == 2026
    assert agenda.meeting.label == "9月定例会議"
    assert agenda.meeting.as_of == "2026-09-30"
    items = agenda_rows_to_items(agenda, number_year_of(agenda.meeting))
    assert len(items) == 52
    first = items[0]
    assert first.citation == "令和8年議案第99号"
    assert first.bill_kind == "settlement"
    assert first.committees == ["決算特別委員会"]
    assert len(first.subcommittees) == 5
    added = [i.number_label for i in items if i.added_this_time]
    assert added == ["議提議案第8号", "陳情第19号", "陳情第20号"]
    assert_snapshot(snapshots / "agenda_2026_09.json", [asdict(i) for i in items])


def test_june_agenda_marks_carried_over_petition(fixtures, snapshots):
    """6 月の一覧は Firefox で印刷された PDF（別の作り）。前年から継続の陳情第11号は令和7年の番号になる。"""
    agenda = parse_agenda_pdf(fixtures / "2026_hugi_0701.pdf")
    items = agenda_rows_to_items(agenda, number_year_of(agenda.meeting))
    assert agenda.meeting.label == "6月定例会議"
    petitions = [i for i in items if i.kind == "petition"]
    assert [p.citation for p in petitions] == ["令和7年陳情第11号", "令和8年陳情第4号", "令和8年陳情第5号", "令和8年陳情第6号"]
    assert petitions[0].carried_over is True
    # ルビ行「もり」が件名に混ざらない
    assert any(i.name == "相模原市立杜のホールはしもと条例の一部を改正する条例について" for i in items)
    assert_snapshot(snapshots / "agenda_2026_06.json", [asdict(i) for i in items])


def test_extra_session_agenda_skips_unnumbered_rows(fixtures):
    agenda = parse_agenda_pdf(fixtures / "2026_hugi_0521-2.pdf")
    assert agenda.meeting.label == "第1回臨時会議"
    assert len(agenda.rows) == 6
    items = agenda_rows_to_items(agenda, number_year_of(agenda.meeting))
    assert [i.citation for i in items] == [
        "令和8年委員会提出議案第1号",
        "令和8年委員会提出議案第2号",
        "令和8年議案第63号",
        "令和8年議案第64号",
    ]
    assert items[0].proposer_kind == "committee"
    assert items[2].added_this_time is True
