import type { IPlugin } from '@dantweb/oxid-fe-core';
import peroxid from '@dantweb/oxid-fe-user/plugins/peroxid';

/**
 * HydroXid's plugin EXTENDS oxid-fe-user's `peroxid` layout plugin: everything of peroxid — header
 * with search and cart, the front page (hero + product streams), the /search page, its setup and
 * configuration — stays, and HydroXid changes only what is its own:
 *   - the footer (peroxid's footer + the cookie-settings link of the consent plugin)
 *   - the copy: hero and footer texts
 *   - the default theme
 *
 * It keeps peroxid's plugin `name`, because peroxid's components read their copy from the
 * `peroxid.*` message namespace and the registry keys messages by plugin name. In
 * `oxid-config.yaml` it is listed as `hydroxid` (the loader key chosen in src/main.ts).
 */
const COPY = {
  en: {
    hero: {
      eyebrow: 'The HydroXid edit',
      title: 'Hydration, engineered.',
      lead: 'Bottles, filters and gear for people who take every sip seriously — chosen for the details.',
      cta: 'Discover the collection',
    },
    footer: { rights: 'All rights reserved.', privacy: 'Privacy', cookies: 'Cookie settings' },
  },
  de: {
    hero: {
      eyebrow: 'Die HydroXid-Auswahl',
      title: 'Hydration, konstruiert.',
      lead: 'Flaschen, Filter und Ausrüstung für alle, die jeden Schluck ernst nehmen — ausgewählt bis ins Detail.',
      cta: 'Kollektion entdecken',
    },
    footer: {
      rights: 'Alle Rechte vorbehalten.',
      privacy: 'Datenschutz',
      cookies: 'Cookie-Einstellungen',
    },
  },
} as const;

type Messages = Record<string, Record<string, unknown>>;

/** Peroxid's messages with HydroXid's copy laid over them (per locale, one level into each group). */
function extendMessages(base: Messages | undefined): Messages {
  const merged: Messages = { ...base };
  for (const [locale, copy] of Object.entries(COPY)) {
    const original = (base?.[locale] ?? {}) as Record<string, Record<string, unknown>>;
    merged[locale] = {
      ...original,
      ...Object.fromEntries(
        Object.entries(copy).map(([group, texts]) => [group, { ...original[group], ...texts }]),
      ),
    };
  }
  return merged;
}

const plugin: IPlugin = {
  ...peroxid,
  version: `${peroxid.version}+hydroxid`,
  defaultTheme: 'hydroxid-vibrant',
  overrides: { ...peroxid.overrides, footer: () => import('./HydroFooter.vue') },
  messages: extendMessages(peroxid.messages),
};

export default plugin;
