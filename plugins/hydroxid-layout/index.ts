import type { IPlugin, PluginContext } from '@dantweb/oxid-fe-core';
import de from './i18n/de.json';
import en from './i18n/en.json';

let context: PluginContext | null = null;

export function useLayoutContext(): PluginContext {
  if (!context) {
    throw new Error('hydroxid-layout plugin is not set up');
  }
  return context;
}

/**
 * HydroXid's header and footer, through the host's layout seam (`overrides`). Lists the shop's
 * navigation, sign-in state, and a "Cookie settings" link that re-opens the consent dialog.
 */
const plugin: IPlugin = {
  name: 'hydroxid-layout',
  version: '0.1.0',
  overrides: {
    header: () => import('./HydroHeader.vue'),
    footer: () => import('./HydroFooter.vue'),
  },
  messages: { en, de },
  setup(ctx) {
    context = ctx;
  },
};

export default plugin;
