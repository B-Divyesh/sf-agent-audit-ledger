import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const siteRoot = new URL('../', import.meta.url);
const socialImage = 'https://agent-audit-ledger.sociobot.in/agent-audit-ledger-social.webp';
const productOrigin = 'https://agent-audit-ledger.sociobot.in';
function webpDimensions(bytes) {
  assert.equal(bytes.subarray(0, 4).toString('ascii'), 'RIFF');
  assert.equal(bytes.subarray(8, 12).toString('ascii'), 'WEBP');

  for (let offset = 12; offset + 8 <= bytes.length;) {
    const chunk = bytes.subarray(offset, offset + 4).toString('ascii');
    const size = bytes.readUInt32LE(offset + 4);
    const data = offset + 8;
    if (chunk === 'VP8X') {
      return {
        width: 1 + bytes.readUIntLE(data + 4, 3),
        height: 1 + bytes.readUIntLE(data + 7, 3)
      };
    }
    if (chunk === 'VP8 ') {
      assert.deepEqual([...bytes.subarray(data + 3, data + 6)], [0x9d, 0x01, 0x2a]);
      return {
        width: bytes.readUInt16LE(data + 6) & 0x3fff,
        height: bytes.readUInt16LE(data + 8) & 0x3fff
      };
    }
    offset = data + size + (size % 2);
  }
  assert.fail('WebP image does not include a supported dimension chunk');
}

test('site contract keeps plain section copy, complete route metadata, and factory build identity', async () => {
  const [home, privacy, terms, notFound, configText, socialBytes, touchIcon, copyAudit] = await Promise.all([
    readFile(new URL('index.html', siteRoot), 'utf8'),
    readFile(new URL('privacy/index.html', siteRoot), 'utf8'),
    readFile(new URL('terms/index.html', siteRoot), 'utf8'),
    readFile(new URL('404.html', siteRoot), 'utf8'),
    readFile(new URL('public/staticwebapp.config.json', siteRoot), 'utf8'),
    readFile(new URL('public/agent-audit-ledger-social.webp', siteRoot)),
    readFile(new URL('public/apple-touch-icon.png', siteRoot)),
    readFile(new URL('../../.factory/copy-audit.md', import.meta.url), 'utf8')
  ]);

  for (const document of [home, privacy, terms, notFound]) {
    assert.match(document, /Built by Param Factory/);
    assert.match(document, /v0\.1\.0 · build agent-audit-ledger-repair-8/);
    assert.match(document, /Local evidence for reviewing agent-assisted patches\./);
  }

  const routeMetadata = [
    [home, 'Agent Audit Ledger — Review agent patches', `${productOrigin}/`],
    [privacy, 'Privacy — Agent Audit Ledger', `${productOrigin}/privacy/`],
    [terms, 'Terms — Agent Audit Ledger', `${productOrigin}/terms/`],
    [notFound, 'Page not found — Agent Audit Ledger', `${productOrigin}/404.html`]
  ];
  for (const [document, title, canonical] of routeMetadata) {
    assert.match(document, new RegExp(`<title>${title}</title>`));
    assert.match(document, new RegExp(`<link rel="canonical" href="${canonical}"`));
    assert.match(document, /<meta name="theme-color" content="#17231f">/);
    assert.match(document, /<link rel="apple-touch-icon" href="\/apple-touch-icon\.png" sizes="180x180">/);
    assert.match(document, new RegExp(`<meta property="og:title" content="${title}"`));
    assert.match(document, new RegExp(`<meta name="twitter:title" content="${title}"`));
    assert.match(document, new RegExp(`property="og:image" content="${socialImage}"`));
    assert.match(document, new RegExp(`name="twitter:image" content="${socialImage}"`));
    const description = document.match(/<meta name="description" content="([^"]+)">/)?.[1];
    assert.ok(description && description.length <= 155, `${title} needs a concise description`);
  }

  for (const requiredHeading of [
    'Keep patch evidence together.',
    'Create a review ledger in three steps.',
    'Build a review ledger from the command line.',
    'Free ledger tools and a one-time team kit.',
    'Review the sample ledger before using your own events.'
  ]) assert.match(home, new RegExp(requiredHeading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

  for (const removedCopy of [
    'A patch is a destination.',
    'Review field note',
    'The real instrument',
    'Own the workflow',
    'A portable record for the path behind a patch.'
  ]) assert.doesNotMatch(home + privacy + terms + notFound, new RegExp(removedCopy.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

  assert.match(home, new RegExp(`property="og:image" content="${socialImage}"`));
  assert.match(home, new RegExp(`name="twitter:image" content="${socialImage}"`));
  assert.match(home, /property="og:image:width" content="1200"/);
  assert.match(home, /property="og:image:height" content="630"/);
  assert.deepEqual(webpDimensions(socialBytes), { width: 1200, height: 630 });
  assert.deepEqual([touchIcon.readUInt32BE(16), touchIcon.readUInt32BE(20)], [180, 180]);
  assert.equal(JSON.parse(configText).routes.find((route) => route.route === '/agent-audit-ledger-social.webp')?.headers['Cache-Control'], 'public, max-age=31536000, immutable');
  assert.equal(JSON.parse(configText).routes.find((route) => route.route === '/apple-touch-icon.png')?.headers['Cache-Control'], 'public, max-age=31536000, immutable');

  const auditedRows = [...copyAudit.matchAll(/^\|\s*(\d+)\s*\|\s*(.+?)\s*\|$/gm)];
  assert.ok(auditedRows.length >= 25, 'copy audit must cover the landing copy');
  assert.ok(auditedRows.every(([, words]) => Number(words) <= 22), 'every audited landing sentence must be 22 words or fewer');
  assert.match(copyAudit, /Keep patch evidence together\./);
  assert.match(copyAudit, /Built by Param Factory/);
});
