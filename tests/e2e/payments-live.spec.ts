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
test.setTimeout(180_000);

const embedded = (page: Page): FrameLocator =>
  page.frameLocator('iframe[name="embedded-checkout"]');

async function payWithStripeCard(page: Page, card: string): Promise<void> {
  const frame = embedded(page);
  const email = frame.getByRole('textbox', { name: 'Email' });
  await email.waitFor({ state: 'visible', timeout: 60_000 });
  await email.fill(`hydroxid-${Date.now()}@oxid-test.local`);
  await frame.getByText('Card', { exact: true }).first().click({ force: true });
  await frame.locator('#cardNumber').fill(card);
  await frame.locator('#cardExpiry').fill(STRIPE.expiry);
  await frame.locator('#cardCvc').fill(STRIPE.cvc);
  await frame.locator('#billingName').fill(STRIPE.name);
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

  const orderNumber = await expectCommittedOrder(page, 'payment-stripe');
  await expectOrderInDashboard(page, orderNumber);
});

test('Stripe: a declined card is explained inside the form and a good card then succeeds', async ({
  page,
}) => {
  await openPaymentStep(page, 'stripe');
  await confirmTerms(page);
  await payWithStripeCard(page, STRIPE.declined);

  await expect(
    embedded(page)
      .getByText(/card was declined/i)
      .first(),
  ).toBeVisible({ timeout: 40_000 });
  await expect(page).toHaveURL(/\/checkout$/);

  const frame = embedded(page);
  await frame.locator('#cardNumber').fill(STRIPE.visa);
  await frame.locator('#cardExpiry').fill(STRIPE.expiry);
  await frame.locator('#cardCvc').fill(STRIPE.cvc);
  await frame.locator('[data-testid="hosted-payment-submit-button"]').first().click();

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
