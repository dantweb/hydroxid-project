import { execFileSync, spawnSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/** deploy/remote-activate.sh with a stubbed nginx / systemctl, in a temp directory. */
function sandbox(nginxOk: boolean) {
  const root = mkdtempSync(join(tmpdir(), 'hx-activate-'));
  const bin = join(root, 'bin');
  mkdirSync(bin);
  writeFileSync(
    join(bin, 'nginx'),
    `#!/bin/sh\n${nginxOk ? 'exit 0' : 'echo "bad config" >&2; exit 1'}\n`,
  );
  writeFileSync(join(bin, 'systemctl'), `#!/bin/sh\necho "$@" >> '${root}/systemctl.log'\n`);
  chmodSync(join(bin, 'nginx'), 0o755);
  chmodSync(join(bin, 'systemctl'), 0o755);

  const base = join(root, 'hydroxid-project');
  const release = (name: string, conf: string): string => {
    const dir = join(base, 'releases', name);
    mkdirSync(join(dir, 'dist'), { recursive: true });
    mkdirSync(join(dir, 'build'), { recursive: true });
    writeFileSync(join(dir, 'dist', 'index.html'), name);
    writeFileSync(join(dir, 'build', 'nginx-pay1.conf'), conf);
    return dir;
  };
  const conf = join(root, 'hydroxid-project.conf');
  const activate = (dir: string) =>
    spawnSync('sh', ['deploy/remote-activate.sh', dir], {
      env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, NGINX_CONF: conf },
      encoding: 'utf-8',
    });
  return { root, base, conf, release, activate };
}

describe('deploy/remote-activate.sh', () => {
  it('switches `current` to the release, installs the nginx config and reloads nginx', () => {
    const s = sandbox(true);
    const first = s.release('aaa', 'conf-a');

    const result = s.activate(first);

    expect(result.status).toBe(0);
    expect(readlinkSync(join(s.base, 'current'))).toBe(first);
    expect(readFileSync(s.conf, 'utf-8')).toBe('conf-a');
    expect(readFileSync(join(s.root, 'systemctl.log'), 'utf-8')).toContain('reload nginx');
  });

  it('rolls back — symlink and config — when nginx rejects the new configuration', () => {
    const ok = sandbox(true);
    const old = ok.release('old', 'conf-old');
    expect(ok.activate(old).status).toBe(0);

    // same tree, but nginx now refuses
    const bad = sandbox(false);
    const oldDir = join(bad.base, 'releases', 'old');
    mkdirSync(join(oldDir, 'dist'), { recursive: true });
    mkdirSync(join(oldDir, 'build'), { recursive: true });
    writeFileSync(join(oldDir, 'dist', 'index.html'), 'old');
    writeFileSync(join(oldDir, 'build', 'nginx-pay1.conf'), 'conf-old');
    execFileSync('ln', ['-sfn', oldDir, join(bad.base, 'current')]);
    writeFileSync(bad.conf, 'conf-old');
    const next = bad.release('new', 'conf-new');

    const result = bad.activate(next);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('rolling back');
    expect(readlinkSync(join(bad.base, 'current'))).toBe(oldDir);
    expect(readFileSync(bad.conf, 'utf-8')).toBe('conf-old');
    expect(existsSync(join(bad.root, 'systemctl.log'))).toBe(false); // never reloaded
  });

  it('refuses a release without the compiled app', () => {
    const s = sandbox(true);
    const dir = join(s.base, 'releases', 'empty');
    mkdirSync(dir, { recursive: true });

    expect(s.activate(dir).status).not.toBe(0);
    expect(existsSync(join(s.base, 'current'))).toBe(false);
  });

  it('keeps only the five newest releases', () => {
    const s = sandbox(true);
    for (let i = 1; i <= 7; i += 1) {
      const dir = s.release(`r${i}`, `conf-${i}`);
      execFileSync('touch', ['-d', `2026-01-0${i}`, dir]);
    }
    s.activate(join(s.base, 'releases', 'r7'));

    const left = execFileSync('ls', [join(s.base, 'releases')], { encoding: 'utf-8' })
      .trim()
      .split('\n');
    expect(left.sort()).toEqual(['r3', 'r4', 'r5', 'r6', 'r7']);
  });
});
