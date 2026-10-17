/**
 * Release detection. A release is identified by its entry bundle (`/assets/index-<hash>.js`): the hash
 * changes whenever any code, copy or translation changes. The running page knows its own bundle from its
 * <script>; the server's current `index.html` (never cached) names the bundle of the latest release.
 */
const ENTRY = /\/assets\/index-[\w-]+\.js/;

/** The entry bundle a page (HTML text) was built against, or null. */
export function bundleOf(html: string): string | null {
  const script = html.match(/<script[^>]*type="module"[^>]*src="([^"]+)"/i);
  const url = script?.[1] ?? html.match(ENTRY)?.[0];
  return url?.match(ENTRY)?.[0] ?? null;
}

/** The bundle the running page was loaded from. */
export function runningBundle(doc: Document): string | null {
  const src = doc.querySelector<HTMLScriptElement>('script[type="module"][src*="/assets/index-"]');
  return src ? (src.getAttribute('src')?.match(ENTRY)?.[0] ?? null) : null;
}

/** True when the server serves a different release than the one running (both must be known). */
export function isNewRelease(running: string | null, latestHtml: string): boolean {
  const latest = bundleOf(latestHtml);
  return running !== null && latest !== null && running !== latest;
}

/** Reloading by itself is fine on browsing pages; never in the middle of a payment. */
export function mayReloadHere(pathname: string): boolean {
  return !pathname.startsWith('/checkout');
}
