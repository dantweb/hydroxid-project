# Themes

Each theme is a child of the **`peroxid` theme** of `oxid-fe-user` (`parent: peroxid`, LESS
`@import '../../peroxid/styles/styles.less'`; peroxid is itself a child of `default`), re-declaring
colours and type. Peroxid's hero photography, radii and container width come along — they belong to the
`peroxid` plugin the HydroXid plugin extends. The build stages the base themes and `themes/` together
(`stageThemeSources`) before compiling.

| Theme                 | Look                                                                      | Typeface                                   | Instance / ports (local · pay1) |
| --------------------- | ------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------- |
| `hydroxid-vibrant`    | high contrast: black on white, hot magenta, electric yellow, cobalt links | **Poppins** 400/700/800                    | `vibrant` · 8101 · 2053         |
| `hydroxid-dark-ocean` | deep navy surfaces, aqua accents                                          | **IBM Plex Sans** 400/600                  | `dark-ocean` · 8102 · 2083      |
| `hydroxid-light-red`  | warm light surfaces, confident red                                        | **Playfair Display** (headings) + **Lato** | `light-red` · 8103 · 8443       |

- **Fonts** are self-hosted (`@fontsource`, OFL): `scripts/copy-fonts.mjs` copies the woff2 files into
  `themes/<id>/fonts` at build time (gitignored) and the LESS declares `@font-face` from `../fonts/…`.
- **Contrast:** `tests/unit/themes.spec.ts` asserts WCAG AA (4.5:1) for text, links and primary
  buttons on every theme, ≥ 15:1 text for vibrant, and that each theme has its own typeface.
- A new theme = a folder in `themes/`, a font entry in `copy-fonts.mjs`, an instance, a port in
  `deploy/instances.json` (and a Cloudflare-proxied port for pay1).
