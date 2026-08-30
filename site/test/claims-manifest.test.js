import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('every published claim has exactly one tagged regression test', async () => {
  const [manifestText, cliTests, browserTests] = await Promise.all([
    readFile(new URL('../../.factory/claims.json', import.meta.url), 'utf8'),
    readFile(new URL('./claims.test.js', import.meta.url), 'utf8'),
    readFile(new URL('../e2e/site.spec.js', import.meta.url), 'utf8')
  ]);
  const claims = JSON.parse(manifestText);
  assert.ok(claims.length > 0);
  assert.equal(new Set(claims.map((claim) => claim.id)).size, claims.length);
  const regressionSource = cliTests + '\n' + browserTests;
  for (const claim of claims) {
    assert.match(claim.id, /^[a-z0-9-]+$/);
    assert.match(claim.claim, /\S/);
    assert.match(claim.where, /\S/);
    assert.match(claim.test, /\S/);
    assert.match(claim.sandbox, /\S/);
    const tag = '@claim:' + claim.id;
    const occurrences = regressionSource.split(tag).length - 1;
    assert.equal(occurrences, 1, tag + ' must name exactly one regression test');
  }
});
