import { readFileSync } from 'node:fs';

/** The localisation files, read from disk: tests expect whatever the wording currently is. */
const read = (path: string) => JSON.parse(readFileSync(path, 'utf-8'));

export const hydroxidCopy = {
  en: read('plugins/hydroxid/i18n/en.json') as { hero: { title: string } },
  de: read('plugins/hydroxid/i18n/de.json') as { hero: { title: string } },
};
export const greetingCopy = {
  en: read('plugins/dashboard-override/i18n/en.json') as { hello: string },
  de: read('plugins/dashboard-override/i18n/de.json') as { hello: string },
};
