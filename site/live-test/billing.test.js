import test from 'node:test';
import assert from 'node:assert/strict';

test('@claim:team-kit-checkout advertised checkout redirects to the hosted Sociobot payment page', async () => {
  const response = await fetch('https://api.sociobot.in/api/v1/products/agent-audit-ledger/checkout', { redirect: 'manual' });
  assert.equal(response.status, 303);
  const checkout = new URL(response.headers.get('location'));
  assert.equal(checkout.protocol, 'https:');
  assert.equal(checkout.hostname, 'checkout.dodopayments.com');
});
