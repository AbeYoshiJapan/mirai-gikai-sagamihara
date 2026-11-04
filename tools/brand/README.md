# ブランド素材の生成

`web/public/brand/<案>/` のロゴ（SVG）・アイコン・OGP 画像・会期ページの帯は、ここのスクリプトから生成しています。

```bash
cd tools/brand
python3 generate.py                 # project/（デザインキャンバス用）と assets/<A|B|C>/ に SVG を出す
node export-assets.js               # assets/ の SVG を PNG にして web/public/brand/ に書き出す（Playwright の Chromium を使う）
```

- 案の色や形を変えるときは `generate.py` の `PLANS` を直してから両方を実行します
- 案を増やすときは `PLANS` に項目を足し（`key` が `web/public/brand/<key>/` のフォルダ名、`adopted: True` で書き出し対象）、`generate.py` の `mark_svg` / `ogp_svg` / `hero_svg` にその案の描画を足し、`export-assets.js` の `MAP` に `id: key` を足します。あわせて `packages/shared/src/site-settings/brand-presets.ts` と `schema.ts` に登録します
- 現在の案：A かけはし、B あじさい、C けやき（未採用）、D 咢堂さくら、E ぎんが
- `export-assets.js` の `SRC` / `OUT` のパスは環境に合わせて書き換えてください
- 文字の描画には Noto Sans JP（無ければ Noto Sans CJK JP）を使います。OGP 画像の文字が化けるときはフォントを入れてください
