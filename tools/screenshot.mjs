import puppeteer from 'puppeteer-core';
const { chromium } = { chromium: puppeteer };

const BASE = 'http://localhost:8000';
const OUT = '/workspace/docs/screenshots';

const pages = [
  ['index', 'Home / product grid'],
  ['detail', 'Product detail'],
  ['compare', 'Comparison table'],
  ['admin', 'Admin dashboard'],
];

const viewports = [
  ['mobile-portrait', 390, 844],
  ['mobile-landscape', 844, 390],
  ['tablet-portrait', 768, 1024],
  ['desktop-1080p', 1440, 900],
  ['desktop-1440p', 1920, 1080],
  ['desktop-4k', 2560, 1440],
];

const browser = await puppeteer.launch({
  executablePath: '/root/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell',
  args: ['--no-sandbox'],
});

for (const [file, label] of pages) {
  for (const [name, w, h] of viewports) {
    const page = await browser.newPage();
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
    await page.goto(`${BASE}/${file}.html`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 300));
    const path = `${OUT}/${file}__${name}.png`;
    await page.screenshot({ path });
    console.log('OK', path, '-', label, `(${w}x${h})`);
    await page.close();
  }
}
await browser.close();
