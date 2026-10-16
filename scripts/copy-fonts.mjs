/**
 * Copies each theme's webfonts out of the @fontsource packages into themes/<id>/fonts, where the
 * theme LESS references them as url('../fonts/…'). The copied files are not committed (gitignored).
 */
import { cpSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

export const THEME_FONTS = {
  'hydroxid-vibrant': [
    ['poppins', 'poppins-latin-400-normal.woff2'],
    ['poppins', 'poppins-latin-700-normal.woff2'],
    ['poppins', 'poppins-latin-800-normal.woff2'],
  ],
  'hydroxid-dark-ocean': [
    ['ibm-plex-sans', 'ibm-plex-sans-latin-400-normal.woff2'],
    ['ibm-plex-sans', 'ibm-plex-sans-latin-600-normal.woff2'],
  ],
  'hydroxid-light-red': [
    ['lato', 'lato-latin-400-normal.woff2'],
    ['lato', 'lato-latin-700-normal.woff2'],
    ['playfair-display', 'playfair-display-latin-700-normal.woff2'],
    ['playfair-display', 'playfair-display-latin-800-normal.woff2'],
  ],
};

export function copyFonts(themesDir = 'themes', modulesDir = 'node_modules/@fontsource') {
  for (const [theme, files] of Object.entries(THEME_FONTS)) {
    const target = join(themesDir, theme, 'fonts');
    mkdirSync(target, { recursive: true });
    for (const [pkg, file] of files) {
      cpSync(join(modulesDir, pkg, 'files', file), join(target, file));
    }
  }
}
