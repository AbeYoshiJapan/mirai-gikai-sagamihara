"""スナップショット比較。`UPDATE_SNAPSHOTS=1 pytest` で期待値を書き直す。"""

from __future__ import annotations

import json
import os
from pathlib import Path


def assert_snapshot(path: Path, actual: object) -> None:
    text = json.dumps(actual, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    if os.environ.get("UPDATE_SNAPSHOTS") == "1" or not path.exists():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")
        return
    expected = path.read_text(encoding="utf-8")
    assert text == expected, f"スナップショットと違います: {path}（UPDATE_SNAPSHOTS=1 で更新）"
