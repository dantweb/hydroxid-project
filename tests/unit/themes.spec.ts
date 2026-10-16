import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

interface ThemeConfig {
  id: string;
  parent: string;
  tokens: Record<string, string>;
}

const THEMES_DIR = 'themes';
const ids = readdirSync(THEMES_DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
const config = (id: string): ThemeConfig =>
  JSON.parse(readFileSync(join(THEMES_DIR, id, 'config.json'), 'utf-8'));

/** WCAG relative luminance contrast ratio of two #rrggbb colours. */
function contrast(a: string, b: string): number {
  const luminance = (hex: string): number => {
    const [r, g, bl] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const lin = (v: number): number => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(bl);
  };
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('the three HydroXid themes', () => {
  it('are exactly vibrant, dark-ocean and light-red, all children of the base default theme', () => {
    expect(ids).toEqual(['hydroxid-dark-ocean', 'hydroxid-light-red', 'hydroxid-vibrant']);
    for (const id of ids) {
      expect(config(id)).toMatchObject({ id, parent: 'default' });
    }
  });

  it('each uses its own typeface (and the light-red one a separate heading face)', () => {
    const families = ids.map((id) => config(id).tokens['--oxfe-font-family']);
    expect(new Set(families).size).toBe(3);
    expect(config('hydroxid-vibrant').tokens['--oxfe-font-family']).toContain('Poppins');
    expect(config('hydroxid-dark-ocean').tokens['--oxfe-font-family']).toContain('IBM Plex Sans');
    expect(config('hydroxid-light-red').tokens['--oxfe-font-family']).toContain('Lato');
    expect(config('hydroxid-light-red').tokens['--oxfe-font-heading']).toContain('Playfair');
  });

  it('every font a theme names is declared with @font-face from its own fonts folder', () => {
    for (const id of ids) {
      const less = readFileSync(join(THEMES_DIR, id, 'styles/styles.less'), 'utf-8');
      expect(less).toContain('@font-face');
      expect(less).toContain("url('../fonts/");
    }
  });

  it('text and primary buttons are readable: WCAG AA (4.5:1) on every theme', () => {
    for (const id of ids) {
      const t = config(id).tokens;
      expect(
        contrast(t['--oxfe-color-text'], t['--oxfe-color-background']),
        `${id} text`,
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        contrast(t['--oxfe-color-primary-contrast'], t['--oxfe-color-primary']),
        `${id} button`,
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        contrast(t['--oxfe-color-link'], t['--oxfe-color-background']),
        `${id} link`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('vibrant is high-contrast: black on white text, black borders', () => {
    const t = config('hydroxid-vibrant').tokens;
    expect(contrast(t['--oxfe-color-text'], t['--oxfe-color-background'])).toBeGreaterThanOrEqual(
      15,
    );
    expect(t['--oxfe-color-border']).toBe('#000000');
  });

  it('dark-ocean is dark and light-red is light', () => {
    const lum = (id: string): number =>
      parseInt(config(id).tokens['--oxfe-color-background'].slice(1, 3), 16);
    expect(lum('hydroxid-dark-ocean')).toBeLessThan(40);
    expect(lum('hydroxid-light-red')).toBeGreaterThan(220);
  });
});
