// Smoke test: load VJ Studio in headless Chromium, catch console errors, screenshot.
import { chromium } from 'playwright';

const url = process.env.APP_URL || 'http://localhost:5173/';

const browser = await chromium.launch({
  headless: true,
  args: [
    '--use-gl=swiftshader',
    '--enable-unsafe-swiftshader',
    '--autoplay-policy=no-user-gesture-required',
  ],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 950 } });

const errors = [];
const logs = [];
page.on('console', (msg) => {
  logs.push(`[${msg.type()}] ${msg.text()}`);
  if (msg.type() === 'error') errors.push(msg.text());
});
page.on('pageerror', (err) => errors.push(`PAGEERROR: ${err.message}`));

await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2500);

// Basic UI presence checks
const checks = {
  topbar: await page.locator('text=VJ STUDIO').count(),
  clipMatrix: await page.locator('text=CLIP MATRIX').count(),
  layers: await page.locator('text=LAYERS').first().isVisible().catch(() => false),
  preview: await page.locator('canvas').count(),
  transport: await page.locator('text=QUANT').count(),
  fxTab: await page.locator('button:text("FX")').count(),
};

// Interact: click a layer, open tabs, trigger slider reset etc.
await page.locator('button:text("AUD")').click().catch(() => {});
await page.waitForTimeout(300);
await page.locator('button:text("MIDI")').click().catch(() => {});
await page.waitForTimeout(300);
await page.locator('button:text("FX")').click().catch(() => {});
await page.waitForTimeout(300);

// BPM tap
await page.locator('button:text("TAP")').click().catch(() => {});

await page.screenshot({ path: 'smoke-ui.png', fullPage: false });

console.log('CHECKS:', JSON.stringify(checks, null, 2));
console.log('ERRORS:', errors.length ? errors : 'none');
console.log('LOGS_TAIL:', logs.slice(-12));

await browser.close();
process.exit(errors.length > 0 ? 1 : 0);
