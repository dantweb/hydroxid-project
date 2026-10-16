/**
 * Cookie-consent policy primitives: storage key, category vocabulary, the persisted record.
 * Dependency-free (no Vue, no DOM) so the composable, the Consent Mode bridge and the tests share it.
 */

/** localStorage key holding the visitor's decision. */
export const CONSENT_STORAGE_KEY = 'hydroxid_cookie_consent';

/** Window event a footer / menu link dispatches to re-open the dialog. */
export const OPEN_CONSENT_EVENT = 'hydroxid:open-cookie-consent';

/** Window event dispatched whenever the granted set changes (for trackers without gtag). */
export const CONSENT_CHANGED_EVENT = 'hydroxid:consent-changed';

export type ConsentCategory = 'necessary' | 'preferences' | 'statistics' | 'marketing';

/** Every category except the always-on `necessary` one. */
export const OPTIONAL_CATEGORIES: Exclude<ConsentCategory, 'necessary'>[] = [
  'preferences',
  'statistics',
  'marketing',
];

export type ConsentMethod = 'accept_all' | 'reject_all' | 'custom';

export type ConsentCategories = Record<ConsentCategory, boolean>;

export interface ConsentRecord {
  /** the configured policy version the decision was made under; a newer one asks again */
  version: number;
  decidedAt: string;
  method: ConsentMethod;
  categories: ConsentCategories;
}

/** Strictly necessary only. */
export function deniedCategories(): ConsentCategories {
  return { necessary: true, preferences: false, statistics: false, marketing: false };
}

export function grantedCategories(): ConsentCategories {
  return { necessary: true, preferences: true, statistics: true, marketing: true };
}
