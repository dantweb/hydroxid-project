# GDPR cookie consent (`plugins/gdpr-cookie-consent`)

A **standalone** plugin: it renders through the host's `overlays` seam and knows nothing about the
layout (the footer link in the `hydroxid` plugin talks to it only through a window event). The model
follows the CMS plugin of the VBWD platform (`vbwd-fe-user-plugin-cms`): policy primitives, a
shared composable, a Consent Mode bridge and a two-layer dialog.

## Behaviour

- **First visit:** a modal dialog (`role="dialog"`, `aria-modal`, focus on _Accept all_, Tab trapped)
  with **Accept all · Reject all · Customize** equally prominent. Nothing optional is granted.
- **Customize:** four categories — _necessary_ (locked on), _preferences_, _statistics_, _marketing_ —
  each with its purpose.
- **Decision** is stored in `localStorage` (`hydroxid_cookie_consent`: version, time, method,
  categories) and not asked again; a **persistent "Cookie settings" button** and the footer link re-open it.
- **Policy version:** `config.version` — bump it and every visitor is asked again.
- **Google Consent Mode v2:** an all-denied `default` is queued on `dataLayer` as soon as the plugin
  mounts, and an `update` follows every decision (statistics → `analytics_storage`, marketing →
  `ad_*`, preferences → `functionality_/personalization_storage`). The plugin never loads a tracker;
  trackers read `dataLayer`, listen for `hydroxid:consent-changed`, or ask `useConsent().granted(category)`.

## Configuration (`plugins.gdpr-cookie-consent.config`, public)

| Key                    | Default    | Meaning                           |
| ---------------------- | ---------- | --------------------------------- |
| `version`              | `1`        | policy version                    |
| `privacy_policy_url`   | `/privacy` | the "Privacy policy" link         |
| `position`             | `center`   | `center` or `bottom`              |
| `additional_text`      | —          | extra copy (e.g. a regional note) |
| `show_settings_button` | `true`     | the persistent re-open button     |

Copy is in `i18n/en.json` and `de.json`; colours and type come from the instance's theme tokens, so
the dialog looks right in all three themes.

## Tests

`tests/unit/consent.spec.ts` (state, persistence, version, storage failure, the Consent Mode mapping),
`tests/unit/plugins.spec.ts` (standalone shape), `tests/e2e/consent.spec.ts` (first visit, accept,
reject, customize, re-open from footer and button, keyboard trap, version bump) — on every theme.
