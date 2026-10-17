import { startStorefront } from '@dantweb/oxid-fe-user/bootstrap';

/**
 * HydroXid = the oxid-fe-user storefront + the project's plugins.
 *  - `dashboard` has the name of a bundled plugin → it REPLACES it (see plugins/dashboard-override)
 *  - `hydroxid` EXTENDS the peroxid layout plugin of oxid-fe-user; `gdpr-cookie-consent` and `release-watcher` are new plugins
 * Which of them run per instance is decided by instances/<name>/oxid-config.yaml.
 */
startStorefront({
  plugins: {
    dashboard: () => import('../plugins/dashboard-override'),
    hydroxid: () => import('../plugins/hydroxid'), // extends peroxid
    'gdpr-cookie-consent': () => import('../plugins/gdpr-cookie-consent'),
    'release-watcher': () => import('../plugins/release-watcher'),
  },
});
