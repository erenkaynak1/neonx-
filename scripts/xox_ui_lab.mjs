import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.NEON_XOX_URL || 'http://127.0.0.1:4173/side-games/football-xox/index.html';
const timeout = Number(process.env.NEON_BOT_TIMEOUT || 45000);
const outDir = path.resolve('artifacts/xox-ui-lab');
await fs.mkdir(outDir, { recursive: true });

const report = { ok: false, base, diagnostics: null, flagSrc: null, error: null };
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
page.setDefaultTimeout(timeout);

try {
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout });
  await page.waitForSelector('body[data-ct-screen="menu"]', { timeout });

  report.diagnostics = await page.evaluate(() => window.NX_XOX_DATA_INTEGRITY || null);
  if (!report.diagnostics) throw new Error('NX_XOX_DATA_INTEGRITY diagnostics missing');
  if (Number(report.diagnostics.enrichedPlayers || 0) < 400) {
    throw new Error(`Expected at least 400 enriched XOX players, got ${report.diagnostics.enrichedPlayers}`);
  }
  if (Number(report.diagnostics.addedClubLinks || 0) < 400) {
    throw new Error(`Expected at least 400 restored club links, got ${report.diagnostics.addedClubLinks}`);
  }

  await page.getByRole('button', { name: 'TEK TELEFON' }).click();
  await page.waitForSelector('body[data-ct-screen="game"] .cell:not(:disabled)', { timeout });
  await page.locator('.cell:not(:disabled)').first().click();
  await page.waitForSelector('#pickerModal .field', { timeout });
  await page.locator('#pickerModal .field').fill('Arda Güler');
  await page.waitForSelector('#pickerModal .result', { timeout });
  const arda = page.locator('#pickerModal .result').filter({ hasText: 'Arda Güler' }).first();
  await arda.waitFor({ state: 'visible', timeout });
  const flag = arda.locator('.nx-xox-flag-result');
  await flag.waitFor({ state: 'attached', timeout });
  report.flagSrc = await flag.getAttribute('src');
  if (!report.flagSrc?.includes('flagcdn.com/tr.svg')) {
    throw new Error(`Turkey flag image missing or incorrect: ${report.flagSrc}`);
  }

  await page.screenshot({ path: path.join(outDir, 'xox-flags-pass.png'), fullPage: true });
  report.ok = true;
} catch (error) {
  report.error = String(error?.stack || error);
  await page.screenshot({ path: path.join(outDir, 'xox-flags-fail.png'), fullPage: true }).catch(() => {});
  throw error;
} finally {
  await fs.writeFile(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2), 'utf8');
  await browser.close();
}

console.log(JSON.stringify(report, null, 2));
