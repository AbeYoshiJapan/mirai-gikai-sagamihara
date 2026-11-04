# 取込ツール（tools/import）

相模原市議会サイトの **付議事件一覧・議案集・陳情・審議結果の PDF** を読み、
管理画面の「取込」で使う JSON（`mirai-gikai-import/1`）に変換します。
このツールは DB に書きません。出来た JSON を管理画面にアップロードし、差分を確認してから適用します。
公開はしません（取り込んだ議案は下書きのまま）。

## 準備

Python 3.11 以上。スキャン PDF（陳情など）を読むには tesseract と日本語データが必要です。

```bash
cd tools/import
python -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
# OCR（任意）: macOS は brew install tesseract tesseract-lang、Ubuntu は apt install tesseract-ocr tesseract-ocr-jpn
```

## 使い方

```bash
# 1. 議会サイトのページから、会議ごとの PDF を取得して取込 JSON を作る
python -m gikai_import bundle \
  --page-url https://www.sagamihara-shigikai.jp/doc/2013120900011/ \
  --cache-dir downloads --out out/2026-09.json

# 過去の会議（年ごとのページ。--meeting で会議を選ぶ）
python -m gikai_import bundle \
  --page-url https://www.sagamihara-shigikai.jp/doc/2026051400048/ --meeting 6月定例会議 \
  --cache-dir downloads --out out/2026-06.json

# 2. 審議結果（採決後）
python -m gikai_import results --pdf downloads/2026_kekka_9_0930.pdf \
  --url https://www.sagamihara-shigikai.jp/doc/2013120900035/file_contents/2026_kekka_9_0930.pdf \
  --out out/2026-09-results.json

# 手元の PDF だけで作る（オフライン）
python -m gikai_import bundle --agenda-pdf 2026_hugi_0930.pdf \
  --document "2026_gian_129-134.pdf=議案第129号〜134号（人事）=https://…/2026_gian_129-134.pdf" \
  --out out/2026-09.json

# ページの PDF リンクを確かめる
python -m gikai_import links --page-url https://www.sagamihara-shigikai.jp/doc/2026051400048/
```

`--document` の「リンク文字列」（議案第129号〜134号 など）から番号の範囲を読み、PDF の中の
「議案第１２９号」の見出しと突き合わせます。URL を付けると、取込時に一次資料として登録されます。

## 読んでいるもの

| 入力 | 取り出すもの |
|------|-------------|
| 付議事件一覧 PDF（`*_hugi_*.pdf`） | 会議名・基準日、番号、件名、所管委員会（分科会）、※（今回の追加分）、継続分 |
| 議案集 PDF（`*_gian_*.pdf`） | 議案ごとの本文、件名、提出日、提案の理由、関係資料（改正の概要など） |
| 議提議案・委員会提出議案（`*_gitei_*.pdf`、`*_gian_1-2.pdf`） | 本文、提出者 |
| 陳情（`*_tinjo_*.pdf`） | OCR した本文（陳情の趣旨・理由）。陳情者の住所・氏名の行は落とす |
| 予算書・決算書（1 冊の本） | 番号ごとに同じ PDF を資料として付け、本文は冒頭だけ（`text_quality = "book"`） |
| 審議結果 PDF（`*_kekka_*.pdf`） | 番号、付託委員会、議決日、結果（可決・否決・認定・同意・採択・不採択・継続審査・撤回）、採決区分 |

番号の扱い: 議案・陳情の番号は **暦年ごと** に振り直されるので、「令和8年議案第99号」のように
年を前置した呼び方（`citation`）を突合キーにします。前の年から継続している陳情は前の年の番号として扱います。

## 出力（取込 JSON）

```jsonc
{
  "format": "mirai-gikai-import/1",
  "source": { "adapter": "sagamihara_agenda_pdf", "url": "…", "files": [ { "name", "url", "sha256", "pages", "label" } ] },
  "meeting": { "council_year": 2026, "era_year_label": "令和8年", "session_name": "令和8年相模原市議会定例会", "label": "9月定例会議", "as_of": "2026-09-30" },
  "items": [
    {
      "key": "2026:bill:99", "kind": "bill", "number": 99, "number_label": "議案第99号",
      "number_year": 2026, "citation": "令和8年議案第99号",
      "name": "令和7年度相模原市一般会計歳入歳出決算",
      "bill_kind": "settlement", "proposer_kind": "mayor",
      "committees": ["決算特別委員会"], "subcommittees": ["総務分科会", "…"],
      "added_this_time": false, "carried_over": false,
      "submitted_on": "2026-08-24", "proposers": [], "category_hint": null,
      "document": { "url": "…", "file": "2026_gian_99.pdf", "pages": [1, 151], "title": "…",
                    "text": "…", "text_quality": "text|ocr|mixed|book|none",
                    "proposal_reason": "…", "materials_text": "…", "sha256": "…", "truncated": false },
      "warnings": []
    }
  ],
  "results": [ { "citation": "令和8年議案第99号", "decided_on": "2026-09-30", "result": "approved", "vote_outcome": "majority", "raw_result": "認定(賛成多数)" } ],
  "warnings": []
}
```

`bill_kind` と `proposer_kind` は件名からの推定です。管理画面の取込プレビューで直せます。

## テスト

```bash
pip install -r requirements-dev.txt
python -m pytest
UPDATE_SNAPSHOTS=1 python -m pytest   # 期待値を書き直す
```

`tests/fixtures/` には 2026 年の実物の PDF を置いています。審議結果だけは実物を確かめていないので、
`tests/fixtures/make_results_fixture.py` で作った合成 PDF を使っています。実物が手に入ったら差し替えてください。

## PDF の書式が変わったら

- 付議事件一覧の列名（番号・件名・所管委員会）や審議結果の列名は `adapters/results.py` の `_COLUMN_WORDS`
- 委員会の略称 → 正式名は `classify.py` の `COMMITTEE_NAMES`
- 件名からの区分の推定は `classify.py` の `_MAYOR_RULES`
