import pytest

from gikai_import.classify import committee_full_name, infer_bill_kind, infer_proposer_kind


@pytest.mark.parametrize(
    ("kind", "name", "expected"),
    [
        ("bill", "令和7年度相模原市一般会計歳入歳出決算", "settlement"),
        ("bill", "令和8年度相模原市一般会計補正予算（第2号）", "budget"),
        ("bill", "専決処分の承認について（相模原市市税条例等の一部を改正する条例）", "senketsu"),
        ("bill", "相模原市手数料条例の一部を改正する条例について", "ordinance"),
        ("bill", "教育委員会の委員の選任について", "personnel"),
        ("bill", "人権擁護委員の候補者の推薦について", "personnel"),
        ("bill", "市道の認定について", "road"),
        ("bill", "動産の取得について（救助工作車Ⅲ型）", "property"),
        ("bill", "指定管理者の指定について（相模原市立北市民健康文化センター）", "property"),
        ("bill", "工事請負契約について（南清掃工場基幹的設備改良工事）", "contract"),
        ("bill", "相互救済事業の委託について", "contract"),
        ("bill", "損害賠償額の決定について", "other"),
        ("member_bill", "地方財政の充実・強化を求める意見書", "opinion"),
        ("member_bill", "折笠正治議員に対する議員辞職勧告決議", "resolution"),
        ("member_bill", "相模原市ケアラー条例について", "ordinance"),
        ("committee_bill", "相模原市議会会議規則の一部を改正する規則について", "member_bill"),
        ("petition", "伊勢山公園の植樹を求めることについて", "citizen_petition"),
        ("request", "何かを求める請願", "petition"),
    ],
)
def test_infer_bill_kind(kind, name, expected):
    assert infer_bill_kind(kind, name) == expected


def test_infer_bill_kind_uses_hint_when_name_is_vague():
    assert infer_bill_kind("bill", "何かについて", "補正予算") == "budget"


def test_infer_proposer_kind():
    assert infer_proposer_kind("bill") == "mayor"
    assert infer_proposer_kind("member_bill") == "member"
    assert infer_proposer_kind("committee_bill") == "committee"
    assert infer_proposer_kind("petition") == "citizen"


def test_committee_full_name():
    assert committee_full_name("総 務") == "総務委員会"
    assert committee_full_name("決算特別") == "決算特別委員会"
    assert committee_full_name("基地対策特別委員会") == "基地対策特別委員会"
