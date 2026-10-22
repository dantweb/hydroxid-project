# Instances — `instances/<name>/oxid-config.yaml`

One compiled app serves three instances (`vibrant`, `dark-ocean`, `light-red`); each is a folder with an
`oxid-config.yaml`. The file is **never served**: `scripts/build-instances.mjs` renders the browser's
`/oxid-config.json` from it through oxid-fe-user's allow-list (`@dantweb/oxid-fe-user/public-config`).
The full option reference is oxid-fe-user's `docs/instance-configuration.md`; this page lists what
HydroXid decides per instance.

## Shop language ids — `shop.language_ids` (sprint 139b)

The shop answers in the language of `?lang=<id>` on every GraphQL request (its browser-language detection
is off), so the storefront maps each locale to the shop's numeric language id. The host's default is
`{ de: 0, en: 1 }` — OXID's own ids, which the pay1 shop behind all three instances uses. **No instance
declares `shop.language_ids`**: a key is added only where a shop differs from the default, e.g.

```yaml
shop:
  graphql_url: /graphql/
  language_ids: { de: 0, en: 1, fr: 2 } # a shop with a third language
  id: 2 # optional subshop id, sent as ?shp=2
```

A locale without an entry sends no `lang`. Proof: `tests/e2e/language.spec.ts` asserts the `lang` value of
the GraphQL requests before and after a language switch (vibrant and light-red; dark-ocean has one
language); `tests/unit/instances.spec.ts` covers the rendered keys (`shop.language_ids`, `shop.id`,
`checkout.guest`, `debug.errors`) and that nothing beside them gets through.

## Debug — `debug.errors`

Default `false`: shoppers see the translated `errors.<code>` text only. `true` adds a collapsible block with
the error code and raw message — for a developer's instance, never for pay1.
