import { test } from '@playwright/test';

/**
 * Screenshots of one running instance against a REAL shop (not part of CI — it needs the shop):
 *   E2E_BASE_URL=http://localhost:8101 THEME=vibrant npx playwright test evidence
 */
const theme = process.env.THEME;
test.skip(!theme || !process.env.E2E_BASE_URL, 'set E2E_BASE_URL and THEME to capture evidence');
test.use({ viewport: { width: 1280, height: 900 } });
const OUT = 'docs/reports';

test(`screenshots — ${theme}`, async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('cookie-consent').waitFor();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/${theme}-1-cookie-dialog.png` });

  await page.getByTestId('cookie-customize').click();
  await page.screenshot({ path: `${OUT}/${theme}-2-cookie-customize.png` });
  await page.getByTestId('cookie-toggle-statistics').check();
  await page.getByTestId('cookie-save').click();

  await page.goto('/shop');
  await page.getByTestId('product-card').first().waitFor({ timeout: 30_000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/${theme}-3-shop.png` });

  await page.getByTestId('product-card').first().click();
  await page.getByTestId('add-to-cart').waitFor();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${theme}-4-product.png` });

  await page.goto('/login');
  await page.screenshot({ path: `${OUT}/${theme}-5-login.png` });
});
