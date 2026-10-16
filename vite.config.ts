import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderPublicConfig } from '@dantweb/oxid-fe-user/public-config';
import vue from '@vitejs/plugin-vue';
import { defineConfig, loadEnv, type Connect, type Plugin } from 'vite';
import { configDefaults } from 'vitest/config';

/**
 * Dev/preview: serves the RENDERED public config of one instance (INSTANCE=vibrant|dark-ocean|
 * light-red, default vibrant) at /oxid-config.json and answers 404 for the YAML and the instance
 * folders — the deployment config is never served.
 */
function instanceConfig(instance: string): Plugin {
  const json: Connect.NextHandleFunction = (_request, response) => {
    response.setHeader('Content-Type', 'application/json');
    response.setHeader('Cache-Control', 'no-store');
    try {
      const yaml = readFileSync(join('instances', instance, 'oxid-config.yaml'), 'utf-8');
      response.end(renderPublicConfig(yaml));
    } catch (error) {
      response.statusCode = 500;
      response.end(String(error instanceof Error ? error.message : error));
    }
  };
  const hidden: Connect.NextHandleFunction = (_request, response) => {
    response.statusCode = 404;
    response.end('Not found');
  };
  const install = (use: Connect.Server['use']): void => {
    use('/oxid-config.json', json);
    use('/instances', hidden);
    use('/deploy', hidden);
  };
  return {
    name: 'hydroxid-instance-config',
    configureServer: (server) => install(server.middlewares.use.bind(server.middlewares)),
    configurePreviewServer: (server) => install(server.middlewares.use.bind(server.middlewares)),
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const shopUrl = env.VITE_SHOP_URL ?? 'http://localhost.local';

  return {
    plugins: [vue(), instanceConfig(process.env.INSTANCE ?? 'vibrant')],
    resolve: {
      // one copy of the framework for the project, oxid-fe-user and oxid-fe-core
      dedupe: ['vue', 'pinia', 'vue-router', 'vue-i18n', 'zod'],
    },
    // oxid-fe-user ships .vue / .ts sources: the bundler must compile them, not pre-bundle
    optimizeDeps: { exclude: ['@dantweb/oxid-fe-user'] },
    server: {
      host: true,
      port: 5273,
      fs: { deny: ['.env', '.env.*', 'instances/**', 'deploy/**', '**/*.pem', '**/*.key'] },
      proxy: {
        '/graphql': { target: shopUrl, changeOrigin: true },
        '/out/pictures': { target: shopUrl, changeOrigin: true },
      },
    },
    test: {
      environment: 'happy-dom',
      include: ['tests/unit/**/*.spec.ts'],
      exclude: [...configDefaults.exclude, 'tests/e2e/**'],
    },
  };
});
