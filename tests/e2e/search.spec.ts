import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { rejectAllCookies } from './helpers/consent';
import { mockShop } from './helpers/mockShop';

/**
 * HydroXid extends peroxid, whose header places the SHOP plugin's search box. The search must work
 * in every instance (theme). SCREENSHOTS=1 also writes docs/reports/search-<instance>-*.png.
 */
const instance = process.env.INSTANCE ?? 'vibrant';
const OUT = 'docs/reports';

async function mockSearch(page: import('@playwright/test').Page): Promise<string[]> {
  const asked: string[] = [];
  await page.route('**/graphql/**', async (route) => {
    const body = route.request().postDataJSON() as {
      query: string;
      variables: { q: string; limit: number };
    };
    if (!body.query.includes('query search(')) {
      return route.fallback();
    }
    asked.push(body.variables.q);
    const products = Array.from({ length: body.variables.limit }, (_, i) => ({
      id: `p${i}`,
      title: `Metall rod ${100 + i} mm`,
      shortDescription: 'Steel',
      price: { price: 9.9, currency: { name: 'EUR', sign: '€' } },
      imageGallery: { thumb: '' },
    }));
    return route.fulfill({ json: { data: { products } } });
  });
  return asked;
}

test.beforeEach(async ({ page }) => {
  await mockShop(page);
  await rejectAllCookies(page);
});

test(`${instance}: search suggestions and results work in the extended layout`, async ({
  page,
}) => {
  const asked = await mockSearch(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');

  const input = page.getByTestId('pxd-search-input');
  await input.pressSequentially('metall rod', { delay: 30 });
  await expect(page.getByTestId('pxd-suggestion')).toHaveCount(5, { timeout: 20_000 });
  expect(asked).toEqual(['metall rod']); // debounced: one request, not one per key
  if (process.env.SCREENSHOTS) {
    mkdirSync(OUT, { recursive: true });
    await page.screenshot({ path: `${OUT}/search-${instance}-suggestions.png` });
  }

  await input.press('Enter');
  await expect(page).toHaveURL(/\/search\?q=metall(%20|\+)rod$/);
  await expect(page.getByTestId('product-card')).toHaveCount(12, { timeout: 20_000 });
  await expect(page.getByTestId('pxd-results-next')).toBeEnabled();
  if (process.env.SCREENSHOTS) {
    await input.blur();
    await page.screenshot({ path: `${OUT}/search-${instance}-results.png` });
  }
});
