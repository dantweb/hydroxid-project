/**
 * npm run build:instances — renders every instances/<name>/oxid-config.yaml into
 * build/instances/<name>/oxid-config.json: the ONLY form of the configuration a browser may get
 * (allow-list + secret guard, @dantweb/oxid-fe-user/public-config). Fails when a config would
 * expose a secret. The YAMLs themselves are never published.
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderPublicConfig } from '@dantweb/oxid-fe-user/public-config';

const rendered = [];
try {
  for (const name of readdirSync('instances').sort()) {
    const json = renderPublicConfig(
      readFileSync(join('instances', name, 'oxid-config.yaml'), 'utf-8'),
    );
    mkdirSync(join('build/instances', name), { recursive: true });
    writeFileSync(join('build/instances', name, 'oxid-config.json'), json);
    rendered.push(name);
  }
  console.log(`instances: rendered ${rendered.join(', ')} -> build/instances`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
