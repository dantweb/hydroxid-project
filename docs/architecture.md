# Architecture

## Layers and the contract between them

`oxid-fe-user` is an application, but it exposes a **project layer** (its `docs/project-layer.md`):

| Import                                 | Used for                                                                 |
| -------------------------------------- | ------------------------------------------------------------------------ |
| `@dantweb/oxid-fe-user/bootstrap`      | `startStorefront({ plugins })` — the app, with the project's plugins     |
| `@dantweb/oxid-fe-user/plugins/<name>` | the original of a plugin the project overrides (`dashboard`)             |
| `@dantweb/oxid-fe-user/theme-tools`    | `buildThemes`, `stageThemeSources` — compile the themes                  |
| `@dantweb/oxid-fe-user/public-config`  | `renderPublicConfig` — the browser's allow-listed, secret-guarded config |

Dependencies are pinned by tag (`oxid-fe-user#v0.3.1`, `oxid-fe-core#v0.8.1`); `overrides` forces one
core for the whole tree. Upgrading = bump the tags, run the gate.

## Three ways a project changes behaviour

1. **Override by name** — `main.ts` registers `dashboard`, so the project's plugin replaces the bundled
   one (`plugins/dashboard-override`: spreads the original, changes the greeting copy).
2. **Layout slots** — `hydroxid-layout` supplies `overrides: { header, footer }`.
3. **Overlays** — `gdpr-cookie-consent` contributes a global component (`overlays`), independent of
   any layout.

Which plugins run, and in which order, is per instance (`instances/<name>/oxid-config.yaml`); the
layout plugin is listed after the plugins whose slots it overrides.

## One build, three instances

The app is compiled once. Each theme has its own nginx `server` block (port) and its own rendered
`oxid-config.json` naming the theme — `scripts/render-nginx.mjs` generates the blocks for `local`
and `pay1` from `deploy/instances.json`.

```
instances/<name>/oxid-config.yaml  ──render (allow-list + secret guard)──►  build/instances/<name>/oxid-config.json
themes/ + oxid-fe-user themes      ──LESS (parent: default)──────────────►  public/themes/<id>/ (css, fonts)
                                          vite build ──► dist/
```
