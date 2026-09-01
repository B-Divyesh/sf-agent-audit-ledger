import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('every published claim has exactly one tagged regression test', async () => {
  const [manifestText, cliTests, browserTests, licenseTests, billingTests, home, privacy, terms] = await Promise.all([
    readFile(new URL('../../.factory/claims.json', import.meta.url), 'utf8'),
    readFile(new URL('./claims.test.js', import.meta.url), 'utf8'),
    readFile(new URL('../e2e/site.spec.js', import.meta.url), 'utf8'),
    readFile(new URL('./license.test.js', import.meta.url), 'utf8'),
    readFile(new URL('../live-test/billing.test.js', import.meta.url), 'utf8'),
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../privacy/index.html', import.meta.url), 'utf8'),
    readFile(new URL('../terms/index.html', import.meta.url), 'utf8')
  ]);
  const claims = JSON.parse(manifestText);
  assert.ok(claims.length > 0);
  assert.equal(new Set(claims.map((claim) => claim.id)).size, claims.length);
  const claimIds = new Set(claims.map((claim) => claim.id));
  const regressionSource = [cliTests, browserTests, licenseTests, billingTests].join('\n');
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

  const publishedRequirements = [
    [home, /hash(ed|es).*file/i, 'browser-file-hashing'],
    [home + terms, /\$49[\s\S]{0,40}one-time/i, 'team-kit-price'],
    [home + terms, /save(s)? one named[\s\S]{0,80}polic/i, 'team-policy-workflow'],
    [home, /schema version 1 in every policy export/i, 'team-policy-workflow'],
    [home, /api\.sociobot\.in\/api\/v1\/products\/agent-audit-ledger\/checkout/, 'team-kit-checkout'],
    [privacy, /prevents another check for 24 hours/i, 'license-daily-verification'],
    [privacy, /stored in your browser’s localStorage[\s\S]{0,140}sends only that token/i, 'license-local-verification'],
    [home + terms, /refund[\s\S]{0,30}(revokes|inactive)/i, 'inactive-license-lock']
  ];
  for (const [document, publishedCopy, claimId] of publishedRequirements) {
    assert.match(document, publishedCopy, `expected published copy for ${claimId}`);
    assert.ok(claimIds.has(claimId), `${claimId} must be registered while its pricing or privacy claim is published`);
  }
  assert.doesNotMatch(home + terms, /future v1 (policy )?updates/i, 'prospective update promises cannot be verified');
});
