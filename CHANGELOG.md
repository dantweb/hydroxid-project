# Changelog

## Unreleased

SEC-1 — security advisories. `happy-dom` pinned to the patched `21.0.4` (GHSA-834v-8h66-3h79). The zod advisory
(GHSA-mrhx-c7xc-m3w5) arrives with oxid-fe-core 0.11.0 / oxid-fe-user 0.7.1 through the `#main` pins: see
`docs/SEC-1-follow-up.md`.

## 0.10.0

Inherits oxid-fe-user 0.7.0 / oxid-fe-core 0.10.0 (graphql-comply sprints 138d, 139a, 139b, 140c).

> **Pins on a feature branch.** `package.json` points `@dantweb/oxid-fe-core`, `@dantweb/oxid-fe-user` (and the
> `overrides` entry) at `#feature/graphql-comply` while those branches are unmerged. They go back to `#main`
> when the branches merge. Never a commit SHA.

### Docs

- 138h: `docs/ci.md` warns that Playwright traces hold the bearer token and the live-shop login.

### Added

- **139b** — `docs/instances.md`; e2e `language.spec.ts` asserts the `lang` id of GraphQL requests after a switch;
  unit tests of the rendered public config keys (`shop.language_ids`, `shop.id`, `checkout.guest`, `debug.errors`).
  No instance declares `shop.language_ids`: the shop's ids are the default `{ de: 0, en: 1 }`.

- **138d** — nginx `log_format headless` (`$uri`, no query string, no referer) for every instance block of
  `build/nginx-local.conf` / `build/nginx-pay1.conf`; unit test of the rendered config; `docs/ci.md` says the
  host-level nginx in front must log without the query string too. `nginx -t` verified on both rendered files.

- **140c** — guest checkout inherited: e2e `guest-checkout.spec.ts` per instance on the desktop project and the
  four device profiles (new Playwright projects, Chromium-emulated); screenshots in
  `docs/reports/guest-checkout/`; `docs/instances.md` documents `checkout.guest` (default `true`, no instance
  changes it); the mock shop answers `countries`.

- **139a** — `docs/ci.md`: the shop update procedure on pay1 (composer update → re-activate modules → payment-base
  `run-migrations.sh` → `oe:graphql:cache-clear` → smoke query), the `/graphql/` rewrite check (`QSA`,
  `skipSession=1`) with the `grep`, and the `zend.exception_ignore_args=On` note.

### Changed

- Dependencies: oxid-fe-core 0.10.0, oxid-fe-user 0.7.0 (`createAppRouter(registry, auth, config)`, payment
  components emit `failed` with the cause, guest routes). The three instances build and the plugins work
  unchanged; a unit test keeps the dashboard override's `orders.payment.*` texts.
