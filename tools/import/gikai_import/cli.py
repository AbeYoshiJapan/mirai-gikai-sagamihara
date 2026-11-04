"""コマンドライン。

  # 議会サイトのページから、会議ごとの PDF を取得して取込 JSON を作る
  python -m gikai_import bundle --page-url https://www.sagamihara-shigikai.jp/doc/2013120900011/ \
      --cache-dir downloads --out out/2026-09.json

  # 手元の PDF から作る（オフライン）
  python -m gikai_import bundle --agenda-pdf 2026_hugi_0930.pdf \
      --document "2026_gian_129-134.pdf=議案第129号〜134号（人事）" --out out/2026-09.json

  # 審議結果
  python -m gikai_import results --pdf 2026_kekka_9_0930.pdf --out out/2026-09-results.json

  # ページの PDF リンクを見る
  python -m gikai_import links --page-url https://www.sagamihara-shigikai.jp/doc/2026051400048/

出来た JSON は、管理画面の「取込」でアップロードして差分を確認してから適用する。
このツールは DB に書かない（公開もしない）。
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
from pathlib import Path

from .pipeline import DocumentInput, build_agenda_bundle, build_results_bundle
from .site import download_pdf, fetch_html, group_meetings, list_pdf_links


def _write(bundle_dict: dict, out: str | None) -> None:
    text = json.dumps(bundle_dict, ensure_ascii=False, indent=2)
    if out:
        path = Path(out)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")
        print(f"書き出しました: {path}", file=sys.stderr)
    else:
        print(text)


def _parse_document_arg(value: str) -> DocumentInput:
    """"path=label[=url]" の形。"""
    parts = value.split("=", 2)
    if len(parts) < 2:
        raise argparse.ArgumentTypeError('--document は "ファイル=リンク文字列[=URL]" の形で指定してください')
    path, label = parts[0], parts[1]
    url = parts[2] if len(parts) > 2 else None
    return DocumentInput(path=Path(path), label=label, url=url)


def cmd_links(args: argparse.Namespace) -> int:
    html = fetch_html(args.page_url)
    meetings = group_meetings(list_pdf_links(html, args.page_url))
    output = [
        {
            "section": m.section,
            "agenda": m.agenda.url if m.agenda else None,
            "documents": [{"label": d.label, "url": d.url} for d in m.documents],
            "results": [{"label": r.label, "url": r.url} for r in m.results],
            "others": [{"label": o.label, "url": o.url} for o in m.others],
        }
        for m in meetings
    ]
    print(json.dumps(output, ensure_ascii=False, indent=2))
    return 0


def cmd_bundle(args: argparse.Namespace) -> int:
    if args.page_url:
        html = fetch_html(args.page_url)
        meetings = group_meetings(list_pdf_links(html, args.page_url))
        meetings = [m for m in meetings if m.agenda is not None]
        if args.meeting:
            meetings = [m for m in meetings if args.meeting in m.section or args.meeting in (m.agenda.label if m.agenda else "")]
        if not meetings:
            print("付議事件一覧のある会議が見つかりません", file=sys.stderr)
            return 2
        meeting = meetings[0]
        if len(meetings) > 1:
            print(f"複数の会議があるので最初の「{meeting.section}」を使います（--meeting で絞れます）", file=sys.stderr)
        cache = Path(args.cache_dir)
        assert meeting.agenda is not None
        agenda_path = download_pdf(meeting.agenda.url, cache)
        documents = [
            DocumentInput(path=download_pdf(link.url, cache), label=link.label, url=link.url)
            for link in meeting.documents
        ]
        bundle = build_agenda_bundle(
            agenda_path,
            documents,
            source_url=args.page_url,
            agenda_url=meeting.agenda.url,
            ocr=args.ocr,
            number_year=args.number_year,
        )
    else:
        if not args.agenda_pdf:
            print("--page-url か --agenda-pdf のどちらかが必要です", file=sys.stderr)
            return 2
        bundle = build_agenda_bundle(
            Path(args.agenda_pdf),
            args.document or [],
            source_url=None,
            agenda_url=None,
            ocr=args.ocr,
            number_year=args.number_year,
        )
    _write(bundle.to_dict(), args.out)
    _print_summary(bundle)
    return 0


def cmd_results(args: argparse.Namespace) -> int:
    bundle = build_results_bundle(
        Path(args.pdf), source_url=None, results_url=args.url, number_year=args.number_year
    )
    _write(bundle.to_dict(), args.out)
    _print_summary(bundle)
    return 0


def _print_summary(bundle) -> None:  # noqa: ANN001
    print(
        f"会議: {bundle.meeting.session_name or '?'} {bundle.meeting.label or ''} "
        f"(番号の年: {bundle.meeting.as_of or bundle.meeting.council_year})",
        file=sys.stderr,
    )
    if bundle.items:
        with_doc = sum(1 for i in bundle.items if i.document is not None)
        print(f"項目: {len(bundle.items)} 件（議案書あり {with_doc} 件）", file=sys.stderr)
    if bundle.results:
        print(f"審議結果: {len(bundle.results)} 件", file=sys.stderr)
    for warning in bundle.warnings:
        print(f"注意: {warning}", file=sys.stderr)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="gikai_import", description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("-v", "--verbose", action="store_true")
    sub = parser.add_subparsers(dest="command", required=True)

    p_links = sub.add_parser("links", help="ページの PDF リンクを会議ごとに表示")
    p_links.add_argument("--page-url", required=True)
    p_links.set_defaults(func=cmd_links)

    p_bundle = sub.add_parser("bundle", help="付議事件一覧と議案書から取込 JSON を作る")
    p_bundle.add_argument("--page-url", help="提出議案のページ URL（PDF を取得する）")
    p_bundle.add_argument("--meeting", help="ページ内の会議名で絞る（例: 6月定例会議）")
    p_bundle.add_argument("--cache-dir", default="downloads", help="取得した PDF の置き場所")
    p_bundle.add_argument("--agenda-pdf", help="手元の付議事件一覧 PDF")
    p_bundle.add_argument(
        "--document", action="append", type=_parse_document_arg, help='手元の議案書 "ファイル=リンク文字列[=URL]"（複数可）'
    )
    p_bundle.add_argument("--ocr", choices=["auto", "never", "always"], default="auto")
    p_bundle.add_argument("--number-year", type=int, help="番号の年（見出しから読めないとき）")
    p_bundle.add_argument("--out", help="出力 JSON（省略時は標準出力）")
    p_bundle.set_defaults(func=cmd_bundle)

    p_results = sub.add_parser("results", help="審議結果 PDF から取込 JSON を作る")
    p_results.add_argument("--pdf", required=True)
    p_results.add_argument("--url", help="PDF の URL（一次資料として記録）")
    p_results.add_argument("--number-year", type=int)
    p_results.add_argument("--out")
    p_results.set_defaults(func=cmd_results)

    args = parser.parse_args(argv)
    logging.basicConfig(level=logging.INFO if args.verbose else logging.WARNING, format="%(message)s")
    return args.func(args)
