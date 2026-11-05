# -*- coding: utf-8 -*-
"""さがみはら市議会ナウ！（旧 みらい議会＠相模原市）ロゴ・画像案のアートボードと、素材 SVG を生成する。"""
import json
import os
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.abspath(__file__))
PROJ = os.path.join(ROOT, "project")
ASSETS = os.path.join(ROOT, "assets")
os.makedirs(PROJ, exist_ok=True)
os.makedirs(ASSETS, exist_ok=True)

FONT_LINK = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@500;700;900&amp;display=swap">'
FONT = "'Noto Sans JP', 'Noto Sans CJK JP', 'Hiragino Sans', 'Yu Gothic', sans-serif"
INK = "#1f2933"
MUTED = "#5b6670"
LINE = "#e3e7ea"
# シート（見本）に入れるサイト名。実際の画像には文字を入れない（ヘッダー・OGP は設定の文字を描く）
SITE_NAME = "さがみはら市議会ナウ！"
SITE_TAGLINE = "議案に意見！議会をもっと身近に。"
SITE_DESCRIPTION = "いま審議されている議案・審議の結果・請願と陳情の案内"

PLANS = [
    {
        "id": "A",
        "key": "kakehashi",
        "adopted": True,
        "no": "案1",
        "name": "かけはし",
        "motif": "吹き出しの中の橋（相模川にかかる橋）",
        "concept": "市民と議会のあいだに「橋をかける」。吹き出しは対話、アーチは相模川の橋。",
        "tone": ["さわやか", "信頼感", "公共的"],
        "fit": "一番クセがなく、どの年代にも安心して見せられる。市政情報らしい落ち着きがほしいときに。",
        "primary": "#1a78a0",
        "accent": "#15607f",
        "g1": "#b7e3f0",
        "g2": "#e8f6fa",
        "sub": "#f6a84c",  # アクセント少量（朝日）
    },
    {
        "id": "B",
        "key": "ajisai",
        "adopted": True,
        "no": "案2",
        "name": "あじさい",
        "motif": "あじさいの小花の集まり（市の花）",
        "concept": "小さな花（ひとりひとりの声）が集まってひとつの花になる。相模原らしさを静かに。",
        "tone": ["やわらかい", "相模原らしい", "季節感"],
        "fit": "親しみやすさを一番出せる。女性・若い世代にも届きやすい一方、花のモチーフは「軽い」と感じる人もいるので、色数を絞って使う。",
        "primary": "#5660b5",
        "accent": "#434a94",
        "g1": "#d3d7f5",
        "g2": "#f0f2fc",
        "sub": "#3b8452",  # 葉の緑
    },
    {
        "id": "C",
        "key": "keyaki",
        "adopted": False,
        "no": "案3",
        "name": "けやき",
        "motif": "けやきの木（市の木）",
        "concept": "根を張り、木陰をつくる木。議会の議論を「みんなが集まれる木陰」として見せる。",
        "tone": ["あたたかい", "地に足がついた", "明るい"],
        "fit": "暖色で明るいが、落ち着いた柿色なので軽く見えない。木は世代を問わず好感度が高く、朝市など地域活動との相性もよい。",
        "primary": "#b05f1c",
        "accent": "#8a4d14",
        "g1": "#fbdcb8",
        "g2": "#fff4e8",
        "sub": "#e9b35c",  # 朝日の黄（少量）
    },
    {
        "id": "D",
        "key": "gakudo",
        "adopted": True,
        "no": "案4",
        "name": "咢堂さくら",
        "motif": "演壇に立つ人の影と桜（尾崎咢堂・ワシントンの桜）",
        "concept": "相模原（旧津久井郡又野）が生んだ「憲政の神様」尾崎咢堂。演壇に立つ人の影と、咢堂が贈った桜で「言葉で政治をつくる」を表す。",
        "tone": ["凛とした", "品がある", "歴史を感じる"],
        "fit": "式典・記念行事の時期や、議会の歴史を語るときに。藍鼠の主色で引き締め、桜は差し色だけに留めて軽く見せない。",
        "primary": "#44507a",
        "accent": "#2f3a63",
        "g1": "#f7d4dc",
        "g2": "#fdf3f5",
        "sub": "#e89bb0",  # 桜色（画像の中だけ）
        "quote": "人生の本舞台は常に将来に在り ― 尾崎咢堂",
    },
    {
        "id": "E",
        "key": "ginga",
        "adopted": True,
        "no": "案5",
        "name": "ぎんが",
        "motif": "人工衛星・小惑星・ロケット・星々（JAXA 相模原キャンパス、銀河連邦）",
        "concept": "宇宙科学のまち相模原。星空に浮かぶ探査機と小惑星、打ち上がるロケットで「遠くを見る・未来を考える」を表す。",
        "tone": ["わくわく", "未来志向", "子どもにも"],
        "fit": "子ども向けの企画や科学・教育の話題が多い時期に。UI は紺の 1 色で落ち着かせ、星空は OGP と帯の中だけにする。",
        "primary": "#2b3f9e",
        "accent": "#1d2c70",
        "g1": "#c9d3f6",
        "g2": "#eef1fb",
        "sub": "#f2c94c",  # 星の黄（画像の中だけ）
        "dark": True,
        "sky": "#0f1a3f",
    },
]


