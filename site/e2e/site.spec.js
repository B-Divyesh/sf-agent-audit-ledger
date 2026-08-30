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
  await page.getByRole('button', { name: 'Load sample' }).click();
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
  await page.goto('/demo');
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

test('reduced motion removes smooth scrolling and movement transitions', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const styles = await page.evaluate(() => ({
    scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
    transitionDuration: getComputedStyle(document.querySelector('.button')).transitionDuration
  }));
  expect(styles.scrollBehavior).toBe('auto');
  expect(styles.transitionDuration.split(',').every((duration) => Number.parseFloat(duration) <= 0.00001)).toBe(true);
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

test('@claim:demo-sandbox opens a completed isolated sample ledger from the first screen', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('aal:team-policy', JSON.stringify({ name: 'Real policy' })));
  await page.goto('/demo');
  await expect(page).toHaveTitle('Demo — Agent Audit Ledger');
  await expect(page.locator('h1')).toHaveText(/Review agent-assisted patches with evidence/);
  await expect(page.getByRole('link', { name: 'Try it with sample data' }).first()).toBeVisible();
  await expect(page.getByText('Demo — sample data, nothing is saved')).toBeVisible();
  await expect(page.locator('#preview')).toContainText('1 changed file');
  await expect(page.locator('#preview')).toContainText('Evidence3');
  expect(await page.locator('body').evaluate((body) => body.scrollWidth <= window.innerWidth)).toBe(true);
  expect(await page.locator('#events').inputValue()).toContain('"task":"Check path redaction"');
  const beforeReset = await page.evaluate(() => ({
    demo: localStorage.getItem('demo:agent-audit-ledger:workbench'),
    real: localStorage.getItem('aal:team-policy')
  }));
  expect(beforeReset.demo).toBeTruthy();
  expect(beforeReset.real).toContain('Real policy');

  await page.locator('#events').fill('not sample data');
  await page.getByRole('button', { name: 'Reset demo' }).click();
  await expect(page.locator('#preview')).toContainText('1 changed file');
  await expect(page.locator('#events')).toHaveValue(/"version":"1"/);

  await Promise.all([
    page.waitForURL(/\/$/),
    page.getByRole('link', { name: 'Start for real' }).click()
  ]);
  const afterLeave = await page.evaluate(() => ({
    demo: localStorage.getItem('demo:agent-audit-ledger:workbench'),
    real: localStorage.getItem('aal:team-policy')
  }));
  expect(afterLeave.demo).toBeNull();
  expect(afterLeave.real).toContain('Real policy');

  await page.goto('/?demo=1');
  await expect(page.getByText('Demo — sample data, nothing is saved')).toBeVisible();
  await expect(page.locator('#preview')).toContainText('1 changed file');
});

test('@claim:browser-local-only demo requests stay on the product origin', async ({ page }) => {
  const origins = new Set();
  page.on('request', (request) => origins.add(new URL(request.url()).origin));
  await page.goto('/demo');
  await expect(page.locator('#preview')).toContainText('1 changed file');
  expect([...origins]).toEqual([new URL(page.url()).origin]);
});

test('@claim:exports-markdown-json exports both ledger formats from the sample demo', async ({ page }) => {
  await page.goto('/demo');
  await expect(page.locator('#preview')).toContainText('1 changed file');
  const [markdownDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export MD' }).click()
  ]);
  expect(markdownDownload.suggestedFilename()).toBe('agent-audit-ledger.md');
  const [jsonDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export JSON' }).click()
  ]);
  expect(jsonDownload.suggestedFilename()).toBe('agent-audit-ledger.json');
  expect(await jsonDownload.createReadStream()).toBeTruthy();
});

test('@claim:offline-reload reloads the isolated demo after the first visit', async ({ browser }) => {
  const demoContext = await browser.newContext();
  try {
    const demoPage = await demoContext.newPage();
    await demoPage.goto('/');
    await demoPage.waitForFunction(async () => {
      await navigator.serviceWorker.ready;
      return true;
    });
    const updateState = await demoPage.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready;
      await registration.update();
      return { active: Boolean(registration.active), scriptURL: registration.active?.scriptURL };
    });
    expect(updateState.active).toBe(true);
    expect(updateState.scriptURL).toMatch(/\/sw\.js$/);
    await demoPage.goto('/demo');
    await demoPage.reload();
    await demoContext.setOffline(true);
    await demoPage.reload();
    await expect(demoPage.locator('h1')).toHaveCount(1);
    await expect(demoPage.locator('#preview')).toContainText('1 changed file');
    expect(await demoPage.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  } finally {
    await demoContext.close();
  }
});

test('demo and legal pages have accessible landmarks and content', async ({ page }) => {
  for (const route of ['/demo', '/privacy/', '/terms/']) {
    await page.goto(route);
    if (route === '/demo') await expect(page.locator('#preview')).toContainText('1 changed file');
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('main')).toHaveCount(1);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.filter((item) => ['serious', 'critical'].includes(item.impact))).toEqual([]);
  }
});

test('every route shows the factory and build identity, with a valid social card', async ({ page }) => {
  for (const route of ['/', '/demo', '/privacy/', '/terms/', '/404.html']) {
    await page.goto(route);
    await expect(page.locator('footer')).toContainText('Built by Param Factory');
    await expect(page.locator('footer')).toContainText('v0.1.0 · build agent-audit-ledger-repair-7');
  }
  await page.goto('/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /agent-audit-ledger-social\.webp$/);
  await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute('content', /agent-audit-ledger-social\.webp$/);
  expect(await page.evaluate(async () => {
    const image = await fetch('/agent-audit-ledger-social.webp').then((response) => response.blob());
    const bitmap = await createImageBitmap(image);
    return { width: bitmap.width, height: bitmap.height };
  })).toEqual({ width: 1200, height: 630 });
});

test('the styled 404 document is accessible and links home', async ({ page }) => {
  await page.goto('/404.html');
  await expect(page).toHaveTitle('Page not found — Agent Audit Ledger');
  await expect(page.locator('h1')).toHaveText('This page does not exist.');
  await expect(page.getByRole('link', { name: 'Return home' })).toHaveAttribute('href', '/');
  expect(await page.locator('body').evaluate((body) => body.scrollWidth <= window.innerWidth)).toBe(true);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((item) => ['serious', 'critical'].includes(item.impact))).toEqual([]);
});
