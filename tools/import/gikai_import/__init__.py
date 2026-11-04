"""相模原市議会サイトの PDF を、みらい議会＠相模原市の取込 JSON に変換するツール。"""

__version__ = "0.1.0"

import logging as _logging

# pdfminer はフォント情報の欠けを警告で大量に出すので黙らせる
_logging.getLogger("pdfminer").setLevel(_logging.ERROR)
