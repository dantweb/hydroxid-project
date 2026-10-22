import { defineConfig, devices } from '@playwright/test';

/**
 * The e2e suite runs against `vite preview` of the built app with the GraphQL API mocked in the
 * tests (tests/e2e/helpers/mockShop.ts) — it needs no shop, so CI can run it. Choose the instance
 * (theme) with INSTANCE=vibrant|dark-ocean|light-red; E2E_BASE_URL points at an already running one.
 */
const instance = process.env.INSTANCE ?? 'vibrant';
const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:4273';

/**
 * The device profiles of oxid-fe-user's responsive spec (iPhone 17 Pro, Galaxy S24, S25 Ultra, Z Fold 7).
 * They run in Chromium (viewport, touch, pixel ratio and user agent of the device; no WebKit install needed
 * in CI) and only the specs that prove a layout on them — see DEVICE_SPECS.
 */
const DEVICE_SPECS = /guest-checkout\.spec\.ts/;
const DEVICES = {
  'iphone-17-pro': { ...devices['iPhone 17 Pro'] },
  'galaxy-s24': { ...devices['Galaxy S24'] },
  'galaxy-s25-ultra': {
    ...devices['Galaxy S24'],
    viewport: { width: 412, height: 915 },
    screen: { width: 412, height: 915 },
    deviceScaleFactor: 3.5,
    userAgent:
      'Mozilla/5.0 (Linux; Android 15; SM-S938B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36',
  },
  'galaxy-z-fold-7': { ...devices['Galaxy Z Fold 7'] },
};

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL, trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    ...Object.entries(DEVICES).map(([name, profile]) => ({
      name,
      testMatch: DEVICE_SPECS,
      use: { ...profile, defaultBrowserType: 'chromium' as const },
    })),
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `npx vite preview --port 4273 --strictPort`,
        url: 'http://localhost:4273',
        env: { INSTANCE: instance },
        // never reuse: a stale preview of another instance would silently answer for this one
        reuseExistingServer: false,
        timeout: 60_000,
      },
});
