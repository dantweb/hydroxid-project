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

`workflow_dispatch` with the input `deploy`, in the `pay1` environment. It repeats the gate, builds,
ships over SSH (`deploy/deploy.sh`) and activates (`deploy/remote-activate.sh`): switch `current`,
install `/etc/nginx/conf.d/hydroxid-project.conf`, `nginx -t`, reload — **rolling back** the symlink
and the config if nginx rejects the new one. Finally it smoke-tests all three ports (config JSON
served, YAML 404).

| Port on pay1.oxid.dev | Theme                 |
| --------------------- | --------------------- |
| 2053                  | `hydroxid-vibrant`    |
| 2083                  | `hydroxid-dark-ocean` |
| 8443                  | `hydroxid-light-red`  |

nginx on pay1 listens on these origin ports with TLS (`listen … ssl`, a self-signed certificate in
`/etc/ssl/hydroxid/`, created by `remote-activate.sh`): Cloudflare reaches custom ports over TLS in
"Full" mode and answers **525** without it. It proxies `/graphql/` to the shop's apache on `127.0.0.1:8543`.

### Secrets and variables for the deployment (environment `pay1`)

| Name                 | Kind     | Value                                          |
| -------------------- | -------- | ---------------------------------------------- |
| `DEPLOY_SSH_KEY`     | secret   | private key authorised on the server           |
| `DEPLOY_HOST`        | variable | `85.236.47.72`                                 |
| `DEPLOY_USER`        | variable | `root` (nginx reload and `/etc/nginx` need it) |
| `DEPLOY_KNOWN_HOSTS` | variable | the server's pinned host key (`ssh-keyscan`)   |

### Prerequisite on the shop

The frontends call the shop's GraphQL API. The OXID shop on pay1 must have the
`graphql-storefront` module installed and active; without it `/graphql/` answers the shop's HTML page.
