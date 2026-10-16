import { PluginRegistry } from '@dantweb/oxid-fe-core';
import { describe, expect, it } from 'vitest';
import consent from '../../plugins/gdpr-cookie-consent';
import dashboardOverride from '../../plugins/dashboard-override';
import layout from '../../plugins/hydroxid-layout';
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

describe('hydroxid-layout plugin', () => {
  it('takes over header and footer through the host seam, and only those', () => {
    expect(Object.keys(layout.overrides ?? {}).sort()).toEqual(['footer', 'header']);
  });
});
