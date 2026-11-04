"""相模原市議会サイトのページから PDF リンクを拾う。

対象ページ（サイト設定 import.sources の url）:
- 提出議案・発言通告（今の会議）: https://www.sagamihara-shigikai.jp/doc/2013120900011/
- 過去の付議事件一覧・提出議案等（年ごと）: https://www.sagamihara-shigikai.jp/doc/2026051400048/ など
- 審議結果等: https://www.sagamihara-shigikai.jp/doc/2013120900035/

ページは h2 が会議名（「令和８年定例会６月定例会議」）で、その下に
「令和８年定例会６月定例会議　付議事件一覧[PDF：67KB]」「議案第65号〜93号（条例）[PDF：6.23MB]」
のようなリンクが並ぶ。
"""

from __future__ import annotations

import re
import time
from dataclasses import dataclass, field
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin

from .numbers import NumberRef, expand_label_ranges
from .text import collapse_spaces, halfwidth_digits

USER_AGENT = "mirai-gikai-sagamihara-import/0.1 (+https://github.com/; polite crawler, 1 req/2s)"
REQUEST_INTERVAL_SECONDS = 2.0

_SIZE_SUFFIX_RE = re.compile(r"\s*[\[［]\s*PDF[：:][^\]］]*[\]］]\s*", re.IGNORECASE)


@dataclass
class PdfLink:
    label: str
    url: str
    section: str | None = None

    @property
    def file_name(self) -> str:
        return self.url.rsplit("/", 1)[-1]

    @property
    def is_agenda(self) -> bool:
        return "付議事件一覧" in self.label

    @property
    def is_results(self) -> bool:
        return "審議結果" in self.label

    @property
    def is_notice(self) -> bool:
        """質問通告・質問順位（議案ではない）。"""
        return any(word in self.label for word in ("通告", "順位"))

    @property
    def numbers(self) -> list[NumberRef]:
        return expand_label_ranges(self.label)

    @property
    def is_document(self) -> bool:
        return bool(self.numbers) and not self.is_agenda and not self.is_notice


@dataclass
class MeetingLinks:
    section: str
    agenda: PdfLink | None = None
    documents: list[PdfLink] = field(default_factory=list)
    results: list[PdfLink] = field(default_factory=list)
    others: list[PdfLink] = field(default_factory=list)


class _LinkParser(HTMLParser):
    def __init__(self, base_url: str) -> None:
        super().__init__()
        self.base_url = base_url
        self.links: list[PdfLink] = []
        self._section: str | None = None
        self._heading_level: str | None = None
        self._heading_text: list[str] = []
        self._href: str | None = None
        self._link_text: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag in ("h2", "h3"):
            self._heading_level = tag
            self._heading_text = []
        elif tag == "a":
            href = dict(attrs).get("href")
            if href and href.lower().split("?")[0].endswith(".pdf"):
                self._href = urljoin(self.base_url, href)
                self._link_text = []

    def handle_endtag(self, tag: str) -> None:
        if tag in ("h2", "h3") and self._heading_level == tag:
            text = halfwidth_digits(collapse_spaces("".join(self._heading_text)))
            if tag == "h2" and text:
                self._section = text
            self._heading_level = None
        elif tag == "a" and self._href:
            label = clean_link_label("".join(self._link_text))
            if label:
                self.links.append(PdfLink(label=label, url=self._href, section=self._section))
            self._href = None

    def handle_data(self, data: str) -> None:
        if self._heading_level:
            self._heading_text.append(data)
        if self._href:
            self._link_text.append(data)


def clean_link_label(text: str) -> str:
    """「議案第65号〜93号（条例）[PDF：6.23MB][PDF：6.23MB]」→「議案第65号〜93号（条例）」。"""
    cleaned = _SIZE_SUFFIX_RE.sub(" ", text)
    return halfwidth_digits(collapse_spaces(cleaned))


def list_pdf_links(html: str, base_url: str) -> list[PdfLink]:
    parser = _LinkParser(base_url)
    parser.feed(html)
    return parser.links


def group_meetings(links: list[PdfLink]) -> list[MeetingLinks]:
    """見出し（会議）ごとにリンクを分ける。見出しが無いページは 1 つの会議として扱う。"""
    groups: dict[str, MeetingLinks] = {}
    order: list[str] = []
    for link in links:
        section = link.section or "(見出しなし)"
        if section not in groups:
            groups[section] = MeetingLinks(section=section)
            order.append(section)
        meeting = groups[section]
        if link.is_agenda:
            meeting.agenda = meeting.agenda or link
        elif link.is_results:
            meeting.results.append(link)
        elif link.is_document:
            meeting.documents.append(link)
        else:
            meeting.others.append(link)
    return [groups[section] for section in order]


def fetch_html(url: str, timeout: float = 30.0) -> str:
    import requests

    response = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=timeout)
    response.raise_for_status()
    response.encoding = response.apparent_encoding or response.encoding
    return response.text


def download_pdf(url: str, dest_dir: str | Path, *, timeout: float = 120.0) -> Path:
    """同じファイル名が既にあれば取得しない（議会サイトに負荷をかけない）。"""
    import requests

    dest_dir = Path(dest_dir)
    dest_dir.mkdir(parents=True, exist_ok=True)
    path = dest_dir / url.rsplit("/", 1)[-1]
    if path.exists() and path.stat().st_size > 0:
        return path
    time.sleep(REQUEST_INTERVAL_SECONDS)
    response = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=timeout)
    response.raise_for_status()
    path.write_bytes(response.content)
    return path
