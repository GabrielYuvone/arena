// Diagnostic: dump exact state before/after screenshot to find state flapping.
import { chromium } from 'playwright';

const url = process.env.APP_URL || 'http://localhost:5173/';
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 950 } });
page.on('console', (m) => {
  if (m.type() === 'error') console.log('CONSOLE ERROR:', m.text());
});
page.on('pageerror', (e) => console.log('PAGE ERROR:', e.message));
page.on('framenavigated', (f) => console.log('NAVIGATED:', f.url()));

const dump = (label) =>
  page.evaluate((lbl) => {
    const fx = document.querySelector('section:has(h2)');
    const all = Array.from(document.querySelectorAll('section h2')).map((h) => h.textContent);
    const perfBtn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'PERF');
    return {
      label: lbl,
      asides: document.querySelectorAll('aside').length,
      sections: all,
      fxNames: Array.from(document.querySelectorAll('span.flex-1.text-2xs.text-txt-hi.truncate')).map(
        (s) => s.textContent,
      ),
      perfBtnClass: perfBtn?.className.includes('bg-accent') ? 'ACTIVE' : 'inactive',
      exitPerfVisible: !!Array.from(document.querySelectorAll('button')).find(
        (b) => b.textContent?.includes('EXIT PERF') && b.offsetParent !== null,
      ),
      layerNames: Array.from(document.querySelectorAll('div.text-2xs.text-txt-hi.truncate.leading-tight')).map(
        (s) => s.textContent,
      ),
    };
  }, label).then((r) => console.log(JSON.stringify(r, null, 1)));

await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);

await page.locator('button:text("LIB")').click();
await page.locator('#lib-file').setInputFiles(['test-media/test-video.webm']);
await page.waitForTimeout(3000);
await page.locator('button:text("FX")').click();
await page.locator('div.group:has-text("test-video")').first().click();
await page.waitForTimeout(600);

const fxPanel = page.locator('section:has(h2:text-is("Effects"))');
const fxSelect = fxPanel.locator('select').nth(1);
await fxSelect.selectOption('kaleidoscope');
await fxPanel.locator('button:has-text("ADD")').click();
await fxSelect.selectOption('vignette');
await fxPanel.locator('button:has-text("ADD")').click();
await page.waitForTimeout(400);

await dump('after-effects');
await page.waitForTimeout(2000);
await dump('after-2s');

await page.locator('button:text("PERF")').click();
await page.waitForTimeout(600);
await dump('perf-on');
await page.screenshot({ path: 'diag-perf.png' });
await dump('after-screenshot');

await browser.close();
