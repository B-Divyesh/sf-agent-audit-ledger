import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  workers: 1,
  use: { baseURL, trace: 'retain-on-failure' },
  webServer: process.env.PLAYWRIGHT_BASE_URL ? undefined : { command: 'npm run dev -- --host 127.0.0.1 --port 4173', url: baseURL, reuseExistingServer: false },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-390', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } }
  ]
});
