import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  expect: { timeout: 15000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4185/Ready-Lilla-matchday/',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4185 --strictPort --outDir dist-e2e',
    url: 'http://127.0.0.1:4185/Ready-Lilla-matchday/',
    reuseExistingServer: false,
  },
})
