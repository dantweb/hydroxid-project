import { expect, test, type Page } from '@playwright/test';
import { mockShop, signInAsAda } from './helpers/mockShop';

/**
 * After a deploy, an already open page notices the new release (a different entry bundle in the
 * server's index.html) and reloads — except in the checkout, where it only offers a banner.
 * The "new release" is simulated by answering the watcher's request with a changed bundle name.
 */
test.beforeEach(async ({ page }) => {
  await mockShop(page);
  await page.addInitScript(() => {
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

/** Fast polling, and auto-reload on or off, for the page under test. */
async function watcherConfig(page: Page, autoReload: boolean): Promise<void> {
  await page.route('**/oxid-config.json', async (route) => {
    const response = await route.fetch();
    const config = await response.json();
    config.plugins['release-watcher'] = {
      enabled: true,
      config: { interval_seconds: 5, auto_reload: autoReload },
    };
    await route.fulfill({ response, json: config });
  });
}

/** The server's index.html now names a different entry bundle. */
async function deployNewRelease(page: Page): Promise<void> {
  await page.route(/\/\?release-check=/, async (route) => {
    const response = await route.fetch();
    const html = (await response.text()).replace(/index-[\w-]+\.js/, 'index-NEWRELEASE.js');
    await route.fulfill({ response, body: html });
  });
}

const markPage = (page: Page) =>
  page.evaluate(() => ((window as unknown as { __old: boolean }).__old = true));
/** false once the old document is gone (also while it is mid-reload and cannot be asked) */
const isOldPage = (page: Page) =>
  page.evaluate(() => (window as unknown as { __old?: boolean }).__old === true).catch(() => false);

test('a new release reloads an open page by itself', async ({ page }) => {
  await watcherConfig(page, true);
  await page.goto('/');
  await expect(page.getByTestId('pxd-hero')).toBeVisible();
  await markPage(page);
  expect(await isOldPage(page)).toBe(true);

  await deployNewRelease(page);

  await expect.poll(() => isOldPage(page), { timeout: 20_000 }).toBe(false); // reloaded: the marker is gone
  await expect(page.getByTestId('pxd-hero')).toBeVisible();
});

test('without auto-reload the visitor gets a banner and a refresh button', async ({ page }) => {
  await watcherConfig(page, false);
  await page.goto('/');
  await markPage(page);
  await deployNewRelease(page);

  await expect(page.getByTestId('release-banner')).toBeVisible({ timeout: 20_000 });
  expect(await isOldPage(page)).toBe(true); // nothing reloaded behind the visitor's back

  await page.getByTestId('release-refresh').click();
  await expect.poll(() => isOldPage(page), { timeout: 15_000 }).toBe(false);
});

test('in the checkout a new release never reloads the page — only the banner appears', async ({
  page,
}) => {
  await watcherConfig(page, true);
  await signInAsAda(page); // the checkout needs a customer
  await page.goto('/checkout');
  await expect(page).toHaveURL(/\/checkout$/);
  await markPage(page);
  await deployNewRelease(page);

  await expect(page.getByTestId('release-banner')).toBeVisible({ timeout: 20_000 });
  expect(await isOldPage(page)).toBe(true);
});

test('the same release is left alone: no reload, no banner', async ({ page }) => {
  await watcherConfig(page, true);
  await page.goto('/');
  await markPage(page);

  await page.waitForTimeout(12_000); // two polling rounds
  expect(await isOldPage(page)).toBe(true);
  await expect(page.getByTestId('release-banner')).toHaveCount(0);
});
