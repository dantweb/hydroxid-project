import { readFileSync } from 'node:fs';
import { renderPublicConfig } from '@dantweb/oxid-fe-user/public-config';
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
      // no keys in the repo: hosted payment pages
      expect(config.plugins['payment-stripe'].config.mode).toBe('redirect');
    },
  );
});
