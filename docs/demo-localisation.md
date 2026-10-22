# Demo: change a translation, deploy, watch the device update

**The claim:** edit the localisation in code, run the deploy — and the frontend that is _already open_
on a user's device updates itself. No cache clearing, no manual reload.

| Instance   | URL                          | Language |
| ---------- | ---------------------------- | -------- |
| vibrant    | `https://pay1.oxid.dev:2053` | English  |
| dark-ocean | `https://pay1.oxid.dev:2083` | Deutsch  |
| light-red  | `https://pay1.oxid.dev:8443` | Deutsch  |

Each instance speaks **one** language (`instances/<name>/oxid-config.yaml` → `i18n.locales`), so a
browser set to another language does not change it.

## The files you edit

HydroXid's wording is plain JSON, one file per language:

```
plugins/hydroxid/i18n/en.json     "hero": { "title": "Hydration, engineered." … }
plugins/hydroxid/i18n/de.json     "hero": { "title": "Hydration, konstruiert." … }
```

(Everything else — checkout, account, search, cookie dialog — has its own `i18n/de.json` / `en.json`
next to its plugin; the instance's language picks the file.)

## On stage (≈ 2 minutes from push to the phone)

1. **Show the device:** open `https://pay1.oxid.dev:2083` on a phone (and the English
   `:2053` next to it). Leave the page open. Point at the hero headline.
2. **Change the code:** in `plugins/hydroxid/i18n/de.json` change `hero.title`, e.g.
   `"Stücke, die bleiben."` → `"Stücke, die bleiben — live auf der Bühne."`
3. **Commit and push to `main`** (CI starts: lint, types, unit tests, e2e on all three instances).
4. **Run the deploy right away** (it repeats lint, types, unit tests and the audit itself, so it need not wait for the CI run) — GitHub → Actions → _Deploy to pay1.oxid.dev_ → _Run workflow_ → type `deploy`, or:
   `gh workflow run deploy.yml -f confirm=deploy`. It builds, ships, switches the release, reloads
   nginx, health-checks, and smoke-tests the cache headers.
5. **Watch the phone.** Within about 30 seconds of the release switch the open page reloads by itself and the
   new headline is there. (Backgrounded or locked phone: it updates the moment the page is visible again.)

## Why it updates by itself

1. **Every release has new file names.** The bundle is `/assets/index-<hash>.js`; the hash changes
   with any code or translation change. `index.html` is served `no-cache`, so a browser always asks
   which bundle is current; the old bundles stay cached forever, the new ones are fetched once.
2. **Files that keep their URL revalidate** (`/themes/*` is `no-cache`, the instance config `no-store`),
   so nothing stale survives a deploy (see _Cache policy_ in [ci.md](ci.md)).
3. **The `release-watcher` plugin** (`plugins/release-watcher`) asks the server every 30 s — and
   whenever the page becomes visible again — which bundle `index.html` names. A different bundle means a
   new release: the page reloads itself, **except in the checkout**, where it only shows a
   "new version available — refresh" banner so nobody loses a payment in progress.
   Config (`instances/<name>/oxid-config.yaml`): `release-watcher.config.auto_reload` (`false` = always
   a banner) and `interval_seconds`.

## After the demo

Revert the wording the same way (edit, push, deploy) — or `git revert` the demo commit and deploy.

## Rehearsal log (pay1, `:2083`, a phone-sized browser left open on the page)

| Time (UTC) | Event                                                                                    |
| ---------- | ---------------------------------------------------------------------------------------- |
| 11:50:32   | `hero.title` changed in `de.json`, pushed                                                |
| 11:52:40   | CI green (2 min)                                                                         |
| 11:53:56   | deploy finished (1¼ min; the release was switched ≈ 30 s earlier)                        |
| ≈ 11:53:30 | **the open page reloaded itself** and showed the new headline — nobody touched the phone |

The earlier attempt of the rehearsal also showed a trap worth remembering: tests must not pin the
wording. Here they read the expected copy from the `i18n/*.json` files, so changing a translation
never turns CI red.
