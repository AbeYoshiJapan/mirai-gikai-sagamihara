from gikai_import.text import (
    clean_title,
    collapse_spaces,
    fix_radicals,
    halfwidth_digits,
    join_wrapped_lines,
    normalize_key,
    parse_era_date,
    parse_era_year,
)


def test_halfwidth_digits():
    assert halfwidth_digits("議案第９９号") == "議案第99号"


def test_collapse_spaces_removes_letter_spacing():
    assert collapse_spaces("総   務") == "総務"
    assert collapse_spaces("本 村 賢 太 郎") == "本村賢太郎"
    assert collapse_spaces("DX に対応") == "DXに対応"
    # 英数字どうしの空白は 1 つ残す
    assert collapse_spaces("Noto  Sans") == "Noto Sans"


def test_join_wrapped_lines_keeps_trailing_kana():
    # 折り返しの末尾「て」はルビではない
    assert join_wrapped_lines(["…条例の一部を改正する条例につい", "て"]) == "…条例の一部を改正する条例について"


def test_join_wrapped_lines_drops_ruby_above_kanji():
    assert join_wrapped_lines(["もり", "相模原市立杜のホールはしもと条例"]) == "相模原市立杜のホールはしもと条例"


def test_clean_title():
    assert clean_title("令和８年度相模原市一般会計補正予算（第２号）") == "令和8年度相模原市一般会計補正予算（第2号）"


def test_normalize_key():
    assert normalize_key("議案第１ １ ３ 号") == "議案第113号"
    assert normalize_key("こども文教") == "こども文教"


def test_fix_radicals():
    assert fix_radicals("⼀般会計 ⺠生 ９⽉") == "一般会計 民生 ９月"


def test_parse_era_date():
    assert parse_era_date("令和８年９月３０日現在") == "2026-09-30"
    assert parse_era_date("令和元年5月1日") == "2019-05-01"
    assert parse_era_date("日付なし") is None


def test_parse_era_year():
    assert parse_era_year("令和８年相模原市議会定例会") == ("令和8年", 2026)
    assert parse_era_year("平成31年") == ("平成31年", 2019)
