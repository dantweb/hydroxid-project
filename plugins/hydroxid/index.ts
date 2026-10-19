import type { IPlugin } from '@dantweb/oxid-fe-core';
import peroxid from '@dantweb/oxid-fe-user/plugins/peroxid';
import de from './i18n/de.json';
import en from './i18n/en.json';

/**
 * HydroXid's plugin EXTENDS oxid-fe-user's `peroxid` layout plugin: everything of peroxid — header
 * with the shop's search box and cart, the front page (hero + product streams), its setup and
 * configuration — stays (`/search` itself is the shop plugin's), and HydroXid changes only what is its own:
 *   - the footer (peroxid's footer + the cookie-settings link of the consent plugin)
 *   - the copy: hero and footer texts
 *   - the default theme
 *
 * It keeps peroxid's plugin `name`, because peroxid's components read their copy from the
 * `peroxid.*` message namespace and the registry keys messages by plugin name. In
 * `oxid-config.yaml` it is listed as `hydroxid` (the loader key chosen in src/main.ts).
 */
/** HydroXid's copy per language — plain JSON, the file to edit for a wording change (i18n/en.json, i18n/de.json). */
const COPY = { en, de } as const;

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
