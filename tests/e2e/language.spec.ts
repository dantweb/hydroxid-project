import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { rejectAllCookies } from './helpers/consent';
import { mockShop } from './helpers/mockShop';

/**
 * Sprint 16 (oxid-fe-user): peroxid's header, which HydroXid extends, offers the language change as
 * an Apex-like dropdown. Each instance configures its own locales (vibrant: en+de, dark-ocean and
 * light-red: de only per their oxid-config.yaml) — the dropdown exists exactly when there is a
 * choice. SCREENSHOTS=1 also writes docs/reports/language-<instance>-*.png.
 */
const instance = process.env.INSTANCE ?? 'vibrant';
const OUT = 'docs/reports';

test.beforeEach(async ({ page }) => {
  await mockShop(page);
  await rejectAllCookies(page);
});

test(`${instance}: language dropdown follows the instance's locales`, async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expect(page.getByTestId('pxd-header')).toBeVisible({ timeout: 20_000 });
  const config = (await (await page.request.get('/oxid-config.json')).json()) as {
    i18n?: { locales?: string[] };
  };
  const locales = config.i18n?.locales ?? ['en', 'de'];
  const toggle = page.getByTestId('pxd-language');

  if (locales.length < 2) {
    await expect(toggle).toHaveCount(0);
    return;
  }

  await expect(toggle).toBeVisible();
  await toggle.click();
  const options = page.getByTestId('pxd-language-option');
  await expect(options).toHaveCount(locales.length);
  if (process.env.SCREENSHOTS) {
    mkdirSync(OUT, { recursive: true });
    await page.screenshot({
      path: `${OUT}/language-${instance}-open.png`,
      clip: { x: 0, y: 0, width: 1440, height: 320 },
    });
  }
  const current = await page.locator('html').getAttribute('lang');
  const other = locales.find((code) => code !== current) ?? locales[1];
  await page.locator(`[data-testid="pxd-language-option"][lang="${other}"]`).click();
  await expect(page.locator('html')).toHaveAttribute('lang', other, { timeout: 20_000 });
});
