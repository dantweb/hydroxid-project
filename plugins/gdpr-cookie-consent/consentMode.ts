/**
 * Google Consent Mode v2 bridge. It only *signals* — it never loads an analytics SDK. A later-loading
 * Google tag reads `window.dataLayer`, so the all-denied default emitted at mount guarantees no
 * non-essential storage fires before the visitor decides. Other consumers listen for
 * `hydroxid:consent-changed` or ask `useConsent().granted(category)`.
 */
import { CONSENT_CHANGED_EVENT, type ConsentCategories } from './policy';

type ConsentValue = 'granted' | 'denied';

interface ConsentSignals {
  ad_storage: ConsentValue;
  ad_user_data: ConsentValue;
  ad_personalization: ConsentValue;
  analytics_storage: ConsentValue;
  functionality_storage: ConsentValue;
  personalization_storage: ConsentValue;
  security_storage: ConsentValue;
}

interface GtagWindow {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
}

/** Calls a present `gtag`, else queues on `dataLayer` where the canonical gtag shim finds it. */
function pushConsent(command: 'default' | 'update', signals: ConsentSignals): void {
  const win = window as unknown as GtagWindow;
  win.dataLayer = win.dataLayer ?? [];
  if (typeof win.gtag === 'function') {
    win.gtag('consent', command, signals);
  } else {
    win.dataLayer.push(['consent', command, signals]);
  }
}

const grant = (on: boolean): ConsentValue => (on ? 'granted' : 'denied');

/** All optional signals denied, security granted. Idempotent. */
export function emitConsentDefault(): void {
  pushConsent('default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    functionality_storage: 'denied',
    personalization_storage: 'denied',
    security_storage: 'granted',
  });
}

/**
 *   statistics  → analytics_storage
 *   marketing   → ad_storage / ad_user_data / ad_personalization
 *   preferences → functionality_storage / personalization_storage
 */
export function emitConsentUpdate(categories: ConsentCategories): void {
  pushConsent('update', {
    analytics_storage: grant(categories.statistics),
    ad_storage: grant(categories.marketing),
    ad_user_data: grant(categories.marketing),
    ad_personalization: grant(categories.marketing),
    functionality_storage: grant(categories.preferences),
    personalization_storage: grant(categories.preferences),
    security_storage: 'granted',
  });
  window.dispatchEvent(new CustomEvent(CONSENT_CHANGED_EVENT, { detail: { categories } }));
}
