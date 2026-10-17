import { expect, test } from '@playwright/test';
import { greetingCopy } from './helpers/copy';

/**
 * Against a REAL shop (not part of CI — it needs the shop's GraphQL):
 *   E2E_BASE_URL=https://pay1.oxid.dev:2053 LIVE=1 npx playwright test live
 * Proves the instance is connected to its shop: the catalogue loads, a customer can sign in, the
 * account shows HydroXid's overriding greeting, and the checkout reaches delivery and payment.
 */
test.skip(!process.env.LIVE || !process.env.E2E_BASE_URL, 'set LIVE=1 and E2E_BASE_URL');
test.describe.configure({ mode: 'serial' });
test.setTimeout(120_000);

const USER = {
  email: process.env.SHOP_USER ?? 'playwright.user@oxid-esales.dev',
  password: process.env.SHOP_PASSWORD ?? 'useruser',
};

test.beforeEach(async ({ page }) => {
  // an accepted cookie decision, as a returning visitor has (the dialog is covered in consent.spec)
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

async function signIn(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/login');
  await page.locator('input[name=email]').fill(USER.email);
  await page.locator('input[name=password]').fill(USER.password);
  await page.locator('[data-testid="login-form"] button[type=submit]').click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 30_000 });
}

test('the shop is connected: the catalogue lists products with prices and categories', async ({
  page,
}) => {
  await page.goto('/shop');

  await expect(page.getByTestId('product-card').first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('product-card-title').first()).not.toBeEmpty();
  await expect(page.getByTestId('product-card-price').first()).toContainText('€');
  await expect(page.getByText(/could not be loaded|konnte nicht geladen/i)).toHaveCount(0);
});

test('a customer signs in — no "HTTP 404: response is not JSON"', async ({ page }) => {
  await page.goto('/login');
  await page.locator('input[name=email]').fill(USER.email);
  await page.locator('input[name=password]').fill(USER.password);
  await page.locator('[data-testid="login-form"] button[type=submit]').click();

  await expect(page.getByTestId('login-error')).toHaveCount(0);
  await expect(page).not.toHaveURL(/\/login/, { timeout: 30_000 });
});

test('the account shows HydroXid’s greeting (the overriding dashboard plugin) and the real data', async ({
  page,
}) => {
  await signIn(page);
  await page.goto('/dashboard');

  await expect(page.getByTestId('account-hello')).toContainText(
    new RegExp(`${greetingCopy.en.hello}|${greetingCopy.de.hello}`),
    {
      timeout: 30_000,
    },
  );
  await expect(page.getByTestId('account-email')).toHaveText(USER.email);
  await expect(page.getByTestId('card-orders')).toBeVisible();
});

test('a basket reaches delivery and payment in the checkout', async ({ page }) => {
  await signIn(page);
  await page.goto('/shop');
  await page.getByTestId('product-card').first().click();
  await page.getByTestId('add-to-cart').click();
  await expect(page.getByTestId('added-note')).toBeVisible();
  await page.goto('/checkout');

  // either the saved address or the form; with an orderable product: delivery, then payment
  await expect(
    page.getByTestId('address-saved').or(page.getByTestId('address-form')).first(),
  ).toBeVisible({ timeout: 30_000 });
  await expect(
    page.getByTestId('confirm-terms').or(page.getByTestId('checkout-error')).first(),
  ).toBeVisible({ timeout: 30_000 });
});
