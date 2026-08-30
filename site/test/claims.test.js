import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const repo = process.cwd();

function aal(args) {
  return spawnSync('cargo', ['run', '--quiet', '--', ...args], {
    cwd: repo,
    encoding: 'utf8'
  });
}

test('@claim:cli-demo runs the shipped sample in a new temporary directory', () => {
  const result = aal(['demo', '--json-output']);
  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.ok, true);
  assert.equal(output.files, 1);
  assert.equal(output.evidence, 3);
  assert.ok(output.demo_dir.startsWith(tmpdir()));
  assert.match(readFileSync(output.input, 'utf8'), /"type":"delegation"/);
  assert.match(readFileSync(output.markdown, 'utf8'), /paths redacted/);
  assert.match(readFileSync(output.json, 'utf8'), /"sha256":/);
  rmSync(output.demo_dir, { recursive: true, force: true });
});

test('@claim:redaction-default keeps paths and command arguments out of a CLI ledger', () => {
  const directory = mkdtempSync(join(tmpdir(), 'aal-claim-redaction-'));
  try {
    writeFileSync(join(directory, 'review.rs'), 'pub fn review() {}\n');
    writeFileSync(join(directory, 'actions.jsonl'), [
      '{"version":"1","time":"2026-08-30T10:00:00Z","type":"file","path":"review.rs","action":"modified","reason":"claim fixture"}',
      '{"version":"1","time":"2026-08-30T10:01:00Z","type":"command","command":"API_TOKEN=supersecret cargo test --all","exit_code":0,"files":["review.rs"]}'
    ].join('\n'));
    const result = aal(['build', '--input', join(directory, 'actions.jsonl'), '--json', join(directory, 'audit.json'), '--root', directory]);
    assert.equal(result.status, 0, result.stderr);
    const ledger = readFileSync(join(directory, 'audit.json'), 'utf8');
    assert.doesNotMatch(ledger, /review\.rs|supersecret|API_TOKEN/);
    assert.match(ledger, /\[command redacted\]/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('@claim:open-event-schema exposes the CLI event schema', () => {
  const result = aal(['schema']);
  assert.equal(result.status, 0, result.stderr);
  const schema = JSON.parse(result.stdout);
  assert.deepEqual(schema.properties.type.enum, ['file', 'command', 'test', 'delegation']);
});

test('@claim:manifest-signing rejects a changed signed manifest', () => {
  const result = spawnSync('cargo', ['test', '--test', 'workflow', 'signed_manifest_detects_tampering'], {
    cwd: repo,
    encoding: 'utf8'
  });
  assert.equal(result.status, 0, result.stderr);
});
