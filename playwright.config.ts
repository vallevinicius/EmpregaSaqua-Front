import { defineConfig } from '@playwright/test';

// E2E de navegador contra o build de produção (`vite preview`, com a CSP real) e API simulada via page.route:
// rápido, determinístico e sem depender do back/banco. Rode: npm run build && npm run test:e2e
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  timeout: 20_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: 'http://127.0.0.1:4173', locale: 'pt-BR' },
  webServer: {
    command: 'npx vite preview --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
