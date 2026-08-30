import test from 'node:test';
import assert from 'node:assert/strict';
import { API_BASE, LICENSE_KEY, PRODUCT_SLUG, captureLicense, saveLicense, verifyLicense } from '../src/license.js';

function storage() {
  const map = new Map();
  return { getItem: (key) => map.get(key) ?? null, setItem: (key, value) => map.set(key, String(value)) };
}

test('return license is stored and removed from the URL', () => {
  const store = storage(); let replaced;
  const token = captureLicense({ location: { href: 'https://example.test/?license=abc&x=1' }, history: { replaceState: (_a, _b, value) => { replaced = value; } }, storage: store });
  assert.equal(token, 'abc'); assert.equal(store.getItem(LICENSE_KEY), 'abc'); assert.equal(replaced, '/?x=1');
});

test('license verify uses the Sociobot product route and caches success', async () => {
  const store = storage(); let requested;
  const verdict = await verifyLicense('token', { storage: store, now: 100, fetcher: async (url) => { requested = url; return { ok: true, json: async () => ({ valid: true, reason: 'ok' }) }; } });
  assert.equal(verdict.valid, true); assert.equal(requested, `${API_BASE}/products/${PRODUCT_SLUG}/verify?license=token`);
  const cached = await verifyLicense('token', { storage: store, now: 200, fetcher: async () => { throw new Error('should not fetch'); } });
  assert.equal(cached.cached, true);
});

test('a fresh invalid verdict is reused for one day', async () => {
  const store = storage(); let calls = 0;
  const fetcher = async () => { calls += 1; return { ok: true, json: async () => ({ valid: false, reason: 'invalid' }) }; };
  const first = await verifyLicense('invalid-token', { storage: store, now: 100, fetcher });
  const second = await verifyLicense('invalid-token', { storage: store, now: 200, fetcher });
  const third = await verifyLicense('invalid-token', { storage: store, now: 300, fetcher });
  assert.equal(first.valid, false);
  assert.equal(second.cached, true);
  assert.equal(third.cached, true);
  assert.equal(calls, 1);
});

test('empty pasted licenses are rejected', () => assert.throws(() => saveLicense('  ', storage()), /Paste/));
