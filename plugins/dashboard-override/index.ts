import type { IPlugin } from '@dantweb/oxid-fe-core';
import base from '@dantweb/oxid-fe-user/plugins/dashboard';

/**
 * Overrides oxid-fe-user's `dashboard` plugin BY NAME (src/main.ts registers it as `dashboard`):
 * everything of the original stays — routes, views, setup — and HydroXid changes what it wants to.
 * Here: the greeting copy. Replace a route's component the same way (`routes.map(...)`).
 */
const GREETING = { en: 'Welcome back', de: 'Willkommen zurück' } as const;

const plugin: IPlugin = {
  ...base,
  version: `${base.version}+hydroxid`,
  messages: Object.fromEntries(
    Object.entries(base.messages ?? {}).map(([locale, messages]) => [
      locale,
      locale in GREETING
        ? { ...messages, hello: GREETING[locale as keyof typeof GREETING] }
        : messages,
    ]),
  ),
};

export default plugin;
