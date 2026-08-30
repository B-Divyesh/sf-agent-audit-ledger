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

test('browser demo redacts a leading environment assignment in full', async () => {
  const assignmentEvents = `{"version":"1","time":"2026-08-28T00:00:00Z","type":"file","path":"src/lib.rs","action":"modified","reason":"redaction regression"}
{"version":"1","time":"2026-08-28T00:01:00Z","type":"command","command":"API_TOKEN=supersecret cargo test","exit_code":0,"files":["src/lib.rs"]}`;
  const manifest = await buildManifest(parseEvents(assignmentEvents));
  assert.equal(manifest.evidence[0].summary, '[command redacted]');
  assert.doesNotMatch(JSON.stringify(manifest), /supersecret/);
  assert.doesNotMatch(markdown(manifest), /supersecret/);
});

test('browser demo matches one selected basename to a directory-qualified event path', async () => {
  const selected = {
    name: 'review.rs',
    webkitRelativePath: '',
    arrayBuffer: async () => new TextEncoder().encode('selected source').buffer
  };
  const manifest = await buildManifest(parseEvents(events), [selected]);
  assert.equal(manifest.files[0].state, 'present + hashed');
  assert.match(manifest.files[0].sha256, /^[a-f0-9]{64}$/);

  const ambiguousEvents = `${events.split('\n')[0]}
{"version":"1","time":"2026-08-27T10:13:00Z","type":"file","path":"tests/review.rs","action":"modified","reason":"same basename"}`;
  const ambiguous = await buildManifest(parseEvents(ambiguousEvents), [selected]);
  assert.equal(ambiguous.files.every((file) => file.state === 'not supplied'), true);
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

test('browser preview rejects dangling evidence references', async () => {
  const dangling = `{"version":"1","time":"2026-08-28T00:00:00Z","type":"file","path":"changed.rs","action":"modified","reason":"baseline"}
{"version":"1","time":"2026-08-28T00:01:00Z","type":"command","command":"cargo test","exit_code":0,"files":["other.rs"]}`;
  await assert.rejects(buildManifest(parseEvents(dangling)), /no matching file event/);
});

test('browser preview uses random opaque IDs and compares timestamp instants', async () => {
  const offsetEvents = `{"version":"1","time":"2026-08-28T10:00:00+14:00","type":"file","path":"src/lib.rs","action":"modified","reason":"earlier instant"}
{"version":"1","time":"2026-08-28T00:00:00Z","type":"command","command":"cargo test","exit_code":0,"files":["src/lib.rs"]}`;
  const first = await buildManifest(parseEvents(offsetEvents));
  const second = await buildManifest(parseEvents(offsetEvents));
  assert.match(first.files[0].id, /^file:[a-f0-9]{32}$/);
  assert.notEqual(first.files[0].id, second.files[0].id);
  assert.deepEqual(first.evidence[0].files, [first.files[0].id]);
  assert.equal(first.generated_at, '2026-08-28T00:00:00Z');
});

test('browser preview orders RFC 3339 leap-second fractions by their instant', async () => {
  const leapEvents = `{"version":"1","time":"2016-12-31T23:59:60.900Z","type":"file","path":"src/lib.rs","action":"modified","reason":"later leap fraction"}
{"version":"1","time":"2017-01-01T00:00:00.800Z","type":"command","command":"cargo test","exit_code":0,"files":["src/lib.rs"]}`;
  const manifest = await buildManifest(parseEvents(leapEvents));
  assert.equal(manifest.generated_at, '2016-12-31T23:59:60.900Z');
});

test('the website publishes the CLI event schema byte-for-byte', async () => {
  const [source, published] = await Promise.all([
    readFile(new URL('../../schema/event.schema.json', import.meta.url), 'utf8'),
    readFile(new URL('../public/schema/event.schema.json', import.meta.url), 'utf8')
  ]);
  assert.equal(published, source);
});

test('static deployment config preserves immutable assets and secure updates', async () => {
  const [configText, serviceWorker, page] = await Promise.all([
    readFile(new URL('../public/staticwebapp.config.json', import.meta.url), 'utf8'),
    readFile(new URL('../public/sw.js', import.meta.url), 'utf8'),
    readFile(new URL('../index.html', import.meta.url), 'utf8')
  ]);
  const config = JSON.parse(configText);
  assert.match(config.globalHeaders['Content-Security-Policy'], /default-src 'self'/);
  assert.match(config.globalHeaders['Content-Security-Policy'], /connect-src 'self' https:\/\/api\.sociobot\.in/);
  assert.match(config.globalHeaders['Permissions-Policy'], /camera=\(\)/);
  const headersFor = (route) => config.routes.find((entry) => entry.route === route)?.headers['Cache-Control'];
  assert.equal(headersFor('/assets/*'), 'public, max-age=31536000, immutable');
  assert.equal(headersFor('/evidence-orchard.webp'), 'public, max-age=31536000, immutable');
  assert.match(headersFor('/sw.js'), /^no-cache/);
  assert.match(serviceWorker, /const CACHE = 'aal-shell-v3'/);
  assert.match(serviceWorker, /'\/demo'/);
  assert.match(serviceWorker, /'\/demo-route\.js'/);
  assert.match(page, /<script src="\/demo-route\.js"><\/script>/);
});
