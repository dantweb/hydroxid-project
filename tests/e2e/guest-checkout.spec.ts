import { expect, test, type Locator, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { rejectAllCookies } from './helpers/consent';
import { mockShop } from './helpers/mockShop';

/**
 * Sprint 140c (C5): HydroXid inherits the guest checkout of oxid-fe-user 0.7.0. Without a login and with
 * one item in the basket, /checkout shows the guest form in the instance's theme — on the desktop project
 * and on the four device profiles of playwright.config.ts (tap targets >= 44 px, no sideways scroll).
 * Choose the theme with INSTANCE=vibrant|dark-ocean|light-red. SCREENSHOTS=1 writes
 * docs/reports/guest-checkout/<instance>-desktop.png and <instance>-phone.png.
 */
const instance = process.env.INSTANCE ?? 'vibrant';
const OUT = 'docs/reports/guest-checkout';
const MIN_TAP_TARGET = 44;
const CART_KEY = 'oxfe_shop_cart'; // the shop plugin's guest cart (localStorage)
const PHONE_SCREENSHOT_PROJECT = 'galaxy-s24';

test.beforeEach(async ({ page }) => {
  await mockShop(page);
  await rejectAllCookies(page);
  await page.addInitScript(
    ([key]) =>
      localStorage.setItem(
        key,
        JSON.stringify([
          { productId: 'p1', title: 'Kuyichi Jeans', price: 29.9, currencyName: 'EUR', amount: 1 },
        ]),
      ),
    [CART_KEY],
  );
});

async function openGuestCheckout(page: Page): Promise<Locator> {
  await page.goto('/checkout');
  const form = page.getByTestId('guest-form');
  await expect(form).toBeVisible({ timeout: 30_000 });
  return form;
}

async function expectTapTarget(locator: Locator, what: string): Promise<void> {
  const box = await locator.boundingBox();
  expect(box, `${what}: not rendered`).not.toBeNull();
  expect(box!.height, `${what}: too short to tap`).toBeGreaterThanOrEqual(MIN_TAP_TARGET);
  expect(box!.width, `${what}: too narrow to tap`).toBeGreaterThanOrEqual(MIN_TAP_TARGET);
}

test(`${instance}: a shopper without a login gets the guest form at /checkout, not the login page`, async ({
  page,
}) => {
  const form = await openGuestCheckout(page);

  await expect(page).toHaveURL(/\/checkout$/);
  for (const name of ['email', 'firstName', 'lastName', 'street', 'zipCode', 'city']) {
    await expect(form.locator(`input[name=${name}]`)).toBeVisible();
  }
  await expect(page.getByTestId('guest-deliver-elsewhere')).toBeVisible();
  await expect(page.getByTestId('confirm-terms')).toBeVisible();
  await expect(page.getByTestId('pay-now')).toBeVisible();
  await expect(page.getByTestId('guest-cart-empty')).toHaveCount(0);
  await expect(page.getByTestId('pxd-header')).toBeVisible(); // inside the instance's own layout
});

test(`${instance}: the guest form fits the screen and can be tapped`, async ({ page }) => {
  const form = await openGuestCheckout(page);

  const width = page.viewportSize()!.width;
  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(overflow.scrollWidth, 'page scrolls sideways').toBeLessThanOrEqual(overflow.innerWidth);
  const box = (await form.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(width + 0.5);

  for (const name of ['email', 'firstName', 'lastName', 'street', 'zipCode', 'city']) {
    await expectTapTarget(form.locator(`input[name=${name}]`), `input ${name}`);
  }
  await expectTapTarget(page.getByTestId('pay-now'), 'pay button');
  await expectTapTarget(
    page.getByTestId('guest-deliver-elsewhere').locator('..'),
    'deliver-elsewhere row',
  );
  await expectTapTarget(page.getByTestId('confirm-terms').locator('..'), 'terms row');

  const project = test.info().project.name;
  const shot =
    project === 'chromium' ? 'desktop' : project === PHONE_SCREENSHOT_PROJECT ? 'phone' : null;
  if (process.env.SCREENSHOTS && shot) {
    mkdirSync(OUT, { recursive: true });
    await page.screenshot({ path: `${OUT}/${instance}-${shot}.png`, fullPage: true });
  }
});
