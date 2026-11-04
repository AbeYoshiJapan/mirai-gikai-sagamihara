"""件名と番号の種類から、サイトの議案区分（bill_kind）と提出者区分（proposer_kind）を推定する。
推定なので、管理画面の取込プレビューで確認・修正できる前提。"""

from __future__ import annotations

from .text import normalize_key

PROPOSER_KIND_BY_NUMBER_KIND = {
    "bill": "mayor",
    "member_bill": "member",
    "committee_bill": "committee",
    "petition": "citizen",
    "request": "citizen",
}

# 件名に含まれる語 → bill_kind。上から順に当てる
_MAYOR_RULES: list[tuple[tuple[str, ...], str]] = [
    (("決算",), "settlement"),
    (("補正予算", "予算"), "budget"),
    (("専決処分",), "senketsu"),
    (("条例",), "ordinance"),
    (("選任", "任命", "推薦", "人事"), "personnel"),
    (("市道の認定", "市道の廃止", "市道の変更"), "road"),
    (("動産の取得", "財産の取得", "財産の処分", "不動産", "指定管理者"), "property"),
    (("工事請負契約", "契約の締結", "契約の変更", "契約について", "事業契約", "委託"), "contract"),
]


def infer_bill_kind(number_kind: str, name: str, hint: str | None = None) -> str:
    """
    - 陳情 → citizen_petition、請願 → petition
    - 議提議案・委員会提出議案 → 条例なら ordinance、意見書なら opinion、決議なら resolution、それ以外は member_bill
    - 市長提出の議案 → 件名の語で判定（決算・予算・専決処分・条例・人事・市道・財産・契約）、残りは other
    """
    if number_kind == "petition":
        return "citizen_petition"
    if number_kind == "request":
        return "petition"

    key = normalize_key(name)
    if number_kind in ("member_bill", "committee_bill"):
        if "意見書" in key:
            return "opinion"
        if "決議" in key:
            return "resolution"
        if "条例" in key:
            return "ordinance"
        return "member_bill"

    for words, kind in _MAYOR_RULES:
        if any(word in key for word in words):
            return kind
    if hint:
        hint_key = normalize_key(hint)
        if "補正予算" in hint_key or "予算" in hint_key:
            return "budget"
        if "決算" in hint_key:
            return "settlement"
        if "条例" in hint_key:
            return "ordinance"
        if "人事" in hint_key:
            return "personnel"
        if "専決" in hint_key:
            return "senketsu"
    return "other"


def infer_proposer_kind(number_kind: str) -> str:
    return PROPOSER_KIND_BY_NUMBER_KIND.get(number_kind, "mayor")


# 所管委員会の略称 → 正式名。付議事件一覧の表記（字間の空白を除いたもの）
COMMITTEE_NAMES: dict[str, str] = {
    "総務": "総務委員会",
    "民生": "民生委員会",
    "市民環境経済": "市民環境経済委員会",
    "建設": "建設委員会",
    "こども文教": "こども文教委員会",
    "議会運営": "議会運営委員会",
    "議運": "議会運営委員会",
    "予算特別": "予算特別委員会",
    "決算特別": "決算特別委員会",
}


def committee_full_name(short: str) -> str:
    """「総務」→「総務委員会」。既に「委員会」で終わればそのまま。"""
    key = normalize_key(short)
    if key in COMMITTEE_NAMES:
        return COMMITTEE_NAMES[key]
    if key.endswith("委員会"):
        return key
    return key


def is_known_committee(text: str) -> bool:
    key = normalize_key(text)
    return key in COMMITTEE_NAMES or key.endswith("委員会") or key.endswith("分科会")
