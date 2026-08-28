import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async ({ page }) => {
  await page.route('https://api.sociobot.in/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{"valid":false,"reason":"invalid"}' }));
});

test('home is accessible and builds a local ledger', async ({ page }) => {
  const consoleErrors = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  await page.goto('/');
  await expect(page.locator('h1')).toHaveCount(1);
  await page.getByRole('button', { name: 'Load example' }).click();
  await page.getByRole('button', { name: 'Build the ledger' }).click();
  await expect(page.getByRole('status').filter({ hasText: /Ledger ready/ })).toBeVisible();
  await expect(page.locator('#preview')).toContainText('Evidence3');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((item) => ['serious', 'critical'].includes(item.impact))).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test('empty and error states explain the next step', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('No ledger yet')).toBeVisible();
  await page.getByRole('button', { name: 'Build the ledger' }).click();
  await expect(page.getByText('Ledger not built')).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: /Add at least one/ })).toBeVisible();
});

test('browser workbench rejects evidence not linked to a changed file', async ({ page }) => {
  await page.goto('/');
  await page.locator('#events').fill(`{"version":"1","time":"2026-08-28T00:00:00Z","type":"file","path":"changed.rs","action":"modified","reason":"baseline"}
{"version":"1","time":"2026-08-28T00:01:00Z","type":"command","command":"cargo test","exit_code":0,"files":["other.rs"]}`);
  await page.getByRole('button', { name: 'Build the ledger' }).click();
  await expect(page.getByText('Ledger not built')).toBeVisible();
  await expect(page.locator('#demo-status')).toContainText('no matching file event');
});

test('keyboard starts at the skip link with no horizontal overflow', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();
  expect(await page.locator('body').evaluate((body) => body.scrollWidth <= window.innerWidth)).toBe(true);
});

test('offline reload uses the service-worker shell', async ({ page, context }) => {
  await page.goto('/');
  await page.waitForFunction(async () => {
    await navigator.serviceWorker.ready;
    return Boolean(navigator.serviceWorker.controller);
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('h1')).toHaveCount(1);
  expect(await page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
});

test('legal pages have one heading and main landmark', async ({ page }) => {
  for (const route of ['/privacy/', '/terms/']) {
    await page.goto(route);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('main')).toHaveCount(1);
  }
});
