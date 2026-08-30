import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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

test('@claim:content-exclusion rejects prompts and omits selected-file contents from both exports', () => {
  const directory = mkdtempSync(join(tmpdir(), 'aal-claim-content-'));
  const contentMarker = 'SELECTED_FILE_BODY_MUST_NOT_APPEAR_9a8f61';
  try {
    writeFileSync(join(directory, 'review.rs'), `const PRIVATE_SOURCE: &str = "${contentMarker}";\n`);
    const event = '{"version":"1","time":"2026-08-30T10:00:00Z","type":"file","path":"review.rs","action":"modified","reason":"content exclusion fixture"}';
    writeFileSync(join(directory, 'actions.jsonl'), event);
    const result = aal([
      'build', '--input', join(directory, 'actions.jsonl'),
      '--markdown', join(directory, 'audit.md'), '--json', join(directory, 'audit.json'),
      '--root', directory
    ]);
    assert.equal(result.status, 0, result.stderr);
    assert.doesNotMatch(readFileSync(join(directory, 'audit.md'), 'utf8'), new RegExp(contentMarker));
    assert.doesNotMatch(readFileSync(join(directory, 'audit.json'), 'utf8'), new RegExp(contentMarker));

    writeFileSync(join(directory, 'prompt.jsonl'), event.replace(/}$/, ',"prompt":"private request"}'));
    const rejected = aal([
      'build', '--input', join(directory, 'prompt.jsonl'),
      '--json', join(directory, 'rejected.json'), '--root', directory
    ]);
    assert.equal(rejected.status, 1);
    assert.match(rejected.stderr, /unknown field `prompt`/);
    assert.equal(existsSync(join(directory, 'rejected.json')), false);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('@claim:cli-local-only runs the CLI demo without internet or DNS calls', () => {
  const directory = mkdtempSync(join(tmpdir(), 'aal-claim-network-'));
  let demoDirectory;
  try {
    const build = spawnSync('cargo', ['build', '--quiet', '--bin', 'aal'], { cwd: repo, encoding: 'utf8' });
    assert.equal(build.status, 0, build.stderr);
    const guardSource = join(directory, 'network-guard.c');
    const guardLibrary = join(directory, 'network-guard.so');
    const guardLog = join(directory, 'network-attempted.log');
    writeFileSync(guardSource, String.raw`
#define _GNU_SOURCE
#include <errno.h>
#include <fcntl.h>
#include <netdb.h>
#include <stdlib.h>
#include <sys/socket.h>
#include <sys/syscall.h>
#include <unistd.h>

static void record_network_attempt(void) {
  const char *path = getenv("AAL_NETWORK_GUARD_LOG");
  if (path != NULL) {
    int fd = open(path, O_WRONLY | O_CREAT | O_APPEND, 0600);
    if (fd >= 0) { (void)write(fd, "blocked\n", 8); (void)close(fd); }
  }
}

int socket(int domain, int type, int protocol) {
  if (domain == AF_INET || domain == AF_INET6) {
    record_network_attempt(); errno = EPERM; return -1;
  }
  return (int)syscall(SYS_socket, domain, type, protocol);
}

int connect(int fd, const struct sockaddr *address, socklen_t length) {
  if (address != NULL && (address->sa_family == AF_INET || address->sa_family == AF_INET6)) {
    record_network_attempt(); errno = EPERM; return -1;
  }
  return (int)syscall(SYS_connect, fd, address, length);
}

int getaddrinfo(const char *node, const char *service, const struct addrinfo *hints, struct addrinfo **result) {
  (void)node; (void)service; (void)hints; (void)result;
  record_network_attempt();
  return EAI_FAIL;
}
`);
    const compile = spawnSync('cc', ['-shared', '-fPIC', '-O2', '-o', guardLibrary, guardSource], { encoding: 'utf8' });
    assert.equal(compile.status, 0, `compile network guard: ${compile.stderr}`);
    const result = spawnSync(join(repo, 'target/debug/aal'), ['demo', '--json-output'], {
      cwd: directory,
      encoding: 'utf8',
      env: {
        ...process.env,
        AAL_NETWORK_GUARD_LOG: guardLog,
        LD_PRELOAD: guardLibrary,
        HTTP_PROXY: 'http://127.0.0.1:1',
        HTTPS_PROXY: 'http://127.0.0.1:1'
      }
    });
    assert.equal(result.status, 0, result.stderr);
    demoDirectory = JSON.parse(result.stdout).demo_dir;
    assert.equal(existsSync(guardLog), false, 'the CLI attempted an internet socket or DNS lookup');
  } finally {
    if (demoDirectory) rmSync(demoDirectory, { recursive: true, force: true });
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
