import type { IPlugin } from '@dantweb/oxid-fe-core';
import base from '@dantweb/oxid-fe-user/plugins/dashboard';
import de from './i18n/de.json';
import en from './i18n/en.json';

/**
 * Overrides oxid-fe-user's `dashboard` plugin BY NAME (src/main.ts registers it as `dashboard`):
 * everything of the original stays — routes, views, setup — and HydroXid changes what it wants to.
 * Here: the greeting copy (i18n/en.json, i18n/de.json). Replace a route's component the same way
 * (`routes.map(...)`).
 */
const COPY: Record<string, Record<string, string>> = { en, de };

const plugin: IPlugin = {
  ...base,
  version: `${base.version}+hydroxid`,
  messages: Object.fromEntries(
    Object.entries(base.messages ?? {}).map(([locale, messages]) => [
      locale,
      { ...messages, ...COPY[locale] },
    ]),
  ),
};

export default plugin;
