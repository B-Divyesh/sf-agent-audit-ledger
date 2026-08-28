import test from 'node:test';
import assert from 'node:assert/strict';
import { buildManifest, markdown, parseEvents } from '../src/demo.js';

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
