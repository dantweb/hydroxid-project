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

## Checkout without an account — `checkout.guest` (sprint 140c)

Default `true`: a shopper without a customer session gets the guest form at `/checkout` (e-mail, invoice
address, "deliver elsewhere", country list from the shop), pays with the anonymous token, and the shop makes
the guest its customer when the payment starts (payment-base 1.5). Set it per instance **only** if an
instance should not offer guest checkout:

```yaml
checkout:
  guest: false # /checkout redirects to the login page, as before sprint 140c
```

All three instances keep the default. Guest details live in the checkout store's memory only; what is
stored where is in oxid-fe-user's `docs/checkout.md`. The form's texts are the host catalog's
`checkout.guest.*` (en, de); HydroXid overrides none of them.

Proof: `tests/e2e/guest-checkout.spec.ts` (mock shop, no login, one item in the basket) runs per instance
(`INSTANCE=<name>`) on the desktop project and on the four device profiles of `playwright.config.ts`
(iPhone 17 Pro, Galaxy S24, S25 Ultra, Z Fold 7, all in Chromium with the device's viewport/touch/user
agent): the form renders, nothing scrolls sideways, inputs, rows and the pay button are at least 44 px
tall. Screenshots (`SCREENSHOTS=1`): `docs/reports/guest-checkout/<instance>-desktop.png` and
`<instance>-phone.png` (Galaxy S24).
