import { defineConfig, devices } from '@playwright/test';

/**
 * The e2e suite runs against `vite preview` of the built app with the GraphQL API mocked in the
 * tests (tests/e2e/helpers/mockShop.ts) — it needs no shop, so CI can run it. Choose the instance
 * (theme) with INSTANCE=vibrant|dark-ocean|light-red; E2E_BASE_URL points at an already running one.
 */
const instance = process.env.INSTANCE ?? 'vibrant';
const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:4273';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL, trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `npx vite preview --port 4273 --strictPort`,
        url: 'http://localhost:4273',
        env: { INSTANCE: instance },
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
});
