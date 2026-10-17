import type { IPlugin, PluginContext } from '@dantweb/oxid-fe-core';
import de from './i18n/de.json';
import en from './i18n/en.json';

export interface WatcherConfig {
  /** how often a visible page asks the server for the latest release */
  intervalSeconds: number;
  /** reload by itself when a newer release is found (never during checkout); else show a banner */
  autoReload: boolean;
}

let context: PluginContext | null = null;

export function useWatcherConfig(): WatcherConfig {
  const config = context?.config ?? {};
  const interval = Number(config.interval_seconds);
  return {
    intervalSeconds: Number.isFinite(interval) && interval >= 5 ? interval : 30,
    autoReload: config.auto_reload === true,
  };
}

/**
 * Keeps devices on the latest release. After a deploy, a page that is already open (a phone in a
 * pocket, a tab left open) notices the new release — when it becomes visible again and every
 * `interval_seconds` — and either reloads (`auto_reload: true`, except in the checkout) or offers a
 * "refresh" banner. Config: `interval_seconds` (default 30), `auto_reload` (default false).
 */
const plugin: IPlugin = {
  name: 'release-watcher',
  version: '0.1.0',
  overlays: [() => import('./ReleaseWatcher.vue')],
  messages: { en, de },
  setup(ctx) {
    context = ctx;
  },
};

export default plugin;
