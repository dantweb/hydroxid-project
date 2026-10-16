import type { IPlugin, PluginContext } from '@dantweb/oxid-fe-core';
import de from './i18n/de.json';
import en from './i18n/en.json';

export interface ConsentConfig {
  /** bump to ask every visitor again (policy change) */
  version: number;
  privacyPolicyUrl: string;
  position: 'center' | 'bottom';
  /** optional extra copy under the summary (e.g. a regional note) */
  additionalText: string;
  /** a persistent "Cookie settings" button once a decision exists */
  showSettingsButton: boolean;
}

let context: PluginContext | null = null;

export function useConsentConfig(): ConsentConfig {
  const config = context?.config ?? {};
  return {
    version: typeof config.version === 'number' ? config.version : 1,
    privacyPolicyUrl: String(config.privacy_policy_url ?? '/privacy'),
    position: config.position === 'bottom' ? 'bottom' : 'center',
    additionalText: String(config.additional_text ?? ''),
    showSettingsButton: config.show_settings_button !== false,
  };
}

/**
 * GDPR cookie consent: a two-layer dialog (accept all · reject all · customize) over four
 * categories, the decision kept in localStorage, Google Consent Mode v2 signals for trackers, and a
 * re-open event for footer links. A standalone plugin — it renders through the host's `overlays`
 * seam and knows nothing of the layout. Config: `version`, `privacy_policy_url`, `position`
 * (`center` | `bottom`), `additional_text`, `show_settings_button`.
 */
const plugin: IPlugin = {
  name: 'gdpr-cookie-consent',
  version: '0.1.0',
  overlays: [() => import('./CookieConsent.vue')],
  messages: { en, de },
  setup(ctx) {
    context = ctx;
  },
};

export default plugin;
