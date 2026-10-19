import type { Page } from '@playwright/test';

/** The consent dialog is decided already: tests about layout and theme must not meet it. */
export async function rejectAllCookies(page: Page): Promise<void> {
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
