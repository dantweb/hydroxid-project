import { PluginRegistry } from '@dantweb/oxid-fe-core';
import { describe, expect, it } from 'vitest';
import consent from '../../plugins/gdpr-cookie-consent';
import dashboardOverride from '../../plugins/dashboard-override';
import hydroxid from '../../plugins/hydroxid';
import peroxid from '@dantweb/oxid-fe-user/plugins/peroxid';
import base from '@dantweb/oxid-fe-user/plugins/dashboard';

describe('dashboard-override (replaces the bundled plugin by name)', () => {
  it('keeps everything of the original — routes, navigation, setup', () => {
    expect(dashboardOverride.name).toBe('dashboard');
    expect(dashboardOverride.routes).toBe(base.routes);
    expect(dashboardOverride.navItems).toBe(base.navItems);
    expect(dashboardOverride.setup).toBe(base.setup);
  });

  it('changes only what HydroXid wants: the greeting copy, per locale', () => {
    expect(dashboardOverride.messages?.en.hello).toBe('Welcome back');
    expect(dashboardOverride.messages?.de.hello).toBe('Willkommen zurück');
    // untouched keys are the original's
    expect(dashboardOverride.messages?.en.menu).toEqual(base.messages?.en.menu);
  });

  it('is distinguishable from the original', () => {
    expect(dashboardOverride.version).toContain('+hydroxid');
  });
});

describe('gdpr-cookie-consent plugin', () => {
  it('is a standalone plugin: no layout slots, no routes, one overlay', () => {
    expect(consent.name).toBe('gdpr-cookie-consent');
    expect(consent.overrides).toBeUndefined();
    expect(consent.routes).toBeUndefined();
    expect(consent.overlays).toHaveLength(1);
  });

  it('registers its overlay with the host registry', () => {
    const registry = new PluginRegistry();
    registry.register(consent);
    expect(registry.overlays()).toHaveLength(1);
  });

  it('ships en and de copy for every category', () => {
    for (const locale of ['en', 'de']) {
      const categories = (consent.messages?.[locale] as { categories: Record<string, unknown> })
        .categories;
      expect(Object.keys(categories).sort()).toEqual([
        'marketing',
        'necessary',
        'preferences',
        'statistics',
      ]);
    }
  });
});

describe('hydroxid plugin (EXTENDS the peroxid layout plugin)', () => {
  it('keeps everything of peroxid: header, front page, search route, setup, requirements', () => {
    expect(hydroxid.overrides?.header).toBe(peroxid.overrides?.header);
    expect(hydroxid.overrides?.home).toBe(peroxid.overrides?.home);
    expect(hydroxid.routes).toBe(peroxid.routes);
    expect(hydroxid.setup).toBe(peroxid.setup);
    expect(hydroxid.requires).toEqual(peroxid.requires);
    expect(hydroxid.defaultConfig).toBe(peroxid.defaultConfig);
  });

  it('keeps peroxid’s plugin name, so the peroxid.* message namespace keeps working', () => {
    expect(hydroxid.name).toBe('peroxid');
    expect(hydroxid.version).toContain('+hydroxid');
  });

  it('replaces only the footer slot', () => {
    expect(hydroxid.overrides?.footer).not.toBe(peroxid.overrides?.footer);
    expect(Object.keys(hydroxid.overrides ?? {}).sort()).toEqual(
      Object.keys(peroxid.overrides ?? {}).sort(),
    );
  });

  it('lays HydroXid’s copy over peroxid’s messages and leaves the rest intact', () => {
    const en = hydroxid.messages?.en as Record<string, Record<string, string>>;
    const original = peroxid.messages?.en as Record<string, Record<string, string>>;

    expect(en.hero.title).toBe('Hydration, engineered.');
    expect(en.hero.title).not.toBe(original.hero.title);
    expect(en.footer.cookies).toBe('Cookie settings');
    // untouched groups and keys are peroxid's own
    expect(en.search).toEqual(original.search);
    expect(en.hero.secondary).toBe(original.hero.secondary);
    expect((hydroxid.messages?.de as Record<string, Record<string, string>>).hero.title).toBe(
      'Hydration, konstruiert.',
    );
  });

  it('brings its own default theme', () => {
    expect(hydroxid.defaultTheme).toBe('hydroxid-vibrant');
  });
});

describe('the localisation of the hydroxid plugin lives in plain JSON files', () => {
  it('every key exists in both languages (a translation cannot be forgotten)', async () => {
    const en = (await import('../../plugins/hydroxid/i18n/en.json')).default;
    const de = (await import('../../plugins/hydroxid/i18n/de.json')).default;
    const keys = (o: Record<string, unknown>, prefix = ''): string[] =>
      Object.entries(o).flatMap(([k, v]) =>
        typeof v === 'object' && v
          ? keys(v as Record<string, unknown>, `${prefix}${k}.`)
          : [`${prefix}${k}`],
      );

    expect(keys(de).sort()).toEqual(keys(en).sort());
  });
});
