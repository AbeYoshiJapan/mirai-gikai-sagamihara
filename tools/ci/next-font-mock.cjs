/**
 * CI の `next build` で next/font/google の Google Fonts 取得を差し替えるモック。
 *
 * GitHub Actions のランナーから fonts.googleapis.com が不安定な応答を返すと
 * （Turbopack: "queries have exactly one entry"、webpack: "Cannot read properties of null"）
 * ビルドが落ちる。CI のビルドはコードが通るかの確認で成果物は配布しないので、
 * NEXT_FONT_GOOGLE_MOCKED_RESPONSES にこのファイルを指定してネットワークを使わない。
 * 本番（Vercel）のビルドではこの環境変数を設定しないこと。
 *
 * next/font は `require(path)[url]` で CSS を引くので、どの URL にも応える Proxy を返す。
 * フォントファイルの URL はモック時はダウンロードされない（next/font の実装）。
 */
module.exports = new Proxy(
  {},
  {
    get(_, url) {
      if (typeof url !== "string" || !url.startsWith("http")) return undefined;
      const familyMatch = url.match(/family=([^:&]+)/);
      const family = decodeURIComponent(
        (familyMatch ? familyMatch[1] : "Mock").replace(/\+/g, " ")
      );
      const slug = family.replace(/\W/g, "");
      const weights = (url.match(/wght@([^&]+)/) || [])[1] || "400";
      const weight = weights.includes("..")
        ? weights.replace("..", " ")
        : weights.split(";")[0];
      return ["latin", "latin-ext"]
        .map(
          (range) =>
            `/* ${range} */\n@font-face {\n  font-family: '${family}';\n  font-style: normal;\n  font-weight: ${weight};\n  font-display: swap;\n  src: url(https://fonts.gstatic.com/mock/${slug}-${range}.woff2) format('woff2');\n  unicode-range: U+0000-00FF;\n}\n`
        )
        .join("\n");
    },
  }
);
