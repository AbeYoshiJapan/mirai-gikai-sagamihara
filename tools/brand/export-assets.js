const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const SRC = process.env.BRAND_SRC || path.join(__dirname, 'assets');
const OUT = process.env.BRAND_OUT || path.join(__dirname, '..', '..', 'web', 'public', 'brand');
const MAP = { A: 'kakehashi', B: 'ajisai' };
if (!fs.existsSync(SRC)) {
  console.error(`SVG がありません: ${SRC}\n先に python3 generate.py を実行してください`);
  process.exit(1);
}
(async () => {
  const browser = await chromium.launch();
  for (const [key, name] of Object.entries(MAP)) {
    const dir = path.join(OUT, name);
    fs.mkdirSync(dir, { recursive: true });
    // logo.svg: copy as-is (standalone svg with xmlns)
    fs.copyFileSync(path.join(SRC, key, 'logo.svg'), path.join(dir, 'logo.svg'));
    const jobs = [
      { svg: 'ogp.svg', out: 'ogp.png', w: 1200, h: 630 },
      { svg: 'hero.svg', out: 'hero.png', w: 2880, h: 570 },
      { svg: 'icon.svg', out: 'icon-512.png', w: 512, h: 512 },
      { svg: 'icon.svg', out: 'icon-192.png', w: 192, h: 192 },
      { svg: 'icon.svg', out: 'icon-180.png', w: 180, h: 180 },
    ];
    for (const j of jobs) {
      let svg = fs.readFileSync(path.join(SRC, key, j.svg), 'utf8');
      svg = svg.replace(/width="\d+" height="\d+"/, `width="${j.w}" height="${j.h}"`);
      const page = await browser.newPage({ viewport: { width: j.w, height: j.h }, deviceScaleFactor: 1 });
      await page.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`);
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(200);
      await page.screenshot({ path: path.join(dir, j.out), omitBackground: true, clip: { x: 0, y: 0, width: j.w, height: j.h } });
      await page.close();
    }
  }
  await browser.close();
  console.log('done');
})();
