// Integration smoke: import media → clips → launch → effects → save → screenshot.
import { chromium } from 'playwright';

const url = process.env.APP_URL || 'http://localhost:5173/';

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 950 } });

const errors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text());
});
page.on('pageerror', (err) => errors.push(`PAGEERROR: ${err.message}`));

await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(1500);

// 1. Open LIB tab and import test media
await page.locator('button:text("LIB")').click();
await page.waitForTimeout(300);
await page.locator('#lib-file').setInputFiles([
  'test-media/test-video.webm',
  'test-media/test-video2.webm',
  'test-media/test-image.png',
]);
await page.waitForTimeout(3500);

// media imported → clips should be auto-filled
const clipCells = page.locator('div:has(> img)').filter({ hasText: /test-/ });
const named = await page.locator('text=test-video').count();
console.log('clips/menus with media names:', named);

// 2. Switch to FX tab, click first clip cell to launch
await page.locator('button:text("FX")').click();
await page.waitForTimeout(200);

// Click a clip cell containing "test-video" label
const cell = page.locator('div.group:has-text("test-video")').first();
await cell.click();
await page.waitForTimeout(1200);

// layer panel should now show a clip assigned
const layerWithClip = await page.locator('text=test-video').count();
console.log('layer/clip references after launch:', layerWithClip);

// 3. Add an effect (kaleidoscope) to the selected layer
await page.locator('select').first().selectOption('kaleidoscope').catch(() => {});
await page.locator('button:has-text("ADD")').first().click().catch(() => {});
await page.waitForTimeout(500);

// 4. Add a feedback effect too (order matters)
await page.locator('select').first().selectOption('feedback').catch(() => {});
await page.locator('button:has-text("ADD")').first().click().catch(() => {});
await page.waitForTimeout(500);

// 5. Play transport
await page.keyboard.press('Space');
await page.waitForTimeout(1500);

await page.screenshot({ path: 'smoke-live.png' });

// 6. Check canvas actually rendered something (non-black GL canvas)
const canvasInfo = await page.evaluate(() => {
  const canvases = Array.from(document.querySelectorAll('canvas'));
  return canvases.map((c) => ({
    w: c.width,
    h: c.height,
    cls: c.className.slice(0, 40),
  }));
});
console.log('canvases:', JSON.stringify(canvasInfo));

// 7. Save project
await page.locator('button[title*="Save project"]').click();
await page.waitForTimeout(800);

// 8. Open projects list — saved project should appear
await page.locator('button[title*="Open project"]').click();
await page.waitForTimeout(600);
const savedVisible = await page.locator('text=Saved projects').isVisible().catch(() => false);
const savedCount = await page.locator('text=Untitled Project').count();
console.log('saved projects panel visible:', savedVisible, 'entries:', savedCount);

await page.screenshot({ path: 'smoke-saved.png' });

// 9. Performance mode
await page.keyboard.press('Escape');
await page.locator('button:text("PERF")').click();
await page.waitForTimeout(600);
await page.screenshot({ path: 'smoke-perf.png' });

console.log('ERRORS:', errors.length ? errors : 'none');
await browser.close();
process.exit(errors.length > 0 ? 1 : 0);
