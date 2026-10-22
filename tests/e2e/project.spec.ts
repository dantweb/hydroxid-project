import { expect, test } from '@playwright/test';
import { rejectAllCookies } from './helpers/consent';
import { greetingCopy, hydroxidCopy } from './helpers/copy';
import { mockShop, signInAsAda } from './helpers/mockShop';

/** The project layer: its peroxid-extending plugin, its overriding dashboard plugin, and the instance's theme. */
const instance = process.env.INSTANCE ?? 'vibrant';
// the expected wording is READ from the localisation files: editing a translation must not break CI
const COPY = {
  en: { hero: hydroxidCopy.en.hero.title, greeting: `${greetingCopy.en.hello} Ada` },
  de: { hero: hydroxidCopy.de.hero.title, greeting: `${greetingCopy.de.hello} Ada` },
} as const;
const EXPECTED = {
  vibrant: {
    lang: 'en' as const,
    theme: 'hydroxid-vibrant',
    font: 'Poppins',
    primary: 'rgb(214, 0, 111)',
    bg: 'rgb(255, 255, 255)',
  },
  'dark-ocean': {
    lang: 'de' as const,
    theme: 'hydroxid-dark-ocean',
    font: 'IBM Plex Sans',
    primary: 'rgb(34, 211, 238)',
    bg: 'rgb(6, 20, 31)',
  },
  'light-red': {
    lang: 'de' as const,
    theme: 'hydroxid-light-red',
    font: 'Lato',
    primary: 'rgb(190, 4, 193)',
    bg: 'rgb(255, 249, 247)',
  },
}[instance]!;

test.beforeEach(async ({ page }) => {
  await mockShop(page);
  await rejectAllCookies(page);
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

test('the hydroxid plugin extends peroxid: its header and front page, HydroXid’s footer and copy', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByTestId('pxd-header')).toBeVisible(); // peroxid's own header
  await expect(page.getByTestId('pxd-brand')).toHaveText(/PEROXID/);
  await expect(page.getByTestId('pxd-hero')).toBeVisible(); // peroxid's front page …
  await expect(page.getByTestId('pxd-hero')).toContainText(COPY[EXPECTED.lang].hero); // … with HydroXid's copy
  await expect(page.getByTestId('hx-footer')).toBeVisible();
  await expect(page.getByTestId('pxd-footer')).toBeVisible(); // peroxid's footer inside ours
  await expect(page.locator('.header__brand')).toHaveCount(0); // the stock header is gone
});

test('primary buttons take the theme colour (shared button styles of oxid-fe-core)', async ({
  page,
}) => {
  await page.goto('/login');
  await expect(page.locator('[data-testid="login-form"] button[type=submit]')).toHaveCSS(
    'background-color',
    EXPECTED.primary,
  );
});

test('the dashboard plugin of oxid-fe-user is REPLACED by the project’s (greeting copy)', async ({
  page,
}) => {
  await signInAsAda(page);
  await page.goto('/dashboard');

  await expect(page.getByTestId('account-hello')).toHaveText(COPY[EXPECTED.lang].greeting); // stock: "Hello Ada"
  await expect(page.getByTestId('card-orders')).toBeVisible(); // the rest of the original still works
});

test('the instance speaks ONE language: <html lang>, the hero copy, and a browser in another language does not change it', async ({
  browser,
}) => {
  const other = EXPECTED.lang === 'en' ? 'de-DE' : 'en-GB';
  const context = await browser.newContext({ locale: other });
  const page = await context.newPage();
  await mockShop(page);
  await page.addInitScript(() => {
    localStorage.setItem(
      'hydroxid_cookie_consent',
      JSON.stringify({
        version: 1,
        decidedAt: 'x',
        method: 'reject_all',
        categories: { necessary: true, preferences: false, statistics: false, marketing: false },
      }),
    );
  });
  const asked: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/graphql'))
      asked.push(request.headers()['accept-language'] ?? '(none)');
  });
  await page.goto('/');

  await expect(page.getByTestId('pxd-hero')).toContainText(COPY[EXPECTED.lang].hero);
  await expect(page.locator('html')).toHaveAttribute('lang', EXPECTED.lang);
  // and the SHOP is asked in the instance's language, so its product data comes in that language too
  expect(asked.length).toBeGreaterThan(0);
  expect(new Set(asked)).toEqual(new Set([EXPECTED.lang]));
  await context.close();
});