# ---------------------------------------------------------------- marks
def mark_svg(p, size=(40, 36), variant="light", label=None, extra_attr=""):
    """ロゴマーク（viewBox 40×36）。variant: light=白地用 / tile=プライマリ地用"""
    w, h = size
    P, A, G1, G2, S = p["primary"], p["accent"], p["g1"], p["g2"], p["sub"]
    label = label or p["name"]
    head = (
        f'<svg viewBox="0 0 40 36" width="{w}" height="{h}" role="img" '
        f'aria-label="{label}" xmlns="http://www.w3.org/2000/svg" {extra_attr}>'
    )
    if p["id"] == "A":
        if variant == "light":
            bubble, bridge, wave = P, "#ffffff", G1
        else:
            bubble, bridge, wave = "#ffffff", P, G1
        body = (
            f'<rect x="1" y="1" width="38" height="29" rx="9" fill="{bubble}"/>'
            f'<path d="M23 30h9l-4.5 5.5z" fill="{bubble}"/>'
            f'<path d="M5 12H35" stroke="{bridge}" stroke-width="3" stroke-linecap="round"/>'
            f'<path d="M6 24C8 14 18 14 20 24M20 24C22 14 32 14 34 24" fill="none" stroke="{bridge}" stroke-width="2.6" stroke-linecap="round"/>'
            f'<path d="M7 27.5c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0 4 1.5 6 0 2-1.5 2-1.5" fill="none" stroke="{wave}" stroke-width="2" stroke-linecap="round"/>'
        )
    elif p["id"] == "B":
        if variant == "light":
            big, small, center, leaf = P, "#8a92d6", "#ffffff", S
        else:
            big, small, center, leaf = "#ffffff", G1, P, "#bfe3c8"
        petal = "M0 -8C3 -8 4.6 -4 0 0C-4.6 -4 -3 -8 0 -8Z"

        def floret(cx, cy, s, fill):
            return (
                f'<g transform="translate({cx} {cy}) scale({s})" fill="{fill}">'
                f'<path d="{petal}"/>'
                f'<path d="{petal}" transform="rotate(90)"/>'
                f'<path d="{petal}" transform="rotate(180)"/>'
                f'<path d="{petal}" transform="rotate(270)"/>'
                f'<circle r="1.7" fill="{center}"/>'
                f"</g>"
            )

        body = (
            f'<path d="M4 31.5C7.5 26.5 15 26.5 17 31.5C13.5 34.5 7 34.5 4 31.5Z" fill="{leaf}"/>'
            + floret(20, 14, 1.0, big)
            + floret(9.5, 24.5, 0.62, small)
            + floret(30.5, 24.5, 0.62, small)
        )
    elif p["id"] == "D":
        if variant == "light":
            bg, fig, petal = P, "#ffffff", S
        else:
            bg, fig, petal = "#ffffff", P, S
        body = (
            f'<rect x="1" y="1" width="38" height="34" rx="10" fill="{bg}"/>'
            f'<circle cx="18" cy="11.5" r="4.4" fill="{fig}"/>'
            f'<path d="M10.5 24C11 18.5 25 18.5 25.5 24Z" fill="{fig}"/>'
            f'<path d="M7 33.5L9.5 23H26.5L29 33.5Z" fill="{fig}"/>'
            f'<path d="M9.5 23H26.5" stroke="{bg}" stroke-width="1.6" stroke-linecap="round"/>'
            f'<g transform="translate(31.5 9.5)" fill="{petal}"><path d="{SAKURA}"/><circle r="1" fill="{bg}"/></g>'
        )
    elif p["id"] == "E":
        if variant == "light":
            bg, body_c, panel, star = P, "#ffffff", G1, "#ffffff"
        else:
            bg, body_c, panel, star = "#ffffff", P, G1, P
        body = (
            f'<rect x="1" y="1" width="38" height="34" rx="10" fill="{bg}"/>'
            f'<circle cx="8.5" cy="8.5" r="1.6" fill="{star}"/>'
            f'<circle cx="31" cy="6.5" r="1.1" fill="{star}"/>'
            f'<circle cx="33.5" cy="27" r="1.3" fill="{star}"/>'
            f'<circle cx="7" cy="27.5" r="1" fill="{star}"/>'
            f'<path d="M27 11.5l1 2.2 2.2 1-2.2 1-1 2.2-1-2.2-2.2-1 2.2-1z" fill="{star}"/>'
            f'<rect x="4" y="16.5" width="9" height="5" rx="1.2" fill="{panel}"/>'
            f'<rect x="27" y="16.5" width="9" height="5" rx="1.2" fill="{panel}"/>'
            f'<rect x="15" y="14" width="10" height="10" rx="2" fill="{body_c}"/>'
            f'<path d="M20 14V10.5" stroke="{body_c}" stroke-width="1.6" stroke-linecap="round"/>'
            f'<circle cx="20" cy="10" r="1.3" fill="{body_c}"/>'
            f'<rect x="18" y="24" width="4" height="3" rx="1" fill="{panel}"/>'
        )
    else:  # C けやき
        if variant == "light":
            canopy, trunk, ground = P, A, G1
        else:
            canopy, trunk, ground = "#ffffff", G1, "#ffffff"
        body = (
            f'<circle cx="20" cy="12" r="9.5" fill="{canopy}"/>'
            f'<circle cx="11" cy="17.5" r="7.5" fill="{canopy}"/>'
            f'<circle cx="29" cy="17.5" r="7.5" fill="{canopy}"/>'
            f'<circle cx="20" cy="19" r="8.5" fill="{canopy}"/>'
            f'<rect x="18.2" y="22" width="3.6" height="12" rx="1.6" fill="{trunk}"/>'
            f'<path d="M12 34.5h16" stroke="{ground}" stroke-width="2" stroke-linecap="round"/>'
        )
    return head + body + "</svg>"


def icon_svg(p, size=512, standalone=False):
    """ホーム画面・favicon 用：プライマリのタイルに白いマーク"""
    P = p["primary"]
    r = round(size * 0.22)
    inner = mark_svg(p, (round(size * 0.66), round(size * 0.594)), "tile")
    # 中央配置：外側 svg に埋め込む
    ox = round((size - size * 0.66) / 2)
    oy = round((size - size * 0.594) / 2)
    xmlns = ' xmlns="http://www.w3.org/2000/svg"' if standalone else ""
    return (
        f'<svg viewBox="0 0 {size} {size}" width="{size}" height="{size}" role="img" aria-label="{p["name"]}のアイコン"{xmlns}>'
        f'<rect width="{size}" height="{size}" rx="{r}" fill="{P}"/>'
        f'<g transform="translate({ox} {oy})">{inner}</g>'
        f"</svg>"
    )


