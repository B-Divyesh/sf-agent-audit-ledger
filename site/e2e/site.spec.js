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

test('legal pages have one heading and main landmark', async ({ page }) => {
  for (const route of ['/privacy/', '/terms/']) {
    await page.goto(route);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('main')).toHaveCount(1);
  }
});
