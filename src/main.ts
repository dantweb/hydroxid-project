import { startStorefront } from '@dantweb/oxid-fe-user/bootstrap';

/**
 * HydroXid = the oxid-fe-user storefront + the project's plugins.
 *  - `dashboard` has the name of a bundled plugin → it REPLACES it (see plugins/dashboard-override)
 *  - `hydroxid-layout` and `gdpr-cookie-consent` are new names → added
 * Which of them run per instance is decided by instances/<name>/oxid-config.yaml.
 */
startStorefront({
  plugins: {
    dashboard: () => import('../plugins/dashboard-override'),
    'hydroxid-layout': () => import('../plugins/hydroxid-layout'),
    'gdpr-cookie-consent': () => import('../plugins/gdpr-cookie-consent'),
  },
});