SAKURA = "M0 -5.2C1.8 -5.2 2.8 -3.6 2.2 -2.2C3.8 -2.6 5.2 -1.4 5 0.4C3.6 0.2 2.6 1.4 2.8 2.9C1.4 2.6 0.6 1.6 0 0.6C-0.6 1.6 -1.4 2.6 -2.8 2.9C-2.6 1.4 -3.6 0.2 -5 0.4C-5.2 -1.4 -3.8 -2.6 -2.2 -2.2C-2.8 -3.6 -1.8 -5.2 0 -5.2Z"
PETAL = "M0 -4C2.4 -4 3.4 -1.6 2.6 0.8C1.8 2.6 0.8 3.6 0 4C-0.8 3.6 -1.8 2.6 -2.6 0.8C-3.4 -1.6 -2.4 -4 0 -4Z"


def sakura(cx, cy, s, fill, center="#ffffff", opacity=1, rot=0):
    return (
        f'<g transform="translate({cx} {cy}) rotate({rot}) scale({s})" opacity="{opacity}">'
        f'<path d="{SAKURA}" fill="{fill}"/><circle r="1" fill="{center}"/></g>'
    )


def petal(cx, cy, s, fill, opacity=1, rot=0):
    return (
        f'<path d="{PETAL}" transform="translate({cx} {cy}) rotate({rot}) scale({s})" fill="{fill}" opacity="{opacity}"/>'
    )


def speaker(cx, cy, s, fill):
    """演壇に立つ人の影（頭・肩・演壇）。cx, cy は演壇の底の中央"""
    return (
        f'<g transform="translate({cx} {cy}) scale({s})" fill="{fill}">'
        f'<circle cx="0" cy="-23" r="4.6"/>'
        f'<path d="M-8 -10C-7.5 -15.5 7.5 -15.5 8 -10Z"/>'
        f'<path d="M-11 0L-8.5 -10H8.5L11 0Z"/>'
        f"</g>"
    )


def star4(cx, cy, s, fill, opacity=1):
    return (
        f'<path d="M0 -4l1.1 2.9L4 0l-2.9 1.1L0 4l-1.1-2.9L-4 0l2.9-1.1z" transform="translate({cx} {cy}) scale({s})" fill="{fill}" opacity="{opacity}"/>'
    )


def starfield(points, fill="#ffffff"):
    return "".join(
        f'<circle cx="{x}" cy="{y}" r="{r}" fill="{fill}" opacity="{o}"/>' for x, y, r, o in points
    )


def satellite(cx, cy, s, body, panel):
    """探査機（本体＋両翼の太陽電池パネル＋アンテナ）。cx, cy は本体の中心"""
    return (
        f'<g transform="translate({cx} {cy}) scale({s})">'
        f'<rect x="-30" y="-6" width="22" height="12" rx="2" fill="{panel}"/>'
        f'<rect x="8" y="-6" width="22" height="12" rx="2" fill="{panel}"/>'
        f'<rect x="-8" y="-8" width="16" height="16" rx="3" fill="{body}"/>'
        f'<path d="M0 -8V-15" stroke="{body}" stroke-width="2.4" stroke-linecap="round"/>'
        f'<circle cx="0" cy="-16" r="2.2" fill="{body}"/>'
        f'<rect x="-3" y="8" width="6" height="4" rx="1.5" fill="{panel}"/>'
        f"</g>"
    )


def asteroid(cx, cy, s, fill, crater):
    """小惑星（イトカワのような細長い形）"""
    return (
        f'<g transform="translate({cx} {cy}) scale({s})">'
        f'<path d="M-60 -6C-52 -30 -10 -36 20 -28C44 -22 62 -8 56 10C50 26 20 34 -6 30C-34 26 -66 16 -60 -6Z" fill="{fill}"/>'
        f'<circle cx="-24" cy="2" r="7" fill="{crater}"/><circle cx="14" cy="-10" r="5" fill="{crater}"/><circle cx="26" cy="12" r="4" fill="{crater}"/>'
        f"</g>"
    )


def rocket(cx, cy, s, body, fin, flame):
    """上向きのロケット。cx, cy は機体の中心"""
    return (
        f'<g transform="translate({cx} {cy}) scale({s})">'
        f'<path d="M0 -34C10 -24 12 -4 10 14H-10C-12 -4 -10 -24 0 -34Z" fill="{body}"/>'
        f'<path d="M-10 4L-20 18L-10 14Z" fill="{fin}"/><path d="M10 4L20 18L10 14Z" fill="{fin}"/>'
        f'<circle cx="0" cy="-10" r="4" fill="{fin}"/>'
        f'<path d="M-5 14C-3 24 3 24 5 14Z" fill="{flame}"/>'
        f"</g>"
    )


