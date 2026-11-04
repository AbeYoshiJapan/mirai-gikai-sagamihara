"""審議結果 PDF の見本（合成）を作る。本物の 2026_kekka_*.pdf が手に入ったら差し替える。

    python tests/fixtures/make_results_fixture.py

Playwright（chromium）で HTML の表を PDF にする。列は「番号・件名・付託委員会・議決日・議決結果」。
"""

from __future__ import annotations

from pathlib import Path

HTML = """<!doctype html><html lang="ja"><meta charset="utf-8">
<style>
body { font-family: "Noto Sans CJK JP", "Noto Serif CJK JP", sans-serif; font-size: 11pt; }
table { border-collapse: collapse; width: 100%; }
th, td { border: 1px solid #000; padding: 4px 6px; vertical-align: top; }
</style>
<p>令和８年相模原市議会定例会９月定例会議　審議結果</p>
<p>令和８年９月３０日議決</p>
<table>
<tr><th>番　号</th><th>件　名</th><th>付託委員会</th><th>議決日</th><th>議決結果</th></tr>
<tr><td>議案第９９号</td><td>令和７年度相模原市一般会計歳入歳出決算</td><td>決算特別</td><td>９月３０日</td><td>認定（賛成多数）</td></tr>
<tr><td>議案第１１６号</td><td>相模原市立保育所設置条例の一部を改正する条例の一部を改正する条例について</td><td>こども文教</td><td>８月２４日</td><td>可決（賛成総員）</td></tr>
<tr><td>議案第１２６号</td><td>令和８年度相模原市一般会計補正予算（第２号）</td><td>民　生<br>市民環境経済<br>建　設</td><td>９月１日</td><td>可決（賛成多数）</td></tr>
<tr><td>議案第１２９号</td><td>教育委員会の委員の選任について</td><td>―</td><td>９月２日</td><td>同意（賛成総員）</td></tr>
<tr><td>議提議案第８号</td><td>国による義務教育財源の保障等を求める意見書</td><td>―</td><td>９月３０日</td><td>可決（賛成総員）</td></tr>
<tr><td>陳情第１１号</td><td>排泄課題を抱える障害児者への日常生活用具の認定に関することについて</td><td>民　生</td><td>９月３０日</td><td>継続審査</td></tr>
<tr><td>陳情第 ７号</td><td>憲法堅持に関する意見書を国に提出するよう求めることについて</td><td>総　務</td><td>９月３０日</td><td>不採択（賛成少数）</td></tr>
<tr><td>陳情第 ９号</td><td>国による義務教育財源の保障等を求めることについて</td><td>こども文教</td><td>９月３０日</td><td>採択（賛成総員）</td></tr>
<tr><td>陳情第１５号</td><td>取り下げられた陳情について</td><td>総　務</td><td>９月１０日</td><td>撤回</td></tr>
</table>
</html>"""


def main() -> None:
    from playwright.sync_api import sync_playwright

    out = Path(__file__).with_name("synthetic_kekka.pdf")
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.set_content(HTML)
        page.pdf(path=str(out), format="A4")
        browser.close()
    print(f"書き出しました: {out}")


if __name__ == "__main__":
    main()
