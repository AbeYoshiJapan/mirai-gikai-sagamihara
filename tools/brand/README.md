# ブランド素材の生成

`web/public/brand/<案>/` のロゴ（SVG）・アイコン・OGP 画像・会期ページの帯は、ここのスクリプトから生成しています。

```bash
cd tools/brand
python3 generate.py                 # project/（デザインキャンバス用）と assets/<A|B|C>/ に SVG を出す
node export-assets.js               # assets/ の SVG を PNG にして web/public/brand/ に書き出す（Playwright の Chromium を使う）
```

- 案の色や形を変えるときは `generate.py` の `PLANS` を直してから両方を実行します
- `export-assets.js` の `SRC` / `OUT` のパスは環境に合わせて書き換えてください
- 文字の描画には Noto Sans JP（無ければ Noto Sans CJK JP）を使います。OGP 画像の文字が化けるときはフォントを入れてください
