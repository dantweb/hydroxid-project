import { expect, test } from '@playwright/test';
import { mockShop } from './helpers/mockShop';

/** The GDPR cookie-consent plugin, end to end in a real browser. */
test.beforeEach(async ({ page }) => {
  await mockShop(page);
});

test('first visit: the dialog blocks until the visitor decides; nothing optional is granted', async ({
  page,
}) => {
  await page.goto('/');

  const dialog = page.getByTestId('cookie-consent');
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute('aria-modal', 'true');
  await expect(page.getByTestId('cookie-accept-all')).toBeFocused();
  // Consent Mode: all-denied default queued before any decision
  const first = await page.evaluate(
    () => (window as unknown as { dataLayer: unknown[][] }).dataLayer[0],
  );
  expect(first.slice(0, 2)).toEqual(['consent', 'default']);
  expect(await page.evaluate(() => localStorage.getItem('hydroxid_cookie_consent'))).toBeNull();
  await expect(page.getByTestId('cookie-settings')).toHaveCount(0);
});

test('accept all: closes, persists, grants every signal, survives a reload', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('cookie-accept-all').click();

  await expect(page.getByTestId('cookie-consent')).toHaveCount(0);
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('hydroxid_cookie_consent') ?? '{}'),
  );
  expect(stored).toMatchObject({
    method: 'accept_all',
    categories: { marketing: true, statistics: true },
  });
  const update = await page.evaluate(() =>
    (window as unknown as { dataLayer: unknown[][] }).dataLayer.find(
      (entry) => entry[1] === 'update',
    ),
  );
  expect(update?.[2]).toMatchObject({ analytics_storage: 'granted', ad_storage: 'granted' });

  await page.reload();
  await expect(page.getByTestId('cookie-consent')).toHaveCount(0); // decided: not asked again
  await expect(page.getByTestId('cookie-settings')).toBeVisible();
});

test('reject all: only strictly necessary stays on', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('cookie-reject-all').click();

  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('hydroxid_cookie_consent') ?? '{}'),
  );
  expect(stored.categories).toEqual({
    necessary: true,
    preferences: false,
    statistics: false,
    marketing: false,
  });
});

test('customize: pick categories; strictly necessary is locked on', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('cookie-customize').click();

  await expect(page.getByTestId('cookie-toggle-necessary')).toBeChecked();
  await expect(page.getByTestId('cookie-toggle-necessary')).toBeDisabled();
  await page.getByTestId('cookie-toggle-statistics').check();
  await page.getByTestId('cookie-save').click();

  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('hydroxid_cookie_consent') ?? '{}'),
  );
  expect(stored).toMatchObject({
    method: 'custom',
    categories: { statistics: true, marketing: false, preferences: false },
  });
});

test('the footer link and the settings button re-open the dialog with the stored choice', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByTestId('cookie-reject-all').click();
  await expect(page.getByTestId('cookie-consent')).toHaveCount(0);

  await page.getByTestId('hx-cookie-settings').click(); // footer of the hydroxid plugin
  await expect(page.getByTestId('cookie-consent')).toBeVisible();
  await page.getByTestId('cookie-customize').click();
  await expect(page.getByTestId('cookie-toggle-statistics')).not.toBeChecked();
  await page.getByTestId('cookie-save').click();

  await page.getByTestId('cookie-settings').click(); // the persistent button
  await expect(page.getByTestId('cookie-consent')).toBeVisible();
});

test('keyboard: Tab stays inside the dialog', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('cookie-accept-all')).toBeFocused(); // the dialog took focus
  for (let i = 0; i < 6; i += 1) {
    await page.keyboard.press('Tab');
    const inside = await page.evaluate(() =>
      Boolean(document.activeElement?.closest('[data-testid="cookie-consent"]')),
    );
    expect(inside).toBe(true);
  }
});

test('a bumped policy version asks a returning visitor again', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'hydroxid_cookie_consent',
      JSON.stringify({
        version: 0,
        decidedAt: new Date().toISOString(),
        method: 'accept_all',
        categories: { necessary: true, preferences: true, statistics: true, marketing: true },
      }),
    );
  });
  await page.goto('/');
  await expect(page.getByTestId('cookie-consent')).toBeVisible(); // stored v0 < configured v1
});
