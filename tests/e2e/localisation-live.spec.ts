import { expect, test } from '@playwright/test';
import { confirmTerms, openPaymentStep } from './helpers/payments';

/**
 * Against a REAL shop: the instance's language reaches the shop, so products and categories come in
 * that language — whatever language the visitor's browser is set to.
 *   LIVE=1 E2E_BASE_URL=https://pay1.oxid.dev:2083 INSTANCE=dark-ocean npx playwright test localisation-live
 */
test.skip(!process.env.LIVE || !process.env.E2E_BASE_URL, 'set LIVE=1 and E2E_BASE_URL');
const LANG: Record<string, 'de' | 'en'> = { vibrant: 'en', 'dark-ocean': 'de', 'light-red': 'de' };
const lang = LANG[process.env.INSTANCE ?? 'vibrant'];
const browserLocale = lang === 'de' ? 'en-US' : 'de-DE'; // deliberately the OTHER language

test.use({ locale: browserLocale });

test(`the ${lang} instance shows the shop's ${lang} product and category data in a ${browserLocale} browser`, async ({
  page,
  request,
}) => {
  const answer = await request.post(`${process.env.E2E_BASE_URL}/graphql/`, {
    headers: { 'Accept-Language': lang, 'User-Agent': 'Mozilla/5.0 (playwright)' },
    data: {
      query:
        '{ categories { title } products(pagination:{limit:8,offset:0}) { shortDescription } }',
    },
  });
  const { categories, products } = (await answer.json()).data as {
    categories: { title: string }[];
    products: { shortDescription: string }[];
  };
  const otherAnswer = await request.post(`${process.env.E2E_BASE_URL}/graphql/`, {
    headers: {
      'Accept-Language': lang === 'de' ? 'en' : 'de',
      'User-Agent': 'Mozilla/5.0 (playwright)',
    },
    data: { query: '{ categories { title } }' },
  });
  const otherCategories = (await otherAnswer.json()).data.categories as { title: string }[];
  // the demo data really differs per language, or this test would prove nothing
  expect(categories.map((c) => c.title)).not.toEqual(otherCategories.map((c) => c.title));

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
  await page.goto('/shop');
  await expect(page.getByTestId('product-card').first()).toBeVisible({ timeout: 30_000 });

  const text = await page.locator('main').innerText();
  for (const category of categories.slice(0, 4)) {
    expect(text, `category "${category.title}" in ${lang}`).toContain(category.title);
  }
  const firstDescription = products[0].shortDescription;
  expect(text).toContain(firstDescription);
});

test(`the checkout interface speaks ${lang} (and not the other language)`, async ({ page }) => {
  test.setTimeout(120_000);
  await openPaymentStep(page, 'stripe');
  await confirmTerms(page);

  await expect(page.locator('main')).toContainText(
    lang === 'de' ? /Zahlung|Versand|Rechnungsadresse/ : /Payment|Delivery|Invoice address/,
  );
  await expect(page.locator('main')).not.toContainText(
    lang === 'de' ? /Delivery|Invoice address/ : /Versand|Rechnungsadresse/,
  );
});

// Stripe's Embedded Checkout takes its language from the Checkout Session's `locale`; the stripe-wallet
// module sets it from the shop's active language (the storefront sends its own via Accept-Language).
test(`Stripe's form speaks ${lang}`, async ({ page }) => {
  test.setTimeout(120_000);
  await openPaymentStep(page, 'stripe');
  await confirmTerms(page);

  const stripe = page.frameLocator('iframe[name="embedded-checkout"]').locator('body');
  await expect(stripe).toContainText(
    lang === 'de' ? /Zahlungsmethode|Kontaktinformationen/ : /Payment method|Contact information/,
    { timeout: 60_000 },
  );
});
