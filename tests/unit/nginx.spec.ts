import { describe, expect, it } from 'vitest';
import { renderNginx } from '../../scripts/render-nginx.mjs';

const targets = {
  instances: {
    vibrant: { theme: 'hydroxid-vibrant', ports: { local: 8101, pay1: 2053 } },
    'dark-ocean': { theme: 'hydroxid-dark-ocean', ports: { local: 8102, pay1: 2083 } },
  },
};

describe('renderNginx', () => {
  it('one server block per instance on that target’s port, serving the instance’s own rendered JSON', () => {
    const conf = renderNginx(targets, 'local');

    expect(conf).toContain('listen 8101;');
    expect(conf).toContain('listen 8102;');
    expect(conf).toContain('alias /srv/hydroxid/build/instances/vibrant/oxid-config.json;');
    expect(conf).toContain('alias /srv/hydroxid/build/instances/dark-ocean/oxid-config.json;');
    expect(conf).not.toContain('2053');
  });

  it('pay1 uses its own ports, release path and the shop behind it over TLS', () => {
    const conf = renderNginx(targets, 'pay1');

    expect(conf).toContain('listen 2053;');
    expect(conf).toContain('listen 2083;');
    expect(conf).toContain('/var/www/oxid/oxid75/hydroxid-project/current/dist');
    expect(conf).toContain('proxy_pass https://127.0.0.1:8543/graphql/;');
    expect(conf).toContain('proxy_set_header Host pay1.oxid.dev;');
  });

  it('never serves a YAML, and never the instance folders', () => {
    for (const target of ['local', 'pay1']) {
      const conf = renderNginx(targets, target);
      expect(conf).toMatch(/location ~\* \\\.ya\?ml\(\\\.dist\)\?\$ \{\s*return 404;/);
      expect(conf).not.toContain('oxid-config.yaml;');
      expect(conf).not.toMatch(/alias [^;]*instances\/[^;]*yaml/);
    }
  });

  it('rejects an unknown target and duplicate ports', () => {
    expect(() => renderNginx(targets, 'moon')).toThrow(/unknown target/);
    const clash = { instances: { a: { ports: { local: 1 } }, b: { ports: { local: 1 } } } };
    expect(() => renderNginx(clash, 'local')).toThrow(/same port/);
  });
});
