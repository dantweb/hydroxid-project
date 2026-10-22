import { readFileSync } from 'node:fs';
import { renderPublicConfig } from '@dantweb/oxid-fe-user/public-config';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';

interface Targets {
  instances: Record<string, { theme: string; ports: { local: number; pay1: number } }>;
}
const targets: Targets = JSON.parse(readFileSync('deploy/instances.json', 'utf-8'));
const yamlOf = (name: string): string =>
  readFileSync(`instances/${name}/oxid-config.yaml`, 'utf-8');

describe('instances', () => {
  const names = Object.keys(targets.instances);

  it('one instance per theme, each with its own local and pay1 port', () => {
    expect(names.sort()).toEqual(['dark-ocean', 'light-red', 'vibrant']);
    for (const target of ['local', 'pay1'] as const) {
      const ports = names.map((n) => targets.instances[n].ports[target]);
      expect(new Set(ports).size).toBe(names.length);
    }
  });

  it('pay1 ports are Cloudflare-proxied HTTPS ports; local ports stay clear of the SDK (80, 8025, 8085–8092)', () => {
    const proxied = [443, 2053, 2083, 2087, 2096, 8443];
    for (const name of names) {
      expect(proxied).toContain(targets.instances[name].ports.pay1);
      expect([8101, 8102, 8103]).toContain(targets.instances[name].ports.local);
    }
  });

  it('vibrant and light-red offer two languages (opening in their own default), dark-ocean one', () => {
    const locales = Object.fromEntries(
      ['vibrant', 'dark-ocean', 'light-red'].map((name) => {
        const i18n = JSON.parse(renderPublicConfig(yamlOf(name))).i18n;
        return [name, i18n];
      }),
    );

    expect(locales.vibrant).toMatchObject({
      default_locale: 'en',
      locales: ['en', 'de'],
      browser_language: false,
    });
    expect(locales['dark-ocean']).toMatchObject({ default_locale: 'de', locales: ['de'] });
    expect(locales['light-red']).toMatchObject({
      default_locale: 'de',
      locales: ['de', 'en'],
      browser_language: false,
    });
  });

  it('every instance keeps devices on the latest release', () => {
    for (const name of ['vibrant', 'dark-ocean', 'light-red']) {
      const config = JSON.parse(renderPublicConfig(yamlOf(name)));
      expect(config.plugins['release-watcher'].config).toMatchObject({ auto_reload: true });
    }
  });

  it.each(['vibrant', 'dark-ocean', 'light-red'])(
    '%s renders a safe public config running its theme, the hydroxid (peroxid-extending) plugin, consent and the overriding dashboard',
    (name) => {
      const config = JSON.parse(renderPublicConfig(yamlOf(name)));
      expect(config.theme.active).toBe(targets.instances[name].theme);
      const plugins = Object.keys(config.plugins);
      expect(plugins).toEqual(
        expect.arrayContaining([
          'shop',
          'checkout',
          'dashboard',
          'hydroxid',
          'gdpr-cookie-consent',
        ]),
      );
      // the extending plugin is listed after the plugins whose slots it overrides
      expect(plugins.indexOf('hydroxid')).toBeGreaterThan(plugins.indexOf('shop'));
      // pay1 offers Stripe and Mollie, inline (iframe); their keys come from the shop, sealed
      expect(config.plugins['payment-stripe'].config).toEqual({ mode: 'iframe' });
      expect(config.plugins['payment-mollie'].config).toMatchObject({ mode: 'iframe' });
      expect(config.plugins['payment-mollie'].config).not.toHaveProperty('profile_id');
      expect(config.plugins['payment-paypal']).toBeUndefined(); // not installed on pay1
    },
  );

  describe('public config keys of oxid-fe-user 0.7.0 (shop.language_ids, shop.id, checkout.guest, debug.errors)', () => {
    const yaml = `
instance: { id: probe, name: Probe }
shop:
  graphql_url: /graphql/
  id: 2
  language_ids: { de: 0, en: 1, fr: 2 }
  admin_password: not-for-the-browser
checkout:
  guest: false
  internal: nope
debug:
  errors: true
  trace: nope
`;

    it('the allow-list renders them and drops everything else next to them', () => {
      const config = JSON.parse(renderPublicConfig(yaml));

      expect(config.shop).toEqual({
        graphql_url: '/graphql/',
        id: 2,
        language_ids: { de: 0, en: 1, fr: 2 },
      });
      expect(config.checkout).toEqual({ guest: false });
      expect(config.debug).toEqual({ errors: true });
    });

    it('the instances declare language_ids/id only where the shop differs from { de: 0, en: 1 } — none does, the host default applies', () => {
      for (const name of names) {
        const declared = parse(yamlOf(name)).shop;
        expect(declared).not.toHaveProperty('language_ids');
        expect(declared).not.toHaveProperty('id');
        const config = JSON.parse(renderPublicConfig(yamlOf(name)));
        // the rendered file carries only what is declared; the default is applied by the host
        // (src/config/schema.ts) and proven on the wire by tests/e2e/language.spec.ts
        expect(config.shop).toEqual({ graphql_url: '/graphql/' });
      }
    });

    it('guest checkout stays on (the default) for every instance; debug details stay off', () => {
      for (const name of names) {
        const config = JSON.parse(renderPublicConfig(yamlOf(name)));
        expect(config.checkout?.guest ?? true).toBe(true);
        expect(config.debug?.errors ?? false).toBe(false);
      }
    });
  });
});
