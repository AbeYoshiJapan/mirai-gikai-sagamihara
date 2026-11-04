"""付議事件一覧・審議結果の見出しから、会議（定例会の年・会議の呼び名・基準日）を読む。"""

from __future__ import annotations

import re

from .model import Meeting
from .text import collapse_spaces, fix_radicals, halfwidth_digits, parse_era_date, parse_era_year

_HEADER_RE = re.compile(r"(.+?議会.+?)\s*(付議事件一覧|審議結果)")


def parse_meeting_header(text: str) -> Meeting:
    """「令和８年相模原市議会定例会９月定例会議 付議事件一覧」「令和８年９月３０日現在」。
    審議結果の「…審議結果」「令和８年９月３０日議決」も同じ形で読む。"""
    meeting = Meeting()
    first_lines = [fix_radicals(line.strip()) for line in text.splitlines() if line.strip()][:4]
    for line in first_lines:
        match = _HEADER_RE.search(line)
        if match and meeting.session_name is None:
            header = fix_radicals(collapse_spaces(match.group(1)))
            era = parse_era_year(header)
            if era:
                meeting.era_year_label, meeting.council_year = era
            # 「相模原市議会定例会」より前が会期の年、後ろが会議の呼び名
            split = re.search(r"(.*?議会定例会)(.*)$", header)
            if split:
                meeting.session_name = halfwidth_digits(split.group(1))
                meeting.label = halfwidth_digits(split.group(2)) or None
            else:
                meeting.session_name = halfwidth_digits(header)
            continue
        if meeting.as_of is None and re.search(r"(現在|議決|採決)", line):
            meeting.as_of = parse_era_date(line)
    return meeting
