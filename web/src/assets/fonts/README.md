# OGP 画像用フォント

`/api/og/site`（サイトの OGP 画像）と `/api/og/report` が Satori（next/og）で文字を描くために使う。
Satori は woff2 を読めないので woff を置く。

- `noto-sans-jp-japanese-700.woff` — Noto Sans JP Bold の japanese サブセット（@fontsource/noto-sans-jp 5.x より。SIL OFL 1.1、`LICENSE-NotoSansJP-OFL.txt`）
- ビルド時・実行時に Google Fonts へは取りに行かない（`next.config.ts` の `outputFileTracingIncludes` で関数に同梱）
