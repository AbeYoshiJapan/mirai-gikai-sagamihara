from gikai_import.site import clean_link_label, group_meetings, list_pdf_links

HTML = """
<html><body>
<h2>令和８年定例会６月定例会議</h2>
<ul>
<li><a href="/doc/2026051400048/file_contents/2026_hugi_0701.pdf">令和８年定例会６月定例会議　付議事件一覧[PDF：67KB]</a></li>
<li><a href="/doc/2026051400048/file_contents/2026_gian_65-93.pdf">議案第65号〜93号（条例）[PDF：6.23MB]</a></li>
<li><a href="/doc/2026051400048/file_contents/2026_gitei_5.pdf">議提議案第5号[PDF：90.5KB]</a></li>
<li><a href="/doc/2026051400048/file_contents/2026_tinjo_11_4-6.pdf">陳情第11号、4号〜6号[PDF：1.17MB]</a></li>
<li><a href="/doc/2026051400048/file_contents/2026_tsukoku_06.pdf">令和８年定例会６月定例会議　代表質問・個人質疑通告一覧[PDF：426KB]</a></li>
<li><a href="/doc/2026051400048/file_contents/2026_juni_06.pdf">令和８年定例会６月定例会議　一般質問順位[PDF：82.1KB]</a></li>
</ul>
<h2>令和８年定例会第１回臨時会議</h2>
<a href="/doc/2026051400048/file_contents/2026_hugi_0521-2.pdf">令和８年定例会第１回臨時会議　付議事件一覧[PDF：48.4KB]</a>
<a href="/doc/2026051400048/file_contents/2026_gian_1-2.pdf">委員会提出議案第1号〜第2号[PDF：1.48MB][PDF：1.48MB]</a>
<a href="/doc/2013120900035/file_contents/2026_kekka_0521.pdf">定例会第1回臨時会議・審議結果 [PDF：92KB]</a>
<a href="/other.html">PDF ではないリンク</a>
</body></html>
"""


def test_clean_link_label():
    assert clean_link_label("議案第65号〜93号（条例）[PDF：6.23MB]") == "議案第65号〜93号（条例）"
    assert clean_link_label("委員会提出議案第1号〜第2号[PDF：1.48MB][PDF：1.48MB]") == "委員会提出議案第1号〜第2号"
    assert clean_link_label("議案第９９号（一般会計決算） [PDF：2.04MB]") == "議案第99号（一般会計決算）"


def test_list_and_group():
    links = list_pdf_links(HTML, "https://www.sagamihara-shigikai.jp/doc/2026051400048/")
    assert len(links) == 9
    assert links[0].url == "https://www.sagamihara-shigikai.jp/doc/2026051400048/file_contents/2026_hugi_0701.pdf"
    assert links[0].section == "令和8年定例会6月定例会議"

    meetings = group_meetings(links)
    assert [m.section for m in meetings] == ["令和8年定例会6月定例会議", "令和8年定例会第1回臨時会議"]
    june = meetings[0]
    assert june.agenda is not None and june.agenda.file_name == "2026_hugi_0701.pdf"
    assert [d.label for d in june.documents] == ["議案第65号〜93号（条例）", "議提議案第5号", "陳情第11号、4号〜6号"]
    assert [o.file_name for o in june.others] == ["2026_tsukoku_06.pdf", "2026_juni_06.pdf"]
    extra = meetings[1]
    assert [d.file_name for d in extra.documents] == ["2026_gian_1-2.pdf"]
    assert [r.file_name for r in extra.results] == ["2026_kekka_0521.pdf"]
