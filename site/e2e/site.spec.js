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

test('default browser redaction hides a leading environment secret', async ({ page }) => {
  await page.goto('/');
  await page.locator('#events').fill(`{"version":"1","time":"2026-08-28T00:00:00Z","type":"file","path":"src/lib.rs","action":"modified","reason":"redaction regression"}
{"version":"1","time":"2026-08-28T00:01:00Z","type":"command","command":"API_TOKEN=supersecret cargo test","exit_code":0,"files":["src/lib.rs"]}`);
  await page.getByRole('button', { name: 'Build the ledger' }).click();
  await expect(page.locator('#preview')).toContainText('[command redacted]');
  await expect(page.locator('#preview')).not.toContainText('supersecret');
});

test('selected basename hashes a directory-qualified browser path', async ({ page }) => {
  await page.goto('/');
  await page.locator('#events').fill(`{"version":"1","time":"2026-08-28T00:00:00Z","type":"file","path":"src/lib.rs","action":"modified","reason":"path matching regression"}`);
  await page.locator('#files').setInputFiles({ name: 'lib.rs', mimeType: 'text/plain', buffer: Buffer.from('ordinary source file') });
  await page.getByRole('button', { name: 'Build the ledger' }).click();
  await expect(page.locator('.file-list li').first()).toContainText('present + hashed');
  await expect(page.locator('.file-list li').first()).toContainText('SHA-256');
});

test('keyboard starts at the skip link with no horizontal overflow', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();
  expect(await page.locator('body').evaluate((body) => body.scrollWidth <= window.innerWidth)).toBe(true);
});

test('file chooser focus is visible and standalone targets are at least 44px', async ({ page }) => {
  await page.goto('/');
  for (let tab = 0; tab < 30 && await page.evaluate(() => document.activeElement?.id !== 'files'); tab += 1) {
    await page.keyboard.press('Tab');
  }
  await expect(page.locator('#files')).toBeFocused();
  const focus = await page.locator('.file-picker').evaluate((element) => {
    const style = getComputedStyle(element);
    return { width: Number.parseFloat(style.outlineWidth), style: style.outlineStyle };
  });
  expect(focus.style).not.toBe('none');
  expect(focus.width).toBeGreaterThanOrEqual(3);

  const undersized = await page.locator('.site-header nav a, footer nav a, .buy-column > p a').evaluateAll((links) => links
    .filter((link) => link.getClientRects().length > 0)
    .map((link) => { const box = link.getBoundingClientRect(); return { text: link.textContent.trim(), width: box.width, height: box.height }; })
    .filter((box) => box.width < 44 || box.height < 44));
  expect(undersized).toEqual([]);
});

test('a cached invalid license is not rechecked on reload', async ({ page }) => {
  let verificationRequests = 0;
  page.on('request', (request) => {
    if (request.url().includes('/products/agent-audit-ledger/verify?license=')) verificationRequests += 1;
  });
  await page.addInitScript(() => localStorage.setItem('sb_license:agent-audit-ledger', 'invalid-token'));
  await page.goto('/');
  await expect.poll(() => verificationRequests).toBe(1);
  await page.reload();
  await page.reload();
  expect(verificationRequests).toBe(1);
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
