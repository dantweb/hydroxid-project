# Changelog

## 0.10.0

Inherits oxid-fe-user 0.7.0 / oxid-fe-core 0.10.0 (graphql-comply sprints 138d, 139a, 139b, 140c).

> **Pins on a feature branch.** `package.json` points `@dantweb/oxid-fe-core`, `@dantweb/oxid-fe-user` (and the
> `overrides` entry) at `#feature/graphql-comply` while those branches are unmerged. They go back to `#main`
> when the branches merge. Never a commit SHA.

### Added

- **139b** — `docs/instances.md`; e2e `language.spec.ts` asserts the `lang` id of GraphQL requests after a switch;
  unit tests of the rendered public config keys (`shop.language_ids`, `shop.id`, `checkout.guest`, `debug.errors`).
  No instance declares `shop.language_ids`: the shop's ids are the default `{ de: 0, en: 1 }`.

- **138d** — nginx `log_format headless` (`$uri`, no query string, no referer) for every instance block of
  `build/nginx-local.conf` / `build/nginx-pay1.conf`; unit test of the rendered config; `docs/ci.md` says the
  host-level nginx in front must log without the query string too. `nginx -t` verified on both rendered files.

### Changed

- Dependencies: oxid-fe-core 0.10.0, oxid-fe-user 0.7.0 (`createAppRouter(registry, auth, config)`, payment
  components emit `failed` with the cause, guest routes). The three instances build and the plugins work
  unchanged; a unit test keeps the dashboard override's `orders.payment.*` texts.
