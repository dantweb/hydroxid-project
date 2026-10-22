import { expect, type Page } from '@playwright/test';

/** Test data of the providers' sandboxes (public documentation values). */
export const STRIPE = {
  visa: '4242424242424242',
  declined: '4000000000000002',
  expiry: '12/34',
  cvc: '123',
  name: 'Marc Muster',
};
export const MOLLIE_CARD = {
  holder: 'Test Buyer',
  number: '4543474002249996',
  expiry: '1230',
  cvc: '123',
};
export const ORDERABLE_PRODUCT_ID = '066e3ce119c43c81cc0e46d4f1681eed'; // "Destiny" (demo data)
export const PAYMENT_IDS = {
  stripe: 'oe_payments_stripe_wallet',
  mollie: 'oe_payments_mollie',
} as const;

/** The shop customer the live specs sign in as. No default: a committed login is a leak (138a). */
export const SHOP_LOGIN_CONFIGURED = !!process.env.SHOP_USER && !!process.env.SHOP_PASSWORD;
export const SHOP_LOGIN_MISSING =
  'SHOP_USER / SHOP_PASSWORD not set (the shop customer the live specs sign in as)';

/** A returning visitor's cookie decision: these specs are about payments, not the dialog. */
export async function decideCookies(page: Page): Promise<void> {
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
}

export async function signIn(page: Page): Promise<void> {
  await page.goto('/login');
  await page.locator('input[name=email]').fill(process.env.SHOP_USER ?? '');
  await page.locator('input[name=password]').fill(process.env.SHOP_PASSWORD ?? '');
  await page.locator('[data-testid="login-form"] button[type=submit]').click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 30_000 });
}

/** Signed-in shopper, one product in the cart, on the checkout's payment step with the method chosen. */
export async function openPaymentStep(
  page: Page,
  payment: keyof typeof PAYMENT_IDS,
): Promise<void> {
  await decideCookies(page);
  await signIn(page);
  await page.goto(`/shop/product/${ORDERABLE_PRODUCT_ID}`);
  await page.getByTestId('add-to-cart').click();
  await expect(page.getByTestId('added-note')).toBeVisible();
  await page.goto('/checkout');

  const form = page.getByTestId('address-form');
  await form.or(page.getByTestId('address-saved')).first().waitFor({ timeout: 30_000 });
  if (await form.isVisible()) {
    await page.locator('input[name=firstName]').fill('Marc');
    await page.locator('input[name=lastName]').fill('Muster');
    await page.locator('input[name=street]').fill('Bertoldstr');
    await page.locator('input[name=streetNumber]').fill('48');
    await page.locator('input[name=zipCode]').fill('79098');
    await page.locator('input[name=city]').fill('Freiburg');
    await page.getByTestId('save-address').click();
  }
  const method = page.getByTestId(`payment-${PAYMENT_IDS[payment]}`);
  // several delivery methods (e.g. a cart over €100) have to be chosen; a single one is preselected
  const delivery = page.locator('input[name=delivery]').first();
  await expect(method.or(delivery)).toBeVisible({ timeout: 30_000 });
  if (!(await method.isVisible())) {
    await delivery.check();
  }
  await expect(method).toBeVisible({ timeout: 30_000 });
  await method.check();
}

export const confirmTerms = (page: Page) => page.getByTestId('confirm-terms').check();

/** After the provider finished: the return route settles the contract and shows the order number. */
export async function expectCommittedOrder(page: Page, provider: string): Promise<string> {
  await page.waitForURL(new RegExp(`/checkout/return/${provider}`), { timeout: 120_000 });
  const committed = page.getByTestId('return-committed');
  await expect(committed).toBeVisible({ timeout: 90_000 });
  const orderNumber = (await committed.innerText()).match(/\d+/)?.[0];
  expect(orderNumber, 'order number on the confirmation').toBeTruthy();
  return orderNumber!;
}

/** The order is live in the account: paid or open (authorized), never cancelled. */
export async function expectOrderInDashboard(page: Page, orderNumber: string): Promise<void> {
  await page.goto('/dashboard/orders');
  const row = page.getByTestId('order-row').filter({
    has: page.getByRole('link', { name: `#${orderNumber}`, exact: true }),
  });
  await expect(row).toBeVisible({ timeout: 30_000 });
  await expect(row).toContainText(/paid|bezahlt|open|offen/i);
  await expect(row).not.toContainText(/cancelled|storniert/i);
}

/** Mollie Components load lazily: a field is only live once it is on screen. */
export async function fillMollieCard(page: Page): Promise<void> {
  const fields = [
    ['cardHolder', MOLLIE_CARD.holder],
    ['cardNumber', MOLLIE_CARD.number],
    ['expiryDate', MOLLIE_CARD.expiry],
    ['verificationCode', MOLLIE_CARD.cvc],
  ] as const;
  for (const [name, value] of fields) {
    await page.getByTestId(`mollie-${name}`).scrollIntoViewIfNeeded();
    await page
      .frameLocator(`iframe[name="${name}-input"]`)
      .locator(`#${name}`)
      .fill(value, { timeout: 30_000 });
  }
}

/** Mollie's test-mode page: pick the final status of the test payment and continue to the shop. */
export async function finishOnMollieTestPage(
  page: Page,
  status: 'Authorized' | 'Paid' | 'Failed',
): Promise<void> {
  await page.waitForURL(/mollie\.com\/checkout\//, { timeout: 60_000 });
  const bank = page.getByRole('button', { name: /\bING\b/ }); // iDEAL asks for a bank first
  const radio = page.getByRole('radio', { name: status, exact: true });
  await bank.or(radio).first().waitFor({ timeout: 30_000 });
  if (await bank.isVisible()) {
    await bank.click();
  }
  await radio.check();
  await page.getByRole('button', { name: /continue/i }).click();
}