# ---------------------------------------------------------------- OGP
def ogp_svg(p, width=1200, height=630, scale=1.0, text=True):
    """OGP 画像。text=False なら背景（地色・モチーフ・下の帯）だけで、ロゴと文字を入れない。
    同梱する ogp-bg.png は text=False。文字は web の /api/og/site が設定から描く。"""
    P, A, G1, G2, S = p["primary"], p["accent"], p["g1"], p["g2"], p["sub"]
    W, H = width, height
    # 右側のモチーフ
    if p["id"] == "A":
        arches = "".join(
            f'<path d="M{x} 470C{x+16} 372 {x+184} 372 {x+200} 470" fill="none" stroke="{G1}" stroke-width="20" stroke-linecap="round"/>'
            for x in (660, 860, 1060)
        )
        motif = (
            f'<path d="M640 352H1260" stroke="{G1}" stroke-width="26" stroke-linecap="round"/>'
            f"{arches}"
            f'<path d="M640 520c40-30 80-30 120 0s80 30 120 0 80-30 120 0 80 30 120 0 80-30 120 0" fill="none" stroke="{P}" stroke-width="12" stroke-linecap="round" opacity="0.3"/>'
            f'<path d="M700 566c40-30 80-30 120 0s80 30 120 0 80-30 120 0 80 30 120 0" fill="none" stroke="{P}" stroke-width="12" stroke-linecap="round" opacity="0.16"/>'
        )
    elif p["id"] == "B":
        hpetal = "M0 -8C3 -8 4.6 -4 0 0C-4.6 -4 -3 -8 0 -8Z"

        def fl(cx, cy, s, fill, op):
            return (
                f'<g transform="translate({cx} {cy}) scale({s})" fill="{fill}" opacity="{op}">'
                f'<path d="{hpetal}"/><path d="{hpetal}" transform="rotate(90)"/>'
                f'<path d="{hpetal}" transform="rotate(180)"/><path d="{hpetal}" transform="rotate(270)"/>'
                f'<circle r="1.7" fill="#ffffff"/></g>'
            )

        motif = (
            fl(900, 250, 14, G1, 1)
            + fl(1040, 380, 9, G1, 1)
            + fl(780, 400, 8, G1, 1)
            + fl(1010, 170, 6, G1, 0.9)
            + fl(860, 520, 6, G1, 0.9)
            + fl(1120, 540, 5, G1, 0.8)
            + fl(760, 150, 4, G1, 0.8)
        )
    elif p["id"] == "D":
        motif = (
            sakura(900, 230, 16, G1)
            + sakura(1060, 330, 11, G1)
            + sakura(790, 380, 9, G1)
            + sakura(1030, 150, 6, S, opacity=0.9)
            + petal(760, 170, 5, S, 0.8, 30)
            + petal(1130, 470, 6, S, 0.7, -20)
            + petal(860, 520, 4, S, 0.8, 60)
            + speaker(880, 500, 6, P)
        )
    elif p["id"] == "E":
        sky = p["sky"]
        pts = [(700, 80, 3, 1), (760, 300, 2, .8), (820, 160, 4, 1), (900, 60, 2, .7), (980, 230, 3, .9),
               (1060, 110, 2, .8), (1130, 60, 3, 1), (1160, 320, 2, .7), (1040, 420, 2, .8), (720, 470, 3, .9),
               (880, 560, 2, .7), (1150, 540, 3, .9), (640, 240, 2, .6), (960, 500, 2, .6)]
        motif = (
            f'<rect x="600" y="0" width="{W-600}" height="{H-14}" fill="{sky}"/>'
            f'<path d="M600 0C640 200 640 420 600 {H-14}Z" fill="{sky}"/>'
            + starfield(pts)
            + star4(1100, 170, 3, S) + star4(740, 390, 2.2, S, 0.9)
            + asteroid(980, 400, 1.6, "#8b93a7", "#6b7389")
            + satellite(820, 250, 1.3, "#ffffff", G1)
            + rocket(1120, 440, 1.6, "#ffffff", S, S)
        )
    else:
        motif = (
            f'<g fill="{G1}">'
            f'<circle cx="930" cy="250" r="120"/><circle cx="810" cy="330" r="95"/>'
            f'<circle cx="1050" cy="330" r="95"/><circle cx="930" cy="360" r="105"/>'
            f"</g>"
            f'<rect x="908" y="430" width="44" height="150" rx="18" fill="{G1}"/>'
            f'<path d="M700 585h460" stroke="{G1}" stroke-width="14" stroke-linecap="round"/>'
        )
    dark = p.get("dark", False)
    bg = p["sky"] if dark else G2
    ink = "#ffffff" if dark else INK
    sub_ink = G1 if dark else A
    muted = "#c7cde6" if dark else MUTED
    name_accent = S if dark else P
    bar = S if dark else P
    logo = mark_svg(p, (150, 135), "tile" if dark else "light", extra_attr='x="84" y="92"')
    quote = p.get("quote")
    quote_svg = (
        f'<text x="{W-84}" y="560" text-anchor="end" font-family="{FONT}" font-weight="500" font-size="22" fill="{muted}">{quote}</text>'
        if quote
        else ""
    )
    foreground = (
        f"{logo}"
        f'<text x="84" y="330" font-family="{FONT}" font-weight="900" font-size="66" fill="{ink}">{SITE_NAME}</text>'
        f'<text x="86" y="396" font-family="{FONT}" font-weight="700" font-size="30" fill="{sub_ink}">{SITE_TAGLINE}</text>'
        f'<text x="86" y="452" font-family="{FONT}" font-weight="500" font-size="24" fill="{muted}">{SITE_DESCRIPTION}</text>'
        f'<text x="86" y="560" font-family="{FONT}" font-weight="500" font-size="22" fill="{muted}">市議会議員が個人で運営・公式サイトではありません</text>'
        f"{quote_svg}"
        if text
        else ""
    )
    return (
        f'<svg viewBox="0 0 {W} {H}" width="{round(W*scale)}" height="{round(H*scale)}" role="img" aria-label="OGP画像 {p["name"]}" xmlns="http://www.w3.org/2000/svg">'
        f'<rect width="{W}" height="{H}" fill="{bg}"/>'
        f"{motif}"
        f'<rect x="0" y="{H-14}" width="{W}" height="14" fill="{bar}"/>'
        f"{foreground}"
        f"</svg>"
    )


