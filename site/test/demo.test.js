import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildManifest, isRfc3339, markdown, parseEvents } from '../src/demo.js';

const events = `{"version":"1","time":"2026-08-27T10:12:00Z","type":"file","path":"src/review.rs","action":"modified","reason":"Link evidence"}
{"version":"1","time":"2026-08-27T10:14:00Z","type":"command","command":"cargo test --all","exit_code":0,"files":["src/review.rs"]}`;

test('browser demo builds the documented redacted manifest', async () => {
  const manifest = await buildManifest(parseEvents(events));
  assert.equal(manifest.summary.file_count, 1);
  assert.equal(manifest.files[0].path.startsWith('file:'), true);
  assert.equal(manifest.evidence[0].summary, 'cargo [arguments redacted]');
  assert.match(markdown(manifest), /Link evidence/);
});

test('browser parser handles empty and invalid states', () => {
  assert.throws(() => parseEvents(''), /at least one/);
  assert.throws(() => parseEvents('{bad'), /Line 1/);
  assert.throws(() => parseEvents(events.split('\n')[0].replace(/}$/, ',"prompt":"secret"}')), /unknown field/);
});

test('browser parser rejects calendar-invalid timestamps and duplicate references', () => {
  for (const timestamp of ['2026-99-99T99:99:99Z', '2025-02-29T12:00:00Z', '2026-04-31T12:00:00Z', '2026-08-27T24:00:00Z', '2026-08-27T10:00:00+24:00']) {
    assert.equal(isRfc3339(timestamp), false, timestamp);
    assert.throws(() => parseEvents(`{"version":"1","time":"${timestamp}","type":"file","path":"file.rs","action":"added","reason":"valid fields"}`), /RFC 3339/);
  }
  assert.equal(isRfc3339('2024-02-29T23:59:59.123+23:59'), true);
  assert.throws(() => parseEvents('{"version":"1","time":"2026-08-27T10:12:00Z","type":"command","command":"cargo test","exit_code":0,"files":["src/lib.rs","src/lib.rs"]}'), /unique/);
});

test('browser parser enforces per-type status constraints', () => {
  assert.throws(() => parseEvents('{"version":"1","time":"2026-08-27T10:12:00Z","type":"test","name":"suite","status":"started"}'), /test events/);
  assert.throws(() => parseEvents('{"version":"1","time":"2026-08-27T10:12:00Z","type":"delegation","task":"review","delegate":"agent-1","status":"skipped"}'), /delegation events/);
  assert.doesNotThrow(() => parseEvents('{"version":"1","time":"2026-08-27T10:12:00Z","type":"test","name":"suite","status":"passed","files":["src/lib.rs"]}'));
});

test('the website publishes the CLI event schema byte-for-byte', async () => {
  const [source, published] = await Promise.all([
    readFile(new URL('../../schema/event.schema.json', import.meta.url), 'utf8'),
    readFile(new URL('../public/schema/event.schema.json', import.meta.url), 'utf8')
  ]);
  assert.equal(published, source);
});

test('static deployment config preserves immutable assets and secure updates', async () => {
  const config = JSON.parse(await readFile(new URL('../public/staticwebapp.config.json', import.meta.url), 'utf8'));
  assert.match(config.globalHeaders['Content-Security-Policy'], /default-src 'self'/);
  assert.match(config.globalHeaders['Content-Security-Policy'], /connect-src 'self' https:\/\/api\.sociobot\.in/);
  assert.match(config.globalHeaders['Permissions-Policy'], /camera=\(\)/);
  const headersFor = (route) => config.routes.find((entry) => entry.route === route)?.headers['Cache-Control'];
  assert.equal(headersFor('/assets/*'), 'public, max-age=31536000, immutable');
  assert.equal(headersFor('/evidence-orchard.webp'), 'public, max-age=31536000, immutable');
  assert.match(headersFor('/sw.js'), /^no-cache/);
});
