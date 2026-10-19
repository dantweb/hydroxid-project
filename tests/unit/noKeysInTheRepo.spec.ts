import { execSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Sprint 15 (same guard as oxid-fe-user): payment provider keys live in the shop, never here. Anything key-shaped in a tracked
 * file or in the built app is a defect (the sealed exchange hands them over at checkout time).
 * A real key never needs to appear in a test or a doc: write `pk_test_…`.
 */
const KEY_SHAPES: [string, RegExp][] = [
  ['a Stripe publishable key', /pk_(test|live)_[A-Za-z0-9]{20,}/],
  ['a Mollie profile id', /\bpfl_[A-Za-z0-9]{6,}/],
  ['a PayPal client id', /\b[AB][A-Za-z0-9_-]{70,}/],
];

const TEXT = /\.(ts|vue|mjs|js|json|ya?ml|md|dist|html|css|conf|template)$/;
const SKIP = /(^|\/)(package-lock\.json|node_modules|coverage|test-results)\b/;

function trackedTextFiles(): string[] {
  return execSync('git ls-files', { encoding: 'utf-8' })
    .split('\n')
    .filter((file) => file && TEXT.test(file) && !SKIP.test(file) && existsSync(file));
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    // CSS holds long base64 fonts/images that look like ids; a key cannot be in a stylesheet
    const scannable = TEXT.test(name) && !name.endsWith('.css');
    return statSync(path).isDirectory() ? walk(path) : scannable ? [path] : [];
  });
}

function offenders(files: string[]): string[] {
  const found: string[] = [];
  for (const file of files) {
    const text = readFileSync(file, 'utf-8');
    for (const [label, shape] of KEY_SHAPES) {
      if (shape.test(text)) {
        found.push(`${file}: ${label}`);
      }
    }
  }
  return found;
}

describe('no payment provider key in the repository', () => {
  it('not in any tracked text file (config, sources, docs, dist templates)', () => {
    expect(offenders(trackedTextFiles())).toEqual([]);
  });

  it('not in the built app, if it was built (dist/ incl. oxid-config.json)', () => {
    expect(offenders(existsSync('dist') ? walk('dist') : [])).toEqual([]);
  });
});
