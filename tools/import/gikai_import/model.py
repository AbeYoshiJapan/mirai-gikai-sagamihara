"""取込 JSON（管理画面の「取込」で読む形式）のデータ構造。
形式名 mirai-gikai-import/1。packages/shared/src/import/schema.ts と対応させる。"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Any

FORMAT = "mirai-gikai-import/1"


@dataclass
class SourceFile:
    name: str
    url: str | None = None
    sha256: str | None = None
    pages: int | None = None
    label: str | None = None


@dataclass
class Meeting:
    """付議事件一覧の見出しから取った会議の情報。"""

    council_year: int | None = None
    era_year_label: str | None = None
    session_name: str | None = None
    label: str | None = None
    as_of: str | None = None


@dataclass
class DocumentText:
    """議案書・陳情書の本文。url と file は取込側が一次資料（bill_sources）に登録する。"""

    url: str | None = None
    file: str | None = None
    pages: list[int] | None = None
    title: str | None = None
    text: str = ""
    text_quality: str = "none"
    proposal_reason: str | None = None
    materials_text: str | None = None
    sha256: str | None = None
    truncated: bool = False


@dataclass
class ImportItem:
    key: str
    kind: str
    number: int
    number_label: str
    """「議案第99号」。議会の表記（半角数字・空白なし）"""
    number_year: int
    """番号が属する年（暦年。陳情・議案の番号は年ごとに振り直される）"""
    citation: str
    """「令和8年議案第99号」。DB の bill_number にはこれを入れ、取込の突合キーにする"""
    name: str
    bill_kind: str
    proposer_kind: str
    committees: list[str] = field(default_factory=list)
    subcommittees: list[str] = field(default_factory=list)
    added_this_time: bool = False
    carried_over: bool = False
    submitted_on: str | None = None
    proposers: list[str] = field(default_factory=list)
    category_hint: str | None = None
    document: DocumentText | None = None
    warnings: list[str] = field(default_factory=list)


@dataclass
class ImportResult:
    key: str
    kind: str
    number: int
    number_label: str
    number_year: int
    citation: str
    name: str
    committees: list[str] = field(default_factory=list)
    decided_on: str | None = None
    result: str | None = None
    vote_outcome: str | None = None
    raw_result: str = ""
    warnings: list[str] = field(default_factory=list)


@dataclass
class ImportBundle:
    adapter: str
    source_url: str | None = None
    files: list[SourceFile] = field(default_factory=list)
    meeting: Meeting = field(default_factory=Meeting)
    items: list[ImportItem] = field(default_factory=list)
    results: list[ImportResult] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    generated_at: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(timespec="seconds")
    )

    def to_dict(self) -> dict[str, Any]:
        return {
            "format": FORMAT,
            "generated_at": self.generated_at,
            "source": {
                "adapter": self.adapter,
                "url": self.source_url,
                "files": [asdict(f) for f in self.files],
            },
            "meeting": asdict(self.meeting),
            "items": [asdict(item) for item in self.items],
            "results": [asdict(result) for result in self.results],
            "warnings": list(self.warnings),
        }
