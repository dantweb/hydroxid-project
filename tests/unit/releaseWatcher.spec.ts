import { describe, expect, it } from 'vitest';
import releaseWatcher from '../../plugins/release-watcher';
import {
  bundleOf,
  isNewRelease,
  mayReloadHere,
  runningBundle,
} from '../../plugins/release-watcher/watcher';

const page = (bundle: string): string =>
  `<!doctype html><html><head><script type="module" crossorigin src="/assets/${bundle}"></script>` +
  `<link rel="modulepreload" href="/assets/vendor-ZZZ.js"></head><body><div id="app"></div></body></html>`;

describe('release detection', () => {
  it('names the release by its entry bundle, ignoring other chunks', () => {
    expect(bundleOf(page('index-AbC123.js'))).toBe('/assets/index-AbC123.js');
    expect(bundleOf('<html><body>nothing</body></html>')).toBeNull();
  });

  it('knows the bundle of the page that is running', () => {
    document.head.innerHTML = '<script type="module" src="/assets/index-Run1.js"></script>';
    expect(runningBundle(document)).toBe('/assets/index-Run1.js');
    document.head.innerHTML = '';
    expect(runningBundle(document)).toBeNull(); // dev server: nothing to compare
  });

  it('a different entry bundle on the server is a new release', () => {
    expect(isNewRelease('/assets/index-Old.js', page('index-New.js'))).toBe(true);
  });

  it('the same bundle is not; unknown on either side never triggers a reload', () => {
    expect(isNewRelease('/assets/index-Same.js', page('index-Same.js'))).toBe(false);
    expect(isNewRelease(null, page('index-New.js'))).toBe(false);
    expect(isNewRelease('/assets/index-Old.js', '<html>an error page</html>')).toBe(false);
  });

  it('never reloads by itself in the middle of a checkout', () => {
    expect(mayReloadHere('/shop')).toBe(true);
    expect(mayReloadHere('/dashboard/orders')).toBe(true);
    expect(mayReloadHere('/checkout')).toBe(false);
    expect(mayReloadHere('/checkout/return/payment-mollie')).toBe(false);
  });
});

describe('release-watcher plugin', () => {
  it('is a standalone overlay plugin with en and de copy', () => {
    expect(releaseWatcher.name).toBe('release-watcher');
    expect(releaseWatcher.overlays).toHaveLength(1);
    expect(Object.keys(releaseWatcher.messages ?? {}).sort()).toEqual(['de', 'en']);
  });
});
