import { expect, test, type FrameLocator, type Page } from '@playwright/test';
import {
  STRIPE,
  confirmTerms,
  expectCommittedOrder,
  expectOrderInDashboard,
  fillMollieCard,
  finishOnMollieTestPage,
  openPaymentStep,
} from './helpers/payments';

/**
 * Real sandbox payments through a HydroXid instance on pay1 (Stripe test cards, Mollie test mode):
 *   LIVE=1 E2E_BASE_URL=https://pay1.oxid.dev:2053 npx playwright test payments-live --workers=1
 * Each payment runs INSIDE the checkout page (iframe mode), commits an order and shows it in the
 * account; failures leave no order and the shopper can try again.
 */
test.skip(!process.env.LIVE || !process.env.E2E_BASE_URL, 'set LIVE=1 and E2E_BASE_URL');
test.describe.configure({ mode: 'serial' });

/** Stripe can ignore a click that lands while it is still initialising: submit again until the shop's return route opens. */
async function submitUntilReturn(page: Page, frame: FrameLocator): Promise<void> {
  await expect(async () => {
    await frame
      .locator('[data-testid="hosted-payment-submit-button"]')
      .first()
      .click({ timeout: 5_000 })
      .catch(() => undefined);
    await page.waitForURL(/\/checkout\/return\/payment-stripe/, { timeout: 12_000 });
  }).toPass({ timeout: 100_000, intervals: [1_000] });
}
test.setTimeout(180_000);

const embedded = (page: Page): FrameLocator =>
  page.frameLocator('iframe[name="embedded-checkout"]');

/** After a decline Stripe also asks for the billing country / postal code: fill them when shown. */
async function completeBillingDetails(frame: FrameLocator): Promise<void> {
  const country = frame.getByRole('combobox', { name: 'Country or region' });
  if (await country.isVisible().catch(() => false)) {
    await country.selectOption({ label: 'Germany' }).catch(() => undefined);
  }
  const postal = frame.getByRole('textbox', { name: /ZIP|Postal code|Postcode/i });
  if (await postal.isVisible().catch(() => false)) {
    await postal.fill('79098');
  }
}

async function payWithStripeCard(page: Page, card: string): Promise<void> {
  const frame = embedded(page);
  const email = frame.getByRole('textbox', { name: 'Email' });
  await email.waitFor({ state: 'visible', timeout: 60_000 });
  await email.fill(`hydroxid-${Date.now()}@oxid-test.local`);
  // the account's layout lists methods as "Pay with card" buttons; older layouts use a "Card" label.
  // Stripe re-renders the list while it loads: click until the card fields are really there.
  await expect(async () => {
    const cardOption = frame.getByRole('button', { name: 'Pay with card' });
    if (await cardOption.isVisible().catch(() => false)) {
      await cardOption.click({ timeout: 5_000 });
    } else if (
      !(await frame
        .locator('#cardNumber')
        .isVisible()
        .catch(() => false))
    ) {
      await frame.getByText('Card', { exact: true }).first().click({ force: true, timeout: 5_000 });
    }
    await expect(frame.locator('#cardNumber')).toBeVisible({ timeout: 8_000 });
  }).toPass({ timeout: 60_000 });
  await frame.locator('#cardNumber').fill(card);
  await frame.locator('#cardExpiry').fill(STRIPE.expiry);
  await frame.locator('#cardCvc').fill(STRIPE.cvc);
  await frame.locator('#billingName').fill(STRIPE.name);
  await completeBillingDetails(frame);
  await frame.locator('[data-testid="hosted-payment-submit-button"]').first().click();
}

test('Stripe: the form is inline on the checkout page; a test card pays and the order is in the account', async ({
  page,
}) => {
  await openPaymentStep(page, 'stripe');
  await confirmTerms(page);
  await expect(page.locator('iframe[name="embedded-checkout"]')).toHaveCount(1, {
    timeout: 60_000,
  });
  await expect(page).toHaveURL(/\/checkout$/); // no redirect to Stripe
  await expect(page.getByTestId('pay-now')).toHaveCount(0);

  await payWithStripeCard(page, STRIPE.visa);
  await submitUntilReturn(page, embedded(page));

  const orderNumber = await expectCommittedOrder(page, 'payment-stripe');
  await expectOrderInDashboard(page, orderNumber);
});

