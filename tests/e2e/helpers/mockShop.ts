import { expect, type Page } from '@playwright/test';

/** An unsigned but well-formed graphql-base JWT: the client only reads its claims. */
function fakeJwt(payload: Record<string, unknown>): string {
  const encode = (value: unknown): string =>
    Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'RS512', typ: 'JWT' })}.${encode(payload)}.signature`;
}

const answer = (data: unknown) => ({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify({ data }),
});
const failure = (message: string) => ({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify({ errors: [{ message }] }),
});

/**
 * A minimal stand-in for the shop's GraphQL API, so the suite runs without a shop (CI).
 * Covers: anonymous + customer tokens, the account summary, empty saved lists, an empty catalogue.
 */
export async function mockShop(page: Page): Promise<void> {
  await page.route('**/graphql/**', async (route) => {
    const body = route.request().postDataJSON() as {
      query: string;
      variables?: Record<string, string>;
    };
    const query = body.query;

    if (query.includes('token(')) {
      const customer = Boolean(body.variables?.username);
      return route.fulfill(
        answer({
          token: fakeJwt({
            exp: Math.floor(Date.now() / 1000) + 3600,
            shopid: 1,
            useranonymous: !customer,
            username: body.variables?.username ?? 'anonymous',
          }),
        }),
      );
    }
    if (query.includes('accountSummary')) {
      return route.fulfill(
        answer({
          customer: {
            firstName: 'Ada',
            email: 'ada@example.test',
            newsletterStatus: null,
            orders: [],
            reviews: [],
            files: [],
          },
        }),
      );
    }
    if (query.includes('savedList')) {
      return route.fulfill(failure('Basket "noticelist" not found for user "u1"'));
    }
    if (query.includes('products')) {
      return route.fulfill(answer({ products: [], categories: [] }));
    }
    return route.fulfill(answer({}));
  });
}

/** Signs in through the UI (the mocked token query accepts any credentials). */
export async function signInAsAda(page: Page): Promise<void> {
  await page.goto('/login');
  await page.locator('input[name=email]').fill('ada@example.test');
  await page.locator('input[name=password]').fill('whatever');
  await page.locator('[data-testid="login-form"] button[type=submit]').click();
  await expect(page).not.toHaveURL(/\/login/); // the token is stored once the app leaves /login
}
