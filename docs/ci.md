# CI and deployment

## CI (`.github/workflows/ci.yml`) — every push and pull request

1. **Quality gate:** lint (+prettier) · `vue-tsc` · knip (dead code) · unit tests · `npm audit` (no
   package with a known advisory) · build (themes → app → rendered instance configs → nginx configs)
   · a check that **no YAML is in the build output**.
2. **E2E matrix** over the three instances (Playwright, `vite preview`, shop API mocked): consent
   dialog, the peroxid-extending plugin, overriding dashboard, the instance's theme and webfont.

### Secrets for CI

`oxid-fe-core` and `oxid-fe-user` are private repositories installed over git+ssh. Each has a
**read-only deploy key**; the private halves are repository secrets here:

| Secret            | Purpose                               |
| ----------------- | ------------------------------------- |
| `CORE_DEPLOY_KEY` | read access to `dantweb/oxid-fe-core` |
| `USER_DEPLOY_KEY` | read access to `dantweb/oxid-fe-user` |

## Deployment (`.github/workflows/deploy.yml`) — manual only

Target: `pay1.oxid.dev`, directory `/var/www/oxid/oxid75/hydroxid-project`:

```
hydroxid-project/
├── releases/<commit-sha>/   dist/  build/instances/  build/nginx-pay1.conf   (the five newest are kept)
└── current  →  releases/<sha>                                                  (atomic switch)
```

**Who writes what.** The project folder is written **only by the CI user `github-actions`** — never by
root. A person with root runs `deploy/server-setup.sh` **once** (outside the folder): it creates a
self-signed origin certificate (Cloudflare reaches custom ports over TLS in "Full" mode, **525**
without), and installs `/etc/nginx/conf.d/hydroxid-project.conf`, a root-owned one-liner that
`include`s `…/hydroxid-project/current/build/nginx-pay1.conf` — the server blocks ship with each release.

`workflow_dispatch` with the input `deploy`, in the `pay1` environment. It repeats the gate, builds and
ships over SSH as `github-actions` (`deploy/deploy.sh`), then `deploy/remote-activate.sh` switches
`current` atomically, reloads nginx through the CI user's single sudo rule
(`/etc/sudoers.d/github-actions-nginx`: `nginx -s reload`), health-checks every port and **rolls back**
to the previous release (and reloads) if nginx did not come up. Finally the workflow smoke-tests all
three ports (config JSON served, YAML 404).

| Port on pay1.oxid.dev | Theme                 |
| --------------------- | --------------------- |
| 2053                  | `hydroxid-vibrant`    |
| 2083                  | `hydroxid-dark-ocean` |
| 8443                  | `hydroxid-light-red`  |

nginx on pay1 listens on these origin ports with TLS and proxies `/graphql/` to the shop's apache on
`127.0.0.1:8543`.

### Secrets and variables for the deployment (environment `pay1`)

| Name                 | Kind     | Value                                          |
| -------------------- | -------- | ---------------------------------------------- |
| `DEPLOY_SSH_KEY`     | secret   | private key authorised on the server           |
| `DEPLOY_HOST`        | variable | `85.236.47.72`                                 |
| `DEPLOY_USER`        | variable | `root` (nginx reload and `/etc/nginx` need it) |
| `DEPLOY_KNOWN_HOSTS` | variable | the server's pinned host key (`ssh-keyscan`)   |

### The shop on pay1 (GraphQL)

The frontends call the shop's GraphQL API at `/graphql/` (nginx proxies it to the shop's apache on
`127.0.0.1:8543`). The pay1 shop needs the GraphQL storefront; its `composer.json` `require` has:

```json
"thecodingmachine/graphqlite": "^7.0",
"oxid-esales/graphql-base": "dev-b-7.4.x",
"oxid-esales/graphql-storefront": "dev-b-7.4.x"
```

- **Why `graphqlite ^7.0`:** every `graphql-base` (also v13) requires `^7`, and under graphqlite 8 the
  storefront controllers are not discovered (the schema shows only `dummyQuery`, and PHP deprecation
  notices land inside the JSON). Upstream `payment-base` itself requires no graphqlite. The earlier root
  pin `^8.3` was therefore replaced; the change is a small downgrade (graphqlite 8.3.1 → 7.0.0 and its
  helpers) with no advisories (`composer update` reports none).
- After `composer update`: `oe:module:install` and `oe:module:activate` for `oe_graphql_base` and
  `oe_graphql_storefront`, `oe:graphql:cache-clear`, delete `var/cache/container/container_cache_shop_1.php`.
- Backups of the previous files: `composer.json.bak-20261016-graphql`, `composer.lock.bak-20261016-graphql`.
- Proof: `LIVE=1 E2E_BASE_URL=https://pay1.oxid.dev:2053 npx playwright test live` — catalogue, sign-in,
  account greeting, checkout (all three ports).

### Payments on pay1

pay1's shop offers **Stripe** (test mode, automatic capture) and **Mollie** (test mode, manual capture);
PayPal's module is not installed there. The instances run both inline (iframe mode) with their
**public** values only (`publishable_key`, `profile_id`) — no secret ever enters this repository.

Shop-side changes made for this (each with a backup next to the original):

| Change                                                                                                        | Why                                                                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `oe_payment_base` → `sPaymentBaseHeadlessReturnOrigins` = the three `https://pay1.oxid.dev:<port>` origins    | the shop returns shoppers only to allow-listed frontends                                                                                                                                                               |
| `oxid-esales/mollie-payment` pinned to `dantweb/mollie-payment` branch `feature/headless-embedded-card-token` | adds `mollieCheckoutStart(cardToken, uiMode: embedded)` for Mollie Components (upstream `b-7.4.x` lacks it); `composer.json.bak-20261016-mollie` restores upstream — inline Mollie then falls back to `mode: redirect` |

Proof: `LIVE=1 E2E_BASE_URL=https://pay1.oxid.dev:2053 npx playwright test payments-live --workers=1`
(and `:2083`, `:8443`): Stripe test card pays inline, a declined card is explained inside the form and a
good card then succeeds, Mollie card (Components, authorized), failed Mollie payment → no order and a
fresh attempt works, iDEAL — each ending in an order visible in `/dashboard/orders`.
The specs use the shared sandbox test customer; they create real (test-mode) orders in the pay1 shop.
