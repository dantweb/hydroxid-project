import { expect, test } from '@playwright/test';
import { mockShop, signInAsAda } from './helpers/mockShop';

/** The project layer: its layout plugin, its overriding dashboard plugin, and the instance's theme. */
const instance = process.env.INSTANCE ?? 'vibrant';
const EXPECTED = {
  vibrant: {
    theme: 'hydroxid-vibrant',
    font: 'Poppins',
    primary: 'rgb(214, 0, 111)',
    bg: 'rgb(255, 255, 255)',
  },
  'dark-ocean': {
    theme: 'hydroxid-dark-ocean',
    font: 'IBM Plex Sans',
    primary: 'rgb(34, 211, 238)',
    bg: 'rgb(6, 20, 31)',
  },
  'light-red': {
    theme: 'hydroxid-light-red',
    font: 'Lato',
    primary: 'rgb(200, 16, 46)',
    bg: 'rgb(255, 249, 247)',
  },
}[instance]!;

test.beforeEach(async ({ page }) => {
  await mockShop(page);
  await page.addInitScript(() => {
    // decided already: these tests are about layout and theme, not the dialog
    localStorage.setItem(
      'hydroxid_cookie_consent',
      JSON.stringify({
        version: 1,
        decidedAt: '2026-01-01T00:00:00Z',
        method: 'reject_all',
        categories: { necessary: true, preferences: false, statistics: false, marketing: false },
      }),
    );
  });
});

test(`the ${instance} instance runs its theme with its own typeface`, async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveCSS('--oxfe-color-primary', /./, { timeout: 20_000 });

  await expect
    .poll(() =>
      page.evaluate(() => document.getElementById('oxfe-theme-css')?.getAttribute('href') ?? ''),
    )
    .toContain(EXPECTED.theme);
  await expect(page.locator('body')).toHaveCSS('background-color', EXPECTED.bg);
  const family = await page.locator('body').evaluate((el) => getComputedStyle(el).fontFamily);
  expect(family).toContain(EXPECTED.font);
  // the webfont really loaded (not a silent fallback)
  const loaded = await page.evaluate(async (name) => {
    await document.fonts.ready;
    return [...document.fonts].some(
      (f) => f.family.replace(/['"]/g, '') === name && f.status === 'loaded',
    );
  }, EXPECTED.font);
  expect(loaded).toBe(true);
});

test('the HydroXid layout plugin supplies header and footer', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('hx-header')).toBeVisible();
  await expect(page.getByTestId('hx-brand')).toHaveText(/HydroXid/);
  await expect(page.getByTestId('hx-footer')).toBeVisible();
  await expect(page.locator('.header__brand')).toHaveCount(0); // the stock header is gone
});

test('primary buttons take the theme colour (shared button styles of oxid-fe-core)', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByTestId('hx-login')).toHaveCSS('background-color', EXPECTED.primary);
});

test('the dashboard plugin of oxid-fe-user is REPLACED by the project’s (greeting copy)', async ({
  page,
}) => {
  await signInAsAda(page);
  await page.goto('/dashboard');

  await expect(page.getByTestId('account-hello')).toHaveText('Welcome back Ada'); // stock: "Hello Ada"
  await expect(page.getByTestId('card-orders')).toBeVisible(); // the rest of the original still works
});
