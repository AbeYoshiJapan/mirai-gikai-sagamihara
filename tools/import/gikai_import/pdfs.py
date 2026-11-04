"""PDF からページごとの文字を取り出す。文字の無いページ（スキャン）は OCR に回す。"""

from __future__ import annotations

import hashlib
import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

import pdfplumber

log = logging.getLogger(__name__)

TextSource = Literal["text", "ocr", "none"]
OcrMode = Literal["auto", "never", "always"]

# これより文字が少ないページは「文字なし」とみなして OCR する
MIN_TEXT_CHARS = 20
# 様式の見出しだけ文字で本文がスキャン画像のページ（陳情書）を拾うための条件：
# 画像がページの 15% 以上を占め、文字がこれより少なければ OCR する（文字層は見出しとして残す）
MIXED_PAGE_MAX_CHARS = 400
MIXED_PAGE_IMAGE_RATIO = 0.15


@dataclass
class PageText:
    index: int
    text: str
    source: TextSource

    @property
    def number(self) -> int:
        return self.index + 1

    @property
    def lines(self) -> list[str]:
        return [line.rstrip() for line in self.text.splitlines() if line.strip()]


def file_sha256(path: str | Path) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def ocr_available() -> bool:
    try:
        import pytesseract  # noqa: F401

        pytesseract.get_tesseract_version()
        return True
    except Exception:  # noqa: BLE001 - 無ければ OCR を諦めるだけ
        return False


def ocr_page(path: str | Path, index: int, lang: str = "jpn", dpi: int = 300) -> str:
    """1 ページを画像にして tesseract にかける。縦書きには対応していない。"""
    import pypdfium2 as pdfium
    import pytesseract

    document = pdfium.PdfDocument(str(path))
    try:
        image = document[index].render(scale=dpi / 72).to_pil()
    finally:
        document.close()
    return pytesseract.image_to_string(image, lang=lang, config="--psm 6")


def extract_pages(
    path: str | Path,
    ocr: OcrMode = "auto",
    *,
    lang: str = "jpn",
    max_pages: int | None = None,
) -> list[PageText]:
    """
    ページごとの文字を返す。
    - ocr="auto": 文字の無いページだけ OCR（tesseract が無ければ空のまま）
    - ocr="never": OCR しない
    - ocr="always": 全ページ OCR（文字のあるページも OCR 結果で置き換える）
    """
    pages: list[PageText] = []
    can_ocr = ocr != "never" and ocr_available()
    if ocr != "never" and not can_ocr:
        log.warning("tesseract が見つからないため OCR を省略します: %s", path)

    with pdfplumber.open(str(path)) as pdf:
        total = len(pdf.pages) if max_pages is None else min(len(pdf.pages), max_pages)
        for index in range(total):
            page = pdf.pages[index]
            text = page.extract_text() or ""
            has_text = len(text.strip()) >= MIN_TEXT_CHARS
            mostly_image = (
                len(text.strip()) < MIXED_PAGE_MAX_CHARS
                and image_area_ratio(page) >= MIXED_PAGE_IMAGE_RATIO
            )
            if can_ocr and (ocr == "always" or not has_text or mostly_image):
                try:
                    ocr_text = ocr_page(path, index, lang=lang)
                    # 様式の見出しだけ文字のページは、見出し（文字層）を先頭に残して本文を OCR で補う
                    combined = f"{text.strip()}\n{ocr_text}" if (has_text and ocr != "always") else ocr_text
                    pages.append(PageText(index, combined, "ocr"))
                    continue
                except Exception as error:  # noqa: BLE001
                    log.warning("OCR に失敗しました (%s p.%d): %s", path, index + 1, error)
            pages.append(PageText(index, text, "text" if has_text else "none"))
    return pages


def image_area_ratio(page) -> float:  # noqa: ANN001 - pdfplumber.page.Page
    """ページ面積に対する画像の面積の割合（重なりは考えない）。"""
    width = float(page.width or 0)
    height = float(page.height or 0)
    if width <= 0 or height <= 0:
        return 0.0
    area = 0.0
    for image in page.images:
        try:
            w = float(image["x1"]) - float(image["x0"])
            h = float(image["bottom"]) - float(image["top"])
        except (KeyError, TypeError, ValueError):
            continue
        if w > 0 and h > 0:
            area += w * h
    return min(area / (width * height), 1.0)


def page_count(path: str | Path) -> int:
    with pdfplumber.open(str(path)) as pdf:
        return len(pdf.pages)


def extract_tables(path: str | Path) -> list[tuple[int, list[list[str | None]]]]:
    """(ページ番号, 表) の一覧。付議事件一覧のような罫線付きの表に使う。"""
    tables: list[tuple[int, list[list[str | None]]]] = []
    with pdfplumber.open(str(path)) as pdf:
        for index, page in enumerate(pdf.pages):
            for table in page.extract_tables():
                tables.append((index + 1, table))
    return tables
