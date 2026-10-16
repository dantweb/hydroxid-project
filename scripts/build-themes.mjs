/**
 * npm run build:themes — compiles the project's themes (and the base `default` theme they extend)
 * into public/themes/<id>/ (served at /themes/<id>/…).
 */
import { mkdtempSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { buildThemes, stageThemeSources } from '@dantweb/oxid-fe-user/theme-tools';
import { copyFonts } from './copy-fonts.mjs';

const require = createRequire(import.meta.url);
const baseThemes = join(
  dirname(require.resolve('@dantweb/oxid-fe-user/package.json')),
  'resources/themes',
);
const staging = mkdtempSync(join(tmpdir(), 'hydroxid-themes-'));

try {
  copyFonts();
  stageThemeSources([baseThemes, 'themes'], staging);
  const { built } = await buildThemes({ srcDir: staging, outDir: 'public/themes' });
  console.log(`themes: built ${built.join(', ')} -> public/themes`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  rmSync(staging, { recursive: true, force: true });
}
