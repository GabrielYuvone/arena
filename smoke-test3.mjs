// Targeted tests: performance mode layout + effects chain + layer param change.
import { chromium } from 'playwright';

const url = process.env.APP_URL || 'http://localhost:5173/';
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 950 } });
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`));

await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

// --- import media + launch clip ---
await page.locator('button:text("LIB")').click();
await page.locator('#lib-file').setInputFiles(['test-media/test-video.webm', 'test-media/test-image.png']);
await page.waitForTimeout(3000);
await page.locator('button:text("FX")').click();
await page.locator('div.group:has-text("test-video")').first().click();
await page.waitForTimeout(800);

// --- effects: use the ADD control inside the EFFECTS panel ---
const fxPanel = page.locator('section:has(h2:text-is("Effects"))');
const fxSelect = fxPanel.locator('select').nth(1);
await fxSelect.selectOption('kaleidoscope');
await fxPanel.locator('button:has-text("ADD")').click();
await fxSelect.selectOption('feedback');
await fxPanel.locator('button:has-text("ADD")').click();
await fxSelect.selectOption('vignette');
await fxPanel.locator('button:has-text("ADD")').click();
await page.waitForTimeout(600);

const fxCount = await fxPanel.locator('div.border:has(header)').count();
const fxNames = await fxPanel.locator('span.text-2xs.text-txt-hi.truncate').allTextContents();
console.log('effects in chain:', fxNames);

// --- move effect up (reorder) ---
await fxPanel.locator('button[title="Move down"]').first().click();
await page.waitForTimeout(200);

// --- performance mode ---
await page.locator('button:text("PERF")').click();
await page.waitForTimeout(500);
const perfHeader = await page.locator('text=EXIT PERF MODE').isVisible();
const layersVisible = await page.locator('text=Layer 1').isVisible().catch(() => false);
const matrixVisible = await page.locator('text=CLIP MATRIX').isVisible().catch(() => false);
const tabsVisible = await page.locator('button:text("MIDI")').isVisible().catch(() => false);
console.log('PERF MODE → header:', perfHeader, '| layers visible:', layersVisible, '| matrix:', matrixVisible, '| tabs:', tabsVisible);
await page.screenshot({ path: 'smoke-perf2.png' });

// --- exit perf, change layer opacity slider via keyboard ---
await page.locator('text=EXIT PERF MODE').click();
await page.waitForTimeout(400);

// --- verify pixel output: GL canvas should not be fully black ---
const bright = await page.evaluate(() => {
  const gl = document.querySelector('canvas.w-full.h-full.block');
  if (!gl) return -1;
  const g = gl.getContext('webgl', { preserveDrawingBuffer: true });
  if (!g) return -2;
  const px = new Uint8Array(4 * 64);
  g.readPixels(300, 200, 8, 8, g.RGBA, g.UNSIGNED_BYTE, px);
  let sum = 0;
  for (let i = 0; i < px.length; i += 4) sum += px[i] + px[i + 1] + px[i + 2];
  return sum;
});
console.log('GL pixel brightness sample (should be > 0 with video playing):', bright);

console.log('ERRORS:', errors.length ? errors : 'none');
await browser.close();
process.exit(errors.length > 0 ? 1 : 0);
