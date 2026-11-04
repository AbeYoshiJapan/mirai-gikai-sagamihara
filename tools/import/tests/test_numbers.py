from gikai_import.numbers import (
    NumberRef,
    carried_over_flags,
    category_hint,
    era_year_label,
    expand_label_ranges,
    is_materials_label,
    parse_number_label,
)


def test_parse_number_label_variants():
    assert parse_number_label("議案第９９号") == NumberRef("bill", 99)
    assert parse_number_label("陳情第 ７号") == NumberRef("petition", 7)
    assert parse_number_label("議提議案第８号") == NumberRef("member_bill", 8)
    assert parse_number_label("委員会提出議案第2号") == NumberRef("committee_bill", 2)
    assert parse_number_label("議案第１ １ ３ 号") == NumberRef("bill", 113)
    assert parse_number_label("議案第１１８号関係資料(その１)") == NumberRef("bill", 118)
    assert parse_number_label("―") is None
    assert parse_number_label("常任委員会委員の選任") is None


def test_is_materials_label():
    assert is_materials_label("議案第６５号関係資料")
    assert is_materials_label("議案第１１８号関係資料(その２)")
    assert not is_materials_label("議案第６５号")


def test_label_and_citation():
    ref = NumberRef("bill", 99)
    assert ref.label == "議案第99号"
    assert ref.citation(2026) == "令和8年議案第99号"
    assert ref.key(2026) == "2026:bill:99"
    assert era_year_label(2019) == "令和元年"
    assert era_year_label(2018) == "平成30年"


def test_expand_label_ranges():
    assert [r.number for r in expand_label_ranges("議案第100号～110号（特別会計・公営企業会計決算）")] == list(range(100, 111))
    assert [r.number for r in expand_label_ranges("議案第129号〜134号（人事）")] == [129, 130, 131, 132, 133, 134]
    assert [r.number for r in expand_label_ranges("陳情第7号〜14号、16号〜18号")] == [7, 8, 9, 10, 11, 12, 13, 14, 16, 17, 18]
    assert [r.number for r in expand_label_ranges("陳情第11号、4号〜6号")] == [11, 4, 5, 6]
    assert expand_label_ranges("委員会提出議案第1号〜第2号") == [NumberRef("committee_bill", 1), NumberRef("committee_bill", 2)]
    assert expand_label_ranges("議提議案第8号") == [NumberRef("member_bill", 8)]
    assert expand_label_ranges("議案第99号（一般会計決算）") == [NumberRef("bill", 99)]
    assert expand_label_ranges("令和８年定例会９月定例会議　付議事件一覧") == []


def test_category_hint():
    assert category_hint("議案第129号〜134号（人事）") == "人事"
    assert category_hint("議提議案第8号") is None


def test_carried_over_flags():
    refs = [NumberRef("petition", 11), NumberRef("petition", 4), NumberRef("petition", 5), NumberRef("bill", 65), None]
    assert carried_over_flags(refs) == [True, False, False, False, False]
    assert carried_over_flags([NumberRef("petition", 7), NumberRef("petition", 11)]) == [False, False]
