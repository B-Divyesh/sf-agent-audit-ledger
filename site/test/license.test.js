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

test('@claim:license-local-verification stores the token and verdict locally and sends only the token', async () => {
  const store = storage(); let requested;
  saveLicense('token', store);
  const verdict = await verifyLicense('token', { storage: store, now: 100, fetcher: async (url) => { requested = url; return { ok: true, json: async () => ({ valid: true, reason: 'ok' }) }; } });
  assert.equal(verdict.valid, true); assert.equal(requested, `${API_BASE}/products/${PRODUCT_SLUG}/verify?license=token`);
  assert.equal(store.getItem(LICENSE_KEY), 'token');
  assert.deepEqual(JSON.parse(store.getItem(`${LICENSE_KEY}:verdict`)), { valid: true, reason: 'ok', token: 'token', checkedAt: 100 });
  const cached = await verifyLicense('token', { storage: store, now: 200, fetcher: async () => { throw new Error('should not fetch'); } });
  assert.equal(cached.cached, true);
});

test('@claim:license-daily-verification reuses any completed verdict for 24 hours, then checks again', async () => {
  const store = storage(); let calls = 0;
  const fetcher = async () => { calls += 1; return { ok: true, json: async () => ({ valid: false, reason: 'invalid' }) }; };
  const first = await verifyLicense('invalid-token', { storage: store, now: 100, fetcher });
  const second = await verifyLicense('invalid-token', { storage: store, now: 86_400_099, fetcher });
  const third = await verifyLicense('invalid-token', { storage: store, now: 86_400_100, fetcher });
  assert.equal(first.valid, false);
  assert.equal(second.cached, true);
  assert.equal(third.cached, undefined);
  assert.equal(calls, 2);
});

test('empty pasted licenses are rejected', () => assert.throws(() => saveLicense('  ', storage()), /Paste/));