test('Stripe: a declined card is explained inside the form and a good card then succeeds', async ({
  page,
}) => {
  await openPaymentStep(page, 'stripe');
  await confirmTerms(page);
  await payWithStripeCard(page, STRIPE.declined);

  // Stripe can ignore a click that lands while it is still initialising: submit again until it reacts
  await expect(async () => {
    await embedded(page)
      .locator('[data-testid="hosted-payment-submit-button"]')
      .first()
      .click({ timeout: 5_000 })
      .catch(() => undefined);
    await expect(
      embedded(page)
        .getByText(/declined/i)
        .first(),
    ).toBeVisible({ timeout: 12_000 });
  }).toPass({ timeout: 90_000, intervals: [1_000] });
  await expect(page).toHaveURL(/\/checkout$/);

  const frame = embedded(page);
  await frame.locator('#cardNumber').fill(STRIPE.visa);
  await frame.locator('#cardExpiry').fill(STRIPE.expiry);
  await frame.locator('#cardCvc').fill(STRIPE.cvc);
  await completeBillingDetails(frame);
  await submitUntilReturn(page, frame);

  const orderNumber = await expectCommittedOrder(page, 'payment-stripe');
  await expectOrderInDashboard(page, orderNumber);
});

test('Mollie: card fields are four inline iframes; the card pays (authorized) and the order is in the account', async ({
  page,
}) => {
  await openPaymentStep(page, 'mollie');
  await confirmTerms(page);
  await expect(page.getByTestId('mollie-pay')).toBeVisible({ timeout: 60_000 });
  for (const name of ['cardHolder', 'cardNumber', 'expiryDate', 'verificationCode']) {
    await expect(page.locator(`iframe[name="${name}-input"]`)).toHaveCount(1, { timeout: 30_000 });
  }
  await expect(page).toHaveURL(/\/checkout$/);

  await fillMollieCard(page);
  await page.getByTestId('mollie-pay').click();
  await finishOnMollieTestPage(page, 'Authorized'); // this shop captures Mollie manually

  const orderNumber = await expectCommittedOrder(page, 'payment-mollie');
  await expectOrderInDashboard(page, orderNumber);
});

test('Mollie: a failed payment commits no order and the shopper can pay again', async ({
  page,
}) => {
  await openPaymentStep(page, 'mollie');
  await confirmTerms(page);
  await expect(page.getByTestId('mollie-pay')).toBeVisible({ timeout: 60_000 });
  await fillMollieCard(page);
  await page.getByTestId('mollie-pay').click();
  await finishOnMollieTestPage(page, 'Failed');

  await page.waitForURL(/\/checkout\/return\/payment-mollie/, { timeout: 60_000 });
  await expect(page.getByTestId('return-failed')).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId('return-committed')).toHaveCount(0);

  await openPaymentStep(page, 'mollie');
  await confirmTerms(page);
  await expect(page.getByTestId('mollie-pay')).toBeVisible({ timeout: 60_000 });
  await fillMollieCard(page);
  await page.getByTestId('mollie-pay').click();
  await finishOnMollieTestPage(page, 'Authorized');
  await expectCommittedOrder(page, 'payment-mollie');
});

test('Mollie: iDEAL is chosen inline and completes on Mollie’s page', async ({ page }) => {
  await openPaymentStep(page, 'mollie');
  await confirmTerms(page);
  await expect(page.getByTestId('mollie-pay')).toBeVisible({ timeout: 60_000 });
  await page.getByTestId('mollie-method-ideal').check();
  await page.getByTestId('mollie-pay').click();
  await finishOnMollieTestPage(page, 'Paid');

  const orderNumber = await expectCommittedOrder(page, 'payment-mollie');
  await expectOrderInDashboard(page, orderNumber);
});