# ---------------------------------------------------------------- hero
def hero_svg(p, width=2880, height=570, scale=1.0):
    P, A, G1, G2, S = p["primary"], p["accent"], p["g1"], p["g2"], p["sub"]
    W, H = width, height
    if p["id"] == "A":
        arches = "".join(
            f'<path d="M{x} 440C{x+24} 318 {x+276} 318 {x+300} 440" fill="none" stroke="{G1}" stroke-width="24" stroke-linecap="round"/>'
            for x in range(-150, W + 300, 300)
        )
        wave = "".join("c60-40 120-40 180 0" for _ in range(W // 180 + 2))
        motif = (
            f'<path d="M-40 300H{W+40}" stroke="{G1}" stroke-width="30" stroke-linecap="round"/>'
            f"{arches}"
            f'<path d="M-60 492{wave}" fill="none" stroke="{P}" stroke-width="12" stroke-linecap="round" opacity="0.26"/>'
            f'<path d="M-60 540{wave}" fill="none" stroke="{P}" stroke-width="12" stroke-linecap="round" opacity="0.14"/>'
            f'<circle cx="2420" cy="150" r="70" fill="{S}" opacity="0.85"/>'
        )
    elif p["id"] == "B":
        hpetal = "M0 -8C3 -8 4.6 -4 0 0C-4.6 -4 -3 -8 0 -8Z"

        def fl(cx, cy, s, fill, op):
            return (
                f'<g transform="translate({cx} {cy}) scale({s})" fill="{fill}" opacity="{op}">'
                f'<path d="{hpetal}"/><path d="{hpetal}" transform="rotate(90)"/>'
                f'<path d="{hpetal}" transform="rotate(180)"/><path d="{hpetal}" transform="rotate(270)"/>'
                f'<circle r="1.7" fill="#ffffff"/></g>'
            )

        spots = [
            (260, 330, 15, 1), (470, 180, 9, 0.9), (640, 420, 11, 1), (900, 250, 7, 0.8),
            (1180, 380, 13, 1), (1400, 150, 8, 0.9), (1620, 450, 9, 0.9), (1880, 240, 15, 1),
            (2120, 420, 8, 0.8), (2340, 170, 10, 0.9), (2600, 360, 14, 1), (2800, 200, 7, 0.8),
            (1040, 520, 5, 0.7), (2000, 520, 6, 0.7), (380, 520, 6, 0.7),
        ]
        motif = "".join(fl(x, y, s, G1, o) for x, y, s, o in spots)
        motif += (
            f'<path d="M1480 560C1540 500 1640 500 1680 560C1620 600 1520 600 1480 560Z" fill="{S}" opacity="0.35"/>'
        )
    elif p["id"] == "D":
        blossoms = [
            (300, 300, 17, G1, 1), (560, 160, 10, G1, .9), (760, 420, 13, G1, 1), (1020, 220, 8, G1, .9),
            (1300, 360, 16, G1, 1), (1560, 150, 9, G1, .9), (1800, 440, 11, G1, 1), (2060, 230, 15, G1, 1),
            (2320, 420, 9, G1, .9), (2560, 180, 12, G1, 1), (2800, 380, 10, G1, .9),
        ]
        petals = [
            (450, 480, 6, S, .8, 20), (900, 120, 5, S, .8, -30), (1150, 500, 7, S, .7, 50), (1700, 300, 5, S, .8, 10),
            (1950, 520, 6, S, .7, -40), (2450, 500, 6, S, .8, 30), (2700, 100, 5, S, .8, -10), (150, 120, 5, S, .7, 40),
        ]
        motif = (
            "".join(sakura(x, y, sc, f, opacity=o) for x, y, sc, f, o in blossoms)
            + "".join(petal(x, y, sc, f, o, r) for x, y, sc, f, o, r in petals)
            + speaker(2600, 545, 8, P)
            + f'<path d="M0 548H{W}" stroke="{P}" stroke-width="6" stroke-linecap="round" opacity="0.18"/>'
        )
    elif p["id"] == "E":
        sky = p["sky"]
        import random as _r

        rnd = _r.Random(7)
        pts = [(rnd.randint(0, W), rnd.randint(0, H), rnd.choice([1.5, 2, 2.5, 3]), rnd.choice([.5, .7, .9, 1])) for _ in range(140)]
        motif = (
            f'<rect width="{W}" height="{H}" fill="{sky}"/>'
            + starfield(pts)
            + star4(420, 120, 3.5, S) + star4(1700, 90, 2.5, S, .9) + star4(2550, 160, 3, S)
            + f'<path d="M1880 480C1960 300 2120 250 2330 240" fill="none" stroke="{G1}" stroke-width="6" stroke-linecap="round" stroke-dasharray="2 22" opacity="0.8"/>'
            + rocket(2360, 230, 2.0, "#ffffff", S, S)
            + asteroid(1180, 360, 2.2, "#8b93a7", "#6b7389")
            + satellite(640, 300, 2.0, "#ffffff", G1)
        )
    else:
        trees = ""
        for x, s in [(200, 1.3), (640, 0.9), (1000, 1.6), (1500, 1.0), (1900, 1.4), (2350, 0.9), (2700, 1.5)]:
            r = 90 * s
            trees += (
                f'<g fill="{G1}"><circle cx="{x}" cy="{330 - r*0.2:.0f}" r="{r:.0f}"/>'
                f'<circle cx="{x - r*0.9:.0f}" cy="{360:.0f}" r="{r*0.8:.0f}"/>'
                f'<circle cx="{x + r*0.9:.0f}" cy="{360:.0f}" r="{r*0.8:.0f}"/>'
                f'<circle cx="{x}" cy="{380}" r="{r*0.9:.0f}"/></g>'
                f'<rect x="{x - 14*s:.0f}" y="{400}" width="{28*s:.0f}" height="{110}" rx="{12*s:.0f}" fill="{G1}"/>'
            )
        motif = (
            f"{trees}"
            f'<path d="M0 512h{W}" stroke="{P}" stroke-width="10" stroke-linecap="round" opacity="0.25"/>'
            f'<circle cx="2500" cy="150" r="70" fill="{S}" opacity="0.8"/>'
        )
    return (
        f'<svg viewBox="0 0 {W} {H}" width="{round(W*scale)}" height="{round(H*scale)}" role="img" aria-label="ヒーロー画像 {p["name"]}" xmlns="http://www.w3.org/2000/svg">'
        f'<rect width="{W}" height="{H}" fill="{G2}"/>'
        f"{motif}"
        f"</svg>"
    )


# ---------------------------------------------------------------- html helpers
def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def page(title, body, w, h, lang="ja"):
    return f"""<!doctype html>
<html lang="{lang}">
<head>
<meta charset="utf-8">
<title>{esc(title)}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
{FONT_LINK}
<style>
body{{margin:0;font-family:{FONT};color:{INK}}}
a{{color:{MUTED}}}a:hover{{color:{INK}}}
</style>
</helmet>
{body}
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{{"$preview":{{"width":{w},"height":{h}}}}}'>
class Component extends DCLogic {{
  renderVals() {{ return {{}}; }}
}}
</script>
</body>
</html>
"""


def swatch(hexv, name, usage, big=False):
    h = 72 if big else 56
    return (
        f'<div style="display:flex;flex-direction:column;gap:6px;flex:1 1 0;min-width:0">'
        f'<div style="height:{h}px;border-radius:10px;background:{hexv};border:1px solid rgba(0,0,0,.06)"></div>'
        f'<div style="font-size:13px;font-weight:700">{esc(name)}</div>'
        f'<div style="font-size:12px;color:{MUTED};font-family:ui-monospace,Menlo,monospace">{hexv}</div>'
        f'<div style="font-size:12px;color:{MUTED};line-height:1.5">{esc(usage)}</div>'
        f"</div>"
    )


def wordmark(p, size=17, gap=8, mark=(40, 36)):
    return (
        f'<div style="display:flex;align-items:center;gap:{gap}px">'
        f'{mark_svg(p, mark, "light")}'
        f'<span style="font-size:{size}px;font-weight:900;letter-spacing:.06em;white-space:nowrap">{SITE_NAME}</span>'
        f"</div>"
    )


def section_title(t):
    return f'<div style="font-size:14px;font-weight:700;color:{MUTED};letter-spacing:.08em;border-bottom:1px solid {LINE};padding-bottom:6px">{esc(t)}</div>'


# ---------------------------------------------------------------- brand sheet
def brand_sheet(p):
    P, A, G1, G2, S = p["primary"], p["accent"], p["g1"], p["g2"], p["sub"]
    tags = "".join(
        f'<span style="font-size:13px;font-weight:700;color:{A};background:{G2};border:1px solid {G1};border-radius:999px;padding:4px 12px">{esc(t)}</span>'
        for t in p["tone"]
    )
    body = f"""
<div style="width:960px;height:1240px;box-sizing:border-box;padding:48px 56px;background:#ffffff;display:flex;flex-direction:column;gap:28px">

  <div style="display:flex;flex-direction:column;gap:10px">
    <div style="display:flex;align-items:baseline;gap:14px">
      <span style="font-size:15px;font-weight:700;color:{P};letter-spacing:.1em">{esc(p["no"])}</span>
      <h1 style="margin:0;font-size:40px;font-weight:900;letter-spacing:.02em">{esc(p["name"])}</h1>
      <span style="font-size:15px;color:{MUTED}">{esc(p["motif"])}</span>
    </div>
    <p style="margin:0;font-size:16px;line-height:1.7">{esc(p["concept"])}</p>
    <div style="display:flex;gap:8px">{tags}</div>
  </div>

  <div style="display:grid;grid-template-columns:repeat(3, minmax(0, 1fr));gap:20px">
    <div style="display:flex;flex-direction:column;gap:10px">
      {section_title("ロゴマーク")}
      <div style="height:200px;border:1px solid {LINE};border-radius:14px;display:flex;align-items:center;justify-content:center;background:#fff">{mark_svg(p, (160, 144), "light")}</div>
    </div>
    <div style="display:flex;flex-direction:column;gap:10px">
      {section_title("ホーム画面アイコン・favicon")}
      <div style="height:200px;border:1px solid {LINE};border-radius:14px;display:flex;align-items:center;justify-content:center;gap:22px;background:#fff">
        {icon_svg(p, 120)}
        <div style="display:flex;flex-direction:column;gap:10px;align-items:center">{icon_svg(p, 48)}{icon_svg(p, 24)}</div>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:10px">
      {section_title("ヘッダーでの見え方（実寸）")}
      <div style="height:200px;border:1px solid {LINE};border-radius:14px;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:18px;padding:0 20px;background:#fff">
        <div style="display:flex;align-items:center;gap:10px;height:56px;padding:0 16px;border-radius:14px;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.12);width:100%;box-sizing:border-box">{wordmark(p)}</div>
        <div style="display:flex;align-items:center;gap:10px;height:56px;padding:0 16px;border-radius:14px;background:{G2};width:100%;box-sizing:border-box">{wordmark(p)}</div>
      </div>
    </div>
  </div>

  <div style="display:flex;flex-direction:column;gap:12px">
    {section_title("色（サイト設定 → ブランド → テーマ色 に入れる 4 色）")}
    <div style="display:flex;gap:16px">
      {swatch(P, "primary", "ボタン・リンク・強調。白文字が読める濃さ", True)}
      {swatch(A, "primary_accent", "ホバー・見出し・小さな文字", True)}
      {swatch(G1, "gradient_start", "帯の背景・飾りの図形", True)}
      {swatch(G2, "gradient_end", "薄い背景・カード", True)}
      {swatch(S, "差し色（画像の中だけ）", "ヒーロー・OGP の一点に少量。UI には使わない", True)}
    </div>
  </div>

  <div style="display:flex;flex-direction:column;gap:12px">
    {section_title("OGP 画像（SNS で共有されたときのカード、1200×630）")}
    <div style="border:1px solid {LINE};border-radius:14px;overflow:hidden;width:848px;height:445px;line-height:0">{ogp_svg(p, scale=848/1200)}</div>
  </div>

  <div style="display:flex;flex-direction:column;gap:12px">
    {section_title("会期ページのヒーロー帯（2880×570、画面幅いっぱい・高さ 285px）")}
    <div style="border:1px solid {LINE};border-radius:14px;overflow:hidden;width:848px;height:168px;line-height:0">{hero_svg(p, scale=848/2880)}</div>
  </div>

  <div style="display:flex;gap:24px;margin-top:auto">
    <div style="flex:1 1 0;font-size:14px;line-height:1.7"><span style="font-weight:700;color:{A}">向いている場面：</span>{esc(p["fit"])}</div>
  </div>
</div>
"""
    return page(f"{p['no']} {p['name']}", body, 960, 1240)


# ---------------------------------------------------------------- usage board
def usage_board(example):
    p = example
    P, A, G1, G2 = p["primary"], p["accent"], p["g1"], p["g2"]

    def card(title, inner, note, width="1fr"):
        return (
            f'<div style="display:flex;flex-direction:column;gap:10px;min-width:0">'
            f"{section_title(title)}"
            f'<div style="border:1px solid {LINE};border-radius:14px;background:#fafbfc;padding:18px;display:flex;flex-direction:column;gap:12px;flex:1 1 auto">{inner}</div>'
            f'<div style="font-size:13px;color:{MUTED};line-height:1.6">{note}</div>'
            f"</div>"
        )

    header_mock = (
        f'<div style="display:flex;align-items:center;justify-content:space-between;height:60px;padding:0 20px;border-radius:16px;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.12)">'
        f"{wordmark(p)}"
        f'<div style="display:flex;gap:8px"><span style="font-size:13px;font-weight:700;padding:8px 14px;border-radius:999px;background:{P};color:#fff">議案を探す</span><span style="font-size:13px;font-weight:700;padding:8px 14px;border-radius:999px;border:1px solid {LINE}">日程</span></div>'
        f"</div>"
    )
    footer_mock = (
        f'<div style="display:flex;flex-direction:column;gap:10px;padding:18px 20px;border-radius:16px;background:{G2}">'
        f"{wordmark(p, 15, 8, (32, 29))}"
        f'<div style="font-size:12px;line-height:1.7;color:{MUTED}">これは政党チームみらいが運営しているものではありません。市議会議員 阿部善博が個人で運営しています。<br>ソースコード：github.com/AbeYoshiJapan/mirai-gikai-sagamihara ／ 本家「みらい議会」</div>'
        f"</div>"
    )
    ogp_card = (
        f'<div style="border:1px solid {LINE};border-radius:14px;overflow:hidden;background:#fff;width:420px">'
        f'<div style="line-height:0">{ogp_svg(p, scale=420/1200)}</div>'
        f'<div style="padding:10px 14px;display:flex;flex-direction:column;gap:3px"><div style="font-size:14px;font-weight:700">{SITE_NAME}</div><div style="font-size:12px;color:{MUTED}">相模原市議会で今どんな議案が審議されているか、わかりやすく伝えるサイト。</div><div style="font-size:12px;color:{MUTED}">mirai-gikai-sagamihara.vercel.app</div></div>'
        f"</div>"
    )
    phone_icons = (
        f'<div style="display:flex;gap:22px;align-items:flex-end">'
        f'<div style="display:flex;flex-direction:column;align-items:center;gap:6px">{icon_svg(p, 60)}<span style="font-size:11px">議会ナウ</span></div>'
        f'<div style="display:flex;flex-direction:column;align-items:center;gap:6px"><div style="width:60px;height:60px;border-radius:14px;background:#d9dde2"></div><span style="font-size:11px;color:{MUTED}">他のアプリ</span></div>'
        f'<div style="display:flex;flex-direction:column;align-items:center;gap:6px"><div style="width:60px;height:60px;border-radius:14px;background:#d9dde2"></div><span style="font-size:11px;color:{MUTED}">他のアプリ</span></div>'
        f'<div style="display:flex;align-items:center;gap:8px;margin-left:10px;padding:8px 12px;border-radius:10px;background:#fff;border:1px solid {LINE}">{icon_svg(p, 16)}<span style="font-size:12px">{SITE_NAME} — ブラウザのタブ</span></div>'
        f"</div>"
    )
    hero_mock = (
        f'<div style="border-radius:14px;overflow:hidden;border:1px solid {LINE};background:#fff">'
        f'<div style="line-height:0">{hero_svg(p, scale=560/2880)}</div>'
        f'<div style="padding:12px 16px;display:flex;flex-direction:column;gap:4px"><div style="font-size:16px;font-weight:900">令和8年相模原市議会定例会の議案</div><div style="font-size:12px;color:{MUTED}">9月定例会議 ／ 52 件</div></div>'
        f"</div>"
    )
    operator_mock = (
        f'<div style="display:flex;align-items:center;gap:14px">'
        f'<div style="width:72px;height:72px;border-radius:50%;background:#d9dde2;border:4px solid {G1};box-shadow:0 0 0 2px {P}"></div>'
        f'<div style="display:flex;flex-direction:column;gap:2px"><div style="font-size:14px;font-weight:700">阿部善博</div><div style="font-size:12px;color:{MUTED}">相模原市議会議員（南区）</div></div>'
        f"</div>"
    )

    rows = [
        ("ロゴマーク", "logo_url", "SVG（40×36 の比率）", "ヘッダー・フッター・準備中ページ。横にサイト名が自動で付く"),
        ("ワードマーク", "service_logo_url", "SVG 151×24（任意）", "ヘッダーのサイト名を文字の代わりに画像で出す。空なら文字"),
        ("OGP 画像", "ogp_image_url", "PNG/JPG 1200×630", "SNS・LINE で URL を貼ったときのカード"),
        ("ヒーロー帯", "archive_hero_url", "PNG/JPG 2880×570", "会期ごとの議案一覧ページの最上部"),
        ("アイコン", "icon_192_url / icon_512_url / icon_ios_url", "PNG 192・512・180", "ホーム画面追加・favicon・ブラウザのタブ"),
        ("テーマ色", "colors（5 項目）", "16 進カラー", "primary / primary_accent / gradient_start / gradient_end / theme_color（= primary）"),
    ]
    table = (
        f'<div style="display:grid;grid-template-columns:repeat(4, minmax(0, 1fr));gap:0;border:1px solid {LINE};border-radius:12px;overflow:hidden;font-size:13px">'
        + "".join(
            f'<div style="padding:9px 12px;background:{G2};font-weight:700;border-bottom:1px solid {LINE}">{h}</div>'
            for h in ["素材", "設定項目（サイト設定 → ブランド）", "形式・サイズ", "出る場所"]
        )
        + "".join(
            f'<div style="padding:9px 12px;border-bottom:1px solid {LINE};font-weight:700">{esc(a)}</div>'
            f'<div style="padding:9px 12px;border-bottom:1px solid {LINE};font-family:ui-monospace,Menlo,monospace;font-size:12px">{esc(b)}</div>'
            f'<div style="padding:9px 12px;border-bottom:1px solid {LINE}">{esc(c)}</div>'
            f'<div style="padding:9px 12px;border-bottom:1px solid {LINE};color:{MUTED}">{esc(d)}</div>'
            for a, b, c, d in rows
        )
        + "</div>"
    )

    rules_do = [
        "マークの周りに、マークの高さの 1/4 以上の余白を空ける",
        "マークは 24px より小さくしない（それ以下はアイコンの単色タイルを使う）",
        "色は 4 色＋差し色 1 色だけ。差し色は画像の中の一点に限る",
        "写真は「人の顔のアップ」「議場の権威的な構図」より、まち・川・木・空の広い景色を",
        "文字は Noto Sans JP（サイトと同じ）。見出しは太め、本文は普通",
    ]
    rules_dont = [
        "相模原市の市章・市のロゴ、チームみらいのロゴは使わない（公式と誤認される）",
        "マークの色を変えない・傾けない・影や縁取りを付けない",
        "キャラクター化しない（目や口を描かない）。かわいさは色と丸みで出す",
        "本家の色（#2aa693・#2a5ea8）を使わない",
        "選挙期間中は候補者名・顔写真を強調する画像に差し替えない",
    ]
    li = lambda items, col: "".join(
        f'<li style="margin:0 0 6px 0;padding-left:4px">{esc(t)}</li>' for t in items
    )

    body = f"""
<div style="width:1440px;height:1200px;box-sizing:border-box;padding:48px 56px;background:#ffffff;display:flex;flex-direction:column;gap:24px">
  <div style="display:flex;flex-direction:column;gap:6px">
    <h1 style="margin:0;font-size:32px;font-weight:900">使う場所と使い方（どの案を選んでも共通）</h1>
    <p style="margin:0;font-size:15px;color:{MUTED}">例として{esc(p["no"])}「{esc(p["name"])}」で表示しています。採用案に差し替えて同じ場所に入れます。</p>
  </div>

  <div style="display:grid;grid-template-columns:repeat(3, minmax(0, 1fr));gap:24px">
    {card("1. ヘッダー（全ページ）", header_mock, "マーク 40×36 ＋ サイト名。マークだけが画像で、サイト名は設定の文字。")}
    {card("2. フッター（全ページ）", footer_mock, "小さいマーク＋免責・ソースコードのリンク。背景は gradient_end。")}
    {card("3. SNS・LINE で共有したとき", ogp_card, "OGP 画像 1200×630。文字は大きく、要素は 3 つまで。")}
  </div>

  <div style="display:grid;grid-template-columns:repeat(3, minmax(0, 1fr));gap:24px">
    {card("4. ホーム画面・ブラウザのタブ", phone_icons, "単色タイルに白いマーク。小さくても形が残る。")}
    {card("5. 会期の議案一覧ページ（帯）", hero_mock, "文字は載らない飾り帯。モチーフを薄い色で繰り返す。")}
    {card("6. 運営者欄の写真", operator_mock, "丸く切り抜き、gradient_start の縁。写真は明るい屋外で、胸から上。")}
  </div>

  <div style="display:grid;grid-template-columns:minmax(0, 1.4fr) minmax(0, 1fr);gap:24px">
    <div style="display:flex;flex-direction:column;gap:10px">
      {section_title("7. 管理画面でどこに入れるか")}
      {table}
    </div>
    <div style="display:grid;grid-template-columns:repeat(2, minmax(0, 1fr));gap:16px">
      <div style="display:flex;flex-direction:column;gap:10px">{section_title("守ること")}<ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.6">{li(rules_do, 0)}</ul></div>
      <div style="display:flex;flex-direction:column;gap:10px">{section_title("しないこと")}<ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.6">{li(rules_dont, 0)}</ul></div>
    </div>
  </div>
</div>
"""
    return page("使う場所と使い方", body, 1440, 1200)


# ---------------------------------------------------------------- write
def main():
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    boards = {}
    order = []
    files = {}
    x = 0
    for p in PLANS:
        name = f"Plan{p['id']}.dc.html"
        files[name] = brand_sheet(p)
        boards[name] = {"x": x, "y": 0, "w": 960, "h": 1240, "title": f"{p['no']} {p['name']}"}
        order.append(name)
        x += 960 + 80
    usage = "Usage.dc.html"
    files[usage] = usage_board(PLANS[0])
    boards[usage] = {"x": 0, "y": 1700, "w": 1440, "h": 1200, "title": "使う場所と使い方"}
    order.append(usage)
    # Main.dc.html が先頭（エントリ）になるよう、案1 を Main に
    main_name = "Main.dc.html"
    files[main_name] = files.pop("PlanA.dc.html")
    boards[main_name] = boards.pop("PlanA.dc.html")
    order[0] = main_name

    canvas = {
        "v": 3,
        "createdOnFiles": {"v": 1, "at": now},
        "title": "みらい議会＠相模原市 ロゴ・画像 3 案",
        "launch": {"view": "canvas"},
        "pages": [],
        "boards": boards,
        "order": order,
        "notes": {
            "t1": {
                "x": 0,
                "y": -300,
                "text": "みらい議会＠相模原市　ロゴ・画像 3 案（2026-11-04）",
                "kind": "title1",
                "maxW": 3040,
            },
            "t2": {
                "x": 0,
                "y": 1420,
                "text": "使う場所と使い方（共通）",
                "kind": "title1",
                "maxW": 1440,
            },
        },
        "designSystems": [],
    }
    with open(os.path.join(PROJ, "canvas.json"), "w", encoding="utf-8") as f:
        json.dump(canvas, f, ensure_ascii=False, indent=1)
    for name, html in files.items():
        with open(os.path.join(PROJ, name), "w", encoding="utf-8") as f:
            f.write(html)

    # 素材 SVG（後で採用案を PNG に書き出すための元）
    for p in PLANS:
        d = os.path.join(ASSETS, p["id"])
        os.makedirs(d, exist_ok=True)
        with open(os.path.join(d, "logo.svg"), "w", encoding="utf-8") as f:
            f.write(mark_svg(p, (40, 36), "light"))
        with open(os.path.join(d, "icon.svg"), "w", encoding="utf-8") as f:
            f.write(icon_svg(p, 512, standalone=True))
        with open(os.path.join(d, "ogp.svg"), "w", encoding="utf-8") as f:
            f.write(ogp_svg(p))
        # 同梱用。文字を入れない背景（文字は web の /api/og/site が設定から描く）
        with open(os.path.join(d, "ogp-bg.svg"), "w", encoding="utf-8") as f:
            f.write(ogp_svg(p, text=False))
        with open(os.path.join(d, "hero.svg"), "w", encoding="utf-8") as f:
            f.write(hero_svg(p))
    print("ok", list(files), order)


if __name__ == "__main__":
    main()
