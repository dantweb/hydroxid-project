import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  emitConsentDefault,
  emitConsentUpdate,
} from '../../plugins/gdpr-cookie-consent/consentMode';
import {
  CONSENT_CHANGED_EVENT,
  CONSENT_STORAGE_KEY,
  deniedCategories,
  grantedCategories,
} from '../../plugins/gdpr-cookie-consent/policy';
import { useConsent } from '../../plugins/gdpr-cookie-consent/useConsent';

type TestWindow = Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void };
const win = window as unknown as TestWindow;

beforeEach(() => {
  localStorage.clear();
  delete win.dataLayer;
  delete win.gtag;
  const consent = useConsent();
  consent.setConsentVersion(1);
  consent.hydrate();
});

describe('policy', () => {
  it('denied = only necessary; granted = everything; necessary is always on', () => {
    expect(deniedCategories()).toEqual({
      necessary: true,
      preferences: false,
      statistics: false,
      marketing: false,
    });
    expect(Object.values(grantedCategories()).every(Boolean)).toBe(true);
  });
});

describe('useConsent', () => {
  it('asks until the visitor decides; the dialog shows exactly while a decision is needed', () => {
    const consent = useConsent();
    expect(consent.needsDecision.value).toBe(true);
    expect(consent.shouldShowDialog.value).toBe(true);

    consent.rejectAll();

    expect(consent.needsDecision.value).toBe(false);
    expect(consent.shouldShowDialog.value).toBe(false);
  });

  it('accept all grants every category and persists the record', () => {
    const consent = useConsent();
    consent.acceptAll();

    expect(consent.granted('marketing')).toBe(true);
    const stored = JSON.parse(localStorage.getItem(CONSENT_STORAGE_KEY) ?? '{}');
    expect(stored).toMatchObject({ version: 1, method: 'accept_all' });
    expect(stored.categories.statistics).toBe(true);
  });

  it('reject all keeps only the strictly necessary', () => {
    const consent = useConsent();
    consent.rejectAll();

    expect(consent.granted('necessary')).toBe(true);
    expect(consent.granted('statistics')).toBe(false);
    expect(consent.granted('marketing')).toBe(false);
  });

  it('a custom selection grants exactly the chosen optional categories; necessary cannot be written off', () => {
    const consent = useConsent();
    consent.save({ statistics: true, necessary: false });

    expect(consent.granted('statistics')).toBe(true);
    expect(consent.granted('preferences')).toBe(false);
    expect(consent.granted('necessary')).toBe(true);
    expect(consent.categories.value.necessary).toBe(true);
  });

  it('a newer policy version asks every visitor again, and the dialog can be re-opened', () => {
    const consent = useConsent();
    consent.acceptAll();
    expect(consent.shouldShowDialog.value).toBe(false);

    consent.reopen();
    expect(consent.shouldShowDialog.value).toBe(true);

    consent.save({});
    consent.setConsentVersion(2);
    expect(consent.needsDecision.value).toBe(true);
    consent.setConsentVersion(1);
  });

  it('survives a reload: a stored decision is picked up on hydrate', () => {
    useConsent().acceptAll();
    const again = useConsent();
    again.hydrate();
    expect(again.isDecided.value).toBe(true);
  });

  it('works when storage is unavailable (the session still carries the decision)', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    const consent = useConsent();
    expect(() => consent.acceptAll()).not.toThrow();
    expect(consent.granted('statistics')).toBe(true);
    spy.mockRestore();
  });
});

describe('Google Consent Mode bridge', () => {
  it('queues an all-denied default on dataLayer (security granted) before any gtag exists', () => {
    emitConsentDefault();

    expect(win.dataLayer?.[0]).toEqual([
      'consent',
      'default',
      expect.objectContaining({
        ad_storage: 'denied',
        analytics_storage: 'denied',
        security_storage: 'granted',
      }),
    ]);
  });

  it('maps statistics → analytics, marketing → ad signals, preferences → functionality; calls gtag when present', () => {
    const gtag = vi.fn();
    win.gtag = gtag;

    emitConsentUpdate({ necessary: true, preferences: false, statistics: true, marketing: false });

    expect(gtag).toHaveBeenCalledWith(
      'consent',
      'update',
      expect.objectContaining({
        analytics_storage: 'granted',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
        functionality_storage: 'denied',
        personalization_storage: 'denied',
      }),
    );
  });

  it('broadcasts hydroxid:consent-changed for consumers without gtag', () => {
    const listener = vi.fn();
    window.addEventListener(CONSENT_CHANGED_EVENT, listener);

    emitConsentUpdate(grantedCategories());

    expect(listener).toHaveBeenCalledTimes(1);
    expect((listener.mock.calls[0][0] as CustomEvent).detail.categories.marketing).toBe(true);
    window.removeEventListener(CONSENT_CHANGED_EVENT, listener);
  });
});
